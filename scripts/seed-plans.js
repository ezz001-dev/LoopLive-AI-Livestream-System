const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const plans = [
  {
    code: 'free_trial',
    name: 'Free Trial',
    description: '14-day free trial with limited resources',
    price_idr: 0,
    price_myr: 0,
    max_active_streams: 1,
    max_storage_gb: 2,
    max_ai_responses_day: 10,
    max_scheduled_sessions: 3,
    max_team_members: 1,
    can_use_custom_voices: false
  },
  {
    code: 'creator',
    name: 'Creator',
    description: 'Perfect for individual content creators',
    price_idr: 199000,
    price_myr: 59,
    max_active_streams: 1,
    max_storage_gb: 5,
    max_ai_responses_day: 100,
    max_scheduled_sessions: 5,
    max_team_members: 2,
    can_use_custom_voices: false
  },
  {
    code: 'studio',
    name: 'Studio',
    description: 'For power users and small production teams',
    price_idr: 499000,
    price_myr: 149,
    max_active_streams: 3,
    max_storage_gb: 20,
    max_ai_responses_day: 1000,
    max_scheduled_sessions: 20,
    max_team_members: 5,
    can_use_custom_voices: true
  },
  {
    code: 'agency',
    name: 'Agency',
    description: 'Scale your content across multiple platforms',
    price_idr: 1499000,
    price_myr: 449,
    max_active_streams: 10,
    max_storage_gb: 100,
    max_ai_responses_day: 10000,
    max_scheduled_sessions: 100,
    max_team_members: 20,
    can_use_custom_voices: true
  }
];

async function main() {
  console.log('🌱 Seeding plans...');
  
  for (const plan of plans) {
    await prisma.plans.upsert({
      where: { code: plan.code },
      update: plan,
      create: plan,
    });
    console.log(`✅ Plan ${plan.name} seeded.`);
  }
  
  console.log('🚀 Seeding completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
