require("dotenv").config();

const crypto = require("crypto");
const { Client } = require("pg");

const DEFAULT_TENANT_NAME = process.env.SAAS_DEFAULT_TENANT_NAME || "Default Workspace";
const DEFAULT_TENANT_SLUG = process.env.SAAS_DEFAULT_TENANT_SLUG || "default-workspace";

async function ensureTenantColumnsExist(client) {
  const requiredColumns = [
    { table: "videos", column: "tenant_id" },
    { table: "live_sessions", column: "tenant_id" },
    { table: "sound_events", column: "tenant_id" },
  ];

  for (const item of requiredColumns) {
    const result = await client.query(
      `
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = $1
        AND column_name = $2
      LIMIT 1
      `,
      [item.table, item.column]
    );

    if (result.rowCount === 0) {
      throw new Error(
        `Kolom ${item.table}.${item.column} belum ada. Jalankan migration schema foundation lebih dulu.`
      );
    }
  }
}

async function findOrCreateDefaultTenant(client) {
  const existing = await client.query(
    `SELECT id, name, slug FROM "tenants" WHERE slug = $1 LIMIT 1`,
    [DEFAULT_TENANT_SLUG]
  );

  if (existing.rows[0]) {
    return existing.rows[0];
  }

  const id = crypto.randomUUID();
  const inserted = await client.query(
    `
    INSERT INTO "tenants" ("id", "name", "slug", "status", "created_at", "updated_at")
    VALUES ($1, $2, $3, 'active', NOW(), NOW())
    RETURNING id, name, slug
    `,
    [id, DEFAULT_TENANT_NAME, DEFAULT_TENANT_SLUG]
  );

  return inserted.rows[0];
}

async function backfillTable(client, tableName, tenantId) {
  const result = await client.query(
    `UPDATE "${tableName}" SET "tenant_id" = $1 WHERE "tenant_id" IS NULL`,
    [tenantId]
  );

  return result.rowCount || 0;
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL tidak ditemukan di environment.");
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  await client.connect();

  try {
    await client.query("BEGIN");
    await ensureTenantColumnsExist(client);

    const tenant = await findOrCreateDefaultTenant(client);

    const videosUpdated = await backfillTable(client, "videos", tenant.id);
    const sessionsUpdated = await backfillTable(client, "live_sessions", tenant.id);
    const soundsUpdated = await backfillTable(client, "sound_events", tenant.id);

    await client.query("COMMIT");

    console.log("[SaaS Backfill] Default tenant ready:");
    console.log(`- id: ${tenant.id}`);
    console.log(`- name: ${tenant.name}`);
    console.log(`- slug: ${tenant.slug}`);
    console.log("[SaaS Backfill] Updated rows:");
    console.log(`- videos: ${videosUpdated}`);
    console.log(`- live_sessions: ${sessionsUpdated}`);
    console.log(`- sound_events: ${soundsUpdated}`);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error("[SaaS Backfill] Failed:", error.message);
  process.exit(1);
});
