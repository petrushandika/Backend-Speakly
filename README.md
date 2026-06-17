# Speakly — Backend

Hono + tRPC API server for the Speakly AI-powered English learning platform.

---

## Tech Stack

| Layer        | Technology               | Version |
| ------------ | ------------------------ | ------- |
| Framework    | Hono                     | 4+      |
| Node adapter | @hono/node-server        | 2+      |
| API layer    | tRPC                     | 11+     |
| Language     | TypeScript               | 6+      |
| Validation   | Zod                      | 4+      |
| ORM          | Drizzle ORM              | 0.45+   |
| Database     | Supabase (PostgreSQL 17) | latest  |
| Cache        | ioredis (local Redis)    | 5+      |
| LLM / STT   | Groq SDK                 | 1.2+    |
| TTS          | ElevenLabs               | —       |
| Dev runner   | tsx                      | 4+      |

---

## Prerequisites

- Node.js 22+
- npm 10+
- Redis running locally on `localhost:6379`
- Supabase project (database + auth)
- Groq API key (used for both LLM and Whisper STT)
- ElevenLabs API key (TTS)

---

## Getting Started

```bash
# 1. Install dependencies
npm install

# 2. Set up environment variables
cp .env.example .env
# Fill in all keys (see Environment Variables section)

# 3. Start Redis
redis-server

# 4. Start dev server
npm run dev
# → http://localhost:8099
```

---

## Environment Variables

```bash
PORT=8099
NODE_ENV=development
ALLOWED_ORIGINS=http://localhost:3099   # Comma-separated allowed CORS origins

# Supabase — Settings → API
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=             # Server-side only, never exposed to frontend

# Groq — used for LLM (llama-3.3-70b) AND Whisper STT (whisper-large-v3-turbo)
# Do NOT use OpenAI API key — STT is handled by Groq SDK
GROQ_API_KEY=

# ElevenLabs TTS
ELEVENLABS_API_KEY=

# ElevenLabs voice IDs per accent (set in .env to avoid hardcoding)
ELEVENLABS_VOICE_US=     # American accent
ELEVENLABS_VOICE_UK=     # British accent
ELEVENLABS_VOICE_AU=     # Australian accent
ELEVENLABS_VOICE_CA=     # Canadian accent
ELEVENLABS_VOICE_IE=     # Irish accent
ELEVENLABS_VOICE_NZ=     # New Zealand accent
ELEVENLABS_VOICE_ZA=     # South African accent
ELEVENLABS_VOICE_IN=     # Indian accent
ELEVENLABS_VOICE_SG=     # Singaporean accent

# Redis — local instance only (no Upstash)
REDIS_HOST=localhost
REDIS_PORT=6379
```

> **Important:** `dotenv.config()` is called as the very first line of `src/index.ts`, before any service module initializes. This ensures env vars are loaded before Redis and Supabase clients connect.

---

## Project Structure

```
src/
├── index.ts               # Entry point — Hono app, middleware, native HTTP routes
├── trpc.ts                # tRPC instance, context factory, protectedProcedure
├── router/
│   ├── _app.ts            # Root router — combines all sub-routers → AppRouter type
│   ├── ai.ts              # analyzeFeedback, generateQuiz, explainGrammar, scorePronunciation,
│   │                      #   getRecommendations, getLearningContext, classifyWord,
│   │                      #   getErrorAnalytics, generateReadingText, analyzeReadingAloud,
│   │                      #   getDailySpeakingChallenge
│   ├── grammar.ts         # getErrors, saveError, saveBatch (with Redis cache invalidation)
│   ├── lessons.ts         # getAll, getById, complete (awards XP)
│   ├── progress.ts        # getSummary, getErrors, getRecentProgress,
│   │                      #   getDueFlashcardsCount, updateStreak
│   ├── rooms.ts           # getActive, create, join, leave, close,
│   │                      #   getMessages, sendMessage (Redis pub/sub)
│   ├── srs.ts             # getDue, submitReview (SM-2), addCard, deleteCard
│   ├── users.ts           # getProfile, createProfile, updateProfile, getAvatarUploadUrl
│   └── vocabulary.ts      # getWords, getFlashcards (CEFR-graded A1–C2 word bank)
├── services/
│   ├── context.ts         # Redis-cached user learning context (5 min TTL)
│   ├── elevenlabs.ts      # TTS synthesis — maps accent name to voice ID
│   ├── groq.ts            # LLM streaming + completion (primary/fast/fallback models)
│   └── whisper.ts         # STT transcription via Groq whisper-large-v3-turbo
├── lib/
│   ├── prompts.ts         # System prompt builder — CEFR rules, voice mode, sanitizeInput
│   ├── pronunciation.ts   # WER-based pronunciation scoring
│   ├── redis.ts           # ioredis client + cacheGet/cacheSet/cacheDel helpers
│   └── supabase.ts        # Supabase admin client (lazy singleton)
└── db/
    ├── index.ts           # Drizzle ORM instance (postgres driver)
    └── schema.ts          # All table definitions
```

