import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import { complete } from "../services/groq";
import { buildFeedbackPrompt, buildGrammarPrompt, buildQuizPrompt } from "../lib/prompts";
import { supabase } from "../lib/supabase";

export const aiRouter = router({
  analyzeFeedback: protectedProcedure
    .input(
      z.object({
        transcript: z.string().min(10).max(5000),
        topic: z.string(),
        activityType: z.enum(["daily_challenge", "ai_call", "peer_room"]).default("ai_call"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { data: user } = await supabase
        .from("users")
        .select("cefr_level")
        .eq("auth_id", ctx.userId)
        .single();

      const prompt = buildFeedbackPrompt(
        input.transcript,
        input.topic,
        user?.cefr_level ?? "B1",
      );

      const raw = await complete(
        [{ role: "user", content: prompt }],
        { model: "primary", temperature: 0.2 },
      );

      let feedback: Record<string, unknown>;
      try {
        feedback = JSON.parse(raw);
      } catch {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "AI returned invalid response",
        });
      }

      // Save errors to user_errors table
      const errors = (feedback.grammar_errors as Array<{
        error: string;
        correction: string;
        category: string;
        explanation: string;
      }>) ?? [];

      if (errors.length > 0) {
        await supabase.from("user_errors").insert(
          errors.map((e) => ({
            user_id: ctx.userId,
            error_type: "grammar",
            error_category: e.category,
            error_text: e.error,
            correct_form: e.correction,
            explanation: e.explanation,
            source_activity: input.activityType,
          })),
        );
      }

      return feedback;
    }),

  generateQuiz: protectedProcedure
    .input(
      z.object({
        topic: z.string(),
        count: z.number().int().min(1).max(10).default(3),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { data: user } = await supabase
        .from("users")
        .select("cefr_level")
        .eq("auth_id", ctx.userId)
        .single();

      const { data: errors } = await supabase
        .from("user_errors")
        .select("error_category")
        .eq("user_id", ctx.userId)
        .order("created_at", { ascending: false })
        .limit(20);

      const topErrors = [
        ...new Set(errors?.map((e) => e.error_category) ?? []),
      ].slice(0, 3);

      const prompt = buildQuizPrompt(
        input.topic,
        user?.cefr_level ?? "B1",
        input.count,
        topErrors,
      );

      const raw = await complete(
        [{ role: "user", content: prompt }],
        { model: "primary", temperature: 0.5 },
      );

      try {
        return JSON.parse(raw);
      } catch {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "AI returned invalid response",
        });
      }
    }),

  explainGrammar: protectedProcedure
    .input(z.object({ grammarPoint: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const { data: user } = await supabase
        .from("users")
        .select("cefr_level, domain")
        .eq("auth_id", ctx.userId)
        .single();

      const prompt = buildGrammarPrompt(
        input.grammarPoint,
        user?.cefr_level ?? "B1",
        user?.domain ?? "general",
      );

      const raw = await complete(
        [{ role: "user", content: prompt }],
        { model: "primary", temperature: 0.3 },
      );

      try {
        return JSON.parse(raw);
      } catch {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "AI returned invalid response",
        });
      }
    }),
});
