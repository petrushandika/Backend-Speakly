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
  {
    title: "Advanced Inversions",
    description: "Use inversion to add emphasis and rhetorical flair to your sentences.",
    cefrLevel: "C1",
    category: "grammar",
    orderIndex: 8,
    content: {
      sections: [
        {
          type: "explanation",
          text: "When starting a sentence with a negative or limiting adverb (e.g., rarely, never, seldom, little), invert the subject and auxiliary verb for emphasis.",
        },
        {
          type: "examples",
          items: [
            { en: "Rarely have I seen such a beautiful sunset.", id: "Jarang sekali saya melihat matahari terbenam seindah itu." },
            { en: "Not only did she win the competition, but she also broke the record.", id: "Tidak hanya dia memenangkan kompetisi, tetapi dia juga memecahkan rekor." },
            { en: "Little did he know that the surprise was waiting for him.", id: "Sedikit yang dia tahu bahwa kejutan sedang menunggunya." },
          ],
        },
        {
          type: "tip",
          text: "Inversions are highly formal and are mostly used in academic writing, literature, and formal speeches.",
        },
      ],
      exercises: [
        { question: "Never ___ (I / see) such dedication.", answer: "have I seen" },
        { question: "Not only ___ (he / forget) his keys, but he also lost his wallet.", answer: "did he forget" },
      ],
    },
  },
  {
    title: "Past Modals of Deduction",
    description: "Express certainty, possibility, and regret about past events.",
    cefrLevel: "C1",
    category: "grammar",
    orderIndex: 9,
    content: {
      sections: [
        {
          type: "explanation",
          text: "Use **must have + V3** for past certainty, **might/may/could have + V3** for past possibility, and **should have + V3** for past regrets or unfulfilled expectations.",
        },
        {
          type: "examples",
          items: [
            { en: "He must have forgotten our meeting.", id: "Dia pasti lupa tentang pertemuan kita." },
            { en: "I should have studied harder.", id: "Saya seharusnya belajar lebih giat." },
            { en: "They could have won if they had tried harder.", id: "Mereka bisa saja menang jika mereka berusaha lebih keras." },
          ],
        },
      ],
      exercises: [
        { question: "She isn't here yet. She ___ (must / miss) the train.", answer: "must have missed" },
        { question: "I ___ (should / tell) him the truth, but I didn't.", answer: "should have told" },
      ],
    },
  },
  {
    title: "Cleft Sentences for Emphasis",
    description: "Restructure sentences to highlight specific information.",
    cefrLevel: "C2",
    category: "grammar",
    orderIndex: 10,
    content: {
      sections: [
        {
          type: "explanation",
          text: "Cleft sentences use introductory phrases like **It is/was... that/who** or **What... is/was** to focus on a particular part of a sentence.",
        },
        {
          type: "examples",
          items: [
            { en: "It was John who made the final decision.", id: "John-lah yang membuat keputusan akhir." },
            { en: "What I really need is a long vacation.", id: "Yang benar-benar saya butuhkan adalah liburan panjang." },
            { en: "It is the economy that worries the voters most.", id: "Ekonomi-lah yang paling mengkhawatirkan para pemilih." },
          ],
        },
      ],
      exercises: [
        { question: "Rewrite: 'I love her smile.' -> '___ is her smile.'", answer: "What I love" },
        { question: "Rewrite: 'The manager fixed the issue.' -> 'It ___ who fixed the issue.'", answer: "was the manager" },
      ],
    },
  },
  {
    title: "Advanced Idiomatic Expressions",
    description: "Sound like a native speaker using advanced C2 idioms.",
    cefrLevel: "C2",
    category: "vocabulary",
    orderIndex: 11,
    content: {
      sections: [
        {
          type: "explanation",
          text: "At C2 level, idioms often rely on metaphors that don't translate literally. Using them correctly shows mastery of English nuance.",
        },
        {
          type: "examples",
          items: [
            { en: "To play devil's advocate (to argue the opposite side for the sake of debate).", id: "Bermain sebagai pengacara iblis (berargumen di pihak lawan demi perdebatan)." },
            { en: "To sit on the fence (to remain neutral).", id: "Duduk di atas pagar (bersikap netral)." },
            { en: "To cut to the chase (to get to the point).", id: "Langsung ke intinya." },
          ],
        },
      ],
      exercises: [
        { question: "Stop wasting time and ___ (cut to the chase).", answer: "cut to the chase" },
        { question: "He never takes a side; he always ___.", answer: "sits on the fence" },
      ],
    },
  },
  {
    title: "S-P-O-K: Basic Sentence Structure",
    description: "Learn how to build correct English sentences using Subject, Predicate, Object, and Adverb.",
    cefrLevel: "A1",
    category: "grammar",
    orderIndex: -2,
    content: {
      sections: [
        {
          type: "explanation",
          text: "In English, the basic sentence structure is **S-P-O-K** (Subjek, Predikat, Objek, Keterangan) or **S-V-O-A** (Subject, Verb, Object, Adverb).\n\n- **Subject**: Who is doing the action (I, You, She, He, John).\n- **Predicate/Verb**: What the action is (eat, study, go).\n- **Object**: Who/what receives the action (an apple, English).\n- **Adverb**: Where, when, or how the action happens (in the kitchen, every day).",
        },
        {
          type: "examples",
          items: [
            { en: "I (S) study (P) English (O) every day (K).", id: "Saya belajar bahasa Inggris setiap hari." },
            { en: "She (S) eats (P) an apple (O) in the morning (K).", id: "Dia makan sebuah apel di pagi hari." },
            { en: "They (S) play (P) football (O) at the park (K).", id: "Mereka bermain sepak bola di taman." },
          ],
        },
        {
          type: "tip",
          text: "Always start with the Subject and the Verb! In English, you cannot usually drop the Subject (unlike in some Indonesian informal phrases).",
        },
      ],
      exercises: [
        { question: "Identify the subject: 'My brother plays guitar.'", answer: "My brother" },
        { question: "Fill the verb: 'We ___ (study) English.'", answer: "study" },
        { question: "Rearrange to S-P-O-K: 'pizza / I / at night / eat'", answer: "I eat pizza at night" },
      ],
    },
  },
  {
    title: "Understanding Verb Forms: V1, V2, V3, V-ing",
    description: "Learn the difference between Verb 1 (Present), Verb 2 (Past), Verb 3 (Past Participle), and Verb-ing (Continuous/Gerund).",
    cefrLevel: "A1",
    category: "grammar",
    orderIndex: -1,
    content: {
      sections: [
        {
          type: "explanation",
          text: "Unlike Indonesian, English verbs change depending on **when** the action happens and **how** it is used in a sentence. Here are the 4 main forms of English verbs:\n\n### 1. Verb 1 (Base/Present Form)\nUsed for:\n- **Habits/Routines** (Present Simple): *I play tennis.* / *She plays tennis (with s/es).* \n- **After Modal Verbs** (*can, could, should, must, will, would*): *You must study.* \n- **Commands/Imperatives**: *Go home!* / *Listen to me!*\n- **To-Infinitives** (after verbs like *want, need, decide*): *I want to learn English.*\n\n### 2. Verb 2 (Past Simple Form)\nUsed for:\n- **Completed Actions in the Past** (Past Simple): *I went to Jakarta yesterday.* / *They played soccer last week.*\n\n### 3. Verb 3 (Past Participle Form)\nUsed for:\n- **Completed Actions** (Present/Past Perfect): *I have eaten lunch.* / *She had left before I arrived. (Requires 'have', 'has', or 'had' before the verb).*\n- **Passive Voice** (di-/ter- in Indonesian): *The cake was eaten by John.* / *English is spoken here.*\n\n### 4. Verb-ing (Present Participle / Gerund)\nUsed for:\n- **Ongoing Actions** (Continuous/Progressive): *I am writing an email now.* / *They were sleeping when it rained. (Requires 'be' like 'am/is/are/was/were').*\n- **Gerunds** (Verbs acting as nouns): *Swimming is fun.* / *I enjoy reading.*",
        },
        {
          type: "examples",
          items: [
            { en: "I write (V1) a letter every week. (Habit)", id: "Saya menulis sebuah surat setiap minggu. (Kebiasaan)" },
            { en: "I wrote (V2) a letter yesterday. (Past)", id: "Saya menulis sebuah surat kemarin. (Masa Lalu)" },
            { en: "I have written (V3) a letter. (Perfect/Completed)", id: "Saya sudah menulis sebuah surat. (Sudah Selesai)" },
            { en: "I am writing (V-ing) a letter right now. (Continuous/Ongoing)", id: "Saya sedang menulis sebuah surat sekarang. (Sedang Berlangsung)" }
          ],
        },
        {
          type: "tip",
          text: "Regular verbs simply add '-ed' for Verb 2 and Verb 3 (walk -> walked -> walked). Irregular verbs change completely (go -> went -> gone, write -> wrote -> written) and need to be memorized!",
        },
      ],
      exercises: [
        { question: "What is the V2 of 'go'?", answer: "went" },
        { question: "I ___ (play - V1) football every week.", answer: "play" },
        { question: "She ___ (eat - V2) pizza yesterday.", answer: "ate" },
        { question: "They are ___ (study - V-ing) English now.", answer: "studying" },
        { question: "He has ___ (write - V3) a book.", answer: "written" }
      ],
    },
  }
];

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("❌ DATABASE_URL not set");
    process.exit(1);
  }

  const client = postgres(url, { ssl: "require", max: 1 });
  const db = drizzle(client);

  console.log("🧹 Clearing old lessons...");
  await db.delete(lessons);

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
