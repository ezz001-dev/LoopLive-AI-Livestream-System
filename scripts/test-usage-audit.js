const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  console.log("--- Testing Usage and Audit Logging ---");

  try {
    // 1. Find a tenant
    const tenant = await prisma.tenants.findFirst();
    if (!tenant) {
      console.error("No tenant found. Run backfill first.");
      return;
    }
    console.log(`Using tenant: ${tenant.name} (${tenant.id})`);

    // 2. Test Usage Logging
    console.log("Recording test usage...");
    const usage = await prisma.usage_records.create({
      data: {
        tenant_id: tenant.id,
        metric: "ai_responses",
        quantity: 1,
        period_start: new Date(),
        period_end: new Date(),
        metadata: { test: true }
      }
    });
    console.log("✅ Usage recorded:", usage.id);

    // 3. Test Audit Logging
    console.log("Recording test audit...");
    const audit = await prisma.audit_logs.create({
      data: {
        tenant_id: tenant.id,
        actor_type: "system",
        action: "TEST_ACTION",
        target_type: "testing",
        metadata: { success: true }
      }
    });
    console.log("✅ Audit recorded:", audit.id);

    // 4. Clean up test data (optional, but good for verification)
    const usageCount = await prisma.usage_records.count({ where: { tenant_id: tenant.id } });
    const auditCount = await prisma.audit_logs.count({ where: { tenant_id: tenant.id } });
    console.log(`Total usage records for tenant: ${usageCount}`);
    console.log(`Total audit logs for tenant: ${auditCount}`);

  } catch (err) {
    console.error("❌ Test failed:", err.message);
  } finally {
    await prisma.$disconnect();
  }
}

test();
