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
import { buildMessages, buildSummaryPrompt, sanitizeInput, type ConversationMode } from "./lib/prompts";
import { get } from "./services/context";
import { redis, cacheGet, cacheSet, cacheDel } from "./lib/redis";
import { transcribe } from "./services/whisper";
import { complete } from "./services/groq";
import { synthesize } from "./services/elevenlabs";
import Redis from "ioredis";

// ─── Redis pub/sub for room chat ──────────────────────────────────────────────
// Separate ioredis client dedicated to subscriber mode
const redisSub = new Redis({
  host: process.env.REDIS_HOST ?? "localhost",
  port: parseInt(process.env.REDIS_PORT ?? "6379"),
  maxRetriesPerRequest: 1,
  lazyConnect: true,
  retryStrategy: (times) => Math.min(times * 100, 3000),
});
redisSub.on("error", () => {});

// roomId → Set of SSE writer callbacks
const roomSubscribers = new Map<string, Set<(data: string) => void>>();

redisSub.on("message", (channel: string, data: string) => {
  // channel = "room:{roomId}:events"
  const roomId = channel.replace(/^room:/, "").replace(/:events$/, "");
  const writers = roomSubscribers.get(roomId);
  if (writers) writers.forEach((fn) => fn(data));
});

async function subscribeRoom(roomId: string, writer: (data: string) => void) {
  if (!roomSubscribers.has(roomId)) {
    roomSubscribers.set(roomId, new Set());
    await redisSub.subscribe(`room:${roomId}:events`).catch(() => {});
  }
  roomSubscribers.get(roomId)!.add(writer);
}