---

## Available Scripts

```bash
npm run dev          # Start dev server with tsx watch on :8099
npm run build        # Compile TypeScript → dist/
npm run start        # Run compiled output (production)
npm run type-check   # tsc --noEmit
```

---

## tRPC Procedures

All procedures require `Authorization: Bearer <supabase-access-token>` header via `protectedProcedure`.

### `users`
| Procedure          | Type     | Description                                              |
| ------------------ | -------- | -------------------------------------------------------- |
| `getProfile`       | query    | Full user profile row                                    |
| `createProfile`    | mutation | Create profile on first sign-in (idempotent)             |
| `updateProfile`    | mutation | Update name, CEFR level, goal, accent — clears Redis cache |
| `getAvatarUploadUrl` | mutation | Signed upload URL for Supabase Storage                 |

### `lessons`
| Procedure  | Type     | Description                                      |
| ---------- | -------- | ------------------------------------------------ |
| `getAll`   | query    | All active lessons for user's CEFR level         |
| `getById`  | query    | Single lesson by UUID                            |
| `complete` | mutation | Mark lesson done, award XP (upsert)              |

### `srs`
| Procedure      | Type     | Description                            |
| -------------- | -------- | -------------------------------------- |
| `getDue`       | query    | Cards due today (max 20, ordered by due date) |
| `submitReview` | mutation | SM-2 quality 0–5, recalculates interval |
| `addCard`      | mutation | Add custom flashcard                   |
| `deleteCard`   | mutation | Delete card (ownership-checked)        |

### `progress`
| Procedure              | Type     | Description                        |
| ---------------------- | -------- | ---------------------------------- |
| `getSummary`           | query    | XP, streak, CEFR level, goal       |
| `getErrors`            | query    | Grammar error history (last 100)   |
| `getRecentProgress`    | query    | Last 30 completed lessons          |
| `getDueFlashcardsCount`| query    | Count of SRS cards due today       |
| `updateStreak`         | mutation | Increment or reset daily streak    |

### `grammar`
| Procedure   | Type     | Description                                          |
| ----------- | -------- | ---------------------------------------------------- |
| `getErrors` | query    | Grammar errors (optional category filter, limit 50)  |
| `saveError` | mutation | Save one grammar error, invalidates Redis context     |
| `saveBatch` | mutation | Save up to 20 errors at once, invalidates Redis context |

### `vocabulary`
| Procedure      | Type  | Description                            |
| -------------- | ----- | -------------------------------------- |
| `getWords`     | query | CEFR-graded word bank (A1–C2)          |
| `getFlashcards`| query | User's SRS vocabulary cards            |

### `rooms`
| Procedure    | Type     | Description                                          |
| ------------ | -------- | ---------------------------------------------------- |
| `getActive`  | query    | List active rooms (max 20)                           |
| `create`     | mutation | Create room, host auto-joins                         |
| `join`       | mutation | Join room (checks max members)                       |
| `leave`      | mutation | Leave room; auto-closes if last member leaves        |
| `close`      | mutation | Host closes room                                     |
| `getMessages`| query    | Last 50 chat messages from Redis                     |
| `sendMessage`| mutation | Send message — membership check + Redis pub/sub      |

