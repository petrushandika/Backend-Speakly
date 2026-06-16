# Speakly — Backend

Hono + tRPC API server for the Speakly AI-powered English learning platform.

---

## Tech Stack

| Layer           | Technology               | Version |
| --------------- | ------------------------ | ------- |
| Framework       | Hono                     | 4+      |
| Node.js adapter | @hono/node-server        | 2+      |
| API layer       | tRPC                     | 11+     |
| Language        | TypeScript               | 6+      |
| Validation      | Zod                      | 4+      |
| Database        | Supabase (PostgreSQL 17) | latest  |
| Cache           | ioredis (Upstash)        | 5+      |
| Dev runner      | tsx                      | 4+      |

---

## Prerequisites

- Node.js 22+
- npm 10+
- Supabase project (for database + auth)
- Upstash Redis database (for cache)

---

## Getting Started

```bash
# 1. Install dependencies
npm install

# 2. Set up environment variables
cp .env.example .env
# Fill in all keys (see Environment Variables section)

# 3. Start development server
npm run dev
# → http://localhost:8099
```

---

## Environment Variables

```bash
PORT=8099
NODE_ENV=development
ALLOWED_ORIGINS=http://localhost:3099   # Comma-separated allowed CORS origins

# Supabase — from Supabase dashboard → Settings → API
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=             # Never expose this to the frontend

# AI Services
GROQ_API_KEY=                          # console.groq.com → API Keys
OPENAI_API_KEY=                        # platform.openai.com → API Keys (Whisper STT)
ELEVENLABS_API_KEY=                    # elevenlabs.io → Profile → API Key
ELEVENLABS_VOICE_US=                   # ElevenLabs Voice ID for American accent
ELEVENLABS_VOICE_UK=                   # ElevenLabs Voice ID for British accent
HUGGINGFACE_API_KEY=                   # huggingface.co → Settings → Access Tokens

# Cache — from Upstash console → REST API
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# Internal
CRON_SECRET=                           # Random string to protect cron endpoints (openssl rand -hex 32)
```

---

## Project Structure

```
src/
├── index.ts                   # Hono app entry point — HTTP server + route registration
├── trpc.ts                    # tRPC instance, context, protectedProcedure
├── router/
│   ├── _app.ts                # Root router — combines all sub-routers → AppRouter type
│   ├── users.ts               # getProfile, updateProfile
│   ├── lessons.ts             # getDaily, complete
│   ├── srs.ts                 # getDue, submitReview, addCard — SM-2 algorithm
│   ├── progress.ts            # getSummary, getStreak, getErrors, getSkills
│   ├── grammar.ts             # getAllTenses, getTenseBySlug, submitDrill
│   ├── vocabulary.ts          # getBank, search, removeFromBank
│   └── rooms.ts               # create, join, getActive, end
├── services/                  # (Sprint 5+) AI + speech service integrations
│   ├── groq.ts                # Groq SDK client + request queue
│   ├── rag.ts                 # RAG pipeline: embed → pgvector search
│   ├── whisper.ts             # OpenAI Whisper STT
│   ├── elevenlabs.ts          # ElevenLabs TTS
│   ├── errors.ts              # Error pattern analysis
│   └── content.ts             # Daily content generation
├── jobs/                      # (Sprint 7+) Cron jobs
│   ├── daily.ts               # Midnight: generate next day's content
│   └── weekly.ts              # Monday: generate weekly AI report
├── lib/
│   ├── supabase.ts            # Supabase admin client (lazy singleton)
│   └── redis.ts               # ioredis client (Upstash)
└── types/
    ├── database.ts            # Supabase generated types (supabase gen types)
    └── api.ts                 # Shared request/response types
```

---

## Available Scripts

```bash
npm run dev          # Start dev server with tsx watch on :8099
npm run build        # Compile TypeScript → dist/
npm run start        # Run compiled output (production)
npm run type-check   # tsc --noEmit (no output files)
```

---

## API Design

### tRPC Procedures (all under `/trpc`)

All procedures require `Authorization: Bearer <supabase-access-token>` header.

