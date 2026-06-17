import dotenv from "dotenv";
import path from "path";
import postgres from "postgres";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

async function main() {
  const url = process.env.DATABASE_URL!;
  const sql = postgres(url, { ssl: "require", max: 1, onnotice: () => {} });

  console.log("🔗 Connected. Running remaining statements...\n");

  const statements: Array<{ name: string; sql: string }> = [
    {
      name: "CREATE TABLE chat_messages",
      sql: `CREATE TABLE IF NOT EXISTS "chat_messages" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "user_id" uuid NOT NULL,
        "role" text NOT NULL,
        "content" text NOT NULL,
        "has_correction" boolean DEFAULT false NOT NULL,
        "created_at" timestamp DEFAULT now() NOT NULL
      )`,
    },
    {
      name: "FK chat_messages → users",
      sql: `ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_user_id_users_id_fk"
        FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action`,
    },
    {
      name: "INDEX chat_messages",
      sql: `CREATE INDEX IF NOT EXISTS "idx_chat_messages_user" ON "chat_messages" USING btree ("user_id","created_at")`,
    },
    {
      name: "RLS chat_messages",
      sql: `ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY`,
    },
    {
      name: "POLICY own_chat",
      sql: `CREATE POLICY "own_chat" ON chat_messages USING (user_id = (SELECT id FROM users WHERE auth_id = auth.uid()))`,
    },
    {
      name: "CREATE FUNCTION update_updated_at",
      sql: `CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$`,
    },
    {
      name: "CREATE TRIGGER users_updated_at",
      sql: `CREATE TRIGGER users_updated_at
        BEFORE UPDATE ON users
        FOR EACH ROW EXECUTE FUNCTION update_updated_at()`,
    },
  ];

  for (const { name, sql: stmt } of statements) {
    try {
      await sql.unsafe(stmt);
      console.log("✅", name);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("already exists") || msg.includes("duplicate")) {
        console.log("⏭️  skipped (exists):", name);
      } else {
        console.error("❌", name, "—", msg);
      }
    }
  }

  console.log("\n✅ Done!");
  await sql.end();
}

main();
