import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🗑️  Starting database reset...');

  if (process.env.NODE_ENV === 'production') {
    console.error('❌ Database reset is not allowed in production environment!');
    process.exit(1);
  }

  try {
    // Delete all data in the correct order (respecting foreign key constraints)
    console.log('🧹 Deleting audit logs...');
    const deletedAuditLogs = await prisma.auditLog.deleteMany();
    console.log(`   Deleted ${deletedAuditLogs.count} audit log entries`);

    console.log('🧹 Deleting coupons...');
    const deletedCoupons = await prisma.coupon.deleteMany();
    console.log(`   Deleted ${deletedCoupons.count} coupons`);

    console.log('🧹 Deleting users...');
    const deletedUsers = await prisma.user.deleteMany();
    console.log(`   Deleted ${deletedUsers.count} users`);

    console.log('\n✅ Database reset completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   Users deleted: ${deletedUsers.count}`);
    console.log(`   Coupons deleted: ${deletedCoupons.count}`);
    console.log(`   Audit logs deleted: ${deletedAuditLogs.count}`);

  } catch (error) {
    console.error('❌ Error during database reset:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error('❌ Database reset failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });