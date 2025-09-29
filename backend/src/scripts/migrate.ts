import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Starting database migration check...');

  try {
    // Test database connection
    console.log('🔌 Testing database connection...');
    await prisma.$connect();
    console.log('✅ Database connection successful');

    // Check if tables exist by trying to count records
    console.log('🔍 Checking database schema...');
    
    try {
      const userCount = await prisma.user.count();
      const couponCount = await prisma.coupon.count();
      const auditLogCount = await prisma.auditLog.count();
      
      console.log('✅ Database schema is up to date');
      console.log('\n📊 Current data:');
      console.log(`   Users: ${userCount}`);
      console.log(`   Coupons: ${couponCount}`);
      console.log(`   Audit Logs: ${auditLogCount}`);
      
    } catch (error) {
      console.log('⚠️  Database schema needs to be created or updated');
      console.log('   Run: npm run db:push or npm run db:migrate');
      throw error;
    }

  } catch (error) {
    console.error('❌ Database migration check failed:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error('❌ Migration check failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });