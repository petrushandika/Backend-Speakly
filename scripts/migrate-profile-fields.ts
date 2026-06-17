import dotenv from "dotenv";
import path from "path";
import postgres from "postgres";

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const sql = postgres(process.env.DATABASE_URL!);

async function run() {
  await sql`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "avatar_url" text`;
  await sql`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "bio" text`;
  await sql`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "native_language" text`;
  await sql`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "country" text`;
  console.log("✓ Profile fields migration applied");
  await sql.end();
}

run().catch((e) => { console.error(e); process.exit(1); });
