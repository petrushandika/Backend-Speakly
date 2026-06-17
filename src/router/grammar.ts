import { z } from "zod";
import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../trpc";
import { db } from "../db";
import { userErrors, users } from "../db/schema";

export const grammarRouter = router({
  getErrors: protectedProcedure
    .input(z.object({ category: z.string().optional() }).optional())
    .query(async ({ ctx }) => {
      const user = await db.query.users.findFirst({
        where: eq(users.authId, ctx.userId),
        columns: { id: true },
      });
      if (!user) return [];

      return db.query.userErrors.findMany({
        where: eq(userErrors.userId, user.id),
        orderBy: (e, { desc }) => desc(e.createdAt),
        limit: 50,
      });
    }),

  saveError: protectedProcedure
    .input(
      z.object({
        errorCategory: z.string(),
        originalText:  z.string(),
        correctedText: z.string().optional(),
        context:       z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const user = await db.query.users.findFirst({
        where: eq(users.authId, ctx.userId),
        columns: { id: true },
      });
      if (!user) throw new TRPCError({ code: "UNAUTHORIZED" });

      const [error] = await db
        .insert(userErrors)
        .values({
          userId:        user.id,
          errorCategory: input.errorCategory,
          originalText:  input.originalText,
          correctedText: input.correctedText,
          context:       input.context,
        })
        .returning();

      return error;
    }),

  saveBatch: protectedProcedure
    .input(
      z.array(
        z.object({
          errorCategory: z.string(),
          originalText:  z.string(),
          correctedText: z.string().optional(),
          context:       z.string().optional(),
        }),
      ).min(1).max(20),
    )
    .mutation(async ({ ctx, input }) => {
      const user = await db.query.users.findFirst({
        where: eq(users.authId, ctx.userId),
        columns: { id: true },
      });
      if (!user) throw new TRPCError({ code: "UNAUTHORIZED" });

      await db.insert(userErrors).values(
        input.map((e) => ({
          userId:        user.id,
          errorCategory: e.errorCategory,
          originalText:  e.originalText,
          correctedText: e.correctedText,
          context:       e.context,
        })),
      );

      return { saved: input.length };
    }),
});
