import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { supabase } from "../lib/supabase";
import { TRPCError } from "@trpc/server";

export const lessonsRouter = router({
  getDaily: protectedProcedure.query(async ({ ctx }) => {
    const today = new Date().toISOString().split("T")[0];

    const { data, error } = await supabase
      .from("daily_lessons")
      .select("*, verbs(*), grammar_points(*), reading_passages(*)")
      .eq("auth_id", ctx.userId)
      .eq("lesson_date", today)
      .single();

    if (error || !data) throw new TRPCError({ code: "NOT_FOUND", message: "No lesson for today" });
    return data;
  }),

  complete: protectedProcedure
    .input(
      z.object({
        lessonId: z.string().uuid(),
        activity: z.enum(["verb", "vocab", "grammar", "reading", "speaking"]),
        xp: z.number().int().min(0),
      }),
    )
    .mutation(async ({ input }) => {
      const field = `${input.activity}_done`;
      const xpField = `${input.activity}_xp`;

      const { data, error } = await supabase
        .from("daily_lessons")
        .update({
          [field]: true,
          [`${field}_at`]: new Date().toISOString(),
          [xpField]: input.xp,
        })
        .eq("id", input.lessonId)
        .select()
        .single();

      if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
      return data;
    }),
});
