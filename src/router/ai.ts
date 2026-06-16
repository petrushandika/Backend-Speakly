import { z } from "zod";
import { eq, desc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../trpc";
import { db } from "../db";
import { users, userErrors } from "../db/schema";
import { complete } from "../services/groq";
import { buildFeedbackPrompt, buildGrammarPrompt, buildQuizPrompt } from "../lib/prompts";

export const aiRouter = router({
  analyzeFeedback: protectedProcedure
    .input(
      z.object({
        transcript:   z.string().min(10).max(5000),
        topic:        z.string(),
        activityType: z.enum(["daily_challenge", "ai_call", "peer_room"]).default("ai_call"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const user = await db.query.users.findFirst({
        where: eq(users.authId, ctx.userId),
        columns: { id: true, cefrLevel: true },
      });

      const prompt = buildFeedbackPrompt(
        input.transcript,
        input.topic,
        user?.cefrLevel ?? "B1",
      );

      const raw = await complete([{ role: "user", content: prompt }], {
        model: "primary",
        temperature: 0.2,
      });

      let feedback: Record<string, unknown>;
      try {
        feedback = JSON.parse(raw);
      } catch {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "AI returned invalid response" });
      }

      // Save detected grammar errors
      if (user) {
        const errors = (feedback.grammar_errors as Array<{
          error: string; correction: string; category: string;
        }>) ?? [];

        if (errors.length > 0) {
          await db.insert(userErrors).values(
            errors.map((e) => ({
              userId:        user.id,
              errorCategory: e.category,
              originalText:  e.error,
              correctedText: e.correction,
            })),
          );
        }
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
      const user = await db.query.users.findFirst({
        where: eq(users.authId, ctx.userId),
        columns: { id: true, cefrLevel: true },
      });

      const recentErrors = user
        ? await db.query.userErrors.findMany({
            where: eq(userErrors.userId, user.id),
            orderBy: (e, { desc }) => desc(e.createdAt),
            limit: 20,
            columns: { errorCategory: true },
          })
        : [];

      const topErrors = [...new Set(recentErrors.map((e) => e.errorCategory))].slice(0, 3);

      const prompt = buildQuizPrompt(
        input.topic,
        user?.cefrLevel ?? "B1",
        input.count,
        topErrors,
      );

      const raw = await complete([{ role: "user", content: prompt }], {
        model: "primary",
        temperature: 0.5,
      });

      try {
        return JSON.parse(raw);
      } catch {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "AI returned invalid response" });
      }
    }),

  explainGrammar: protectedProcedure
    .input(z.object({ grammarPoint: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const user = await db.query.users.findFirst({
        where: eq(users.authId, ctx.userId),
        columns: { cefrLevel: true, domain: true },
      });

      const prompt = buildGrammarPrompt(
        input.grammarPoint,
        user?.cefrLevel ?? "B1",
        user?.domain ?? "general",
      );

      const raw = await complete([{ role: "user", content: prompt }], {
        model: "primary",
        temperature: 0.3,
      });

      try {
        return JSON.parse(raw);
      } catch {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "AI returned invalid response" });
      }
    }),
});
