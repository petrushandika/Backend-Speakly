import { z } from "zod";
import { eq, and, ilike } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../trpc";
import { db } from "../db";
import { vocabulary, users } from "../db/schema";

export interface StudyWord {
  word: string;
  phonetic: string;
  definition: string;
  example: string;
  category: string;
  cefrLevel: string;
}

const STUDY_WORDS: StudyWord[] = [
  // A1
  { word: "greet", phonetic: "/ɡriːt/", definition: "To say hello to someone", example: "She always greets her colleagues warmly.", category: "social", cefrLevel: "A1" },
  { word: "introduce", phonetic: "/ˌɪn.trəˈdjuːs/", definition: "To present someone to another person", example: "Let me introduce my friend, Sarah.", category: "social", cefrLevel: "A1" },
  { word: "describe", phonetic: "/dɪˈskraɪb/", definition: "To say what something or someone is like", example: "Can you describe your neighborhood?", category: "communication", cefrLevel: "A1" },
  { word: "polite", phonetic: "/pəˈlaɪt/", definition: "Behaving in a respectful and considerate way", example: "It is polite to say thank you.", category: "manners", cefrLevel: "A1" },
  { word: "fluent", phonetic: "/ˈfluː.ənt/", definition: "Able to speak a language easily and accurately", example: "She is fluent in three languages.", category: "language", cefrLevel: "A1" },

  // A2
  { word: "apologize", phonetic: "/əˈpɒl.ə.dʒaɪz/", definition: "To say sorry for something you did wrong", example: "He apologized for being late to the meeting.", category: "social", cefrLevel: "A2" },
  { word: "recommend", phonetic: "/ˌrek.əˈmend/", definition: "To suggest something as being good or suitable", example: "I recommend visiting the old town.", category: "communication", cefrLevel: "A2" },
  { word: "suggest", phonetic: "/səˈdʒest/", definition: "To put forward an idea for consideration", example: "She suggested going to a new restaurant.", category: "communication", cefrLevel: "A2" },
  { word: "complaint", phonetic: "/kəmˈpleɪnt/", definition: "An expression of dissatisfaction", example: "He made a complaint about the noisy neighbors.", category: "social", cefrLevel: "A2" },
  { word: "opinion", phonetic: "/əˈpɪn.jən/", definition: "A personal view or belief", example: "In my opinion, learning English is essential.", category: "communication", cefrLevel: "A2" },

  // B1
  { word: "persuade", phonetic: "/pəˈsweɪd/", definition: "To convince someone to do or believe something", example: "She persuaded her manager to approve the budget.", category: "communication", cefrLevel: "B1" },
  { word: "negotiate", phonetic: "/nɪˈɡəʊ.ʃi.eɪt/", definition: "To discuss something to reach an agreement", example: "They negotiated a better deal with the supplier.", category: "business", cefrLevel: "B1" },
  { word: "clarify", phonetic: "/ˈklær.ɪ.faɪ/", definition: "To make something clearer or easier to understand", example: "Could you clarify what you meant by that?", category: "communication", cefrLevel: "B1" },
  { word: "elaborate", phonetic: "/ɪˈlæb.ər.eɪt/", definition: "To explain in more detail", example: "Please elaborate on your proposal.", category: "communication", cefrLevel: "B1" },
  { word: "emphasize", phonetic: "/ˈem.fə.saɪz/", definition: "To give special importance to something", example: "She emphasized the importance of punctuality.", category: "communication", cefrLevel: "B1" },
  { word: "acknowledge", phonetic: "/əkˈnɒl.ɪdʒ/", definition: "To accept or admit the existence of something", example: "He acknowledged the mistake and apologized.", category: "social", cefrLevel: "B1" },
  { word: "collaborate", phonetic: "/kəˈlæb.ər.eɪt/", definition: "To work jointly with others", example: "Our teams collaborate on international projects.", category: "business", cefrLevel: "B1" },

  // B2
  { word: "articulate", phonetic: "/ɑːˈtɪk.jʊ.lət/", definition: "Able to express ideas clearly and effectively", example: "She gave an articulate presentation to the board.", category: "communication", cefrLevel: "B2" },
  { word: "concise", phonetic: "/kənˈsaɪs/", definition: "Short and clear, without unnecessary detail", example: "Keep your email concise and to the point.", category: "communication", cefrLevel: "B2" },
  { word: "convey", phonetic: "/kənˈveɪ/", definition: "To communicate or make known a feeling or idea", example: "His tone conveyed deep frustration.", category: "communication", cefrLevel: "B2" },
  { word: "implication", phonetic: "/ˌɪm.plɪˈkeɪ.ʃən/", definition: "A conclusion that can be drawn from something", example: "The implications of this decision are serious.", category: "critical thinking", cefrLevel: "B2" },
  { word: "perspective", phonetic: "/pəˈspek.tɪv/", definition: "A particular attitude or point of view", example: "We need to consider the customer's perspective.", category: "critical thinking", cefrLevel: "B2" },
  { word: "comprehensive", phonetic: "/ˌkɒm.prɪˈhen.sɪv/", definition: "Including all or nearly all aspects", example: "The report provides a comprehensive analysis.", category: "academic", cefrLevel: "B2" },

  // C1
  { word: "nuance", phonetic: "/ˈnjuː.ɑːns/", definition: "A subtle difference in meaning or expression", example: "He appreciated the nuance in her argument.", category: "language", cefrLevel: "C1" },
  { word: "rhetoric", phonetic: "/ˈret.ər.ɪk/", definition: "The art of effective or persuasive speaking", example: "His rhetoric impressed everyone in the debate.", category: "communication", cefrLevel: "C1" },
  { word: "pragmatic", phonetic: "/præɡˈmæt.ɪk/", definition: "Dealing with things practically rather than theoretically", example: "We need a pragmatic approach to solve this.", category: "critical thinking", cefrLevel: "C1" },
  { word: "mitigate", phonetic: "/ˈmɪt.ɪ.ɡeɪt/", definition: "To make something less severe or serious", example: "These measures will help mitigate the risks.", category: "academic", cefrLevel: "C1" },
];

