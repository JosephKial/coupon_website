#!/usr/bin/env python3
"""
Seed data script for the Family Coupon Manager
Creates sample users and coupons for testing and demonstration
"""

import sys
import os
from datetime import datetime, timedelta, timezone
from decimal import Decimal
import json

# Add the parent directory to the path to import our modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models.database import SessionLocal, User, Coupon
from core.security import SecurityManager

def create_sample_users():
    """Create sample family users"""
    db = SessionLocal()
    
    try:
        # Check if users already exist
        existing_users = db.query(User).count()
        if existing_users > 0:
            print("Users already exist, skipping user creation...")
            return
        
        security_manager = SecurityManager()
        
        users_data = [
            {
                "email": "admin@family.com",
                "username": "admin",
                "full_name": "Family Admin",
                "password": "SecurePassword123!",
                "is_admin": True
            },
            {
                "email": "parent1@family.com", 
                "username": "parent1",
                "full_name": "Parent One",
                "password": "SecurePassword123!",
                "is_admin": False
            },
            {
                "email": "parent2@family.com",
                "username": "parent2", 
                "full_name": "Parent Two",
                "password": "SecurePassword123!",
                "is_admin": False
            },
            {
                "email": "teen@family.com",
                "username": "teenager",
                "full_name": "Teen Family Member", 
                "password": "SecurePassword123!",
                "is_admin": False
            }
        ]
        
        created_users = []
        
        for user_data in users_data:
            hashed_password = security_manager.hash_password(user_data["password"])
            
            db_user = User(
                email=user_data["email"],
                username=user_data["username"],
                full_name=user_data["full_name"],
                password_hash=hashed_password,
                is_active=True,
                is_admin=user_data["is_admin"]
            )
            
            db.add(db_user)
            created_users.append(db_user)
        
        db.commit()
        
        print(f"✅ Created {len(created_users)} sample users")
        for user in created_users:
            print(f"   - {user.username} ({user.email})")
        
        return created_users
        
    except Exception as e:
        print(f"❌ Error creating users: {str(e)}")
        db.rollback()
        return []
    finally:
        db.close()

