import dotenv from "dotenv";
import path from "path";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { lessons } from "../src/db/schema";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const LESSONS = [
  {
    title: "Present Simple vs Present Continuous",
    description: "Learn when to use present simple for habits and present continuous for ongoing actions.",
    cefrLevel: "A2",
    category: "grammar",
    orderIndex: 1,
    content: {
      sections: [
        {
          type: "explanation",
          text: "Use **Present Simple** for routines, facts, and habits. Use **Present Continuous** for actions happening right now or temporary situations.",
        },
        {
          type: "examples",
          items: [
            { en: "I work in Jakarta. (habit)", id: "Saya bekerja di Jakarta. (kebiasaan)" },
            { en: "I am working on a report now. (ongoing)", id: "Saya sedang mengerjakan laporan sekarang. (sedang berlangsung)" },
          ],
        },
        {
          type: "tip",
          text: "State verbs (know, love, believe, want) are rarely used in continuous form.",
        },
      ],
      exercises: [
        { question: "She ___ (study) every day.", answer: "studies" },
        { question: "They ___ (watch) a movie right now.", answer: "are watching" },
        { question: "He ___ (not / like) coffee.", answer: "doesn't like" },
      ],
    },
  },
  {
    title: "Past Simple & Past Continuous",
    description: "Master storytelling in English using past tenses.",
    cefrLevel: "A2",
    category: "grammar",
    orderIndex: 2,
    content: {
      sections: [
        {
          type: "explanation",
          text: "**Past Simple** for completed actions. **Past Continuous** for actions that were in progress when another event happened.",
        },
        {
          type: "examples",
          items: [
            { en: "I watched TV last night.", id: "Saya menonton TV semalam." },
            { en: "I was sleeping when he called.", id: "Saya sedang tidur ketika dia menelepon." },
          ],
        },
      ],
      exercises: [
        { question: "She ___ (read) when I arrived.", answer: "was reading" },
        { question: "We ___ (visit) Bali last year.", answer: "visited" },
      ],
    },
  },
  {
    title: "Modal Verbs: Can, Could, Should, Must",
    description: "Express ability, permission, advice, and obligation in English.",
    cefrLevel: "B1",
    category: "grammar",
    orderIndex: 3,
    content: {
      sections: [
        {
          type: "explanation",
          text: "Modals add meaning to the main verb: **can/could** (ability/possibility), **should** (advice), **must** (strong obligation), **may/might** (possibility).",
        },
        {
          type: "examples",
          items: [
            { en: "You should practice speaking every day.", id: "Kamu sebaiknya berlatih berbicara setiap hari." },
            { en: "You must submit the report by Friday.", id: "Kamu harus mengumpulkan laporan sebelum Jumat." },
            { en: "She might be late today.", id: "Dia mungkin terlambat hari ini." },
          ],
        },
      ],
      exercises: [
        { question: "You look tired. You ___ rest.", answer: "should" },
        { question: "Passengers ___ wear a seatbelt.", answer: "must" },
        { question: "___ you speak Mandarin?", answer: "Can" },
      ],
    },
  },
  {
    title: "Conditionals: Zero, First & Second",
    description: "Talk about real and hypothetical situations confidently.",
    cefrLevel: "B1",
    category: "grammar",
    orderIndex: 4,
    content: {
      sections: [
        {
          type: "explanation",
          text: "**Zero**: general truths (If + present, present). **First**: real/likely future (If + present, will). **Second**: hypothetical (If + past, would).",
        },
        {
          type: "examples",
          items: [
            { en: "If you heat water to 100°C, it boils. (zero)", id: "Jika air dipanaskan hingga 100°C, air mendidih. (zero)" },
            { en: "If it rains, I will stay home. (first)", id: "Jika hujan, saya akan tetap di rumah. (first)" },
            { en: "If I had more time, I would travel more. (second)", id: "Jika saya punya lebih banyak waktu, saya akan lebih banyak bepergian. (second)" },
          ],
        },
      ],
      exercises: [
        { question: "If she studies hard, she ___ (pass) the exam.", answer: "will pass" },
        { question: "If I ___ (be) you, I would apologize.", answer: "were" },
      ],
    },
  },
  {
    title: "Business English: Emails & Meetings",
    description: "Professional communication for the workplace.",
    cefrLevel: "B2",
    category: "grammar",
    orderIndex: 5,
    content: {
      sections: [
        {
          type: "explanation",
          text: "Professional English requires formal vocabulary and polite structures. Avoid contractions (don't → do not), use passive voice, and hedge opinions.",
        },
        {
          type: "examples",
          items: [
            { en: "I would like to schedule a meeting.", id: "Saya ingin menjadwalkan rapat." },
            { en: "Please find attached the report.", id: "Terlampir laporannya." },
            { en: "Could you please clarify your position on this matter?", id: "Bisakah Anda menjelaskan posisi Anda dalam hal ini?" },
          ],
        },
        {
          type: "tip",
          text: "Opening: I am writing with regard to... / I hope this email finds you well.\nClosing: Please do not hesitate to contact me. / I look forward to hearing from you.",
        },
      ],
      exercises: [
        { question: "Rewrite informally: 'I wanna know more about the job.'", answer: "I would like to learn more about the position." },
        { question: "Complete: 'I ___ to schedule a call at your earliest convenience.'", answer: "would like" },
      ],
    },
  },
  {
    title: "Phrasal Verbs in Daily Conversation",
    description: "Master 20 essential phrasal verbs used by native speakers.",
    cefrLevel: "B1",
    category: "vocabulary",
    orderIndex: 6,
    content: {
      sections: [
        {
          type: "explanation",
          text: "Phrasal verbs are verb + preposition/adverb combinations with meanings different from the literal parts.",
        },
        {
          type: "examples",
          items: [
            { en: "give up — to stop trying", id: "menyerah" },
            { en: "look forward to — to anticipate", id: "menantikan / tidak sabar menunggu" },
            { en: "run out of — to exhaust supply", id: "kehabisan" },
            { en: "put off — to postpone", id: "menunda" },
            { en: "bring up — to mention a topic", id: "menyebut / memunculkan topik" },
            { en: "come across — to find unexpectedly", id: "menemukan secara tidak sengaja" },
          ],
        },
      ],
      exercises: [
        { question: "I ___ (give) smoking last year.", answer: "gave up" },
        { question: "We ___ (run) milk. Can you buy some?", answer: "ran out of" },
        { question: "Don't ___ (put) the meeting again!", answer: "put off" },
      ],
    },
  },
  {
    title: "Articles: A, An, The",
    description: "One of the trickiest parts of English — master articles once and for all.",
    cefrLevel: "A1",
    category: "grammar",
    orderIndex: 0,
    content: {
      sections: [
        {
          type: "explanation",
          text: "Use **a/an** for first mention or non-specific nouns. Use **the** for specific nouns both speaker and listener know. No article for general plural/uncountable nouns.",
        },
        {
          type: "examples",
          items: [
            { en: "I saw a dog in the park. The dog was brown.", id: "Saya melihat seekor anjing di taman. Anjing itu berwarna coklat." },
            { en: "I like coffee. (general)", id: "Saya suka kopi. (umum)" },
            { en: "The coffee in this shop is great. (specific)", id: "Kopi di toko ini enak. (spesifik)" },
          ],
        },
      ],
      exercises: [
        { question: "She has ___ umbrella.", answer: "an" },
        { question: "___ sun rises in the east.", answer: "The" },
        { question: "I love ___ music. (general)", answer: "—" },
      ],
    },
  },
  {
    title: "Passive Voice",
    description: "Express actions when the doer is unknown or unimportant.",
    cefrLevel: "B1",
    category: "grammar",
    orderIndex: 7,
    content: {
      sections: [
        {
          type: "explanation",
          text: "Passive voice: **be + past participle**. Used when the action is more important than who does it, or when the doer is unknown.",
        },
        {
          type: "examples",
          items: [
            { en: "The report was written by the team.", id: "Laporan itu ditulis oleh tim." },
            { en: "English is spoken worldwide.", id: "Bahasa Inggris digunakan di seluruh dunia." },
            { en: "The package will be delivered tomorrow.", id: "Paket akan dikirim besok." },
          ],
        },
      ],
      exercises: [
        { question: "The cake ___ (eat) by the children.", answer: "was eaten" },
        { question: "These cars ___ (make) in Japan.", answer: "are made" },
        { question: "The email ___ (send) yesterday.", answer: "was sent" },
      ],
    },
  },
];

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("❌ DATABASE_URL not set");
    process.exit(1);
  }

  const client = postgres(url, { ssl: "require", max: 1 });
  const db = drizzle(client);

  console.log(`🌱 Seeding ${LESSONS.length} lessons...\n`);

  let inserted = 0;
  let skipped = 0;

  for (const lesson of LESSONS) {
    try {
      await db.insert(lessons).values(lesson).onConflictDoNothing();
      console.log("✅", lesson.title);
      inserted++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("duplicate") || msg.includes("already exists")) {
        console.log("⏭️  skipped:", lesson.title);
        skipped++;
      } else {
        console.error("❌", lesson.title, "—", msg);
      }
    }
  }

  console.log(`\n✅ Done — ${inserted} inserted, ${skipped} skipped`);
  await client.end();
}

main();
