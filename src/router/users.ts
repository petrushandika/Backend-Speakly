import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { supabase } from "../lib/supabase";
import { TRPCError } from "@trpc/server";

export const usersRouter = router({
  getProfile: protectedProcedure.query(async ({ ctx }) => {
    const { data, error } = await supabase
      .from("users")
      .select("*, user_skills(*)")
      .eq("auth_id", ctx.userId)
      .single();

    if (error || !data) throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
    return data;
  }),

  updateProfile: protectedProcedure
    .input(
      z.object({
        displayName: z.string().min(1).max(50).optional(),
        goal: z.enum(["general", "business", "tech", "academic", "travel", "ielts"]).optional(),
        accentPreference: z.enum(["american", "british", "australian", "neutral"]).optional(),
        dailyGoalMinutes: z.union([z.literal(10), z.literal(20), z.literal(30), z.literal(45)]).optional(),
        notifyEnabled: z.boolean().optional(),
        notifyTime: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await supabase
        .from("users")
        .update({
          display_name: input.displayName,
          goal: input.goal,
          accent_preference: input.accentPreference,
          daily_goal_minutes: input.dailyGoalMinutes,
          notify_enabled: input.notifyEnabled,
          notify_time: input.notifyTime,
          updated_at: new Date().toISOString(),
        })
        .eq("auth_id", ctx.userId)
        .select()
        .single();

      if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
      return data;
    }),
});
