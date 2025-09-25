from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_, and_, func, desc
from typing import Optional, List
from datetime import datetime, timezone
import json

from models.database import get_db, Coupon, User, CouponUse
from schemas.coupon import (
    CouponCreate, CouponUpdate, CouponResponse, CouponSearchFilter, 
    PaginatedCouponsResponse, CouponUseCreate, CouponUseResponse,
    CouponStatus, DiscountType
)
from api.auth import get_current_user

router = APIRouter(prefix="/coupons", tags=["coupons"])

class CouponService:
    def __init__(self, db: Session):
        self.db = db

    def create_coupon(self, coupon_data: CouponCreate, user_id: int) -> Coupon:
        # Check if coupon code already exists for this user
        existing_coupon = self.db.query(Coupon).filter(
            Coupon.code == coupon_data.code,
            Coupon.created_by == user_id
        ).first()
        
        if existing_coupon:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Coupon code already exists"
            )
        
        # Create coupon
        db_coupon = Coupon(
            **coupon_data.dict(exclude={'tags'}),
            created_by=user_id,
            tags=json.dumps(coupon_data.tags) if coupon_data.tags else None
        )
        
        self.db.add(db_coupon)
        self.db.commit()
        self.db.refresh(db_coupon)
        
        return db_coupon

    def get_coupon(self, coupon_id: int, user_id: int) -> Optional[Coupon]:
        return self.db.query(Coupon).filter(
            Coupon.id == coupon_id,
            Coupon.created_by == user_id
        ).first()

    def update_coupon(self, coupon_id: int, coupon_data: CouponUpdate, user_id: int) -> Optional[Coupon]:
        db_coupon = self.get_coupon(coupon_id, user_id)
        if not db_coupon:
            return None
        
        # Update fields
        update_data = coupon_data.dict(exclude_unset=True, exclude={'tags'})
        for field, value in update_data.items():
            setattr(db_coupon, field, value)
        
        # Handle tags separately
        if coupon_data.tags is not None:
            db_coupon.tags = json.dumps(coupon_data.tags) if coupon_data.tags else None
        
        db_coupon.updated_at = datetime.now(timezone.utc)
        self.db.commit()
        self.db.refresh(db_coupon)
        
        return db_coupon

    def delete_coupon(self, coupon_id: int, user_id: int) -> bool:
        db_coupon = self.get_coupon(coupon_id, user_id)
        if not db_coupon:
            return False
        
        self.db.delete(db_coupon)
        self.db.commit()
        return True

    def search_coupons(
        self, 
        user_id: int, 
        filters: CouponSearchFilter, 
        page: int = 1, 
        per_page: int = 20
    ) -> tuple[List[Coupon], int]:
        query = self.db.query(Coupon).filter(Coupon.created_by == user_id)
        
        # Apply filters
        if filters.search:
            search_term = f"%{filters.search}%"
            query = query.filter(
                or_(
                    Coupon.title.ilike(search_term),
                    Coupon.description.ilike(search_term),
                    Coupon.code.ilike(search_term),
                    Coupon.store_name.ilike(search_term)
                )
            )
        
        if filters.status:
            query = query.filter(Coupon.status == filters.status)
        
        if filters.category:
            query = query.filter(Coupon.category.ilike(f"%{filters.category}%"))
        
        if filters.store_name:
            query = query.filter(Coupon.store_name.ilike(f"%{filters.store_name}%"))
        
        if filters.discount_type:
            query = query.filter(Coupon.discount_type == filters.discount_type)
        
        if filters.expires_before:
            query = query.filter(Coupon.expiration_date <= filters.expires_before)
        
        if filters.expires_after:
            query = query.filter(Coupon.expiration_date >= filters.expires_after)
        
        if filters.min_discount:
            query = query.filter(Coupon.discount_value >= filters.min_discount)
        
        if filters.max_discount:
            query = query.filter(Coupon.discount_value <= filters.max_discount)
        
        if filters.unused_only:
            query = query.filter(Coupon.usage_count == 0)
        
        if filters.tags:
            for tag in filters.tags:
                query = query.filter(Coupon.tags.contains(f'"{tag}"'))
        
        # Get total count
        total = query.count()
        
        # Apply pagination
        offset = (page - 1) * per_page
        coupons = query.order_by(desc(Coupon.updated_at)).offset(offset).limit(per_page).all()
        
        return coupons, total

    def use_coupon(self, coupon_id: int, use_data: CouponUseCreate, user_id: int) -> CouponUse:
        # Get coupon
        coupon = self.db.query(Coupon).filter(Coupon.id == coupon_id).first()
        if not coupon:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Coupon not found"
            )
        
        # Check if coupon can be used
        if coupon.status != CouponStatus.ACTIVE:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Coupon is not active"
            )
        
        # Check expiration
        if coupon.expiration_date and coupon.expiration_date < datetime.now(timezone.utc):
            coupon.status = CouponStatus.EXPIRED
            self.db.commit()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Coupon has expired"
            )
        
        # Check start date
        if coupon.start_date and coupon.start_date > datetime.now(timezone.utc):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Coupon is not yet valid"
            )
        
        # Check overall usage limit
        if coupon.usage_limit and coupon.usage_count >= coupon.usage_limit:
            coupon.status = CouponStatus.USED_UP
            self.db.commit()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Coupon usage limit reached"
            )
        
        # Check per-user usage limit
        if coupon.per_user_limit:
            user_usage_count = self.db.query(CouponUse).filter(
                CouponUse.coupon_id == coupon_id,
                CouponUse.user_id == user_id
            ).count()
            
            if user_usage_count >= coupon.per_user_limit:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Per-user usage limit reached for this coupon"
                )
        
        # Calculate savings
        amount_saved = None
        if use_data.purchase_amount:
            if coupon.minimum_purchase and use_data.purchase_amount < coupon.minimum_purchase:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Minimum purchase amount is ${coupon.minimum_purchase}"
                )
            
            if coupon.discount_type == DiscountType.AMOUNT:
                amount_saved = min(coupon.discount_value, use_data.purchase_amount)
                if coupon.maximum_discount:
                    amount_saved = min(amount_saved, coupon.maximum_discount)
            else:  # PERCENT
                amount_saved = use_data.purchase_amount * (coupon.discount_value / 100)
                if coupon.maximum_discount:
                    amount_saved = min(amount_saved, coupon.maximum_discount)
        
        # Create usage record
        coupon_use = CouponUse(
            coupon_id=coupon_id,
            user_id=user_id,
            purchase_amount=use_data.purchase_amount,
            amount_saved=amount_saved,
            notes=use_data.notes
        )
        
        # Update coupon usage count
        coupon.usage_count += 1
        
        # Check if coupon is now used up
        if coupon.usage_limit and coupon.usage_count >= coupon.usage_limit:
            coupon.status = CouponStatus.USED_UP
        
        self.db.add(coupon_use)
        self.db.commit()
        self.db.refresh(coupon_use)
        
        return coupon_use

    def get_coupon_uses(self, coupon_id: int, user_id: int) -> List[CouponUse]:
        # Verify user owns the coupon
        coupon = self.get_coupon(coupon_id, user_id)
        if not coupon:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Coupon not found"
            )
        
        return self.db.query(CouponUse).filter(CouponUse.coupon_id == coupon_id).all()

