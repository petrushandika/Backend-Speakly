import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { supabase } from "../lib/supabase";
import { TRPCError } from "@trpc/server";

export const vocabularyRouter = router({
  getBank: protectedProcedure.query(async ({ ctx }) => {
    const { data } = await supabase
      .from("srs_cards")
      .select("*, vocabulary_words(*)")
      .eq("user_id", ctx.userId)
      .eq("card_type", "vocabulary")
      .order("created_at", { ascending: false });

    return data ?? [];
  }),

  search: protectedProcedure
    .input(z.object({ query: z.string().min(1) }))
    .query(async ({ input }) => {
      const { data } = await supabase
        .from("vocabulary_words")
        .select("*")
        .textSearch("word", input.query)
        .limit(20);

      return data ?? [];
    }),

  removeFromBank: protectedProcedure
    .input(z.object({ cardId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { error } = await supabase
        .from("srs_cards")
        .delete()
        .eq("id", input.cardId)
        .eq("user_id", ctx.userId);

      if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
      return { success: true };
    }),
});
