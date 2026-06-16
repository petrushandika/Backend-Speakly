import { z } from "zod";
import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../trpc";
import { db } from "../db";
import { users } from "../db/schema";

export const usersRouter = router({
  getProfile: protectedProcedure.query(async ({ ctx }) => {
    const user = await db.query.users.findFirst({
      where: eq(users.authId, ctx.userId),
    });
    if (!user) throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
    return user;
  }),

  updateProfile: protectedProcedure
    .input(
      z.object({
        displayName:      z.string().min(1).max(50).optional(),
        goal:             z.enum(["general", "business", "tech", "academic", "travel", "ielts"]).optional(),
        accentPreference: z.enum(["american", "british", "australian", "neutral"]).optional(),
        cefrLevel:        z.enum(["A1", "A2", "B1", "B2", "C1", "C2"]).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [updated] = await db
        .update(users)
        .set({
          ...(input.displayName      && { displayName: input.displayName }),
          ...(input.goal             && { goal: input.goal }),
          ...(input.accentPreference && { accentPreference: input.accentPreference }),
          ...(input.cefrLevel        && { cefrLevel: input.cefrLevel }),
          updatedAt: new Date(),
        })
        .where(eq(users.authId, ctx.userId))
        .returning();

      if (!updated) throw new TRPCError({ code: "NOT_FOUND" });
      return updated;
    }),
});
