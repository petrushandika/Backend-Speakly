import { eq, desc, lte, gte, sql } from "drizzle-orm";
import { db } from "../db";
import { users, userErrors, userProgress, vocabulary, flashcards } from "../db/schema";
import { cacheGet, cacheSet, cacheDel } from "../lib/redis";

export interface LearningContext {
  // Core profile
  userId:           string;
  displayName:      string;
  cefrLevel:        string;
  goal:             string;
  domain:           string;
  accentPreference: string;
  nativeLanguage:   string | null;

  // Error intelligence
  topErrors:        string[];
  errorFrequency:   Record<string, number>;
  errorTrend:       "improving" | "stable" | "needs_attention";
  totalErrors:      number;

  // Lesson progress
  lessonsCompleted:   number;
  weakCategories:     string[];
  strongCategories:   string[];

  // Vocabulary intelligence
  vocabularySize:   number;
  avgMastery:       number;

  // Activity
  xpTotal:     number;
  streakDays:  number;
}

const CACHE_KEY = (userId: string) => `learning_ctx:${userId}`;
const TTL = 5 * 60; // 5 minutes

export async function get(userId: string): Promise<LearningContext> {
  // Try cache first
  const cached = await cacheGet<LearningContext>(CACHE_KEY(userId));
  if (cached) return cached;

  const ctx = await compute(userId);
  await cacheSet(CACHE_KEY(userId), ctx, TTL);
  return ctx;
}

export async function invalidate(userId: string): Promise<void> {
  await cacheDel(CACHE_KEY(userId));
}

async function compute(userId: string): Promise<LearningContext> {
  const twoWeeksAgo = new Date(Date.now() - 14 * 86_400_000);
  const oneWeekAgo  = new Date(Date.now() -  7 * 86_400_000);

  const [user, allErrors, recentErrors, progress, vocabRows] = await Promise.all([
    db.query.users.findFirst({
      where: eq(users.id, userId),
    }),
    db.query.userErrors.findMany({
      where: eq(userErrors.userId, userId),
      orderBy: desc(userErrors.createdAt),
      limit: 150,
      columns: { errorCategory: true, createdAt: true },
    }),
    db.query.userErrors.findMany({
      where: (e, { and }) => and(
        eq(e.userId, userId),
        gte(e.createdAt, oneWeekAgo),
      ),
      columns: { id: true },
    }),
    db.query.userProgress.findMany({
      where: eq(userProgress.userId, userId),
      with: { lesson: { columns: { category: true } } },
    }),
    db.query.vocabulary.findMany({
      where: eq(vocabulary.userId, userId),
      columns: { mastery: true },
    }),
  ]);

  if (!user) throw new Error("User not found");

  // ── Error frequency by category ──────────────────────────────────────────
  const errorFrequency: Record<string, number> = {};
  for (const e of allErrors) {
    errorFrequency[e.errorCategory] = (errorFrequency[e.errorCategory] ?? 0) + 1;
  }

  const topErrors = Object.entries(errorFrequency)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 4)
    .map(([cat]) => cat);

  // ── Error trend: last 7 days vs 7–14 days ────────────────────────────────
  const errLast7  = allErrors.filter((e) => new Date(e.createdAt) >= oneWeekAgo).length;
  const errPrev7  = allErrors.filter((e) => {
    const d = new Date(e.createdAt);
    return d >= twoWeeksAgo && d < oneWeekAgo;
  }).length;

  const errorTrend: LearningContext["errorTrend"] =
    errPrev7 > 0 && errLast7 < errPrev7 * 0.7
      ? "improving"
      : errLast7 > errPrev7 * 1.3
        ? "needs_attention"
        : "stable";

  // ── Lesson category analysis ──────────────────────────────────────────────
  const catStats: Record<string, { total: number; completed: number }> = {};
  for (const p of progress) {
    const cat = (p.lesson as { category: string } | null)?.category ?? "general";
    if (!catStats[cat]) catStats[cat] = { total: 0, completed: 0 };
    catStats[cat].total++;
    if (p.status === "completed") catStats[cat].completed++;
  }

  const weakCategories   = Object.entries(catStats)
    .filter(([, v]) => v.total >= 2 && v.completed / v.total < 0.5)
    .map(([cat]) => cat);

  const strongCategories = Object.entries(catStats)
    .filter(([, v]) => v.total >= 2 && v.completed / v.total >= 0.8)
    .map(([cat]) => cat);

  // ── Vocabulary stats ──────────────────────────────────────────────────────
  const avgMastery = vocabRows.length > 0
    ? Math.round(vocabRows.reduce((s, v) => s + v.mastery, 0) / vocabRows.length)
    : 0;

  const ctx: LearningContext = {
    userId,
    displayName:      user.displayName,
    cefrLevel:        user.cefrLevel,
    goal:             user.goal,
    domain:           user.domain,
    accentPreference: user.accentPreference,
    nativeLanguage:   user.nativeLanguage ?? null,
    topErrors,
    errorFrequency,
    errorTrend,
    totalErrors:      allErrors.length,
    lessonsCompleted: progress.filter((p) => p.status === "completed").length,
    weakCategories,
    strongCategories,
    vocabularySize:   vocabRows.length,
    avgMastery,
    xpTotal:          user.xpTotal,
    streakDays:       user.streakDays,
  };

  return ctx;
}