### `ai`
| Procedure                  | Type     | Description                                        |
| -------------------------- | -------- | -------------------------------------------------- |
| `analyzeFeedback`          | mutation | Grade speaking transcript, log grammar errors      |
| `generateQuiz`             | mutation | Personalized quiz based on user's error patterns   |
| `explainGrammar`           | mutation | Grammar explanation at user's CEFR level           |
| `scorePronunciation`       | query    | WER-based pronunciation score (expected vs actual) |
| `getRecommendations`       | query    | Up to 4 lesson recommendations from error patterns |
| `getLearningContext`       | query    | Full Redis-cached learning context for frontend    |
| `classifyWord`             | mutation | Classify a word (CEFR, POS, definition, example)   |
| `getErrorAnalytics`        | query    | 14-day error trend + category frequency (cached 5 min) |
| `generateReadingText`      | mutation | AI-generated reading passage at user's level       |
| `analyzeReadingAloud`      | mutation | WER + AI feedback on reading-aloud attempt         |
| `getDailySpeakingChallenge`| query    | Daily speaking prompt at user's CEFR level         |

---

## Native Hono Routes

These bypass tRPC for low-level streaming or multipart handling. All require `Authorization: Bearer <token>`.

| Method   | Path                        | Description                                             |
| -------- | --------------------------- | ------------------------------------------------------- |
| `GET`    | `/health`                   | Health check — returns status + timestamp               |
| `POST`   | `/ai/stream`                | SSE: Groq LLM streaming chat (validates mode + history) |
| `POST`   | `/ai/summarize`             | Summarize session into long-term Redis memory (30 days) |
| `GET`    | `/ai/memory`                | Retrieve stored conversation summary                    |
| `DELETE` | `/ai/memory`                | Clear stored conversation summary                       |
| `POST`   | `/speech/transcribe`        | Whisper STT — multipart audio, 25 MB limit              |
| `POST`   | `/speech/synthesize`        | ElevenLabs TTS — returns audio/mpeg blob                |
| `GET`    | `/rooms/:roomId/events`     | SSE: real-time room chat (token via query param)        |

### `/ai/stream` request body

```json
{
  "message": "string (max 4000 chars, required)",
  "history": [{ "role": "user|assistant", "content": "string" }],
  "mode": "free_talk|roleplay|grammar_drill|debate|storytelling|interview_prep",
  "voiceMode": false
}
```

History is sanitized, role-filtered, and capped at the last 20 entries server-side.

### SSE event format

```
data: {"type":"token","content":"Hello"}
data: {"type":"token","content":", how can I help?"}
data: {"type":"done","fullResponse":"Hello, how can I help?"}
data: {"type":"error","message":"AI service error"}
```

---

## Key Patterns

### Redis usage
- **Cache**: User learning context cached 5 min per user (`context:{userId}`). Invalidated immediately when profile or grammar errors change.
- **Pub/Sub**: Room chat uses a dedicated `redisSub` client. Each room publishes to `room:{roomId}:events`; SSE subscribers receive in real time.
- **Chat history**: Last 100 messages stored per room in a Redis list, TTL 24h.
- **Memory**: Conversation summaries stored up to 30 days (`conv_memory:{userId}`).

### CEFR-aware AI
`buildSystemPrompt()` in `lib/prompts.ts` reads the user's CEFR level and injects vocabulary, grammar complexity, and correction format rules. In voice mode (`voiceMode=true`), A1/A2 users still receive English-only responses (no Indonesian fallback).

### Security
- All tRPC procedures use `protectedProcedure` — unauthenticated requests get `UNAUTHORIZED`
- `SUPABASE_SERVICE_ROLE_KEY` is server-side only
- CORS restricted to `ALLOWED_ORIGINS`
- `secureHeaders()` middleware on all routes
- All user input validated with Zod; text inputs sanitized with `sanitizeInput()` (strips HTML, prompt injection patterns)
- File upload limit: 25 MB on `/speech/transcribe`

### SM-2 Spaced Repetition
Quality ratings 0–5 fed to `calculateNextReview()` in `router/srs.ts`:

| Rating | Meaning        | Result                      |
| ------ | -------------- | --------------------------- |
| 0–2    | Failed         | Reset to interval = 1 day   |
| 3      | Barely correct | Interval grows slowly        |
| 4      | Good           | EF slightly increased        |
| 5      | Perfect        | EF maximally increased       |
