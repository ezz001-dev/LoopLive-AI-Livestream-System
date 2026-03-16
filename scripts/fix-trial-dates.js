const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Fixing trial subscription dates...');
  
  const subs = await prisma.subscriptions.findMany({
    where: {
      plan_code: 'free_trial',
      current_period_end: null
    }
  });

  console.log(`🔍 Found ${subs.length} free trial subscriptions with missing dates.`);

  for (const sub of subs) {
    // If trial_ends_at is missing, set to 14 days from creation
    let endDate = sub.trial_ends_at;
    if (!endDate) {
      endDate = new Date(sub.created_at);
      endDate.setDate(endDate.getDate() + 14);
    }

    await prisma.subscriptions.update({
      where: { id: sub.id },
      data: {
        trial_ends_at: endDate,
        current_period_end: endDate
      }
    });
    console.log(`✅ Updated subscription ${sub.id}`);
  }
  
  console.log('🚀 All subscription dates fixed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
