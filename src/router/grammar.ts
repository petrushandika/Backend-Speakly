import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { supabase } from "../lib/supabase";
import { TRPCError } from "@trpc/server";

export const grammarRouter = router({
  getAllTenses: protectedProcedure.query(async ({ ctx }) => {
    const { data: tenses } = await supabase
      .from("grammar_points")
      .select("id, title, slug, cefr_level, order_index")
      .eq("category", "tenses")
      .order("order_index");

    const { data: progress } = await supabase
      .from("tense_progress")
      .select("tense_slug, status, mastery_score")
      .eq("user_id", ctx.userId);

    const progressMap = new Map(progress?.map((p) => [p.tense_slug, p]) ?? []);

    return (tenses ?? []).map((t) => ({
      ...t,
      progress: progressMap.get(t.slug) ?? { status: "not_started", mastery_score: 0 },
    }));
  }),

  getTenseBySlug: protectedProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ ctx, input }) => {
      const { data: tense } = await supabase
        .from("grammar_points")
        .select("*")
        .eq("slug", input.slug)
        .single();

      if (!tense) throw new TRPCError({ code: "NOT_FOUND" });

      const { data: progress } = await supabase
        .from("tense_progress")
        .select("*")
        .eq("user_id", ctx.userId)
        .eq("tense_slug", input.slug)
        .single();

      return { tense, progress };
    }),

  submitDrill: protectedProcedure
    .input(
      z.object({
        tenseSlug: z.string(),
        answers: z.array(z.object({ questionId: z.string(), answer: z.string() })),
        correct: z.number().int().min(0),
        total: z.number().int().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const accuracy = (input.correct / input.total) * 100;

      await supabase.from("tense_progress").upsert({
        user_id: ctx.userId,
        tense_slug: input.tenseSlug,
        mastery_score: Math.round(accuracy),
        status: accuracy >= 80 ? "mastered" : "in_progress",
        last_practiced: new Date().toISOString(),
        attempts: supabase.rpc("increment", { x: 1 }),
        correct: supabase.rpc("increment", { x: input.correct }),
      });

      return { accuracy, mastered: accuracy >= 80 };
    }),
});
