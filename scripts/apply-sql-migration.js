require("dotenv").config();

const fs = require("fs");
const path = require("path");
const { Client } = require("pg");

async function main() {
  const migrationPathArg = process.argv[2];

  if (!migrationPathArg) {
    throw new Error("Path migration.sql wajib diberikan. Contoh: node scripts/apply-sql-migration.js prisma/migrations/xxx/migration.sql");
  }

  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL tidak ditemukan di environment.");
  }

  const migrationPath = path.resolve(process.cwd(), migrationPathArg);
  if (!fs.existsSync(migrationPath)) {
    throw new Error(`File migration tidak ditemukan: ${migrationPath}`);
  }

  const sql = await fs.promises.readFile(migrationPath, "utf8");
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  await client.connect();

  try {
    await client.query("BEGIN");
    await client.query(sql);
    await client.query("COMMIT");
    console.log(`[SQL Migration] Applied successfully: ${migrationPathArg}`);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error("[SQL Migration] Failed:", error.message);
  process.exit(1);
});