async function unsubscribeRoom(roomId: string, writer: (data: string) => void) {
  const writers = roomSubscribers.get(roomId);
  if (!writers) return;
  writers.delete(writer);
  if (writers.size === 0) {
    roomSubscribers.delete(roomId);
    await redisSub.unsubscribe(`room:${roomId}:events`).catch(() => {});
  }
}

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
    mode?: ConversationMode;
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

  // 4. Build rich context (Redis-cached, 5 min TTL) + long-term memory
  let userCtx;
  if (user) {
    try {
      const ctx = await get(user.id);
      const memoryKey = `conv_memory:${user.id}`;
      const memory = await cacheGet<{ summary: string }>(memoryKey);
      userCtx = {
        displayName:          ctx.displayName,
        cefrLevel:            ctx.cefrLevel,
        goal:                 ctx.goal,
        domain:               ctx.domain,
        accentPreference:     ctx.accentPreference,
        topErrors:            ctx.topErrors,
        nativeLanguage:       ctx.nativeLanguage,
        errorTrend:           ctx.errorTrend,
        weakCategories:       ctx.weakCategories,
        strongCategories:     ctx.strongCategories,
        vocabularySize:       ctx.vocabularySize,
        avgMastery:           ctx.avgMastery,
        conversationSummary:  memory?.summary ?? null,
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
    body.mode,
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
        maxTokens: body.voiceMode ? 180 : 1024,
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

// ─── Summarize conversation & store as long-term memory ──────────────────────
app.post("/ai/summarize", async (c) => {
  const token = c.req.header("Authorization")?.replace("Bearer ", "");
  if (!token) return c.json({ error: "Unauthorized" }, 401);

  const { data: authData, error: authError } = await supabase.auth.getUser(token);
  if (authError || !authData.user) return c.json({ error: "Invalid token" }, 401);

  let body: {
    messages: Array<{ role: "user" | "assistant"; content: string }>;
  };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }

  if (!body.messages || body.messages.length < 4) {
    return c.json({ stored: false, reason: "Not enough messages to summarize" });
  }

  const user = await db.query.users.findFirst({
    where: eq(users.authId, authData.user.id),
    columns: { id: true, displayName: true, cefrLevel: true },
  });
  if (!user) return c.json({ error: "User not found" }, 404);

  const prompt = buildSummaryPrompt(body.messages, user.displayName, user.cefrLevel);
  const raw = await complete([{ role: "user", content: prompt }], {
    model: "fast",
    temperature: 0.3,
    maxTokens: 400,
  });

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return c.json({ stored: false, reason: "Could not parse summary" });
  }

  const memoryKey = `conv_memory:${user.id}`;
  // Append to existing memory, keep last 3 sessions worth of memory
  const existing = await cacheGet<{ summaries: unknown[]; summary: string }>(memoryKey);
  const summaries = existing?.summaries ?? [];
  summaries.push(parsed);
  if (summaries.length > 3) summaries.splice(0, summaries.length - 3);

  // Build a combined readable summary for the system prompt
  const combinedNote = summaries
    .map((s) => {
      const entry = s as Record<string, unknown>;
      return [
        entry.aria_memory_note,
        entry.personal_details ? `Personal: ${entry.personal_details}` : null,
        Array.isArray(entry.student_interests) && entry.student_interests.length ? `Interests: ${(entry.student_interests as string[]).join(", ")}` : null,
        Array.isArray(entry.recurring_struggles) && entry.recurring_struggles.length ? `Still working on: ${(entry.recurring_struggles as string[]).join(", ")}` : null,
      ].filter(Boolean).join(" | ");
    })
    .join("\n");

  await cacheSet(memoryKey, { summaries, summary: combinedNote }, 30 * 24 * 60 * 60); // 30 days

  return c.json({ stored: true, note: parsed.aria_memory_note });
});

// ─── Get/clear long-term memory ───────────────────────────────────────────────
app.get("/ai/memory", async (c) => {
  const token = c.req.header("Authorization")?.replace("Bearer ", "");
  if (!token) return c.json({ error: "Unauthorized" }, 401);
  const { data: authData, error: authError } = await supabase.auth.getUser(token);
  if (authError || !authData.user) return c.json({ error: "Invalid token" }, 401);

  const user = await db.query.users.findFirst({
    where: eq(users.authId, authData.user.id),
    columns: { id: true },
  });
  if (!user) return c.json({ error: "User not found" }, 404);

  const memory = await cacheGet<{ summaries: unknown[]; summary: string }>(`conv_memory:${user.id}`);
  return c.json({ memory: memory ?? null });
});

app.delete("/ai/memory", async (c) => {
  const token = c.req.header("Authorization")?.replace("Bearer ", "");
  if (!token) return c.json({ error: "Unauthorized" }, 401);
  const { data: authData, error: authError } = await supabase.auth.getUser(token);
  if (authError || !authData.user) return c.json({ error: "Invalid token" }, 401);

  const user = await db.query.users.findFirst({
    where: eq(users.authId, authData.user.id),
    columns: { id: true },
  });
  if (!user) return c.json({ error: "User not found" }, 404);

  await cacheDel(`conv_memory:${user.id}`);
  return c.json({ cleared: true });
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
  if (body.text.length > 5000) return c.json({ error: "text too long (max 5000 chars)" }, 400);

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

// ─── Room SSE — real-time chat events ────────────────────────────────────────
app.get("/rooms/:roomId/events", async (c) => {
  // EventSource doesn't support custom headers — accept token via query param
  const token = c.req.query("token") ?? c.req.header("Authorization")?.replace("Bearer ", "");
  if (!token) return c.json({ error: "Unauthorized" }, 401);

  const { data: authData, error: authError } = await supabase.auth.getUser(token);
  if (authError || !authData.user) return c.json({ error: "Invalid token" }, 401);

  const roomId = c.req.param("roomId");

  return stream(c, async (s) => {
    c.header("Content-Type", "text/event-stream");
    c.header("Cache-Control", "no-cache");
    c.header("Connection", "keep-alive");

    const writer = (data: string) => {
      s.write(`data: ${data}\n\n`).catch(() => {});
    };

    await subscribeRoom(roomId, writer);

    // Keep-alive ping every 25s
    const ping = setInterval(() => {
      s.write(": ping\n\n").catch(() => clearInterval(ping));
    }, 25_000);

    // Wait for client disconnect
    await new Promise<void>((resolve) => {
      s.onAbort(() => { resolve(); });
    });

    clearInterval(ping);
    await unsubscribeRoom(roomId, writer);
  });
});

const PORT = parseInt(process.env.PORT ?? "8099");

serve({ fetch: app.fetch, port: PORT }, () => {
  console.log(`speakly-api running on http://localhost:${PORT}`);
  console.log(`tRPC endpoint: http://localhost:${PORT}/trpc`);
});

export default app;
export type { AppRouter } from "./router/_app";
