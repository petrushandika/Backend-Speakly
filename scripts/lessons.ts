import dotenv from "dotenv";
import path from "path";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { lessons } from "../src/db/schema";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const LESSONS = [
  // ─── A1 ───────────────────────────────────────────────────────────────────
  {
    title: "S-P-O-K: Basic Sentence Structure",
    description: "Pelajari cara membangun kalimat bahasa Inggris yang benar menggunakan Subjek, Predikat, Objek, dan Keterangan.",
    cefrLevel: "A1", category: "grammar", orderIndex: 1,
    content: {
      sections: [
        { type: "explanation", text: "Dalam bahasa Inggris, struktur dasar kalimat mengikuti pola **S-P-O-K**:\n\n- **Subject (Subjek)**: Siapa pelaku tindakan (I, You, She, He, John).\n- **Predicate/Verb (Predikat)**: Apa tindakannya (eat, study, go).\n- **Object (Objek)**: Siapa/apa penerima tindakan (an apple, English).\n- **Adverb (Keterangan)**: Di mana, kapan, atau bagaimana (in the kitchen, every day)." },
        { type: "examples", items: [
          { en: "I study English every day.", id: "Saya belajar bahasa Inggris setiap hari." },
          { en: "She eats an apple in the morning.", id: "Dia makan sebuah apel di pagi hari." },
          { en: "They play football at the park.", id: "Mereka bermain sepak bola di taman." },
        ]},
        { type: "tip", text: "Selalu mulai kalimat dengan Subjek dan Predikat! Subjek tidak boleh dihilangkan dalam bahasa Inggris." },
      ],
      exercises: [
        { question: "Identify the subject: 'My brother plays guitar.'", answer: "My brother" },
        { question: "Fill the verb: 'We ___ (study) English.'", answer: "study" },
        { question: "Rearrange: 'pizza / I / at night / eat'", answer: "I eat pizza at night" },
      ],
    },
  },
  {
    title: "Understanding Verb Forms: V1, V2, V3, V-ing",
    description: "Pelajari perbedaan antara Verb 1, Verb 2, Verb 3, dan Verb-ing.",
    cefrLevel: "A1", category: "grammar", orderIndex: 2,
    content: {
      sections: [
        { type: "explanation", text: "Bahasa Inggris mengubah bentuk kata kerja berdasarkan waktu:\n\n- **V1 (Base Form)**: Untuk kebiasaan & setelah modal. *I play tennis.*\n- **V2 (Past Simple)**: Tindakan yang selesai di masa lalu. *I played tennis.*\n- **V3 (Past Participle)**: Bersama have/has/had & passive. *I have played tennis.*\n- **V-ing**: Tindakan yang sedang berlangsung. *I am playing tennis.*" },
        { type: "examples", items: [
          { en: "I write (V1) a letter every week.", id: "Saya menulis surat setiap minggu." },
          { en: "I wrote (V2) a letter yesterday.", id: "Saya menulis surat kemarin." },
          { en: "I have written (V3) a letter.", id: "Saya sudah menulis surat." },
          { en: "I am writing (V-ing) a letter right now.", id: "Saya sedang menulis surat sekarang." },
        ]},
        { type: "tip", text: "Regular verbs add '-ed' for V2 & V3. Irregular verbs change completely: go → went → gone." },
      ],
      exercises: [
        { question: "V2 of 'go'?", answer: "went" },
        { question: "She ___ (eat - V2) pizza yesterday.", answer: "ate" },
        { question: "They are ___ (study - V-ing) now.", answer: "studying" },
        { question: "He has ___ (write - V3) a book.", answer: "written" },
      ],
    },
  },
  {
    title: "Articles: A, An, The",
    description: "Salah satu bagian tersulit dalam bahasa Inggris — kuasai penggunaan artikel.",
    cefrLevel: "A1", category: "grammar", orderIndex: 3,
    content: {
      sections: [
        { type: "explanation", text: "- **a/an**: Untuk kata benda tunggal yang belum spesifik. Gunakan *an* sebelum bunyi vokal (a, e, i, o, u).\n- **the**: Untuk kata benda yang sudah spesifik dan diketahui kedua pihak.\n- **Tanpa artikel**: Untuk kata benda jamak atau uncountable yang bersifat umum." },
        { type: "examples", items: [
          { en: "I saw a dog. The dog was brown.", id: "Saya melihat seekor anjing. Anjing itu berwarna coklat." },
          { en: "I like coffee. (general)", id: "Saya suka kopi. (umum — no article)" },
          { en: "The coffee in this shop is great.", id: "Kopi di toko ini enak. (spesifik)" },
        ]},
      ],
      exercises: [
        { question: "She has ___ umbrella.", answer: "an" },
        { question: "___ sun rises in the east.", answer: "The" },
        { question: "I love ___ music. (general)", answer: "—" },
        { question: "He is ___ engineer.", answer: "an" },
      ],
    },
  },
  {
    title: "Pronouns & Possessives",
    description: "Kuasai kata ganti orang dan kepemilikan dalam bahasa Inggris.",
    cefrLevel: "A1", category: "grammar", orderIndex: 4,
    content: {
      sections: [
        { type: "explanation", text: "**Personal Pronouns**: I, you, he, she, it, we, they\n**Object Pronouns**: me, you, him, her, it, us, them\n**Possessive Adjectives**: my, your, his, her, its, our, their\n**Possessive Pronouns**: mine, yours, his, hers, ours, theirs\n\nGunakan possessive adjective sebelum noun, possessive pronoun berdiri sendiri." },
        { type: "examples", items: [
          { en: "She gave him her phone. The phone is hers.", id: "Dia memberinya ponselnya. Ponsel itu miliknya." },
          { en: "This is my book. That one is yours.", id: "Ini buku saya. Yang itu milik kamu." },
          { en: "They love their job.", id: "Mereka menyukai pekerjaan mereka." },
        ]},
      ],
      exercises: [
        { question: "That bag is ___. (belong to me)", answer: "mine" },
        { question: "___ name is Sarah. (she)", answer: "Her" },
        { question: "I gave ___ the book. (to him)", answer: "him" },
        { question: "We love ___ teacher.", answer: "our" },
      ],
    },
  },
  {
    title: "Common Greetings & Introductions",
    description: "Pelajari cara menyapa dan memperkenalkan diri dalam bahasa Inggris sehari-hari.",
    cefrLevel: "A1", category: "speaking", orderIndex: 5,
    content: {
      sections: [
        { type: "explanation", text: "Sapaan umum:\n- **Formal**: Good morning / Good afternoon / Good evening\n- **Informal**: Hi / Hey / What's up?\n- **Responses**: I'm fine, thanks. / Not bad. / Pretty good.\n\nMemenalkan diri:\n- My name is... / I'm... / Nice to meet you. / Pleased to meet you." },
        { type: "examples", items: [
          { en: "A: Good morning! How are you?\nB: I'm doing well, thank you. And you?", id: "A: Selamat pagi! Apa kabar?\nB: Saya baik-baik saja, terima kasih. Kamu?" },
          { en: "A: Hi, I'm Alex. What's your name?\nB: Nice to meet you, Alex. I'm Maria.", id: "A: Hai, saya Alex. Siapa namamu?\nB: Senang bertemu kamu, Alex. Saya Maria." },
        ]},
        { type: "tip", text: "Dalam konteks formal gunakan 'Good morning/afternoon/evening'. Hindari 'Good night' untuk sapaan — itu hanya untuk perpisahan di malam hari." },
      ],
      exercises: [
        { question: "How do you greet someone formally in the morning?", answer: "Good morning" },
        { question: "Complete: 'Nice to ___ you.'", answer: "meet" },
        { question: "Informal response to 'How are you?'", answer: "Not bad / Pretty good / I'm good" },
      ],
    },
  },
  {
    title: "Numbers, Dates & Time",
    description: "Bicarakan angka, tanggal, dan waktu dengan percaya diri.",
    cefrLevel: "A1", category: "vocabulary", orderIndex: 6,
    content: {
      sections: [
        { type: "explanation", text: "**Cardinal numbers**: one, two, three... ten, eleven, twelve, thirteen... twenty, thirty... hundred, thousand.\n**Ordinal numbers**: first (1st), second (2nd), third (3rd), fourth (4th)...\n**Dates**: Month + ordinal OR ordinal + of + month. *July 4th / the 4th of July.*\n**Time**: It's 3 o'clock. / It's half past 3. / It's quarter to 4. / It's 3:45." },
        { type: "examples", items: [
          { en: "My birthday is on the 15th of August.", id: "Ulang tahun saya pada tanggal 15 Agustus." },
          { en: "The meeting starts at half past nine.", id: "Rapat dimulai jam setengah sepuluh." },
          { en: "There are twenty-four hours in a day.", id: "Ada dua puluh empat jam dalam sehari." },
        ]},
      ],
      exercises: [
        { question: "Write in words: 25", answer: "twenty-five" },
        { question: "What is '3:30' in words?", answer: "half past three" },
        { question: "Ordinal of 3?", answer: "third" },
      ],
    },
  },
  {
    title: "Describing People & Things",
    description: "Gunakan adjektiva untuk mendeskripsikan orang, tempat, dan benda.",
    cefrLevel: "A1", category: "vocabulary", orderIndex: 7,
    content: {
      sections: [
        { type: "explanation", text: "Dalam bahasa Inggris, adjektiva (kata sifat) diletakkan **sebelum** kata benda, bukan sesudahnya.\n\nAdjektiva umum:\n- **Size**: big, small, tall, short, long\n- **Age**: young, old, new, ancient\n- **Color**: red, blue, green, yellow\n- **Quality**: good, bad, beautiful, ugly, fast, slow\n- **Personality**: kind, friendly, shy, brave, smart" },
        { type: "examples", items: [
          { en: "She has long black hair and bright blue eyes.", id: "Dia memiliki rambut panjang hitam dan mata biru cerah." },
          { en: "This is a small, cozy restaurant.", id: "Ini adalah restoran yang kecil dan nyaman." },
          { en: "He is a tall, friendly man.", id: "Dia adalah pria yang tinggi dan ramah." },
        ]},
        { type: "tip", text: "Urutan adjektiva: opinion → size → age → shape → color → origin → material → purpose + noun. E.g., 'a beautiful small old round red Italian wooden dining table.'" },
      ],
      exercises: [
        { question: "Correct or wrong? 'She has hair black long.'", answer: "Wrong — 'She has long black hair.'" },
        { question: "Describe your phone in one sentence.", answer: "Open answer — e.g., 'I have a small black smartphone.'" },
      ],
    },
  },
  {
    title: "WH-Questions: Who, What, Where, When, Why, How",
    description: "Pelajari cara membuat pertanyaan dalam bahasa Inggris dengan benar.",
    cefrLevel: "A1", category: "grammar", orderIndex: 8,
    content: {
      sections: [
        { type: "explanation", text: "Rumus WH-Question:\n**WH-word + auxiliary + subject + main verb?**\n\n- **Who**: menanyakan orang → *Who is she?*\n- **What**: menanyakan benda/tindakan → *What do you eat?*\n- **Where**: menanyakan tempat → *Where do you live?*\n- **When**: menanyakan waktu → *When does he arrive?*\n- **Why**: menanyakan alasan → *Why are you late?*\n- **How**: menanyakan cara/kondisi → *How do you feel?*" },
        { type: "examples", items: [
          { en: "Where do you work?", id: "Di mana kamu bekerja?" },
          { en: "What time does the movie start?", id: "Jam berapa film dimulai?" },
          { en: "Why did she leave early?", id: "Mengapa dia pergi lebih awal?" },
          { en: "How long does it take to get there?", id: "Berapa lama untuk sampai ke sana?" },
        ]},
      ],
      exercises: [
        { question: "___ do you live? (place)", answer: "Where" },
        { question: "___ is your favorite food? (thing)", answer: "What" },
        { question: "Form a question: 'He arrives at 9.' → ___?", answer: "When does he arrive?" },
      ],
    },
  },

  // ─── A2 ───────────────────────────────────────────────────────────────────
  {
    title: "Present Simple vs Present Continuous",
    description: "Belajar kapan menggunakan present simple untuk kebiasaan dan present continuous untuk tindakan yang sedang berlangsung.",
    cefrLevel: "A2", category: "grammar", orderIndex: 9,
    content: {
      sections: [
        { type: "explanation", text: "**Present Simple**: Untuk rutinitas, fakta, dan kebiasaan.\n**Present Continuous**: Untuk tindakan yang sedang berlangsung sekarang atau situasi sementara.\n\nSignal words:\n- Simple: always, usually, every day, never, often\n- Continuous: now, at the moment, currently, right now" },
        { type: "examples", items: [
          { en: "I work in Jakarta. (habit)", id: "Saya bekerja di Jakarta. (kebiasaan)" },
          { en: "I am working on a report now. (ongoing)", id: "Saya sedang mengerjakan laporan sekarang." },
          { en: "Water boils at 100°C. (fact)", id: "Air mendidih pada 100°C. (fakta)" },
        ]},
        { type: "tip", text: "State verbs (know, love, believe, want, have, seem) jarang dipakai dalam continuous form." },
      ],
      exercises: [
        { question: "She ___ (study) every day.", answer: "studies" },
        { question: "They ___ (watch) a movie right now.", answer: "are watching" },
        { question: "He ___ (not / like) coffee.", answer: "doesn't like" },
        { question: "I ___ (understand) the lesson. (state verb)", answer: "understand" },
      ],
    },
  },
  {
    title: "Past Simple & Past Continuous",
    description: "Kuasai cara menceritakan kejadian di masa lampau.",
    cefrLevel: "A2", category: "grammar", orderIndex: 10,
    content: {
      sections: [
        { type: "explanation", text: "**Past Simple**: Tindakan yang telah selesai di masa lalu.\n**Past Continuous**: Tindakan yang sedang berlangsung ketika peristiwa lain terjadi.\n\nPola: *was/were + V-ing*\n\nSering digunakan bersama: *when* (saat kejadian terjadi) dan *while* (selama kejadian berlangsung)." },
        { type: "examples", items: [
          { en: "I watched TV last night.", id: "Saya menonton TV semalam." },
          { en: "I was sleeping when he called.", id: "Saya sedang tidur ketika dia menelepon." },
          { en: "While she was cooking, the phone rang.", id: "Sementara dia memasak, telepon berbunyi." },
        ]},
      ],
      exercises: [
        { question: "She ___ (read) when I arrived.", answer: "was reading" },
        { question: "We ___ (visit) Bali last year.", answer: "visited" },
        { question: "It ___ (rain) while I ___ (walk) home.", answer: "was raining / was walking" },
      ],
    },
  },
  {
    title: "Future Tenses: Will & Going To",
    description: "Bicarakan rencana dan prediksi masa depan dengan percaya diri.",
    cefrLevel: "A2", category: "grammar", orderIndex: 11,
    content: {
      sections: [
        { type: "explanation", text: "**will + V1**: Keputusan spontan, prediksi, janji, penawaran.\n**be going to + V1**: Rencana yang sudah direncanakan, prediksi berdasarkan bukti.\n**Present Continuous**: Untuk rencana yang sudah pasti dijadwalkan (dengan orang lain)." },
        { type: "examples", items: [
          { en: "I'll have the steak, please. (spontaneous decision)", id: "Saya akan memesan steak. (keputusan spontan)" },
          { en: "I'm going to study abroad next year. (planned)", id: "Saya akan belajar di luar negeri tahun depan. (sudah direncanakan)" },
          { en: "Look at those clouds — it's going to rain. (prediction from evidence)", id: "Lihat awan itu — sepertinya akan hujan. (prediksi dari bukti)" },
          { en: "I'm meeting Sarah at 3 pm. (arranged)", id: "Saya bertemu Sarah jam 3 sore. (sudah dijadwalkan)" },
        ]},
      ],
      exercises: [
        { question: "A: The phone is ringing! B: I ___ (answer) it.", answer: "I'll answer" },
        { question: "She ___ (go) to university next September. (planned)", answer: "is going to go" },
        { question: "I think it ___ (be) a great party.", answer: "will be" },
      ],
    },
  },
  {
    title: "Present Perfect: Have/Has + V3",
    description: "Hubungkan masa lalu dengan masa kini menggunakan Present Perfect.",
    cefrLevel: "A2", category: "grammar", orderIndex: 12,
    content: {
      sections: [
        { type: "explanation", text: "**Present Perfect** = **have/has + V3**\n\nDigunakan untuk:\n1. Pengalaman hidup (pernah/belum) — *I have visited Paris.*\n2. Tindakan yang baru saja selesai — *She has just finished lunch.*\n3. Tindakan di masa lalu yang masih relevan sekarang — *I have lost my keys (so I can't open the door).*\n\nSignal words: **ever, never, just, already, yet, recently, since, for**" },
        { type: "examples", items: [
          { en: "Have you ever eaten sushi?", id: "Pernahkah kamu makan sushi?" },
          { en: "I've already seen that movie.", id: "Saya sudah menonton film itu." },
          { en: "She hasn't called yet.", id: "Dia belum menelepon." },
          { en: "I have lived here for five years.", id: "Saya sudah tinggal di sini selama lima tahun." },
        ]},
        { type: "tip", text: "Gunakan Past Simple untuk waktu spesifik (yesterday, last year, in 2020). Gunakan Present Perfect jika waktu tidak disebutkan atau tidak penting." },
      ],
      exercises: [
        { question: "I ___ (never / try) bungee jumping.", answer: "have never tried" },
        { question: "She ___ (just / finish) her homework.", answer: "has just finished" },
        { question: "They ___ (live) here since 2018.", answer: "have lived" },
      ],
    },
  },
  {
    title: "Comparatives & Superlatives",
    description: "Bandingkan orang, tempat, dan benda dalam bahasa Inggris.",
    cefrLevel: "A2", category: "grammar", orderIndex: 13,
    content: {
      sections: [
        { type: "explanation", text: "**Comparative** (membandingkan dua hal):\n- Pendek (1-2 suku kata): adj + **-er than** → *taller than, faster than*\n- Panjang (3+ suku kata): **more** + adj + **than** → *more expensive than*\n- Tidak beraturan: good → better, bad → worse, far → further\n\n**Superlative** (yang paling di antara semua):\n- Pendek: **the** + adj + **-est** → *the tallest*\n- Panjang: **the most** + adj → *the most expensive*\n- Tidak beraturan: good → the best, bad → the worst" },
        { type: "examples", items: [
          { en: "She is taller than her brother.", id: "Dia lebih tinggi dari saudaranya." },
          { en: "This hotel is more expensive than that one.", id: "Hotel ini lebih mahal dari yang itu." },
          { en: "Mount Everest is the highest mountain in the world.", id: "Gunung Everest adalah gunung tertinggi di dunia." },
        ]},
      ],
      exercises: [
        { question: "Indonesia is ___ (big) than Singapore.", answer: "bigger" },
        { question: "She is the ___ (intelligent) student in the class.", answer: "most intelligent" },
        { question: "Today is ___ (bad) than yesterday.", answer: "worse" },
      ],
    },
  },
  {
    title: "Prepositions of Time & Place",
    description: "Gunakan in, on, at, by, between, dan lainnya dengan tepat.",
    cefrLevel: "A2", category: "grammar", orderIndex: 14,
    content: {
      sections: [
        { type: "explanation", text: "**Prepositions of TIME**:\n- **in**: bulan, tahun, musim, abad → *in July, in 2024, in summer*\n- **on**: hari, tanggal → *on Monday, on July 4th*\n- **at**: waktu, hari raya → *at 3pm, at midnight, at Christmas*\n- **by**: paling lambat/tidak lebih dari → *by Friday, by 5pm*\n- **for**: durasi → *for two hours*\n- **since**: titik awal → *since Monday, since 2020*\n\n**Prepositions of PLACE**:\n- **in**: di dalam (ruang/kota/negara) → *in the box, in Jakarta*\n- **on**: di atas permukaan → *on the table*\n- **at**: lokasi spesifik → *at the airport, at school*" },
        { type: "examples", items: [
          { en: "The meeting is at 9am on Monday.", id: "Rapat pada jam 9 pagi hari Senin." },
          { en: "She has worked here since 2019.", id: "Dia telah bekerja di sini sejak 2019." },
          { en: "The keys are on the table in the kitchen.", id: "Kunci ada di atas meja di dapur." },
        ]},
      ],
      exercises: [
        { question: "I was born ___ 1998.", answer: "in" },
        { question: "The party starts ___ 7pm.", answer: "at" },
        { question: "Please submit the report ___ Friday.", answer: "by" },
        { question: "She lives ___ a small village ___ the mountains.", answer: "in / in" },
      ],
    },
  },
  {
    title: "Making Requests & Offers",
    description: "Gunakan bahasa sopan untuk meminta, menawarkan, dan meminta izin.",
    cefrLevel: "A2", category: "speaking", orderIndex: 15,
    content: {
      sections: [
        { type: "explanation", text: "**Making Requests** (meminta tolong):\n- Could you...? / Would you mind...? / Can you...? (lebih informal)\n\n**Making Offers** (menawarkan bantuan):\n- Shall I...? / Would you like me to...? / Can I help you with...?\n\n**Asking Permission** (meminta izin):\n- Could I...? / May I...? / Is it okay if I...?\n\n**Formal vs Informal**: Semakin panjang dan tidak langsung = semakin sopan." },
        { type: "examples", items: [
          { en: "Could you please pass the salt?", id: "Bisakah kamu mengoper garamnya?" },
          { en: "Would you mind closing the window?", id: "Apakah kamu keberatan menutup jendela?" },
          { en: "Shall I carry that for you?", id: "Boleh saya membawakan itu?" },
          { en: "May I ask a question?", id: "Boleh saya bertanya?" },
        ]},
      ],
      exercises: [
        { question: "More polite: 'Give me water' →", answer: "Could you please give me some water?" },
        { question: "Offer help: Someone looks lost. →", answer: "Can I help you? / Would you like some help?" },
        { question: "Ask permission to use a phone →", answer: "May I use your phone?" },
      ],
    },
  },
  {
    title: "Countable & Uncountable Nouns",
    description: "Pelajari perbedaan kata benda yang bisa dihitung dan tidak.",
    cefrLevel: "A2", category: "grammar", orderIndex: 16,
    content: {
      sections: [
        { type: "explanation", text: "**Countable nouns**: Bisa dihitung satu per satu. Punya bentuk tunggal dan jamak.\n- *one apple, two apples / a car, three cars*\n\n**Uncountable nouns**: Tidak bisa dihitung. Tidak punya bentuk jamak. Tidak pakai a/an.\n- *water, rice, information, advice, furniture, money, music*\n\n**Quantifiers**:\n- Countable: many, a few, few, several\n- Uncountable: much, a little, little\n- Keduanya: some, any, a lot of, plenty of, no" },
        { type: "examples", items: [
          { en: "I need some advice. (uncountable — NOT 'an advice')", id: "Saya butuh saran. (tidak bisa dihitung)" },
          { en: "There are a few apples left.", id: "Ada beberapa apel yang tersisa." },
          { en: "We don't have much time.", id: "Kita tidak punya banyak waktu." },
        ]},
      ],
      exercises: [
        { question: "Correct or wrong? 'She gave me an information.'", answer: "Wrong — 'She gave me some information.'" },
        { question: "Countable or uncountable? 'furniture'", answer: "Uncountable" },
        { question: "Fill: 'I don't have ___ money left.'", answer: "much / any" },
      ],
    },
  },

  // ─── B1 ───────────────────────────────────────────────────────────────────
  {
    title: "Modal Verbs: Can, Could, Should, Must",
    description: "Ungkapkan kemampuan, izin, saran, dan kewajiban dalam bahasa Inggris.",
    cefrLevel: "B1", category: "grammar", orderIndex: 17,
    content: {
      sections: [
        { type: "explanation", text: "- **can / could**: kemampuan atau izin (*bisa*) — *I can swim. Could I leave early?*\n- **should / ought to**: saran — *You should see a doctor.*\n- **must / have to**: kewajiban — *You must wear a seatbelt.*\n- **mustn't**: larangan — *You mustn't smoke here.*\n- **don't have to / needn't**: tidak wajib — *You don't have to come if you're busy.*\n- **may / might**: kemungkinan — *It might rain tonight.*" },
        { type: "examples", items: [
          { en: "You should practice speaking every day.", id: "Kamu sebaiknya berlatih berbicara setiap hari." },
          { en: "You must submit the report by Friday.", id: "Kamu harus mengumpulkan laporan sebelum Jumat." },
          { en: "You don't have to wear a tie — it's casual.", id: "Kamu tidak harus memakai dasi — suasananya santai." },
        ]},
      ],
      exercises: [
        { question: "You look tired. You ___ rest.", answer: "should" },
        { question: "Passengers ___ wear a seatbelt.", answer: "must" },
        { question: "You ___ pay — it's free! (no obligation)", answer: "don't have to" },
        { question: "___ you speak Mandarin?", answer: "Can" },
      ],
    },
  },
  {
    title: "Reported Speech",
    description: "Sampaikan apa yang dikatakan orang lain menggunakan indirect speech.",
    cefrLevel: "B1", category: "grammar", orderIndex: 18,
    content: {
      sections: [
        { type: "explanation", text: "Saat menyampaikan ucapan orang lain (reported/indirect speech), kata kerja bergeser satu waktu ke belakang:\n\n| Direct | Reported |\n|--------|----------|\n| am/is/are | was/were |\n| have/has | had |\n| will | would |\n| can | could |\n| may | might |\n\nPronoun dan time expressions juga berubah: *today → that day, tomorrow → the next day, here → there.*" },
        { type: "examples", items: [
          { en: "Direct: 'I am tired.' → Reported: She said that she was tired.", id: "Dia bilang bahwa dia lelah." },
          { en: "Direct: 'I will call you.' → He told me he would call me.", id: "Dia bilang akan menelepon saya." },
          { en: "Direct: 'Can you help me?' → She asked if I could help her.", id: "Dia bertanya apakah saya bisa membantunya." },
        ]},
        { type: "tip", text: "Gunakan 'say' tanpa objek orang atau 'tell' dengan objek orang: *She said (that)... / She told me (that)...*" },
      ],
      exercises: [
        { question: "Direct: 'I live in Jakarta.' → She said she ___ in Jakarta.", answer: "lived" },
        { question: "Direct: 'I will help you.' → He said he ___ help me.", answer: "would" },
        { question: "Direct: 'Are you free tonight?' → She asked if I ___ free that night.", answer: "was" },
      ],
    },
  },
  {
    title: "Relative Clauses: Who, Which, That, Where",
    description: "Gabungkan kalimat dan berikan informasi tambahan menggunakan relative clauses.",
    cefrLevel: "B1", category: "grammar", orderIndex: 19,
    content: {
      sections: [
        { type: "explanation", text: "**Relative clauses** memberikan informasi tambahan tentang kata benda.\n\n- **who / that**: untuk orang → *The man who/that called is my boss.*\n- **which / that**: untuk benda → *The book which/that I borrowed is great.*\n- **where**: untuk tempat → *The restaurant where we met was lovely.*\n- **whose**: untuk kepemilikan → *The student whose essay won the prize is my friend.*\n\n**Defining** (menentukan): Tidak pakai koma — klausa wajib untuk mengidentifikasi.\n**Non-defining** (menambahkan info): Pakai koma — klausa hanya memberikan info tambahan." },
        { type: "examples", items: [
          { en: "The woman who lives next door is a doctor. (defining)", id: "Wanita yang tinggal di sebelah adalah dokter. (menentukan)" },
          { en: "My sister, who lives in London, is visiting next week. (non-defining)", id: "Saudari saya, yang tinggal di London, akan berkunjung minggu depan." },
          { en: "This is the city where I was born.", id: "Ini adalah kota di mana saya lahir." },
        ]},
      ],
      exercises: [
        { question: "The man ___ bag was stolen called the police.", answer: "whose" },
        { question: "Is that the restaurant ___ they serve amazing pasta?", answer: "where" },
        { question: "I prefer movies ___ make me think.", answer: "that" },
      ],
    },
  },
  {
    title: "Conditionals: Zero, First & Second",
    description: "Bicarakan situasi nyata dan hipotetis dengan percaya diri.",
    cefrLevel: "B1", category: "grammar", orderIndex: 20,
    content: {
      sections: [
        { type: "explanation", text: "- **Zero Conditional** (Kebenaran Umum): *If + present simple, present simple.* → Fakta ilmiah & kebiasaan.\n- **First Conditional** (Kemungkinan Nyata): *If + present simple, will + V1.* → Situasi yang mungkin terjadi.\n- **Second Conditional** (Hipotetis/Imajiner): *If + past simple, would + V1.* → Situasi yang tidak mungkin atau tidak nyata." },
        { type: "examples", items: [
          { en: "If you heat water to 100°C, it boils. (zero)", id: "Jika air dipanaskan hingga 100°C, air mendidih." },
          { en: "If it rains, I will stay home. (first)", id: "Jika hujan, saya akan tetap di rumah." },
          { en: "If I had more time, I would travel more. (second)", id: "Jika saya punya lebih banyak waktu, saya akan lebih banyak bepergian." },
        ]},
      ],
      exercises: [
        { question: "If she studies hard, she ___ (pass) the exam.", answer: "will pass" },
        { question: "If I ___ (be) you, I would apologize.", answer: "were" },
        { question: "If you mix red and blue, you ___ (get) purple.", answer: "get" },
      ],
    },
  },
  {
    title: "Phrasal Verbs in Daily Conversation",
    description: "Kuasai 20 phrasal verbs penting yang sering digunakan penutur asli.",
    cefrLevel: "B1", category: "vocabulary", orderIndex: 21,
    content: {
      sections: [
        { type: "explanation", text: "Phrasal verbs = kata kerja + preposisi/adverb. Artinya berbeda dari kata aslinya dan harus dihafalkan.\n\nTips: Pelajari phrasal verbs dalam konteks kalimat, bukan hanya artinya saja." },
        { type: "examples", items: [
          { en: "give up — to stop trying (menyerah)", id: "I gave up trying to fix it myself." },
          { en: "look forward to — to anticipate (menantikan)", id: "I'm looking forward to the holidays." },
          { en: "run out of — to exhaust supply (kehabisan)", id: "We've run out of coffee." },
          { en: "put off — to postpone (menunda)", id: "Don't put off what you can do today." },
          { en: "come across — to find unexpectedly (menemukan tidak sengaja)", id: "I came across an old photo album." },
          { en: "bring up — to mention a topic (menyebut topik)", id: "She brought up an interesting point." },
          { en: "get along with — to have a good relationship (cocok)", id: "I get along well with my coworkers." },
          { en: "figure out — to find a solution (mencari tahu)", id: "I finally figured out the problem." },
        ]},
      ],
      exercises: [
        { question: "I ___ (give) smoking last year.", answer: "gave up" },
        { question: "We ___ (run) milk. Can you buy some?", answer: "ran out of" },
        { question: "Don't ___ (put) the meeting again!", answer: "put off" },
        { question: "I ___ (come) an old friend at the mall.", answer: "came across" },
      ],
    },
  },
  {
    title: "Passive Voice",
    description: "Ungkapkan tindakan ketika pelaku tidak diketahui atau tidak penting.",
    cefrLevel: "B1", category: "grammar", orderIndex: 22,
    content: {
      sections: [
        { type: "explanation", text: "**Passive Voice** = **to be + V3**\n\nDigunakan ketika:\n- Pelaku tidak diketahui\n- Pelaku tidak penting\n- Tindakan itu sendiri yang lebih penting\n- Teks formal/akademis/ilmiah\n\n| Tense | Passive Form |\n|-------|-------------|\n| Present Simple | is/are + V3 |\n| Past Simple | was/were + V3 |\n| Present Perfect | has/have been + V3 |\n| Future (will) | will be + V3 |\n| Modal | modal + be + V3 |" },
        { type: "examples", items: [
          { en: "The report was written by the team.", id: "Laporan itu ditulis oleh tim." },
          { en: "English is spoken worldwide.", id: "Bahasa Inggris digunakan di seluruh dunia." },
          { en: "The package will be delivered tomorrow.", id: "Paket akan dikirim besok." },
          { en: "The error has been fixed.", id: "Kesalahan tersebut telah diperbaiki." },
        ]},
      ],
      exercises: [
        { question: "The cake ___ (eat) by the children.", answer: "was eaten" },
        { question: "These cars ___ (make) in Japan.", answer: "are made" },
        { question: "The proposal ___ (approve) next week.", answer: "will be approved" },
        { question: "The problem ___ (already / solve).", answer: "has already been solved" },
      ],
    },
  },
  {
    title: "Prefixes & Suffixes: Building Vocabulary",
    description: "Pelajari cara membentuk kata baru dari kata yang sudah kamu tahu.",
    cefrLevel: "B1", category: "vocabulary", orderIndex: 23,
    content: {
      sections: [
        { type: "explanation", text: "**Common Prefixes** (di awal kata):\n- **un-** = not → unhappy, unusual, unfair\n- **re-** = again → redo, revisit, rethink\n- **dis-** = opposite → disagree, dishonest\n- **pre-** = before → preview, prepare\n- **mis-** = wrongly → misunderstand, misuse\n- **over-** = too much → overwork, overlook\n\n**Common Suffixes** (di akhir kata):\n- **-tion/-sion** → verb to noun: *decide → decision*\n- **-ment** → verb to noun: *develop → development*\n- **-ful** → adj: *care → careful*\n- **-less** → adj (without): *care → careless*\n- **-ly** → adverb: *quick → quickly*\n- **-er/-or** → person: *teach → teacher*" },
        { type: "examples", items: [
          { en: "communicate → communication → communicative", id: "berkomunikasi → komunikasi → komunikatif" },
          { en: "The project was unsuccessful. (un- + successful)", id: "Proyek itu tidak berhasil." },
          { en: "She misunderstood the instructions.", id: "Dia salah memahami instruksinya." },
        ]},
      ],
      exercises: [
        { question: "Add prefix to make opposite of 'honest'.", answer: "dishonest" },
        { question: "'employ' → noun (the state of having a job)", answer: "employment" },
        { question: "'care' → adjective meaning 'without care'", answer: "careless" },
        { question: "Add prefix: to do again → ___do", answer: "redo" },
      ],
    },
  },
  {
    title: "Collocations: Words That Go Together",
    description: "Kuasai kombinasi kata yang terdengar alami bagi penutur asli.",
    cefrLevel: "B1", category: "vocabulary", orderIndex: 24,
    content: {
      sections: [
        { type: "explanation", text: "Collocation adalah kombinasi kata yang secara alami sering digunakan bersama. Menggunakannya dengan benar membuat bahasamu terdengar lebih alami.\n\n**Verb + Noun collocations:**\n- make a decision / do homework (bukan *make homework*)\n- take a break / have a meeting / give advice\n- pay attention / keep a promise / break a habit\n\n**Adjective + Noun collocations:**\n- strong coffee / heavy rain / high price\n- fast food / hard work / deep sleep" },
        { type: "examples", items: [
          { en: "I need to make a decision by tomorrow.", id: "Saya perlu membuat keputusan sebelum besok." },
          { en: "Could you give me some advice?", id: "Bisakah kamu memberi saya saran?" },
          { en: "It was heavy rain so the match was cancelled.", id: "Hujan deras sehingga pertandingan dibatalkan." },
        ]},
      ],
      exercises: [
        { question: "make or do? ___ a mistake", answer: "make" },
        { question: "make or do? ___ homework", answer: "do" },
        { question: "high or strong? ___ coffee", answer: "strong" },
        { question: "give or make? ___ a speech", answer: "give" },
      ],
    },
  },

  // ─── B2 ───────────────────────────────────────────────────────────────────
  {
    title: "Business English: Emails & Meetings",
    description: "Professional communication for the workplace.",
    cefrLevel: "B2", category: "speaking", orderIndex: 25,
    content: {
      sections: [
        { type: "explanation", text: "Professional English uses formal vocabulary, polite hedging, and indirect structures.\n\n**Email openings**: I am writing with regard to... / Further to our meeting...\n**Email closings**: Please do not hesitate to contact me. / I look forward to hearing from you.\n**Meeting language**: I'd like to propose... / Could we move on to...? / To summarize..." },
        { type: "examples", items: [
          { en: "I would like to schedule a meeting at your earliest convenience.", id: "Saya ingin menjadwalkan rapat sesegera mungkin." },
          { en: "Please find attached the report for your review.", id: "Terlampir laporan untuk ditinjau." },
          { en: "Could you please clarify your position on this matter?", id: "Bisakah Anda menjelaskan posisi Anda dalam hal ini?" },
        ]},
      ],
      exercises: [
        { question: "Formalize: 'I wanna know more about the job.'", answer: "I would like to learn more about the position." },
        { question: "Complete: 'I ___ to schedule a call at your earliest convenience.'", answer: "would like" },
      ],
    },
  },
  {
    title: "Third Conditional & Mixed Conditionals",
    description: "Ungkapkan penyesalan dan situasi kontrafaktual yang kompleks.",
    cefrLevel: "B2", category: "grammar", orderIndex: 26,
    content: {
      sections: [
        { type: "explanation", text: "**Third Conditional** (Masa lalu yang tidak terjadi):\n*If + past perfect, would have + V3*\n→ Situasi yang tidak terjadi di masa lalu & akibatnya.\n\n**Mixed Conditional** (Masa lalu → Masa kini):\n*If + past perfect, would + V1*\n→ Jika sesuatu terjadi/tidak terjadi di masa lalu, kondisi sekarang akan berbeda." },
        { type: "examples", items: [
          { en: "If I had studied harder, I would have passed the exam. (3rd)", id: "Jika saya belajar lebih keras, saya pasti lulus ujian." },
          { en: "If she had taken that job, she wouldn't be unemployed now. (mixed)", id: "Jika dia menerima pekerjaan itu, dia tidak akan menganggur sekarang." },
          { en: "We wouldn't have missed the flight if we had left earlier. (3rd)", id: "Kami tidak akan ketinggalan pesawat jika berangkat lebih awal." },
        ]},
        { type: "tip", text: "Third conditional = menyesali apa yang TIDAK dilakukan di masa lalu. Mixed conditional = bagaimana masa lalu mempengaruhi kondisi saat ini." },
      ],
      exercises: [
        { question: "If I ___ (know), I would have told you.", answer: "had known" },
        { question: "If she ___ (not / miss) the meeting, she would have heard the news.", answer: "hadn't missed" },
        { question: "He would be a doctor now if he ___ (study) medicine.", answer: "had studied" },
      ],
    },
  },
  {
    title: "Discourse Markers & Connectors",
    description: "Buat tulisan dan ucapanmu mengalir lebih kohesif dengan connectors yang tepat.",
    cefrLevel: "B2", category: "writing", orderIndex: 27,
    content: {
      sections: [
        { type: "explanation", text: "**Adding ideas**: furthermore, moreover, in addition, besides, what is more\n**Contrasting**: however, nevertheless, on the other hand, despite, in spite of, although\n**Cause & Effect**: therefore, consequently, as a result, hence, owing to, due to\n**Exemplifying**: for example, for instance, such as, namely\n**Conceding**: admittedly, granted that, it is true that\n**Concluding**: in conclusion, to sum up, overall, all in all" },
        { type: "examples", items: [
          { en: "The project was delayed. However, the final result was excellent.", id: "Proyek tersebut terlambat. Namun, hasilnya sangat baik." },
          { en: "She works hard. Furthermore, she is always on time.", id: "Dia bekerja keras. Selain itu, dia selalu tepat waktu." },
          { en: "Sales dropped. Consequently, we had to cut costs.", id: "Penjualan turun. Akibatnya, kami harus memotong biaya." },
        ]},
      ],
      exercises: [
        { question: "She was tired. ___, she kept working. (contrast)", answer: "Nevertheless / However" },
        { question: "___ the rain, the match continued. (despite)", answer: "Despite" },
        { question: "Connect: 'He studied hard' + 'He passed.' (result)", answer: "He studied hard. As a result, he passed." },
      ],
    },
  },
  {
    title: "Academic Writing & Formal Register",
    description: "Tulis secara formal dan akademis untuk laporan, esai, dan surat resmi.",
    cefrLevel: "B2", category: "writing", orderIndex: 28,
    content: {
      sections: [
        { type: "explanation", text: "**Formal writing rules**:\n1. Hindari kontraksi: *don't → do not, it's → it is*\n2. Hindari bahasa sehari-hari: *get → obtain/receive, big → significant/substantial*\n3. Gunakan passive voice lebih sering\n4. Gunakan hedging untuk membuat klaim lebih berhati-hati: *It appears that, It is suggested that, may, might, could*\n5. Variasikan kalimat: campurkan panjang pendek\n6. Gunakan nominalisasi: *decide → decision, analyze → analysis*" },
        { type: "examples", items: [
          { en: "Informal: 'We found out that...' → Formal: 'It was found that...'", id: "Informal → Formal" },
          { en: "Informal: 'A lot of people think...' → Formal: 'A significant proportion of the population...'", id: "Informal → Formal" },
          { en: "Informal: 'The results show...' → Formal: 'The findings indicate / suggest...'", id: "Informal → Formal" },
        ]},
      ],
      exercises: [
        { question: "Formalize: 'Kids don't get enough sleep.'", answer: "Children do not obtain sufficient sleep." },
        { question: "Nominalize: 'The team decided to...' → 'The ___ was to...'", answer: "decision" },
        { question: "Add hedging: 'This is the reason.' →", answer: "This may be the reason. / It appears that this is the reason." },
      ],
    },
  },
  {
    title: "Narrative Tenses: Telling Stories",
    description: "Gunakan past tenses bersama untuk menceritakan cerita yang kohesif.",
    cefrLevel: "B2", category: "grammar", orderIndex: 29,
    content: {
      sections: [
        { type: "explanation", text: "Untuk menceritakan cerita di masa lalu, gunakan kombinasi:\n\n- **Past Simple**: tindakan utama yang terjadi secara berurutan\n- **Past Continuous**: latar belakang / tindakan yang sedang berlangsung\n- **Past Perfect**: tindakan yang terjadi SEBELUM tindakan utama lainnya\n- **Past Perfect Continuous**: tindakan yang berlangsung sebelum titik waktu tertentu di masa lalu" },
        { type: "examples", items: [
          { en: "When I arrived at the party, most guests had already left. (past perfect = happened before arriving)", id: "Ketika saya tiba di pesta, sebagian besar tamu sudah pergi." },
          { en: "She had been waiting for an hour when he finally showed up.", id: "Dia sudah menunggu selama satu jam ketika dia akhirnya datang." },
          { en: "It was raining when I stepped outside. I grabbed my umbrella and headed to the station.", id: "Sedang hujan ketika saya keluar. Saya mengambil payung dan menuju stasiun." },
        ]},
      ],
      exercises: [
        { question: "By the time I got home, she ___ (already / cook) dinner.", answer: "had already cooked" },
        { question: "I ___ (walk) to work when it suddenly ___ (start) to rain.", answer: "was walking / started" },
      ],
    },
  },
  {
    title: "Expressing Opinions, Agreeing & Disagreeing",
    description: "Perdebatkan dan diskusikan ide dengan percaya diri dalam bahasa Inggris.",
    cefrLevel: "B2", category: "speaking", orderIndex: 30,
    content: {
      sections: [
        { type: "explanation", text: "**Expressing opinions**: In my view... / As far as I'm concerned... / I'm of the opinion that... / It seems to me that...\n**Agreeing**: I couldn't agree more. / That's exactly my point. / Absolutely. / You're spot on.\n**Partially agreeing**: I see what you mean, but... / You have a point, although...\n**Disagreeing politely**: I'm afraid I disagree. / I see it differently. / With all due respect, I don't think..." },
        { type: "examples", items: [
          { en: "In my view, remote work improves productivity.", id: "Menurut saya, bekerja dari rumah meningkatkan produktivitas." },
          { en: "I see what you mean, but there are also drawbacks.", id: "Saya mengerti maksudmu, tetapi ada juga kekurangannya." },
          { en: "With all due respect, I don't think that's accurate.", id: "Dengan hormat, saya rasa itu tidak akurat." },
        ]},
      ],
      exercises: [
        { question: "Politely disagree: 'Social media is always harmful.'", answer: "I see what you mean, but I think it also has many benefits." },
        { question: "Formally express opinion: 'I think English is important.'", answer: "In my view / As far as I'm concerned, English is of great importance." },
      ],
    },
  },

  // ─── C1 ───────────────────────────────────────────────────────────────────
  {
    title: "Advanced Inversions",
    description: "Use inversion to add emphasis and rhetorical flair to your sentences.",
    cefrLevel: "C1", category: "grammar", orderIndex: 31,
    content: {
      sections: [
        { type: "explanation", text: "Starting with a negative or limiting adverb triggers subject-auxiliary inversion:\n\n- **Never / Rarely / Seldom**: *Never have I seen such dedication.*\n- **Not only... but also**: *Not only did she win, but she also broke the record.*\n- **Hardly / Scarcely / No sooner**: *Hardly had I sat down when the alarm rang.*\n- **Only then / Only after**: *Only then did I understand the problem.*" },
        { type: "examples", items: [
          { en: "Rarely have I seen such a beautiful sunset.", id: "Jarang sekali saya melihat matahari terbenam seindah itu." },
          { en: "Not only did she win the competition, but she also broke the record.", id: "Tidak hanya dia memenangkan kompetisi, tetapi juga memecahkan rekor." },
          { en: "Little did he know that a surprise was waiting for him.", id: "Sedikit yang dia tahu kejutan sedang menunggunya." },
        ]},
        { type: "tip", text: "Inversions are highly formal and mostly used in academic writing, literature, and speeches. They add rhetorical power." },
      ],
      exercises: [
        { question: "Never ___ (I / see) such dedication.", answer: "have I seen" },
        { question: "Not only ___ (he / forget) his keys, but he also lost his wallet.", answer: "did he forget" },
        { question: "Scarcely ___ (she / arrive) when the meeting started.", answer: "had she arrived" },
      ],
    },
  },
  {
    title: "Past Modals of Deduction",
    description: "Express certainty, possibility, and regret about past events.",
    cefrLevel: "C1", category: "grammar", orderIndex: 32,
    content: {
      sections: [
        { type: "explanation", text: "- **must have + V3**: deduction — almost certain → *He must have forgotten.*\n- **can't have + V3**: near impossibility → *She can't have said that.*\n- **might/may/could have + V3**: possibility → *They may have been delayed.*\n- **should have + V3**: criticism/regret → *I should have studied harder.*\n- **needn't have + V3**: unnecessary past action → *You needn't have brought a gift.*" },
        { type: "examples", items: [
          { en: "He must have forgotten our meeting.", id: "Dia pasti lupa tentang pertemuan kita." },
          { en: "I should have studied harder — I almost failed.", id: "Saya seharusnya belajar lebih giat — hampir gagal." },
          { en: "She can't have seen the email yet — she just logged in.", id: "Dia pasti belum melihat emailnya — dia baru saja login." },
        ]},
      ],
      exercises: [
        { question: "She isn't here. She ___ (must / miss) the train.", answer: "must have missed" },
        { question: "I ___ (should / tell) him the truth.", answer: "should have told" },
        { question: "He looks confused. He ___ (may / not understand) the instructions.", answer: "may not have understood" },
      ],
    },
  },
  {
    title: "Nominalisation: Transforming Verbs to Nouns",
    description: "Make your academic writing more sophisticated with nominalisation.",
    cefrLevel: "C1", category: "writing", orderIndex: 33,
    content: {
      sections: [
        { type: "explanation", text: "**Nominalisation** = converting verbs/adjectives into nouns. Used extensively in academic, formal, and professional writing to create more concise, impersonal sentences.\n\nCommon patterns:\n- Verb → Noun: *decide → decision, investigate → investigation, achieve → achievement*\n- Adjective → Noun: *important → importance, different → difference, accurate → accuracy*\n\nWhy use it?\n- More formal and concise\n- Creates distance/objectivity\n- Reduces reliance on personal pronouns" },
        { type: "examples", items: [
          { en: "Informal: 'We decided to expand.' → Formal: 'A decision was made to expand.'", id: "Informal → Formal dengan nominalisasi." },
          { en: "Informal: 'The team investigated the problem.' → Formal: 'An investigation into the problem was conducted.'", id: "Informal → Formal." },
          { en: "Informal: 'It is important that we improve.' → Formal: 'The importance of improvement cannot be overstated.'", id: "Informal → Formal." },
        ]},
      ],
      exercises: [
        { question: "Nominalise: 'We analyzed the data.' →", answer: "An analysis of the data was conducted." },
        { question: "Verb to noun: 'achieve' →", answer: "achievement" },
        { question: "Adj to noun: 'significant' →", answer: "significance" },
      ],
    },
  },
  {
    title: "Hedging Language in Academic Writing",
    description: "Sound precise and appropriately cautious in formal writing and presentations.",
    cefrLevel: "C1", category: "writing", orderIndex: 34,
    content: {
      sections: [
        { type: "explanation", text: "**Hedging** = expressing caution, uncertainty, or limitation in claims. Essential in academic writing to avoid overgeneralizing.\n\n**Modal verbs**: may, might, could, would\n**Adverbs**: arguably, possibly, seemingly, apparently, likely\n**Verbs**: appears, seems, suggests, indicates, tends to\n**Phrases**: It is possible that / It has been suggested that / There is evidence to suggest that / In certain circumstances..." },
        { type: "examples", items: [
          { en: "Too strong: 'Social media causes depression.' → Hedged: 'Social media may contribute to depression in certain individuals.'", id: "Klaim kuat → Klaim berhati-hati." },
          { en: "The findings suggest that regular exercise could improve mental wellbeing.", id: "Temuan menunjukkan bahwa olahraga teratur mungkin dapat meningkatkan kesejahteraan mental." },
          { en: "It appears that the results are largely influenced by external factors.", id: "Tampaknya hasilnya sangat dipengaruhi oleh faktor eksternal." },
        ]},
      ],
      exercises: [
        { question: "Hedge: 'This drug cures cancer.'", answer: "This drug may help treat certain types of cancer." },
        { question: "Hedge: 'All students learn better visually.'", answer: "Some students appear to learn more effectively through visual aids." },
      ],
    },
  },
  {
    title: "Register & Tone: Formal vs Informal",
    description: "Switch between registers effortlessly to suit different audiences and contexts.",
    cefrLevel: "C1", category: "speaking", orderIndex: 35,
    content: {
      sections: [
        { type: "explanation", text: "**Register** = the level of formality appropriate to a context.\n\n| Informal | Formal |\n|----------|--------|\n| get | obtain / receive |\n| big / huge | substantial / significant |\n| find out | discover / ascertain |\n| show | demonstrate / indicate |\n| think | consider / believe |\n| need | require |\n| start | commence / initiate |\n| end | conclude / terminate |" },
        { type: "examples", items: [
          { en: "Informal: 'The company got a lot of money.' → Formal: 'The company obtained substantial funding.'", id: "Informal → Formal" },
          { en: "Informal: 'We need to think about this more.' → Formal: 'This matter requires further consideration.'", id: "Informal → Formal" },
          { en: "Informal: 'They found out why sales dropped.' → Formal: 'The cause of the sales decline was ascertained.'", id: "Informal → Formal" },
        ]},
      ],
      exercises: [
        { question: "Formalize: 'We need to start the project soon.'", answer: "The project should be commenced promptly." },
        { question: "Informalize: 'The committee will ascertain the findings.'", answer: "The committee will find out the results." },
      ],
    },
  },

  // ─── C2 ───────────────────────────────────────────────────────────────────
  {
    title: "Cleft Sentences for Emphasis",
    description: "Restructure sentences to highlight specific information.",
    cefrLevel: "C2", category: "grammar", orderIndex: 36,
    content: {
      sections: [
        { type: "explanation", text: "Cleft sentences split a simple sentence into two clauses to place special emphasis on one element.\n\n**It-cleft**: *It is/was + [emphasis] + that/who + [rest]*\n→ *It was John who made the decision. (not Sarah)*\n\n**Wh-cleft (pseudo-cleft)**: *What + [clause] + is/was + [emphasis]*\n→ *What I really need is a long vacation.*\n\n**All-cleft**: *All + [that-clause] + is/was + [emphasis]*\n→ *All you need to do is sign the form.*" },
        { type: "examples", items: [
          { en: "It was the lack of planning that caused the failure.", id: "Kurangnya perencanaan-lah yang menyebabkan kegagalan itu." },
          { en: "What impressed me most was her confidence.", id: "Yang paling mengesankan saya adalah kepercayaan dirinya." },
          { en: "All you have to do is ask.", id: "Yang perlu kamu lakukan hanyalah bertanya." },
        ]},
      ],
      exercises: [
        { question: "Rewrite: 'I love her smile.' → '___ is her smile.'", answer: "What I love" },
        { question: "Emphasize 'the manager': 'The manager fixed the issue.' → 'It ___ who fixed the issue.'", answer: "was the manager" },
      ],
    },
  },
  {
    title: "Advanced Idiomatic Expressions",
    description: "Sound like a native speaker using advanced C2 idioms and fixed phrases.",
    cefrLevel: "C2", category: "vocabulary", orderIndex: 37,
    content: {
      sections: [
        { type: "explanation", text: "C2-level idioms rely on metaphors that require cultural knowledge. Context and collocations matter.\n\n**Common advanced idioms**:\n- *to play devil's advocate* — argue the opposite view for debate\n- *to sit on the fence* — remain neutral/undecided\n- *to cut to the chase* — get to the main point\n- *to burn one's bridges* — destroy a relationship permanently\n- *to bite off more than you can chew* — take on more than you can handle\n- *to let the cat out of the bag* — accidentally reveal a secret\n- *to throw in the towel* — give up, admit defeat\n- *to beat around the bush* — avoid saying something directly" },
        { type: "examples", items: [
          { en: "Let me play devil's advocate: what if this plan actually backfires?", id: "Izinkan saya berargumen dari sisi lain: bagaimana jika rencana ini justru berbalik?" },
          { en: "She tends to sit on the fence on controversial issues.", id: "Dia cenderung bersikap netral pada isu-isu kontroversial." },
          { en: "Just cut to the chase — what do you want from me?", id: "Langsung saja ke intinya — apa yang kamu inginkan dari saya?" },
        ]},
      ],
      exercises: [
        { question: "Stop wasting time and ___ (direct to main point).", answer: "cut to the chase" },
        { question: "He never takes a side; he always ___.", answer: "sits on the fence" },
        { question: "She took on 5 projects at once — she's ___ (too much).", answer: "biting off more than she can chew" },
      ],
    },
  },
  {
    title: "Discourse Coherence & Cohesion",
    description: "Create highly sophisticated, logically tight written and spoken discourse.",
    cefrLevel: "C2", category: "writing", orderIndex: 38,
    content: {
      sections: [
        { type: "explanation", text: "**Coherence** = logical flow of ideas (the text makes sense as a whole).\n**Cohesion** = linguistic devices that link sentences and paragraphs.\n\n**Cohesive devices**:\n1. **Reference**: pronouns, demonstratives (*this, that, these*)\n2. **Substitution**: *do so, one, ones*\n3. **Ellipsis**: omitting words already understood\n4. **Conjunction**: *furthermore, however, thus*\n5. **Lexical cohesion**: synonyms, repetition, superordinates\n\n**Paragraph structure** (for coherent writing):\n- Topic sentence → Development → Evidence/Example → Comment/Conclusion → Link to next" },
        { type: "examples", items: [
          { en: "The economy grew. This growth (reference) was driven by exports. Trade (lexical cohesion) also benefited from...", id: "Penggunaan referensi dan kohesi leksikal untuk tulisan yang kohesif." },
          { en: "She could have left. She chose not to do so. (substitution — 'do so' = leave)", id: "Penggunaan substitusi agar tidak mengulang kata yang sama." },
        ]},
      ],
      exercises: [
        { question: "Replace repetition: 'I love jazz. I listen to jazz every day.' →", answer: "I love jazz and listen to it every day." },
        { question: "Add a topic sentence for a paragraph about climate change.", answer: "Open answer — e.g., Climate change represents one of the most pressing challenges of the modern era." },
      ],
    },
  },
  {
    title: "Critical Thinking in English: Argument & Evaluation",
    description: "Analyse, evaluate, and construct sophisticated arguments in English.",
    cefrLevel: "C2", category: "speaking", orderIndex: 39,
    content: {
      sections: [
        { type: "explanation", text: "**Critical thinking language**:\n\n**Analysing**: *This implies... / A close reading reveals... / Underlying this assumption is...*\n**Evaluating**: *This argument is compelling because... / A significant weakness of this position is... / The evidence is insufficiently robust...*\n**Counterarguing**: *Proponents might argue... / While it is true that... one must also consider...*\n**Conceding & rebutting**: *Granted that X, it is nonetheless the case that Y...*" },
        { type: "examples", items: [
          { en: "While it is true that AI increases efficiency, one must consider its long-term impact on employment.", id: "Meskipun benar bahwa AI meningkatkan efisiensi, dampak jangka panjangnya pada lapangan kerja perlu dipertimbangkan." },
          { en: "Underlying this assumption is the questionable belief that economic growth always benefits all sectors of society.", id: "Di balik asumsi ini terdapat kepercayaan yang patut dipertanyakan bahwa pertumbuhan ekonomi selalu menguntungkan semua sektor masyarakat." },
        ]},
      ],
      exercises: [
        { question: "Construct a counterargument to: 'Social media should be banned for under-18s.'", answer: "Open answer — e.g., While banning may reduce harm, it is arguably more effective to improve digital literacy education." },
        { question: "Evaluate: 'This study proves social media is harmful.'", answer: "The word 'proves' is too strong; the study may suggest or indicate a correlation rather than establish causation." },
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

  console.log("🧹 Clearing old lessons...");
  await db.delete(lessons);

  console.log(`🌱 Seeding ${LESSONS.length} lessons...\n`);

  let inserted = 0;
  for (const lesson of LESSONS) {
    try {
      await db.insert(lessons).values(lesson).onConflictDoNothing();
      console.log("✅", lesson.title);
      inserted++;
    } catch (err) {
      console.error("❌", lesson.title, "—", err instanceof Error ? err.message : String(err));
    }
  }

  console.log(`\n✅ Done — ${inserted} inserted`);
  await client.end();
}

main();
