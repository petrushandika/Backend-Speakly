import { z } from "zod";
import { eq, lte, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../trpc";
import { db } from "../db";
import { users, userProgress, userErrors, flashcards } from "../db/schema";
import { cacheGet, cacheSet } from "../lib/redis";

// ISO date string for today in local timezone (YYYY-MM-DD)
function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export const progressRouter = router({
  getSummary: protectedProcedure.query(async ({ ctx }) => {
    const user = await db.query.users.findFirst({
      where: eq(users.authId, ctx.userId),
      columns: {
        xpTotal:    true,
        streakDays: true,
        cefrLevel:  true,
        goal:       true,
      },
    });
    if (!user) throw new TRPCError({ code: "NOT_FOUND" });
    return user;
  }),

  getErrors: protectedProcedure.query(async ({ ctx }) => {
    const user = await db.query.users.findFirst({
      where: eq(users.authId, ctx.userId),
      columns: { id: true },
    });
    if (!user) return [];

    return db.query.userErrors.findMany({
      where: eq(userErrors.userId, user.id),
      orderBy: (e, { desc }) => desc(e.createdAt),
      limit: 100,
    });
  }),

  getRecentProgress: protectedProcedure.query(async ({ ctx }) => {
    const user = await db.query.users.findFirst({
      where: eq(users.authId, ctx.userId),
      columns: { id: true },
    });
    if (!user) return [];

    return db.query.userProgress.findMany({
      where: eq(userProgress.userId, user.id),
      orderBy: (p, { desc }) => desc(p.completedAt),
      limit: 30,
      with: { lesson: { columns: { title: true, category: true } } },
    });
  }),

  getDueFlashcardsCount: protectedProcedure.query(async ({ ctx }) => {
    const user = await db.query.users.findFirst({
      where: eq(users.authId, ctx.userId),
      columns: { id: true },
    });
    if (!user) return { count: 0 };

    const due = await db.query.flashcards.findMany({
      where: (f, { and }) => and(
        eq(f.userId, user.id),
        lte(f.dueDate, new Date()),
      ),
      columns: { id: true },
    });

    return { count: due.length };
  }),

  // Award XP for any activity (flashcards, speaking, voice sessions, etc.)
  awardXP: protectedProcedure
    .input(z.object({ amount: z.number().int().min(1).max(500) }))
    .mutation(async ({ ctx, input }) => {
      const user = await db.query.users.findFirst({
        where: eq(users.authId, ctx.userId),
        columns: { id: true, xpTotal: true },
      });
      if (!user) throw new TRPCError({ code: "NOT_FOUND" });

      const [updated] = await db
        .update(users)
        .set({ xpTotal: sql`${users.xpTotal} + ${input.amount}` })
        .where(eq(users.id, user.id))
        .returning({ xpTotal: users.xpTotal });

      return { xpTotal: updated?.xpTotal ?? (user.xpTotal + input.amount), awarded: input.amount };
    }),

  // Update daily streak using Redis to track last activity date (independent of profile updates)
  updateStreak: protectedProcedure.mutation(async ({ ctx }) => {
    const user = await db.query.users.findFirst({
      where: eq(users.authId, ctx.userId),
      columns: { id: true, streakDays: true },
    });
    if (!user) throw new TRPCError({ code: "NOT_FOUND" });

    const today = toDateStr(new Date());
    const streakKey = `streak:last:${user.id}`;
    const lastDate = await cacheGet<string>(streakKey);

    // Already updated today — return current streak, no changes
    if (lastDate === today) {
      return { streakDays: user.streakDays };
    }

    // Calculate diff in calendar days
    let diffDays = 0;
    if (lastDate) {
      const last = new Date(lastDate);
      const now  = new Date(today);
      diffDays = Math.round((now.getTime() - last.getTime()) / 86_400_000);
    }

    const newStreak = diffDays === 1
      ? user.streakDays + 1
      : diffDays === 0
        ? user.streakDays
        : 1; // streak broken — reset to 1

    await db
      .update(users)
      .set({ streakDays: newStreak })
      .where(eq(users.id, user.id));

    // Store today's date in Redis — TTL 2 days (ensures idempotency for the day)
    await cacheSet(streakKey, today, 2 * 24 * 60 * 60);

    return { streakDays: newStreak };
  }),
});
