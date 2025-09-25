from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from datetime import datetime, timedelta, timezone
from typing import Optional

from models.database import get_db, User, RefreshToken
from schemas.auth import UserCreate, UserLogin, UserResponse, Token, TokenRefresh, PasswordChange
from core.security import SecurityManager, PasswordValidator, RateLimiter
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

router = APIRouter(prefix="/auth", tags=["authentication"])
security = HTTPBearer()
limiter = Limiter(key_func=get_remote_address)

class AuthService:
    def __init__(self, db: Session):
        self.db = db
        self.security_manager = SecurityManager()

    def create_user(self, user_data: UserCreate) -> User:
        # Check if user already exists
        existing_user = self.db.query(User).filter(
            (User.email == user_data.email) | (User.username == user_data.username)
        ).first()
        
        if existing_user:
            if existing_user.email == user_data.email:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Email already registered"
                )
            else:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Username already taken"
                )
        
        # Validate password
        is_valid, errors = PasswordValidator.validate(user_data.password)
        if not is_valid:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"message": "Password validation failed", "errors": errors}
            )
        
        # Create new user
        hashed_password = self.security_manager.hash_password(user_data.password)
        
        db_user = User(
            email=user_data.email,
            username=user_data.username.lower(),
            full_name=user_data.full_name,
            password_hash=hashed_password,
            is_active=True,
            is_admin=False
        )
        
        self.db.add(db_user)
        self.db.commit()
        self.db.refresh(db_user)
        
        return db_user

    def authenticate_user(self, email: str, password: str) -> Optional[User]:
        user = self.db.query(User).filter(User.email == email, User.is_active == True).first()
        
        if not user:
            return None
        
        if not self.security_manager.verify_password(password, user.password_hash):
            return None
        
        # Check if password needs rehashing (security parameters updated)
        if self.security_manager.needs_rehash(user.password_hash):
            user.password_hash = self.security_manager.hash_password(password)
            self.db.commit()
        
        # Update last login
        user.last_login = datetime.now(timezone.utc)
        self.db.commit()
        
        return user

    def create_tokens(self, user: User) -> dict:
        access_token = self.security_manager.create_access_token(
            data={"sub": str(user.id), "username": user.username, "email": user.email}
        )
        
        refresh_token = self.security_manager.create_refresh_token(
            data={"sub": str(user.id)}
        )
        
        # Store refresh token in database
        db_refresh_token = RefreshToken(
            token=refresh_token,
            user_id=user.id,
            expires_at=datetime.now(timezone.utc) + timedelta(days=7)
        )
        
        self.db.add(db_refresh_token)
        self.db.commit()
        
        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "expires_in": 30 * 60  # 30 minutes in seconds
        }

    def refresh_access_token(self, refresh_token: str) -> dict:
        # Verify refresh token
        payload = self.security_manager.verify_token(refresh_token)
        if not payload or payload.get("type") != "refresh":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid refresh token"
            )
        
        # Check if refresh token exists in database and is not revoked
        db_token = self.db.query(RefreshToken).filter(
            RefreshToken.token == refresh_token,
            RefreshToken.is_revoked == False,
            RefreshToken.expires_at > datetime.now(timezone.utc)
        ).first()
        
        if not db_token:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Refresh token expired or revoked"
            )
        
        # Get user
        user = self.db.query(User).filter(User.id == db_token.user_id, User.is_active == True).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found or inactive"
            )
        
        # Create new access token
        access_token = self.security_manager.create_access_token(
            data={"sub": str(user.id), "username": user.username, "email": user.email}
        )
        
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "expires_in": 30 * 60
        }

    def revoke_refresh_token(self, refresh_token: str):
        db_token = self.db.query(RefreshToken).filter(RefreshToken.token == refresh_token).first()
        if db_token:
            db_token.is_revoked = True
            self.db.commit()

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    token = credentials.credentials
    
    payload = SecurityManager.verify_token(token)
    if not payload or payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload"
        )
    
    user = db.query(User).filter(User.id == int(user_id), User.is_active == True).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive"
        )
    
    return user

def get_current_admin_user(current_user: User = Depends(get_current_user)) -> User:
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return current_user

# Routes
@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("5/minute")
async def register(request: Request, user_data: UserCreate, db: Session = Depends(get_db)):
    auth_service = AuthService(db)
    user = auth_service.create_user(user_data)
    return user

@router.post("/login", response_model=Token)
@limiter.limit("10/minute")
async def login(request: Request, credentials: UserLogin, db: Session = Depends(get_db)):
    auth_service = AuthService(db)
    
    user = auth_service.authenticate_user(credentials.email, credentials.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    
    tokens = auth_service.create_tokens(user)
    return tokens

@router.post("/refresh", response_model=dict)
@limiter.limit("20/minute")
async def refresh_token(request: Request, token_data: TokenRefresh, db: Session = Depends(get_db)):
    auth_service = AuthService(db)
    return auth_service.refresh_access_token(token_data.refresh_token)

@router.post("/logout")
async def logout(
    request: Request,
    token_data: TokenRefresh,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    auth_service = AuthService(db)
    auth_service.revoke_refresh_token(token_data.refresh_token)
    return {"message": "Successfully logged out"}

@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    return current_user

@router.post("/change-password")
@limiter.limit("3/minute")
async def change_password(
    request: Request,
    password_data: PasswordChange,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Verify current password
    if not SecurityManager.verify_password(password_data.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect"
        )
    
    # Validate new password
    is_valid, errors = PasswordValidator.validate(password_data.new_password)
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"message": "Password validation failed", "errors": errors}
        )
    
    # Update password
    current_user.password_hash = SecurityManager.hash_password(password_data.new_password)
    db.commit()
    
    return {"message": "Password changed successfully"}