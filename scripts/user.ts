import dotenv from "dotenv";
import path from "path";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { createClient } from "@supabase/supabase-js";
import * as schema from "../src/db/schema";
import { eq } from "drizzle-orm";

const { users } = schema;

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const EMAIL    = "demo@speakly.app";
const PASSWORD = "Speakly123!";
const NAME     = "Demo User";

async function main() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const dbUrl       = process.env.DATABASE_URL;

  if (!supabaseUrl || !serviceKey || !dbUrl) {
    console.error("❌ Missing env vars: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, or DATABASE_URL");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const client = postgres(dbUrl, { ssl: "require", max: 1 });
  const db = drizzle(client, { schema });

  console.log("🔗 Connected to database\n");

  // ── 1. Create Supabase Auth user ─────────────────────────────────────────
  console.log(`📧 Creating auth user: ${EMAIL}`);

  const { data: existing } = await supabase.auth.admin.listUsers();
  const existingUser = existing?.users?.find((u) => u.email === EMAIL);

  let authId: string;

  if (existingUser) {
    console.log("⏭️  Auth user already exists, reusing");
    authId = existingUser.id;

    // Reset password in case it changed
    await supabase.auth.admin.updateUserById(authId, { password: PASSWORD });
  } else {
    const { data, error } = await supabase.auth.admin.createUser({
      email: EMAIL,
      password: PASSWORD,
      email_confirm: true,
      user_metadata: { display_name: NAME },
    });

    if (error) {
      console.error("❌ Failed to create auth user:", error.message);
      process.exit(1);
    }

    authId = data.user.id;
    console.log("✅ Auth user created:", authId);
  }

  // ── 2. Create user profile in DB ─────────────────────────────────────────
  console.log(`\n👤 Creating user profile in DB`);

  const existingProfile = await db.query.users.findFirst({
    where: eq(users.authId, authId),
  });

  if (existingProfile) {
    console.log("⏭️  Profile already exists");
  } else {
    await db.insert(users).values({
      authId,
      email:            EMAIL,
      displayName:      NAME,
      cefrLevel:        "B1",
      goal:             "general",
      accentPreference: "american",
      xpTotal:          120,
      streakDays:       3,
    });
    console.log("✅ Profile created");
  }

  // ── Done ──────────────────────────────────────────────────────────────────
  console.log("\n" + "─".repeat(40));
  console.log("✅ Seed user ready!\n");
  console.log("  URL      : http://localhost:3099");
  console.log(`  Email    : ${EMAIL}`);
  console.log(`  Password : ${PASSWORD}`);
  console.log("─".repeat(40));

  await client.end();
}

main();