```
users
  ├── getProfile          → query    — Full user profile + skill scores
  └── updateProfile       → mutation — Update display name, goal, accent, etc.

lessons
  ├── getDaily            → query    — Today's lesson plan (verb, vocab, grammar, reading, speaking)
  └── complete            → mutation — Mark activity done, award XP

srs
  ├── getDue              → query    — Cards due for review today (max 20)
  ├── submitReview        → mutation — Submit quality 0–5, recalculate SM-2 interval
  └── addCard             → mutation — Add word/verb/grammar card to user's deck

progress
  ├── getSummary          → query    — XP, streak, CEFR level, skill scores
  ├── getStreak           → query    — 90-day calendar heatmap data
  ├── getErrors           → query    — Error history with categories
  └── getSkills           → query    — 6-axis skill radar data

grammar
  ├── getAllTenses         → query    — All 12 tenses with per-user mastery
  ├── getTenseBySlug      → query    — Single tense detail + user progress
  └── submitDrill         → mutation — Submit drill answers, update mastery %

vocabulary
  ├── getBank             → query    — User's full vocabulary SRS bank
  ├── search              → query    — Full-text search on vocabulary_words
  └── removeFromBank      → mutation — Delete SRS card from deck

rooms
  ├── create              → mutation — Create peer room, returns 6-char code
  ├── join                → mutation — Join by code, marks room active
  ├── getActive           → query    — List open rooms filtered by CEFR level
  └── end                 → mutation — End session, trigger feedback generation
```

### Native Hono Routes (streaming)

These routes bypass tRPC because they require low-level HTTP streaming:

| Method | Path                  | Description                                  |
| ------ | --------------------- | -------------------------------------------- |
| GET    | `/health`             | Health check — returns status + timestamp    |
| POST   | `/ai/stream`          | SSE: Groq LLM token stream                   |
| POST   | `/speech/transcribe`  | Whisper STT: `multipart/form-data` audio blob |
| POST   | `/speech/synthesize`  | ElevenLabs TTS: streams audio chunks         |

### Response Format

tRPC handles its own envelope. For native Hono routes:

```json
// Success
{ "data": { ... } }

// Error
{
  "error": {
    "code": "RATE_LIMITED",
    "message": "Too many requests. Try again in 30 seconds.",
    "retryAfter": 30
  }
}
```

### SSE Stream Format (AI chat)

```
data: {"type":"token","content":"Hello"}

data: {"type":"token","content":", how are you?"}

data: {"type":"done","errors":[...]}
```

---

## Architecture

### tRPC Context

Every tRPC request resolves a context containing the authenticated `userId`:

```
Request
  → Hono receives HTTP
  → @hono/trpc-server extracts Authorization header
  → createContext() calls supabase.auth.getUser(token)
  → { userId } attached to all procedure handlers
  → protectedProcedure throws UNAUTHORIZED if userId is null
```

### Supabase Client

The Supabase admin client uses a lazy proxy pattern — it only initializes when first accessed, so the server starts cleanly without env keys during development scaffolding:

```typescript
// Accessed like a normal client
const { data } = await supabase.from("users").select("*");
// Throws a clear error if SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are missing
```

### SM-2 Spaced Repetition

The SRS algorithm runs entirely in the backend (`router/srs.ts`). Quality ratings 0–5:

| Rating | Meaning        | Result                      |
| ------ | -------------- | --------------------------- |
| 0–2    | Failed         | Reset to interval = 1 day  |
| 3      | Barely correct | EF unchanged, interval grows |
| 4      | Good           | EF slightly increased       |
| 5      | Perfect        | EF maximally increased      |

---

## Sprint Implementation Plan

| Sprint | Feature                         | Status      |
| ------ | ------------------------------- | ----------- |
| 1–4    | tRPC routers (all above)        | Scaffolded  |
| 5      | Groq + RAG pipeline             | Pending     |
| 6      | AI conversation + SSE streaming | Pending     |
| 7      | Error pattern tracker           | Pending     |
| 8      | Tense mastery path              | Pending     |
| 9      | Speech-to-speech pipeline       | Pending     |
| 10     | Call features + post-call report | Pending    |
| 11     | Peer speaking room (WebRTC)     | Pending     |
| 12     | Pronunciation + accent system   | Pending     |

---

## Security

- All tRPC procedures use `protectedProcedure` — unauthenticated requests get `UNAUTHORIZED`
- Supabase `SERVICE_ROLE_KEY` is server-side only — never sent to the frontend
- CORS restricted to `ALLOWED_ORIGINS` env variable
- Hono `secureHeaders()` middleware adds standard security headers
- All user input validated by Zod before any database operation
- Row Level Security enabled on all Supabase tables (defense in depth)