def create_sample_coupons():
    """Create sample coupons for testing"""
    db = SessionLocal()
    
    try:
        # Check if coupons already exist
        existing_coupons = db.query(Coupon).count()
        if existing_coupons > 0:
            print("Coupons already exist, skipping coupon creation...")
            return
        
        # Get users to assign coupons to
        users = db.query(User).all()
        if not users:
            print("❌ No users found, please create users first")
            return
        
        # Sample coupon data
        now = datetime.now(timezone.utc)
        
        sample_coupons = [
            # Grocery coupons
            {
                "code": "SAVE20GROCERY",
                "title": "$20 off Whole Foods",
                "description": "Save $20 on grocery shopping at Whole Foods with minimum $100 purchase",
                "discount_type": "amount",
                "discount_value": Decimal("20.00"),
                "minimum_purchase": Decimal("100.00"),
                "usage_limit": 5,
                "per_user_limit": 1,
                "expiration_date": now + timedelta(days=30),
                "store_name": "Whole Foods",
                "category": "Grocery",
                "tags": json.dumps(["grocery", "healthy", "organic"]),
                "status": "active"
            },
            {
                "code": "GROCERIES15",
                "title": "15% off Kroger",
                "description": "Get 15% off your total purchase at Kroger",
                "discount_type": "percent",
                "discount_value": Decimal("15.00"),
                "maximum_discount": Decimal("50.00"),
                "usage_limit": None,  # Unlimited
                "per_user_limit": 3,
                "expiration_date": now + timedelta(days=45),
                "store_name": "Kroger",
                "category": "Grocery",
                "tags": json.dumps(["grocery", "savings"]),
                "status": "active"
            },
            
            # Restaurant coupons
            {
                "code": "PIZZA25OFF",
                "title": "$25 off Pizza Night",
                "description": "Save $25 on orders over $50 at Papa John's",
                "discount_type": "amount",
                "discount_value": Decimal("25.00"),
                "minimum_purchase": Decimal("50.00"),
                "usage_limit": 10,
                "per_user_limit": 2,
                "expiration_date": now + timedelta(days=21),
                "store_name": "Papa John's",
                "category": "Restaurant",
                "tags": json.dumps(["pizza", "dinner", "family"]),
                "status": "active"
            },
            {
                "code": "COFFEE20",
                "title": "20% off Starbucks",
                "description": "Enjoy 20% off your coffee and pastries at Starbucks",
                "discount_type": "percent",
                "discount_value": Decimal("20.00"),
                "maximum_discount": Decimal("15.00"),
                "usage_limit": None,
                "per_user_limit": 1,
                "expiration_date": now + timedelta(days=14),
                "store_name": "Starbucks",
                "category": "Restaurant",
                "tags": json.dumps(["coffee", "breakfast", "drinks"]),
                "status": "active"
            },
            
            # Clothing coupons
            {
                "code": "FASHION30",
                "title": "30% off Target Clothing",
                "description": "Save 30% on all clothing items at Target",
                "discount_type": "percent",
                "discount_value": Decimal("30.00"),
                "usage_limit": 100,
                "per_user_limit": 5,
                "start_date": now,
                "expiration_date": now + timedelta(days=60),
                "store_name": "Target",
                "category": "Clothing",
                "tags": json.dumps(["fashion", "clothing", "sale"]),
                "status": "active"
            },
            
            # Electronics coupons
            {
                "code": "TECH50OFF",
                "title": "$50 off Electronics",
                "description": "Get $50 off electronics purchases over $200 at Best Buy",
                "discount_type": "amount",
                "discount_value": Decimal("50.00"),
                "minimum_purchase": Decimal("200.00"),
                "usage_limit": 5,
                "per_user_limit": 1,
                "expiration_date": now + timedelta(days=90),
                "store_name": "Best Buy",
                "category": "Electronics",
                "tags": json.dumps(["electronics", "tech", "gadgets"]),
                "status": "active"
            },
            
            # Expired coupon for testing
            {
                "code": "EXPIRED10",
                "title": "$10 off (Expired)",
                "description": "This coupon has already expired - for testing purposes",
                "discount_type": "amount",
                "discount_value": Decimal("10.00"),
                "usage_limit": 1,
                "expiration_date": now - timedelta(days=5),  # Expired 5 days ago
                "store_name": "Test Store",
                "category": "Test",
                "tags": json.dumps(["expired", "test"]),
                "status": "expired"
            },
            
            # Nearly expired coupon
            {
                "code": "URGENT5",
                "title": "$5 off - Expires Soon!",
                "description": "Urgent: Use this coupon soon, expires in 2 days",
                "discount_type": "amount",
                "discount_value": Decimal("5.00"),
                "minimum_purchase": Decimal("25.00"),
                "usage_limit": 1,
                "expiration_date": now + timedelta(days=2),
                "store_name": "Quick Shop",
                "category": "Miscellaneous",
                "tags": json.dumps(["urgent", "expiring"]),
                "status": "active"
            },
            
            # High-value coupon
            {
                "code": "VIP100",
                "title": "$100 off Premium Purchase",
                "description": "Exclusive VIP coupon: $100 off purchases over $500",
                "discount_type": "amount",
                "discount_value": Decimal("100.00"),
                "minimum_purchase": Decimal("500.00"),
                "usage_limit": 1,
                "per_user_limit": 1,
                "expiration_date": now + timedelta(days=120),
                "store_name": "Premium Store",
                "category": "Luxury",
                "tags": json.dumps(["vip", "premium", "high-value"]),
                "status": "active"
            }
        ]
        
        created_coupons = []
        
        # Distribute coupons among users
        for i, coupon_data in enumerate(sample_coupons):
            # Assign to different users in round-robin fashion
            user = users[i % len(users)]
            
            db_coupon = Coupon(
                **coupon_data,
                created_by=user.id
            )
            
            db.add(db_coupon)
            created_coupons.append(db_coupon)
        
        db.commit()
        
        print(f"✅ Created {len(created_coupons)} sample coupons")
        
        # Print summary by category
        categories = {}
        for coupon in created_coupons:
            cat = coupon.category
            if cat not in categories:
                categories[cat] = []
            categories[cat].append(coupon)
        
        for category, coupons in categories.items():
            print(f"   📁 {category}: {len(coupons)} coupons")
        
        return created_coupons
        
    except Exception as e:
        print(f"❌ Error creating coupons: {str(e)}")
        db.rollback()
        return []
    finally:
        db.close()

def main():
    """Main function to run the seed script"""
    print("🌱 Starting seed data creation...")
    print("="*50)
    
    # Create sample users
    print("\n👥 Creating sample users...")
    users = create_sample_users()
    
    if users:
        # Create sample coupons
        print("\n🎫 Creating sample coupons...")
        coupons = create_sample_coupons()
        
        print("\n" + "="*50)
        print("✅ Seed data creation completed successfully!")
        print("\n📋 Summary:")
        print(f"   - Users created: {len(users)}")
        print(f"   - Coupons created: {len(coupons) if coupons else 0}")
        
        if users:
            print("\n🔑 Login credentials (all users have the same password):")
            print("   Password: SecurePassword123!")
            print("   Users:")
            for user in users:
                print(f"     - {user.username}: {user.email}")
        
        print("\n🚀 Your Family Coupon Manager is now ready with sample data!")
        
    else:
        print("❌ Failed to create seed data")
        sys.exit(1)

if __name__ == "__main__":
    main()