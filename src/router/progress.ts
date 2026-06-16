import { eq, desc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../trpc";
import { db } from "../db";
import { users, userProgress, userErrors, flashcards } from "../db/schema";

export const progressRouter = router({
  getSummary: protectedProcedure.query(async ({ ctx }) => {
    const user = await db.query.users.findFirst({
      where: eq(users.authId, ctx.userId),
      columns: {
        xpTotal: true,
        streakDays: true,
        cefrLevel: true,
        goal: true,
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
      where: eq(flashcards.userId, user.id),
      columns: { id: true },
    });

    return { count: due.length };
  }),
});
