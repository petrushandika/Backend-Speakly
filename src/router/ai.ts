import { z } from "zod";
import { eq, desc, gte } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../trpc";
import { db } from "../db";
import { users, userErrors, lessons, userProgress } from "../db/schema";
import { cacheGet, cacheSet } from "../lib/redis";
import { complete } from "../services/groq";
import { get, invalidate } from "../services/context";
import { scorePronunciation } from "../lib/pronunciation";
import {
  buildFeedbackPrompt,
  buildGrammarPrompt,
  buildQuizPrompt,
  buildReadingTextPrompt,
  buildSpeakingChallengePrompt,
  sanitizeInput,
} from "../lib/prompts";

// ── Error category → lesson category mapping ─────────────────────────────────
const ERROR_TO_LESSON: Record<string, string[]> = {
  tense:         ["grammar"],
  article:       ["grammar"],
  preposition:   ["grammar"],
  subject_verb:  ["grammar"],
  vocabulary:    ["vocabulary"],
  pronunciation: ["speaking"],
  fluency:       ["speaking"],
  listening:     ["listening"],
};

export const aiRouter = router({
  // ── Analyze spoken transcript feedback ───────────────────────────────────
  analyzeFeedback: protectedProcedure
    .input(
      z.object({
        transcript:   z.string().min(10).max(5000),
        topic:        z.string(),
        activityType: z.enum(["daily_challenge", "ai_call", "peer_room"]).default("ai_call"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const user = await db.query.users.findFirst({
        where: eq(users.authId, ctx.userId),
        columns: { id: true, cefrLevel: true },
      });

      const prompt = buildFeedbackPrompt(
        input.transcript,
        input.topic,
        user?.cefrLevel ?? "B1",
      );

      const raw = await complete([{ role: "user", content: prompt }], {
        model: "primary",
        temperature: 0.2,
      });

      let feedback: Record<string, unknown>;
      try {
        feedback = JSON.parse(raw);
      } catch {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "AI returned invalid response" });
      }

      if (user) {
        const errors = (feedback.grammar_errors as Array<{
          error: string; correction: string; category: string;
        }>) ?? [];

        if (errors.length > 0) {
          await db.insert(userErrors).values(
            errors.map((e) => ({
              userId:        user.id,
              errorCategory: e.category,
              originalText:  e.error,
              correctedText: e.correction,
            })),
          );
          await invalidate(user.id);
        }
      }

      return feedback;
    }),

  // ── Generate personalized quiz ────────────────────────────────────────────
  generateQuiz: protectedProcedure
    .input(
      z.object({
        topic: z.string(),
        count: z.number().int().min(1).max(10).default(3),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const user = await db.query.users.findFirst({
        where: eq(users.authId, ctx.userId),
        columns: { id: true, cefrLevel: true },
      });

      let topErrors: string[] = [];
      if (user) {
        try {
          const context = await get(user.id);
          topErrors = context.topErrors;
        } catch {}
      }

      const prompt = buildQuizPrompt(
        input.topic,
        user?.cefrLevel ?? "B1",
        input.count,
        topErrors,
      );

      const raw = await complete([{ role: "user", content: prompt }], {
        model: "primary",
        temperature: 0.5,
      });

      try {
        return JSON.parse(raw);
      } catch {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "AI returned invalid response" });
      }
    }),

  // ── Explain a grammar point (personalized) ────────────────────────────────
  explainGrammar: protectedProcedure
    .input(z.object({ grammarPoint: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const user = await db.query.users.findFirst({
        where: eq(users.authId, ctx.userId),
        columns: { cefrLevel: true, domain: true },
      });

      const prompt = buildGrammarPrompt(
        input.grammarPoint,
        user?.cefrLevel ?? "B1",
        user?.domain ?? "general",
      );

      const raw = await complete([{ role: "user", content: prompt }], {
        model: "primary",
        temperature: 0.3,
      });

      try {
        return JSON.parse(raw);
      } catch {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "AI returned invalid response" });
      }
    }),

  // ── Score pronunciation via WER ────────────────────────────────────────────
  scorePronunciation: protectedProcedure
    .input(
      z.object({
        expected:   z.string().min(1).max(500),
        transcript: z.string(),
      }),
    )
    .query(async ({ input }) => {
      return scorePronunciation(input.expected, input.transcript);
    }),

  // ── Personalized lesson recommendations ───────────────────────────────────
  getRecommendations: protectedProcedure.query(async ({ ctx }) => {
    const user = await db.query.users.findFirst({
      where: eq(users.authId, ctx.userId),
      columns: { id: true, cefrLevel: true },
    });
    if (!user) return [];

    const learningCtx = await get(user.id);

    // Determine target lesson categories from error patterns
    const targetCategories = new Set<string>();
    for (const errorCat of learningCtx.topErrors) {
      const lessonCats = ERROR_TO_LESSON[errorCat] ?? ["grammar"];
      lessonCats.forEach((c) => targetCategories.add(c));
    }
    for (const weakCat of learningCtx.weakCategories) {
      targetCategories.add(weakCat);
    }
    // Always include at least grammar if no data
    if (targetCategories.size === 0) targetCategories.add("grammar");

    // Get all completed lesson IDs
    const completedProgress = await db.query.userProgress.findMany({
      where: (p, { and }) => and(
        eq(p.userId, user.id),
        eq(p.status, "completed"),
      ),
      columns: { lessonId: true },
    });
    const completedIds = new Set(completedProgress.map((p) => p.lessonId));

    // Find lessons matching target categories, same CEFR level, not completed
    const allLessons = await db.query.lessons.findMany({
      where: eq(lessons.cefrLevel, learningCtx.cefrLevel),
      columns: { id: true, title: true, description: true, category: true, cefrLevel: true },
      limit: 50,
    });

    const recommended = allLessons
      .filter((l) => !completedIds.has(l.id) && targetCategories.has(l.category))
      .slice(0, 4);

    // If fewer than 4, fill with any uncompleted lessons at this CEFR level
    if (recommended.length < 4) {
      const extra = allLessons
        .filter((l) => !completedIds.has(l.id) && !recommended.find((r) => r.id === l.id))
        .slice(0, 4 - recommended.length);
      recommended.push(...extra);
    }

    return recommended.map((l) => ({
      ...l,
      reason: targetCategories.has(l.category)
        ? `Your ${learningCtx.topErrors[0] ?? l.category} skills need practice`
        : `Continue your ${learningCtx.cefrLevel} journey`,
    }));
  }),

  // ── Get user's full learning context (for frontend analytics) ─────────────
  getLearningContext: protectedProcedure.query(async ({ ctx }) => {
    const user = await db.query.users.findFirst({
      where: eq(users.authId, ctx.userId),
      columns: { id: true },
    });
    if (!user) throw new TRPCError({ code: "NOT_FOUND" });
    return get(user.id);
  }),

  // ── Auto-classify a flashcard word via Groq ───────────────────────────────
  classifyWord: protectedProcedure
    .input(z.object({ word: z.string().min(1).max(100) }))
    .mutation(async ({ ctx, input }) => {
      const user = await db.query.users.findFirst({
        where: eq(users.authId, ctx.userId),
        columns: { cefrLevel: true },
      });

      const prompt = `Classify this English word/phrase and return ONLY valid JSON.
Word: "${sanitizeInput(input.word)}"
Student level: ${user?.cefrLevel ?? "B1"}

Return:
{
  "cefrLevel": "A1|A2|B1|B2|C1|C2",
  "partOfSpeech": "noun|verb|adjective|adverb|phrase|other",
  "definition": "simple definition in max 12 words",
  "exampleSentence": "natural example sentence",
  "synonyms": ["word1", "word2"],
  "difficulty": "easy|medium|hard"
}`;

      const raw = await complete([{ role: "user", content: prompt }], {
        model: "fast",
        temperature: 0.1,
        maxTokens: 200,
      });

      try {
        return JSON.parse(raw);
      } catch {
        return null;
      }
    }),

  // ── Grammar error analytics ────────────────────────────────────────────────
  getErrorAnalytics: protectedProcedure.query(async ({ ctx }) => {
    const user = await db.query.users.findFirst({
      where: eq(users.authId, ctx.userId),
      columns: { id: true },
    });
    if (!user) return null;

    const cacheKey = `analytics:errors:${user.id}`;
    const cached = await cacheGet<{
      frequency: Record<string, number>;
      dailyCounts: Record<string, number>;
      trend: string;
      totalThisWeek: number;
      totalLastWeek: number;
      topCategory: string | null;
    }>(cacheKey);
    if (cached) return cached;

    const twoWeeksAgo = new Date(Date.now() - 14 * 86_400_000);

    const allErrors = await db.query.userErrors.findMany({
      where: (e, { and }) => and(
        eq(e.userId, user.id),
        gte(e.createdAt, twoWeeksAgo),
      ),
      orderBy: desc(userErrors.createdAt),
      columns: { errorCategory: true, createdAt: true },
    });

    // Frequency by category
    const frequency: Record<string, number> = {};
    for (const e of allErrors) {
      frequency[e.errorCategory] = (frequency[e.errorCategory] ?? 0) + 1;
    }

    // Daily counts for trend chart (last 14 days)
    const dailyCounts: Record<string, number> = {};
    for (let i = 13; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86_400_000);
      dailyCounts[d.toISOString().slice(0, 10)] = 0;
    }
    for (const e of allErrors) {
      const day = new Date(e.createdAt).toISOString().slice(0, 10);
      if (day in dailyCounts) dailyCounts[day]++;
    }

    // Week-over-week trend
    const oneWeekAgo = new Date(Date.now() - 7 * 86_400_000);
    const errThisWeek = allErrors.filter((e) => new Date(e.createdAt) >= oneWeekAgo).length;
    const errLastWeek = allErrors.filter((e) => new Date(e.createdAt) < oneWeekAgo).length;
    const trend = errThisWeek < errLastWeek * 0.7
      ? "improving"
      : errThisWeek > errLastWeek * 1.3
        ? "needs_attention"
        : "stable";

    const result = {
      frequency,
      dailyCounts,
      trend,
      totalThisWeek: errThisWeek,
      totalLastWeek: errLastWeek,
      topCategory:   Object.entries(frequency).sort(([, a], [, b]) => b - a)[0]?.[0] ?? null,
    };

    await cacheSet(cacheKey, result, 5 * 60);
    return result;
  }),

  // ── Generate reading-aloud practice text ──────────────────────────────────
  generateReadingText: protectedProcedure
    .input(
      z.object({
        theme:      z.enum(["business", "technology", "travel", "daily_life", "science", "culture"]),
        paragraphs: z.number().int().min(1).max(3).default(2),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const user = await db.query.users.findFirst({
        where: eq(users.authId, ctx.userId),
        columns: { cefrLevel: true, domain: true },
      });

      const prompt = buildReadingTextPrompt(
        input.theme,
        input.paragraphs,
        user?.cefrLevel ?? "B1",
        user?.domain ?? "general",
      );

      const raw = await complete([{ role: "user", content: prompt }], {
        model: "primary",
        temperature: 0.6,
        maxTokens: 1600,
      });

      try {
        return JSON.parse(raw) as {
          title: string;
          theme: string;
          cefrLevel: string;
          paragraphs: string[];
          wordCount: number;
          keyVocabulary: Array<{ word: string; definition: string; indonesian: string; ipa: string }>;
          readingTips: string;
        };
      } catch {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "AI returned invalid response" });
      }
    }),

  // ── Get / generate daily speaking challenge ───────────────────────────────
  getDailySpeakingChallenge: protectedProcedure.query(async ({ ctx }) => {
    const user = await db.query.users.findFirst({
      where: eq(users.authId, ctx.userId),
      columns: { cefrLevel: true, domain: true },
    });

    const prompt = buildSpeakingChallengePrompt(
      user?.cefrLevel ?? "B1",
      user?.domain ?? "general",
    );

    const raw = await complete([{ role: "user", content: prompt }], {
      model: "fast",
      temperature: 0.7,
      maxTokens: 300,
    });

    try {
      return JSON.parse(raw) as {
        topic: string;
        prompt: string;
        targetSkill: string;
        difficulty: string;
        hints: string[];
        exampleOpener: string;
      };
    } catch {
      // Fallback challenge if AI fails
      return {
        topic: "Tell me about your typical workday.",
        prompt: "Talk for 60 seconds about what you do at work or school every day.",
        targetSkill: "fluency",
        difficulty: "easy",
        hints: ["Start with: Every day, I...", "Use present simple tense for routines"],
        exampleOpener: "Every day, I usually start my morning by...",
      };
    }
  }),
});
