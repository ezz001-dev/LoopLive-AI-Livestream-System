require("dotenv").config();
const { Client } = require("pg");

const DEFAULT_TENANT_SLUG = process.env.SAAS_DEFAULT_TENANT_SLUG || "default-workspace";

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

    // 1. Find default tenant
    const tenantRes = await client.query(
      `SELECT id FROM "tenants" WHERE slug = $1 LIMIT 1`,
      [DEFAULT_TENANT_SLUG]
    );

    if (tenantRes.rowCount === 0) {
      throw new Error(`Tenant default dengan slug '${DEFAULT_TENANT_SLUG}' tidak ditemukan. Jalankan backfill-default-tenant.js dulu.`);
    }

    const tenantId = tenantRes.rows[0].id;

    // 2. Fetch global settings
    const globalSettingsRes = await client.query(
      `SELECT * FROM "system_settings" WHERE id = '1' LIMIT 1`
    );

    if (globalSettingsRes.rowCount === 0) {
      console.log("[SaaS Backfill Settings] No global settings (id: '1') found. Skipping.");
      await client.query("COMMIT");
      return;
    }

    const globalSettings = globalSettingsRes.rows[0];

    // 3. Migrate to tenant_settings
    console.log(`[SaaS Backfill Settings] Migrating non-sensitive settings for tenant ${tenantId}...`);
    await client.query(
      `
      INSERT INTO "tenant_settings" (
        "id", "tenant_id", "ai_provider", "tts_provider", "yt_channel_handle", 
        "tiktok_channel_handle", "ai_name", "ai_persona", "ai_tone_default", 
        "max_response_length", "updated_at"
      )
      VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
      ON CONFLICT ("tenant_id") DO UPDATE SET
        "ai_provider" = EXCLUDED."ai_provider",
        "tts_provider" = EXCLUDED."tts_provider",
        "yt_channel_handle" = EXCLUDED."yt_channel_handle",
        "tiktok_channel_handle" = EXCLUDED."tiktok_channel_handle",
        "ai_name" = EXCLUDED."ai_name",
        "ai_persona" = EXCLUDED."ai_persona",
        "ai_tone_default" = EXCLUDED."ai_tone_default",
        "max_response_length" = EXCLUDED."max_response_length",
        "updated_at" = NOW()
      `,
      [
        tenantId,
        globalSettings.ai_provider,
        globalSettings.tts_provider,
        globalSettings.yt_channel_handle,
        globalSettings.tiktok_channel_handle,
        globalSettings.ai_name,
        globalSettings.ai_persona,
        globalSettings.ai_tone_default,
        globalSettings.max_response_length,
      ]
    );

    // 4. Migrate to tenant_secrets
    console.log(`[SaaS Backfill Settings] Migrating sensitive keys for tenant ${tenantId}...`);
    const secrets = [
      { key: "openai_api_key", value: globalSettings.openai_api_key },
      { key: "gemini_api_key", value: globalSettings.gemini_api_key },
      { key: "yt_cookie", value: globalSettings.yt_cookie },
    ];

    for (const secret of secrets) {
      if (secret.value) {
        await client.query(
          `
          INSERT INTO "tenant_secrets" ("id", "tenant_id", "key", "encrypted_value", "created_at", "updated_at")
          VALUES (gen_random_uuid(), $1, $2, $3, NOW(), NOW())
          ON CONFLICT ("tenant_id", "key") DO UPDATE SET
            "encrypted_value" = EXCLUDED."encrypted_value",
            "updated_at" = NOW()
          `,
          [tenantId, secret.key, secret.value]
        );
      }
    }

    await client.query("COMMIT");
    console.log("[SaaS Backfill Settings] Successfully migrated global settings to tenant scope.");

  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error("[SaaS Backfill Settings] Failed:", error.message);
  process.exit(1);
});
