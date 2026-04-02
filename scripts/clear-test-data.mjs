import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { sql } from "drizzle-orm";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

async function main() {
  const connection = await mysql.createConnection(DATABASE_URL);
  const db = drizzle(connection);

  console.log("Clearing all test data...\n");

  // Delete in reverse FK order (children first, parents last)
  // Keep users table intact (admin accounts stay)

  const tables = [
    "whatsapp_messages",
    "whatsapp_conversations", 
    "whatsapp_settings",
    "visit_attachments",
    "payments",
    "google_tokens",
    "appointments",
    "visits",
    "vaccinations",
    "pets",
    "owners",
  ];

  for (const table of tables) {
    const result = await db.execute(sql.raw(`DELETE FROM \`${table}\``));
    console.log(`  ✓ ${table} — cleared`);
  }

  // Reset auto-increment counters
  for (const table of tables) {
    await db.execute(sql.raw(`ALTER TABLE \`${table}\` AUTO_INCREMENT = 1`));
  }

  console.log("\n✅ All test data cleared. Database is ready for production use.");
  await connection.end();
}

main().catch(err => {
  console.error("Error:", err);
  process.exit(1);
});