def _enhance_coupon_response(coupon: Coupon, user_id: int, db: Session) -> CouponResponse:
    """Enhance coupon data with calculated fields"""
    # Parse tags
    tags = json.loads(coupon.tags) if coupon.tags else []
    
    # Calculate remaining uses
    remaining_uses = None
    if coupon.usage_limit:
        remaining_uses = max(0, coupon.usage_limit - coupon.usage_count)
    
    # Check if user can use this coupon
    can_use = True
    if coupon.status != CouponStatus.ACTIVE:
        can_use = False
    elif coupon.expiration_date and coupon.expiration_date < datetime.now(timezone.utc):
        can_use = False
    elif coupon.start_date and coupon.start_date > datetime.now(timezone.utc):
        can_use = False
    elif remaining_uses == 0:
        can_use = False
    elif coupon.per_user_limit:
        user_usage = db.query(CouponUse).filter(
            CouponUse.coupon_id == coupon.id,
            CouponUse.user_id == user_id
        ).count()
        if user_usage >= coupon.per_user_limit:
            can_use = False
    
    return CouponResponse(
        **coupon.__dict__,
        tags=tags,
        can_use=can_use,
        remaining_uses=remaining_uses
    )

# Routes
@router.post("/", response_model=CouponResponse, status_code=status.HTTP_201_CREATED)
async def create_coupon(
    coupon_data: CouponCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    service = CouponService(db)
    coupon = service.create_coupon(coupon_data, current_user.id)
    return _enhance_coupon_response(coupon, current_user.id, db)

@router.get("/", response_model=PaginatedCouponsResponse)
async def get_coupons(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    search: Optional[str] = Query(None),
    status: Optional[CouponStatus] = Query(None),
    category: Optional[str] = Query(None),
    store_name: Optional[str] = Query(None),
    discount_type: Optional[DiscountType] = Query(None),
    expires_before: Optional[datetime] = Query(None),
    expires_after: Optional[datetime] = Query(None),
    min_discount: Optional[float] = Query(None),
    max_discount: Optional[float] = Query(None),
    unused_only: Optional[bool] = Query(None),
    tags: Optional[List[str]] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    filters = CouponSearchFilter(
        search=search,
        status=status,
        category=category,
        store_name=store_name,
        discount_type=discount_type,
        expires_before=expires_before,
        expires_after=expires_after,
        min_discount=min_discount,
        max_discount=max_discount,
        unused_only=unused_only,
        tags=tags or []
    )
    
    service = CouponService(db)
    coupons, total = service.search_coupons(current_user.id, filters, page, per_page)
    
    enhanced_coupons = [_enhance_coupon_response(c, current_user.id, db) for c in coupons]
    
    return PaginatedCouponsResponse(
        coupons=enhanced_coupons,
        total=total,
        page=page,
        per_page=per_page,
        total_pages=(total + per_page - 1) // per_page
    )

@router.get("/{coupon_id}", response_model=CouponResponse)
async def get_coupon(
    coupon_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    service = CouponService(db)
    coupon = service.get_coupon(coupon_id, current_user.id)
    
    if not coupon:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Coupon not found"
        )
    
    return _enhance_coupon_response(coupon, current_user.id, db)

@router.put("/{coupon_id}", response_model=CouponResponse)
async def update_coupon(
    coupon_id: int,
    coupon_data: CouponUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    service = CouponService(db)
    coupon = service.update_coupon(coupon_id, coupon_data, current_user.id)
    
    if not coupon:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Coupon not found"
        )
    
    return _enhance_coupon_response(coupon, current_user.id, db)

@router.delete("/{coupon_id}")
async def delete_coupon(
    coupon_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    service = CouponService(db)
    deleted = service.delete_coupon(coupon_id, current_user.id)
    
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Coupon not found"
        )
    
    return {"message": "Coupon deleted successfully"}

@router.post("/{coupon_id}/use", response_model=CouponUseResponse)
async def use_coupon(
    coupon_id: int,
    use_data: CouponUseCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    service = CouponService(db)
    coupon_use = service.use_coupon(coupon_id, use_data, current_user.id)
    return coupon_use

@router.get("/{coupon_id}/uses", response_model=List[CouponUseResponse])
async def get_coupon_uses(
    coupon_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    service = CouponService(db)
    return service.get_coupon_uses(coupon_id, current_user.id)