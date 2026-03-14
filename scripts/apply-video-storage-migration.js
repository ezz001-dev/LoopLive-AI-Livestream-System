const fs = require("fs");
const path = require("path");
const { Client } = require("pg");

async function main() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not set");
  }

  const sqlPath = path.join(
    process.cwd(),
    "prisma",
    "migrations",
    "20260313_add_video_storage_fields",
    "migration.sql"
  );

  const sql = fs.readFileSync(sqlPath, "utf8");
  const client = new Client({ connectionString: databaseUrl });

  await client.connect();

  try {
    await client.query(sql);
    console.log("[DB] Video storage migration applied successfully.");
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error("[DB] Migration failed:", error.message);
  process.exit(1);
});
