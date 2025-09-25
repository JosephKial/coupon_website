
from sqlalchemy import create_engine, Column, Integer, String, DateTime, Boolean, Decimal, Text, ForeignKey, Index
from sqlalchemy.orm import sessionmaker, relationship, declarative_base
from sqlalchemy.sql import func
import os

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://coupon_user:secure_password@localhost:5432/coupon_db")

engine = create_engine(DATABASE_URL, pool_pre_ping=True, pool_recycle=300)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    username = Column(String(100), unique=True, index=True, nullable=False)
    full_name = Column(String(200), nullable=False)
    password_hash = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True)
    is_admin = Column(Boolean, default=False)
    created_at = Column(DateTime, default=func.now())
    last_login = Column(DateTime, nullable=True)
    
    # Relationships
    coupons = relationship("Coupon", back_populates="created_by_user")
    coupon_uses = relationship("CouponUse", back_populates="user")

class Coupon(Base):
    __tablename__ = "coupons"
    
    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(100), nullable=False, index=True)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    
    # Discount information
    discount_type = Column(String(20), nullable=False)  # 'amount' or 'percent'
    discount_value = Column(Decimal(10, 2), nullable=False)
    minimum_purchase = Column(Decimal(10, 2), nullable=True)
    maximum_discount = Column(Decimal(10, 2), nullable=True)
    
    # Usage limits
    usage_limit = Column(Integer, nullable=True)  # null = unlimited
    usage_count = Column(Integer, default=0)
    per_user_limit = Column(Integer, nullable=True)  # null = unlimited per user
    
    # Dates
    start_date = Column(DateTime, nullable=True)
    expiration_date = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Status and metadata
    status = Column(String(20), default="active")  # active, expired, disabled, used_up
    store_name = Column(String(200), nullable=True)
    category = Column(String(100), nullable=True)
    tags = Column(Text, nullable=True)  # JSON string of tags
    
    # Foreign keys
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Relationships
    created_by_user = relationship("User", back_populates="coupons")
    uses = relationship("CouponUse", back_populates="coupon", cascade="all, delete-orphan")
    
    # Indexes for performance
    __table_args__ = (
        Index('idx_coupon_status_expiry', 'status', 'expiration_date'),
        Index('idx_coupon_category_store', 'category', 'store_name'),
        Index('idx_coupon_created_by', 'created_by'),
    )

class CouponUse(Base):
    __tablename__ = "coupon_uses"
    
    id = Column(Integer, primary_key=True, index=True)
    coupon_id = Column(Integer, ForeignKey("coupons.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    used_at = Column(DateTime, default=func.now())
    amount_saved = Column(Decimal(10, 2), nullable=True)
    purchase_amount = Column(Decimal(10, 2), nullable=True)
    notes = Column(Text, nullable=True)
    
    # Relationships
    coupon = relationship("Coupon", back_populates="uses")
    user = relationship("User", back_populates="coupon_uses")
    
    # Indexes
    __table_args__ = (
        Index('idx_coupon_use_user_coupon', 'user_id', 'coupon_id'),
        Index('idx_coupon_use_date', 'used_at'),
    )

class RefreshToken(Base):
    __tablename__ = "refresh_tokens"
    
    id = Column(Integer, primary_key=True, index=True)
    token = Column(String(255), unique=True, index=True, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    expires_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=func.now())
    is_revoked = Column(Boolean, default=False)
    
    # Relationships
    user = relationship("User")

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def create_tables():
    Base.metadata.create_all(bind=engine)

if __name__ == "__main__":
    create_tables()