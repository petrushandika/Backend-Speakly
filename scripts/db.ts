import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import postgres from "postgres";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("❌ DATABASE_URL is not set");
    process.exit(1);
  }

  console.log("🔗 Connecting to:", new URL(url).hostname);

  const sql = postgres(url, {
    ssl: "require",
    max: 1,
    onnotice: () => {},
  });

  const sqlFile = path.resolve(process.cwd(), "supabase/setup.sql");
  const rawSql = fs.readFileSync(sqlFile, "utf-8");

  // Split on statement-breakpoint markers and semicolons
  const statements = rawSql
    .replace(/--> statement-breakpoint/g, "")
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.startsWith("--"));

  console.log(`🚀 Running ${statements.length} SQL statements...\n`);

  let ok = 0;
  let skip = 0;

  for (const stmt of statements) {
    try {
      await sql.unsafe(stmt);
      ok++;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      // Ignore "already exists" errors
      if (
        msg.includes("already exists") ||
        msg.includes("duplicate") ||
        msg.includes("PGRST")
      ) {
        skip++;
      } else {
        console.error("❌ Failed:", stmt.substring(0, 80));
        console.error("   Error:", msg);
      }
    }
  }

  console.log(`\n✅ Done — ${ok} executed, ${skip} skipped (already exist)`);
  await sql.end();
}

main();
