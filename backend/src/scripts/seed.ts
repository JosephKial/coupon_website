import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';
import { UserRole, DiscountType, CouponStatus } from '../types';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  try {
    // Clear existing data (in development only)
    if (process.env.NODE_ENV === 'development') {
      console.log('🧹 Clearing existing data...');
      await prisma.auditLog.deleteMany();
      await prisma.coupon.deleteMany();
      await prisma.user.deleteMany();
    }

    // Create sample users
    console.log('👥 Creating sample users...');
    
    const adminPassword = await argon2.hash('AdminPass123!');
    const memberPassword = await argon2.hash('MemberPass123!');

    const adminUser = await prisma.user.create({
      data: {
        email: 'admin@family.com',
        passwordHash: adminPassword,
        firstName: 'Admin',
        lastName: 'User',
        role: UserRole.ADMIN,
        isActive: true,
        lastLoginAt: new Date()
      }
    });

    const memberUser1 = await prisma.user.create({
      data: {
        email: 'john@family.com',
        passwordHash: memberPassword,
        firstName: 'John',
        lastName: 'Smith',
        role: UserRole.MEMBER,
        isActive: true,
        lastLoginAt: new Date(Date.now() - 24 * 60 * 60 * 1000) // 1 day ago
      }
    });

    const memberUser2 = await prisma.user.create({
      data: {
        email: 'jane@family.com',
        passwordHash: memberPassword,
        firstName: 'Jane',
        lastName: 'Smith',
        role: UserRole.MEMBER,
        isActive: true,
        lastLoginAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) // 2 days ago
      }
    });

    console.log(`✅ Created ${3} users`);

    // Create sample coupons
    console.log('🎫 Creating sample coupons...');

    const sampleCoupons = [
      {
        code: 'SAVE20',
        description: 'Save 20% on your next grocery purchase',
        discountType: DiscountType.PERCENTAGE,
        faceValue: 20.00,
        expirationDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        usageLimit: 5,
        usageCount: 0,
        status: CouponStatus.ACTIVE,
        tags: ['grocery', 'percentage', 'general'],
        createdBy: adminUser.id
      },
      {
        code: 'PIZZA15',
        description: '$15 off pizza delivery orders over $50',
        discountType: DiscountType.AMOUNT,
        faceValue: 15.00,
        expirationDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
        usageLimit: 3,
        usageCount: 1,
        status: CouponStatus.ACTIVE,
        tags: ['pizza', 'delivery', 'food'],
        createdBy: memberUser1.id
      },
      {
        code: 'COFFEE10',
        description: '10% off coffee shop purchases',
        discountType: DiscountType.PERCENTAGE,
        faceValue: 10.00,
        expirationDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        usageLimit: 10,
        usageCount: 3,
        status: CouponStatus.ACTIVE,
        tags: ['coffee', 'beverage', 'percentage'],
        createdBy: memberUser2.id
      },
      {
        code: 'OLDCODE',
        description: 'Expired coupon for testing',
        discountType: DiscountType.AMOUNT,
        faceValue: 25.00,
        expirationDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
        usageLimit: 1,
        usageCount: 0,
        status: CouponStatus.EXPIRED,
        tags: ['expired', 'test'],
        createdBy: adminUser.id
      },
      {
        code: 'USED50',
        description: 'Used coupon for testing',
        discountType: DiscountType.PERCENTAGE,
        faceValue: 50.00,
        expirationDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days from now
        usageLimit: 1,
        usageCount: 1,
        status: CouponStatus.USED,
        tags: ['used', 'test', 'percentage'],
        createdBy: memberUser1.id
      },
      {
        code: 'DISABLED',
        description: 'Disabled coupon for testing',
        discountType: DiscountType.AMOUNT,
        faceValue: 5.00,
        expirationDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        usageLimit: 100,
        usageCount: 0,
        status: CouponStatus.DISABLED,
        tags: ['disabled', 'test'],
        createdBy: adminUser.id
      },
      {
        code: 'RESTAURANT25',
        description: '$25 off restaurant orders over $100',
        discountType: DiscountType.AMOUNT,
        faceValue: 25.00,
        expirationDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000), // 45 days from now
        usageLimit: 2,
        usageCount: 0,
        status: CouponStatus.ACTIVE,
        tags: ['restaurant', 'dining', 'amount'],
        createdBy: memberUser2.id
      },
      {
        code: 'BOOKS15PCT',
        description: '15% off bookstore purchases',
        discountType: DiscountType.PERCENTAGE,
        faceValue: 15.00,
        expirationDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000), // 21 days from now
        usageLimit: null, // unlimited
        usageCount: 0,
        status: CouponStatus.ACTIVE,
        tags: ['books', 'education', 'percentage'],
        createdBy: adminUser.id
      }
    ];

    const createdCoupons = await Promise.all(
      sampleCoupons.map(coupon => prisma.coupon.create({ data: coupon }))
    );

    console.log(`✅ Created ${createdCoupons.length} coupons`);

    // Create sample audit logs
    console.log('📋 Creating sample audit logs...');

    const sampleAuditLogs = [
      {
        userId: adminUser.id,
        action: 'LOGIN',
        resourceType: 'AUTH',
        details: { loginMethod: 'email' },
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        createdAt: new Date(Date.now() - 60 * 60 * 1000) // 1 hour ago
      },
      {
        userId: adminUser.id,
        action: 'COUPON_CREATE',
        resourceType: 'COUPON',
        resourceId: createdCoupons[0].id,
        details: { couponCode: 'SAVE20' },
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        createdAt: new Date(Date.now() - 50 * 60 * 1000) // 50 minutes ago
      },
      {
        userId: memberUser1.id,
        action: 'LOGIN',
        resourceType: 'AUTH',
        details: { loginMethod: 'email' },
        ipAddress: '192.168.1.101',
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15',
        createdAt: new Date(Date.now() - 30 * 60 * 1000) // 30 minutes ago
      },
      {
        userId: memberUser1.id,
        action: 'COUPON_CREATE',
        resourceType: 'COUPON',
        resourceId: createdCoupons[1].id,
        details: { couponCode: 'PIZZA15' },
        ipAddress: '192.168.1.101',
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15',
        createdAt: new Date(Date.now() - 25 * 60 * 1000) // 25 minutes ago
      },
      {
        userId: memberUser2.id,
        action: 'LOGIN',
        resourceType: 'AUTH',
        details: { loginMethod: 'email' },
        ipAddress: '192.168.1.102',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        createdAt: new Date(Date.now() - 20 * 60 * 1000) // 20 minutes ago
      },
      {
        userId: memberUser2.id,
        action: 'COUPON_SEARCH',
        resourceType: 'COUPON',
        details: { searchTerm: 'coffee' },
        ipAddress: '192.168.1.102',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        createdAt: new Date(Date.now() - 10 * 60 * 1000) // 10 minutes ago
      }
    ];

    const createdAuditLogs = await Promise.all(
      sampleAuditLogs.map(log => prisma.auditLog.create({ data: log }))
    );

    console.log(`✅ Created ${createdAuditLogs.length} audit log entries`);

    // Display summary
    console.log('\n🎉 Database seeding completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   Users: ${3}`);
    console.log(`   Coupons: ${createdCoupons.length}`);
    console.log(`   Audit Logs: ${createdAuditLogs.length}`);
    
    console.log('\n👤 Test Users:');
    console.log('   Admin: admin@family.com / AdminPass123!');
    console.log('   Member 1: john@family.com / MemberPass123!');
    console.log('   Member 2: jane@family.com / MemberPass123!');

    console.log('\n🎫 Sample Coupons:');
    createdCoupons.forEach(coupon => {
      console.log(`   ${coupon.code}: ${coupon.description} (${coupon.status})`);
    });

  } catch (error) {
    console.error('❌ Error during seeding:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });