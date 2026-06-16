import { router, protectedProcedure } from "../trpc";
import { supabase } from "../lib/supabase";
import { TRPCError } from "@trpc/server";

export const progressRouter = router({
  getSummary: protectedProcedure.query(async ({ ctx }) => {
    const { data: user } = await supabase
      .from("users")
      .select("total_xp, current_streak, longest_streak, cefr_level, cefr_score")
      .eq("auth_id", ctx.userId)
      .single();

    const { data: skills } = await supabase
      .from("user_skills")
      .select("*")
      .eq("user_id", ctx.userId)
      .single();

    return { user, skills };
  }),

  getStreak: protectedProcedure.query(async ({ ctx }) => {
    const { data } = await supabase
      .from("daily_progress")
      .select("date, xp_earned, activities_completed, streak_day")
      .eq("user_id", ctx.userId)
      .order("date", { ascending: false })
      .limit(90);

    return data ?? [];
  }),

  getErrors: protectedProcedure.query(async ({ ctx }) => {
    const { data } = await supabase
      .from("user_errors")
      .select("*")
      .eq("user_id", ctx.userId)
      .order("created_at", { ascending: false })
      .limit(100);

    return data ?? [];
  }),

  getSkills: protectedProcedure.query(async ({ ctx }) => {
    const { data, error } = await supabase
      .from("user_skills")
      .select("*")
      .eq("user_id", ctx.userId)
      .single();

    if (error) throw new TRPCError({ code: "NOT_FOUND" });
    return data;
  }),
});
