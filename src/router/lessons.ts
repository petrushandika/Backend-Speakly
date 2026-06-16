import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../trpc";
import { db } from "../db";
import { lessons, userProgress, users } from "../db/schema";

export const lessonsRouter = router({
  getAll: protectedProcedure
    .input(z.object({ cefrLevel: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const user = await db.query.users.findFirst({
        where: eq(users.authId, ctx.userId),
        columns: { id: true, cefrLevel: true },
      });

      const allLessons = await db.query.lessons.findMany({
        where: and(
          eq(lessons.isActive, true),
          input?.cefrLevel
            ? eq(lessons.cefrLevel, input.cefrLevel)
            : user?.cefrLevel
              ? eq(lessons.cefrLevel, user.cefrLevel)
              : undefined,
        ),
        orderBy: (l, { asc }) => asc(l.orderIndex),
      });

      if (!user) return allLessons.map((l) => ({ ...l, progress: null }));

      const progress = await db.query.userProgress.findMany({
        where: eq(userProgress.userId, user.id),
        columns: { lessonId: true, status: true, score: true, xpEarned: true },
      });

      const progressMap = new Map(progress.map((p) => [p.lessonId, p]));

      return allLessons.map((l) => ({
        ...l,
        progress: progressMap.get(l.id) ?? null,
      }));
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input }) => {
      const lesson = await db.query.lessons.findFirst({
        where: eq(lessons.id, input.id),
      });
      if (!lesson) throw new TRPCError({ code: "NOT_FOUND" });
      return lesson;
    }),

  complete: protectedProcedure
    .input(
      z.object({
        lessonId: z.string().uuid(),
        score:    z.number().int().min(0).max(100),
        xpEarned: z.number().int().min(0),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const user = await db.query.users.findFirst({
        where: eq(users.authId, ctx.userId),
        columns: { id: true },
      });
      if (!user) throw new TRPCError({ code: "UNAUTHORIZED" });

      const [result] = await db
        .insert(userProgress)
        .values({
          userId:      user.id,
          lessonId:    input.lessonId,
          status:      "completed",
          score:       input.score,
          xpEarned:    input.xpEarned,
          completedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: [userProgress.userId, userProgress.lessonId],
          set: {
            status:      "completed",
            score:       input.score,
            xpEarned:    input.xpEarned,
            completedAt: new Date(),
          },
        })
        .returning();

      // Add XP to user total
      await db
        .update(users)
        .set({ xpTotal: db.$count(userProgress) })
        .where(eq(users.id, user.id));

      return result;
    }),
});
