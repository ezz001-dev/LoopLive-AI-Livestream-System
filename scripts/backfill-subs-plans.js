const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Backfilling subscriptions...');
  
  const result = await prisma.subscriptions.updateMany({
    where: {
      plan_code: null
    },
    data: {
      plan_code: 'free_trial'
    }
  });
  
  console.log(`✅ Backfilled ${result.count} subscriptions.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
