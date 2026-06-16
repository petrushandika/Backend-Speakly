import { z } from "zod";
import { eq, and, ilike } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../trpc";
import { db } from "../db";
import { vocabulary, users } from "../db/schema";

export const vocabularyRouter = router({
  getAll: protectedProcedure.query(async ({ ctx }) => {
    const user = await db.query.users.findFirst({
      where: eq(users.authId, ctx.userId),
      columns: { id: true },
    });
    if (!user) return [];

    return db.query.vocabulary.findMany({
      where: eq(vocabulary.userId, user.id),
      orderBy: (v, { desc }) => desc(v.createdAt),
    });
  }),

  search: protectedProcedure
    .input(z.object({ query: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const user = await db.query.users.findFirst({
        where: eq(users.authId, ctx.userId),
        columns: { id: true },
      });
      if (!user) return [];

      return db.query.vocabulary.findMany({
        where: and(
          eq(vocabulary.userId, user.id),
          ilike(vocabulary.word, `%${input.query}%`),
        ),
        limit: 20,
      });
    }),

  add: protectedProcedure
    .input(
      z.object({
        word:       z.string().min(1).max(200),
        definition: z.string().min(1),
        example:    z.string().optional(),
        cefrLevel:  z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const user = await db.query.users.findFirst({
        where: eq(users.authId, ctx.userId),
        columns: { id: true },
      });
      if (!user) throw new TRPCError({ code: "UNAUTHORIZED" });

      const [entry] = await db
        .insert(vocabulary)
        .values({
          userId:     user.id,
          word:       input.word,
          definition: input.definition,
          example:    input.example,
          cefrLevel:  input.cefrLevel,
        })
        .onConflictDoUpdate({
          target: [vocabulary.userId, vocabulary.word],
          set: { definition: input.definition, example: input.example },
        })
        .returning();

      return entry;
    }),

  remove: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const user = await db.query.users.findFirst({
        where: eq(users.authId, ctx.userId),
        columns: { id: true },
      });
      if (!user) throw new TRPCError({ code: "UNAUTHORIZED" });

      await db
        .delete(vocabulary)
        .where(and(eq(vocabulary.id, input.id), eq(vocabulary.userId, user.id)));

      return { success: true };
    }),
});
