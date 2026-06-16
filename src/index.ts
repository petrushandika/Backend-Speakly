import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { trpcServer } from "@hono/trpc-server";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { secureHeaders } from "hono/secure-headers";
import { prettyJSON } from "hono/pretty-json";
import { stream } from "hono/streaming";
import dotenv from "dotenv";
import { appRouter } from "./router/_app";
import { createContext } from "./trpc";

dotenv.config();

const app = new Hono();

app.use("*", logger());
app.use("*", cors({ origin: process.env.ALLOWED_ORIGINS?.split(",") ?? "*" }));
app.use("*", secureHeaders());
app.use("*", prettyJSON());

app.get("/health", (c) =>
  c.json({ status: "ok", version: "1.0.0", timestamp: new Date().toISOString() }),
);

// tRPC — handles all typed API procedures
app.use(
  "/trpc/*",
  trpcServer({
    router: appRouter,
    createContext: (_opts, c) => createContext(c),
  }),
);

// SSE streaming — AI chat (native Hono for real-time streaming)
app.post("/ai/stream", async (c) => {
  const token = c.req.header("Authorization")?.replace("Bearer ", "");
  if (!token) return c.json({ error: "Unauthorized" }, 401);

  return stream(c, async (s) => {
    // Groq streaming integration will be implemented in Sprint 5
    await s.write("data: {\"type\":\"token\",\"content\":\"\"}\n\n");
    await s.write("data: {\"type\":\"done\"}\n\n");
  });
});

// SSE streaming — TTS synthesis (native Hono for audio chunk streaming)
app.post("/speech/synthesize", async (c) => {
  const token = c.req.header("Authorization")?.replace("Bearer ", "");
  if (!token) return c.json({ error: "Unauthorized" }, 401);

  // ElevenLabs streaming integration will be implemented in Sprint 9
  return c.json({ message: "TTS endpoint — implementation in Sprint 9" });
});

// STT transcription — multipart audio upload
app.post("/speech/transcribe", async (c) => {
  const token = c.req.header("Authorization")?.replace("Bearer ", "");
  if (!token) return c.json({ error: "Unauthorized" }, 401);

  // Whisper STT integration will be implemented in Sprint 4
  return c.json({ transcript: "" });
});

const PORT = parseInt(process.env.PORT ?? "3001");

serve({ fetch: app.fetch, port: PORT }, () => {
  console.log(`speakly-api running on http://localhost:${PORT}`);
  console.log(`tRPC endpoint: http://localhost:${PORT}/trpc`);
});

export default app;
export type { AppRouter } from "./router/_app";
