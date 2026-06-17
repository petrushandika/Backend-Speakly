import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { trpcServer } from "@hono/trpc-server";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { secureHeaders } from "hono/secure-headers";
import { prettyJSON } from "hono/pretty-json";
import { stream } from "hono/streaming";
import { eq } from "drizzle-orm";
import dotenv from "dotenv";
import { appRouter } from "./router/_app";
import { createContext } from "./trpc";
import { supabase } from "./lib/supabase";
import { db } from "./db";
import { users } from "./db/schema";
import { stream as groqStream } from "./services/groq";
import { buildMessages, sanitizeInput } from "./lib/prompts";
import { getLearningContext } from "./services/learning-context";
import { transcribe } from "./services/whisper";
import { synthesize } from "./services/elevenlabs";

dotenv.config();

const app = new Hono();

app.use("*", logger());
app.use("*", cors({
  origin: process.env.ALLOWED_ORIGINS?.split(",") ?? "*",
  allowMethods: ["GET", "POST", "DELETE", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization"],
}));
app.use("*", secureHeaders());
app.use("*", prettyJSON());

app.get("/health", (c) =>
  c.json({ status: "ok", version: "1.0.0", timestamp: new Date().toISOString() }),
);

// tRPC — all typed procedures
app.use(
  "/trpc/*",
  trpcServer({
    router: appRouter,
    createContext: (_opts, c) => createContext(c),
  }),
);

// ─── AI Chat — SSE Streaming ─────────────────────────────────────────────────
app.post("/ai/stream", async (c) => {
  // 1. Auth via Supabase JWT
  const token = c.req.header("Authorization")?.replace("Bearer ", "");
  if (!token) return c.json({ error: "Unauthorized" }, 401);

  const { data: authData, error: authError } = await supabase.auth.getUser(token);
  if (authError || !authData.user) return c.json({ error: "Invalid token" }, 401);

  // 2. Parse body
  let body: {
    message: string;
    history?: Array<{ role: "user" | "assistant"; content: string }>;
    voiceMode?: boolean;
  };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }
  if (!body.message?.trim()) return c.json({ error: "message is required" }, 400);

  // 3. Get user profile
  const user = await db.query.users.findFirst({
    where: eq(users.authId, authData.user.id),
    columns: { id: true },
  });

  // 4. Build rich learning context (Redis-cached, 5 min TTL)
  let userCtx;
  if (user) {
    try {
      const ctx = await getLearningContext(user.id);
      userCtx = {
        displayName:      ctx.displayName,
        cefrLevel:        ctx.cefrLevel,
        goal:             ctx.goal,
        domain:           ctx.domain,
        accentPreference: ctx.accentPreference,
        topErrors:        ctx.topErrors,
        nativeLanguage:   ctx.nativeLanguage,
        errorTrend:       ctx.errorTrend,
        weakCategories:   ctx.weakCategories,
        strongCategories: ctx.strongCategories,
        vocabularySize:   ctx.vocabularySize,
        avgMastery:       ctx.avgMastery,
      };
    } catch {
      userCtx = {
        displayName: "Student", cefrLevel: "B1", goal: "general",
        domain: "general", accentPreference: "american", topErrors: [],
      };
    }
  } else {
    userCtx = {
      displayName: "Student", cefrLevel: "B1", goal: "general",
      domain: "general", accentPreference: "american", topErrors: [],
    };
  }

  const messages = buildMessages(
    userCtx,
    body.history ?? [],
    sanitizeInput(body.message),
    body.voiceMode,
  );

  // 6. Stream from Groq via SSE
  c.header("Content-Type", "text/event-stream");
  c.header("Cache-Control", "no-cache");
  c.header("X-Accel-Buffering", "no");

  return stream(c, async (s) => {
    try {
      let fullResponse = "";

      for await (const chunk of groqStream(messages, {
        model: body.voiceMode ? "fast" : "primary",
        temperature: 0.7,
        maxTokens: body.voiceMode ? 160 : 512,
      })) {
        fullResponse += chunk;
        await s.write(`data: ${JSON.stringify({ type: "token", content: chunk })}\n\n`);
      }

      await s.write(`data: ${JSON.stringify({ type: "done", fullResponse })}\n\n`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "AI service error";
      await s.write(`data: ${JSON.stringify({ type: "error", message })}\n\n`);
    }
  });
});

// ─── STT Transcription — Whisper ─────────────────────────────────────────────
app.post("/speech/transcribe", async (c) => {
  const token = c.req.header("Authorization")?.replace("Bearer ", "");
  if (!token) return c.json({ error: "Unauthorized" }, 401);

  const { data: authData, error: authError } = await supabase.auth.getUser(token);
  if (authError || !authData.user) return c.json({ error: "Invalid token" }, 401);

  const formData = await c.req.formData();
  const file = formData.get("audio");

  if (!file || !(file instanceof File)) {
    return c.json({ error: "audio field (File) is required" }, 400);
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const transcript = await transcribe(buffer, file.name);
    return c.json({ transcript });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Transcription failed";
    return c.json({ error: message }, 500);
  }
});

// ─── TTS Synthesis — ElevenLabs ──────────────────────────────────────────────
app.post("/speech/synthesize", async (c) => {
  const token = c.req.header("Authorization")?.replace("Bearer ", "");
  if (!token) return c.json({ error: "Unauthorized" }, 401);

  const { data: authData, error: authError } = await supabase.auth.getUser(token);
  if (authError || !authData.user) return c.json({ error: "Invalid token" }, 401);

  let body: { text: string; accent?: string };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }

  if (!body.text?.trim()) return c.json({ error: "text is required" }, 400);
  if (body.text.length > 1000) return c.json({ error: "text too long (max 1000 chars)" }, 400);

  try {
    const audioBuffer = await synthesize(body.text.trim(), body.accent ?? "american");
    c.header("Content-Type", "audio/mpeg");
    c.header("Content-Length", String(audioBuffer.length));
    return c.body(new Uint8Array(audioBuffer));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Synthesis failed";
    return c.json({ error: message }, 500);
  }
});

const PORT = parseInt(process.env.PORT ?? "8099");

serve({ fetch: app.fetch, port: PORT }, () => {
  console.log(`speakly-api running on http://localhost:${PORT}`);
  console.log(`tRPC endpoint: http://localhost:${PORT}/trpc`);
});

export default app;
export type { AppRouter } from "./router/_app";
