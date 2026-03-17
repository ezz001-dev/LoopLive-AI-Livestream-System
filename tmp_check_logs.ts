
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const logs = await prisma.tenant_logs.findMany({
    take: 10,
    orderBy: { created_at: 'desc' },
    include: { tenant: true }
  });

  console.log(JSON.stringify(logs, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
