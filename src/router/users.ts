import { z } from "zod";
import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../trpc";
import { db } from "../db";
import { users } from "../db/schema";
import { supabase } from "../lib/supabase";

const GOAL_VALUES = [
  "general", "business", "tech", "academic", "travel", "ielts",
  "medical", "finance", "creative", "education", "hospitality", "law",
] as const;

const ACCENT_VALUES = [
  "american", "british", "australian", "neutral",
  "indian", "irish", "canadian", "newzealand", "south_african", "singaporean",
] as const;
const CEFR_VALUES   = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;

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
        bio:              z.string().max(200).optional().nullable(),
        nativeLanguage:   z.string().max(50).optional().nullable(),
        country:          z.string().max(60).optional().nullable(),
        avatarUrl:        z.string().url().optional().nullable(),
        goal:             z.enum(GOAL_VALUES).optional(),
        accentPreference: z.enum(ACCENT_VALUES).optional(),
        cefrLevel:        z.enum(CEFR_VALUES).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const set: Record<string, unknown> = { updatedAt: new Date() };

      // goal → also derive domain for AI context
      const GOAL_DOMAIN: Record<string, string> = {
        general:     "general",     business:    "business",
        tech:        "technology",  academic:    "academic",
        travel:      "travel",      ielts:       "academic",
        medical:     "medical",     finance:     "finance",
        creative:    "creative",    education:   "education",
        hospitality: "hospitality", law:         "law",
      };

      if (input.displayName      != null) set.displayName      = input.displayName;
      if (input.bio              !== undefined) set.bio              = input.bio;
      if (input.nativeLanguage   !== undefined) set.nativeLanguage   = input.nativeLanguage;
      if (input.country          !== undefined) set.country          = input.country;
      if (input.avatarUrl        !== undefined) set.avatarUrl        = input.avatarUrl;
      if (input.goal             != null) {
        set.goal   = input.goal;
        set.domain = GOAL_DOMAIN[input.goal] ?? input.goal;
      }
      if (input.accentPreference != null) set.accentPreference = input.accentPreference;
      if (input.cefrLevel        != null) set.cefrLevel        = input.cefrLevel;

      const [updated] = await db
        .update(users)
        .set(set)
        .where(eq(users.authId, ctx.userId))
        .returning();

      if (!updated) throw new TRPCError({ code: "NOT_FOUND" });
      return updated;
    }),

  // Returns a signed upload URL for avatar — client uploads directly to Supabase Storage
  getAvatarUploadUrl: protectedProcedure
    .input(z.object({ fileExt: z.enum(["jpg", "jpeg", "png", "webp"]) }))
    .mutation(async ({ ctx, input }) => {
      const path = `${ctx.userId}/avatar.${input.fileExt}`;
      const { data, error } = await supabase.storage
        .from("avatars")
        .createSignedUploadUrl(path);

      if (error || !data) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error?.message ?? "Upload failed" });
      }

      // Build the public URL for the uploaded file
      const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);

      return { signedUrl: data.signedUrl, token: data.token, publicUrl };
    }),
});
