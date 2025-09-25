from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError, VerificationError
from jose import JWTError, jwt
from datetime import datetime, timedelta, timezone
from typing import Optional
import secrets
import os
import argon2

# Argon2id configuration for production security
ph = PasswordHasher(
    time_cost=3,           # Number of iterations
    memory_cost=65536,     # Memory usage in KB (64 MB)
    parallelism=1,         # Number of parallel threads
    hash_len=32,           # Length of hash in bytes
    salt_len=16,           # Length of salt in bytes
    encoding='utf-8',      # Encoding for strings
    type=argon2.Type.ID    # Use Argon2id variant
)

# JWT Configuration
SECRET_KEY = os.getenv("SECRET_KEY", secrets.token_urlsafe(32))
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30
REFRESH_TOKEN_EXPIRE_DAYS = 7

class SecurityManager:
    @staticmethod
    def hash_password(password: str) -> str:
        """Hash a password using Argon2id."""
        try:
            return ph.hash(password)
        except Exception as e:
            raise ValueError(f"Failed to hash password: {str(e)}")
    
    @staticmethod
    def verify_password(plain_password: str, hashed_password: str) -> bool:
        """Verify a password against its hash."""
        try:
            ph.verify(hashed_password, plain_password)
            return True
        except (VerifyMismatchError, VerificationError):
            return False
        except Exception:
            return False
    
    @staticmethod
    def needs_rehash(hashed_password: str) -> bool:
        """Check if password needs rehashing (security parameters updated)."""
        try:
            return ph.check_needs_rehash(hashed_password)
        except Exception:
            return True  # If we can't check, assume it needs rehashing
    
    @staticmethod
    def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
        """Create a JWT access token."""
        to_encode = data.copy()
        if expires_delta:
            expire = datetime.now(timezone.utc) + expires_delta
        else:
            expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        
        to_encode.update({"exp": expire, "type": "access"})
        encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
        return encoded_jwt
    
    @staticmethod
    def create_refresh_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
        """Create a JWT refresh token."""
        to_encode = data.copy()
        if expires_delta:
            expire = datetime.now(timezone.utc) + expires_delta
        else:
            expire = datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
        
        to_encode.update({"exp": expire, "type": "refresh"})
        encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
        return encoded_jwt
    
    @staticmethod
    def verify_token(token: str) -> Optional[dict]:
        """Verify and decode a JWT token."""
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            return payload
        except JWTError:
            return None
    
    @staticmethod
    def generate_secure_token(length: int = 32) -> str:
        """Generate a cryptographically secure random token."""
        return secrets.token_urlsafe(length)

# Password validation rules
class PasswordValidator:
    MIN_LENGTH = 8
    MAX_LENGTH = 128
    
    @classmethod
    def validate(cls, password: str) -> tuple[bool, list[str]]:
        """Validate password strength and return (is_valid, error_messages)."""
        errors = []
        
        if len(password) < cls.MIN_LENGTH:
            errors.append(f"Password must be at least {cls.MIN_LENGTH} characters long")
        
        if len(password) > cls.MAX_LENGTH:
            errors.append(f"Password must be no more than {cls.MAX_LENGTH} characters long")
        
        if not any(c.islower() for c in password):
            errors.append("Password must contain at least one lowercase letter")
        
        if not any(c.isupper() for c in password):
            errors.append("Password must contain at least one uppercase letter")
        
        if not any(c.isdigit() for c in password):
            errors.append("Password must contain at least one digit")
        
        if not any(c in "!@#$%^&*()_+-=[]{}|;:,.<>?" for c in password):
            errors.append("Password must contain at least one special character")
        
        # Check for common weak patterns
        if password.lower() in ["password", "123456", "qwerty", "admin", "letmein"]:
            errors.append("Password is too common and easily guessable")
        
        return len(errors) == 0, errors

# Rate limiting helpers
class RateLimiter:
    @staticmethod
    def get_client_ip(request) -> str:
        """Extract client IP from request, considering proxy headers."""
        forwarded_for = request.headers.get("X-Forwarded-For")
        if forwarded_for:
            return forwarded_for.split(',')[0].strip()
        
        real_ip = request.headers.get("X-Real-IP")
        if real_ip:
            return real_ip
        
        return request.client.host if request.client else "unknown"