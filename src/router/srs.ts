import { z } from "zod";
import { eq, and, lte } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../trpc";
import { db } from "../db";
import { flashcards, users } from "../db/schema";

function calculateNextReview(
  easeFactor: number,
  interval: number,
  repetitions: number,
  quality: number,
): { easeFactor: number; interval: number; repetitions: number } {
  if (quality < 3) return { easeFactor, interval: 1, repetitions: 0 };

  const newEF = Math.max(
    1.3,
    easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)),
  );

  let newInterval: number;
  if (repetitions === 0) newInterval = 1;
  else if (repetitions === 1) newInterval = 6;
  else newInterval = Math.round(interval * newEF);

  return { easeFactor: newEF, interval: newInterval, repetitions: repetitions + 1 };
}

export const srsRouter = router({
  getDue: protectedProcedure.query(async ({ ctx }) => {
    const user = await db.query.users.findFirst({
      where: eq(users.authId, ctx.userId),
      columns: { id: true },
    });
    if (!user) return [];

    return db.query.flashcards.findMany({
      where: and(
        eq(flashcards.userId, user.id),
        lte(flashcards.dueDate, new Date()),
      ),
      limit: 20,
      orderBy: (f, { asc }) => asc(f.dueDate),
    });
  }),

  submitReview: protectedProcedure
    .input(
      z.object({
        cardId:  z.string().uuid(),
        quality: z.number().int().min(0).max(5),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const user = await db.query.users.findFirst({
        where: eq(users.authId, ctx.userId),
        columns: { id: true },
      });
      if (!user) throw new TRPCError({ code: "UNAUTHORIZED" });

      const card = await db.query.flashcards.findFirst({
        where: and(eq(flashcards.id, input.cardId), eq(flashcards.userId, user.id)),
      });
      if (!card) throw new TRPCError({ code: "NOT_FOUND" });

      const next = calculateNextReview(
        card.easeFactor,
        card.intervalDays,
        card.repetitions,
        input.quality,
      );

      const nextDue = new Date();
      nextDue.setDate(nextDue.getDate() + next.interval);

      await db
        .update(flashcards)
        .set({
          easeFactor:   next.easeFactor,
          intervalDays: next.interval,
          repetitions:  next.repetitions,
          dueDate:      nextDue,
        })
        .where(eq(flashcards.id, input.cardId));

      return { success: true, nextIntervalDays: next.interval };
    }),

  addCard: protectedProcedure
    .input(
      z.object({
        front:   z.string().min(1).max(500),
        back:    z.string().min(1).max(500),
        example: z.string().optional(),
        tags:    z.array(z.string()).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const user = await db.query.users.findFirst({
        where: eq(users.authId, ctx.userId),
        columns: { id: true },
      });
      if (!user) throw new TRPCError({ code: "UNAUTHORIZED" });

      const [card] = await db
        .insert(flashcards)
        .values({
          userId:  user.id,
          front:   input.front,
          back:    input.back,
          example: input.example,
          tags:    input.tags ?? [],
        })
        .returning();

      return card;
    }),

  deleteCard: protectedProcedure
    .input(z.object({ cardId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const user = await db.query.users.findFirst({
        where: eq(users.authId, ctx.userId),
        columns: { id: true },
      });
      if (!user) throw new TRPCError({ code: "UNAUTHORIZED" });

      await db
        .delete(flashcards)
        .where(and(eq(flashcards.id, input.cardId), eq(flashcards.userId, user.id)));

      return { success: true };
    }),
});