function getStudyWordsForLevel(cefrLevel: string): StudyWord[] {
  const order = ["A1", "A2", "B1", "B2", "C1", "C2"];
  const idx = order.indexOf(cefrLevel);
  // Show words at current level + one below
  const levels = idx > 0 ? [order[idx - 1], cefrLevel] : [cefrLevel];
  return STUDY_WORDS.filter((w) => levels.includes(w.cefrLevel));
}

export const vocabularyRouter = router({
  getStudyList: protectedProcedure.query(async ({ ctx }) => {
    const user = await db.query.users.findFirst({
      where: eq(users.authId, ctx.userId),
      columns: { cefrLevel: true },
    });
    return getStudyWordsForLevel(user?.cefrLevel ?? "B1");
  }),

  getAll: protectedProcedure.query(async ({ ctx }) => {
    const user = await db.query.users.findFirst({
      where: eq(users.authId, ctx.userId),
      columns: { id: true },
    });
    if (!user) return [];

    return db.query.vocabulary.findMany({
      where: eq(vocabulary.userId, user.id),
      orderBy: (v, { desc }) => desc(v.createdAt),
    });
  }),

  search: protectedProcedure
    .input(z.object({ query: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const user = await db.query.users.findFirst({
        where: eq(users.authId, ctx.userId),
        columns: { id: true },
      });
      if (!user) return [];

      return db.query.vocabulary.findMany({
        where: and(
          eq(vocabulary.userId, user.id),
          ilike(vocabulary.word, `%${input.query}%`),
        ),
        limit: 20,
      });
    }),

  add: protectedProcedure
    .input(
      z.object({
        word:       z.string().min(1).max(200),
        definition: z.string().min(1),
        example:    z.string().optional(),
        cefrLevel:  z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const user = await db.query.users.findFirst({
        where: eq(users.authId, ctx.userId),
        columns: { id: true },
      });
      if (!user) throw new TRPCError({ code: "UNAUTHORIZED" });

      const [entry] = await db
        .insert(vocabulary)
        .values({
          userId:     user.id,
          word:       input.word,
          definition: input.definition,
          example:    input.example,
          cefrLevel:  input.cefrLevel,
        })
        .onConflictDoUpdate({
          target: [vocabulary.userId, vocabulary.word],
          set: { definition: input.definition, example: input.example },
        })
        .returning();

      return entry;
    }),

  remove: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const user = await db.query.users.findFirst({
        where: eq(users.authId, ctx.userId),
        columns: { id: true },
      });
      if (!user) throw new TRPCError({ code: "UNAUTHORIZED" });

      await db
        .delete(vocabulary)
        .where(and(eq(vocabulary.id, input.id), eq(vocabulary.userId, user.id)));

      return { success: true };
    }),
});
