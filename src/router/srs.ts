import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { supabase } from "../lib/supabase";
import { TRPCError } from "@trpc/server";

function calculateNextReview(
  easeFactor: number,
  interval: number,
  repetitions: number,
  quality: number,
): { easeFactor: number; interval: number; repetitions: number } {
  if (quality < 3) {
    return { easeFactor, interval: 1, repetitions: 0 };
  }

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
    const today = new Date().toISOString().split("T")[0];

    const { data, error } = await supabase
      .from("srs_cards")
      .select("*")
      .eq("user_id", ctx.userId)
      .lte("due_date", today)
      .eq("is_suspended", false)
      .limit(20);

    if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
    return data ?? [];
  }),

  submitReview: protectedProcedure
    .input(
      z.object({
        cardId: z.string().uuid(),
        quality: z.number().int().min(0).max(5),
        responseTimeMs: z.number().int().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { data: card, error: fetchError } = await supabase
        .from("srs_cards")
        .select("ease_factor, interval, repetitions")
        .eq("id", input.cardId)
        .eq("user_id", ctx.userId)
        .single();

      if (fetchError || !card) throw new TRPCError({ code: "NOT_FOUND" });

      const next = calculateNextReview(
        Number(card.ease_factor),
        card.interval,
        card.repetitions,
        input.quality,
      );

      const nextDue = new Date();
      nextDue.setDate(nextDue.getDate() + next.interval);

      await supabase.from("srs_cards").update({
        ease_factor: next.easeFactor,
        interval: next.interval,
        repetitions: next.repetitions,
        quality_last: input.quality,
        due_date: nextDue.toISOString().split("T")[0],
        last_reviewed: new Date().toISOString(),
        times_seen: supabase.rpc("increment", { x: 1 }),
        times_correct: input.quality >= 3 ? supabase.rpc("increment", { x: 1 }) : undefined,
      }).eq("id", input.cardId);

      await supabase.from("srs_reviews").insert({
        user_id: ctx.userId,
        card_id: input.cardId,
        quality: input.quality,
        response_time_ms: input.responseTimeMs,
      });

      return { success: true, nextInterval: next.interval };
    }),

  addCard: protectedProcedure
    .input(
      z.object({
        cardType: z.enum(["vocabulary", "verb", "grammar", "phrase", "idiom"]),
        referenceId: z.string().uuid(),
        cardFace: z.string(),
        cardBack: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await supabase
        .from("srs_cards")
        .insert({
          user_id: ctx.userId,
          card_type: input.cardType,
          reference_id: input.referenceId,
          card_face: input.cardFace,
          card_back: input.cardBack,
        })
        .select()
        .single();

      if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
      return data;
    }),
});
