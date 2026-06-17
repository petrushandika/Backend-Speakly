import { z } from "zod";
import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../trpc";
import { db } from "../db";
import { users } from "../db/schema";

const GOAL_VALUES = ["general", "business", "tech", "academic", "travel", "ielts"] as const;
const ACCENT_VALUES = ["american", "british", "australian", "neutral"] as const;
const CEFR_VALUES = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;

export const usersRouter = router({
  getProfile: protectedProcedure.query(async ({ ctx }) => {
    const user = await db.query.users.findFirst({
      where: eq(users.authId, ctx.userId),
    });
    if (!user) throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
    return user;
  }),

  createProfile: protectedProcedure
    .input(
      z.object({
        email:            z.string().email(),
        displayName:      z.string().min(1).max(50),
        cefrLevel:        z.enum(CEFR_VALUES).default("B1"),
        goal:             z.enum(GOAL_VALUES).default("general"),
        accentPreference: z.enum(ACCENT_VALUES).default("american"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await db.query.users.findFirst({
        where: eq(users.authId, ctx.userId),
      });
      if (existing) return existing;

      const [created] = await db
        .insert(users)
        .values({
          authId:           ctx.userId,
          email:            input.email,
          displayName:      input.displayName,
          cefrLevel:        input.cefrLevel,
          goal:             input.goal,
          accentPreference: input.accentPreference,
        })
        .returning();

      return created;
    }),

  updateProfile: protectedProcedure
    .input(
      z.object({
        displayName:      z.string().min(1).max(50).optional(),
        goal:             z.enum(GOAL_VALUES).optional(),
        accentPreference: z.enum(ACCENT_VALUES).optional(),
        cefrLevel:        z.enum(CEFR_VALUES).optional(),
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
