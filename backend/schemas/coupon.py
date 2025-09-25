from pydantic import BaseModel, Field, validator
from typing import Optional, List
from datetime import datetime
from decimal import Decimal
from enum import Enum

class DiscountType(str, Enum):
    AMOUNT = "amount"
    PERCENT = "percent"

class CouponStatus(str, Enum):
    ACTIVE = "active"
    EXPIRED = "expired"
    DISABLED = "disabled"
    USED_UP = "used_up"

class CouponBase(BaseModel):
    code: str = Field(..., min_length=1, max_length=100)
    title: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=1000)
    discount_type: DiscountType
    discount_value: Decimal = Field(..., gt=0, decimal_places=2)
    minimum_purchase: Optional[Decimal] = Field(None, ge=0, decimal_places=2)
    maximum_discount: Optional[Decimal] = Field(None, gt=0, decimal_places=2)
    usage_limit: Optional[int] = Field(None, gt=0)
    per_user_limit: Optional[int] = Field(None, gt=0)
    start_date: Optional[datetime] = None
    expiration_date: Optional[datetime] = None
    store_name: Optional[str] = Field(None, max_length=200)
    category: Optional[str] = Field(None, max_length=100)
    tags: Optional[List[str]] = []

    @validator('discount_value')
    def validate_discount_value(cls, v, values):
        if 'discount_type' in values:
            if values['discount_type'] == DiscountType.PERCENT and v > 100:
                raise ValueError('Percentage discount cannot exceed 100%')
        return v

    @validator('expiration_date')
    def validate_expiration_date(cls, v, values):
        if v and 'start_date' in values and values['start_date']:
            if v <= values['start_date']:
                raise ValueError('Expiration date must be after start date')
        return v

    @validator('maximum_discount')
    def validate_maximum_discount(cls, v, values):
        if v and 'discount_type' in values and values['discount_type'] == DiscountType.AMOUNT:
            if 'discount_value' in values and v < values['discount_value']:
                raise ValueError('Maximum discount cannot be less than discount value for amount discounts')
        return v

class CouponCreate(CouponBase):
    pass

class CouponUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=1000)
    discount_type: Optional[DiscountType] = None
    discount_value: Optional[Decimal] = Field(None, gt=0, decimal_places=2)
    minimum_purchase: Optional[Decimal] = Field(None, ge=0, decimal_places=2)
    maximum_discount: Optional[Decimal] = Field(None, gt=0, decimal_places=2)
    usage_limit: Optional[int] = Field(None, gt=0)
    per_user_limit: Optional[int] = Field(None, gt=0)
    start_date: Optional[datetime] = None
    expiration_date: Optional[datetime] = None
    status: Optional[CouponStatus] = None
    store_name: Optional[str] = Field(None, max_length=200)
    category: Optional[str] = Field(None, max_length=100)
    tags: Optional[List[str]] = None

class CouponInDB(CouponBase):
    id: int
    usage_count: int
    status: CouponStatus
    created_at: datetime
    updated_at: datetime
    created_by: int

    class Config:
        from_attributes = True

class CouponResponse(CouponBase):
    id: int
    usage_count: int
    status: CouponStatus
    created_at: datetime
    updated_at: datetime
    created_by: int
    can_use: bool = True
    remaining_uses: Optional[int] = None

    class Config:
        from_attributes = True

class CouponUseBase(BaseModel):
    purchase_amount: Optional[Decimal] = Field(None, gt=0, decimal_places=2)
    notes: Optional[str] = Field(None, max_length=500)

class CouponUseCreate(CouponUseBase):
    coupon_id: int

class CouponUseResponse(CouponUseBase):
    id: int
    coupon_id: int
    user_id: int
    used_at: datetime
    amount_saved: Optional[Decimal]

    class Config:
        from_attributes = True

class CouponSearchFilter(BaseModel):
    search: Optional[str] = None
    status: Optional[CouponStatus] = None
    category: Optional[str] = None
    store_name: Optional[str] = None
    discount_type: Optional[DiscountType] = None
    expires_before: Optional[datetime] = None
    expires_after: Optional[datetime] = None
    min_discount: Optional[Decimal] = None
    max_discount: Optional[Decimal] = None
    created_by_me: Optional[bool] = None
    unused_only: Optional[bool] = None
    tags: Optional[List[str]] = []

class PaginatedCouponsResponse(BaseModel):
    coupons: List[CouponResponse]
    total: int
    page: int
    per_page: int
    total_pages: int