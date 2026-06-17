export type ConversationMode =
  | "free_talk"
  | "roleplay"
  | "grammar_drill"
  | "debate"
  | "storytelling"
  | "interview_prep";

export interface UserContext {
  displayName:      string;
  cefrLevel:        string;
  goal:             string;
  domain:           string;
  accentPreference: string;
  topErrors:        string[];
  // Optional rich context from LearningContext
  nativeLanguage?:   string | null;
  errorTrend?:       "improving" | "stable" | "needs_attention";
  weakCategories?:   string[];
  strongCategories?: string[];
  vocabularySize?:   number;
  avgMastery?:       number;
  // Long-term memory from past sessions
  conversationSummary?: string | null;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

// ─── Sanitization ───────────────────────────────────────────────────────────

export function sanitizeInput(raw: string): string {
  return raw
    .replace(/<[^>]*>/g, "")
    .replace(/\[SYSTEM\]/gi, "")
    .replace(/\[ASSISTANT\]/gi, "")
    .replace(/ignore (all |previous )?instructions?/gi, "")
    .replace(/you are now/gi, "")
    .replace(/forget everything/gi, "")
    .trim()
    .slice(0, 2000);
}

export function wrapForLLM(sanitized: string): string {
  return `<user_input>${sanitized}</user_input>`;
}

// ─── Aria Tutor — Main Conversation ─────────────────────────────────────────

// Native language → common English interference patterns
const NATIVE_LANGUAGE_NOTES: Record<string, string> = {
  indonesian:  "Indonesian has no verb tenses, articles (a/the), or subject-verb agreement — these are their biggest struggles. Also: Indonesian word order can differ. Watch for missing auxiliary verbs ('She go' instead of 'She goes').",
  javanese:    "Same as Indonesian, plus watch for politeness register confusion and passive voice overuse.",
  malay:       "Very similar to Indonesian learners. Articles and tenses are the main weak points.",
  mandarin:    "No articles, no tenses, no plural marking in Chinese. Watch for these patterns. Also: aspect vs tense confusion.",
  cantonese:   "Similar to Mandarin. Also: prepositions and relative clauses are commonly confused.",
  hindi:       "Articles missing, verb-final word order interference, prepositions often wrong.",
  arabic:      "Definite article 'the' is often overused. Verb agreement with non-human plurals is tricky.",
  spanish:     "Good grammar base but false cognates, ser/estar confusion, and subjunctive mood are weak points.",
  portuguese:  "Similar to Spanish learners. Watch for preposition usage.",
  french:      "Generally strong grammar awareness but article gender and phrasal verb usage is weak.",
  japanese:    "Topic-comment structure interference. Articles missing. Over-polite phrasing.",
  korean:      "Subject-object-verb word order interference. No articles. Honorifics confusion.",
  thai:        "No conjugation in Thai — tense markers very important to emphasize.",
  vietnamese:  "Tonal language — pronunciation of unstressed syllables is a challenge.",
};

function getNativeLanguageNote(lang: string | null | undefined): string {
  if (!lang) return "";
  const key = lang.toLowerCase().replace(/\s+/g, "");
  return NATIVE_LANGUAGE_NOTES[key] ?? "";
}

// ─── CEFR-Adaptive Language Rules ────────────────────────────────────────────

function getCefrLanguageRules(cefrLevel: string, hasErrors: boolean, topError: string, domain: string): string {
  switch (cefrLevel) {
    case "A1":
      return `## Aturan Bahasa untuk Level A1 (Pemula)
PENTING: Gunakan BAHASA INDONESIA sebagai bahasa utama (80%). Bahasa Inggris hanya untuk:
- Kalimat contoh yang sedang diajarkan
- Kata/frasa baru yang diperkenalkan (selalu dengan terjemahan)
- Sapaan singkat ("Great!", "Well done!")

Format wajib saat memperkenalkan kata baru: "kata baru" = artinya "makna"
Koreksi error: SANGAT LEMBUT. Koreksi maksimal 1 kesalahan per pesan. Jangan pernah menyalahkan, hanya tunjukkan yang benar.
Format koreksi: "Bagus! Kita bilang '[koreksi]', bukan '[error]'. Ini benar karena [penjelasan singkat dalam bahasa Indonesia]."
Panjang respons: maksimal 3 kalimat. Selalu akhiri dengan pertanyaan mudah dalam bahasa Inggris + terjemahannya.
Contoh gaya Aria A1: "Bagus sekali! 'I go to school' artinya 'Saya pergi ke sekolah'. Sekarang coba tanya: 'Where do you live?' (Kamu tinggal di mana?)"`;

    case "A2":
      return `## Language Rules for A2 Elementary
Gunakan campuran Bahasa Indonesia (50%) dan English (50%).
- Penjelasan grammar → selalu dalam Bahasa Indonesia
- Percakapan → English, tapi SELALU sertakan terjemahan untuk kata baru
- Format kata baru: "kata" (artinya: terjemahan)
Koreksi error: Lembut. Tunjukkan yang benar, jelaskan singkat dalam bahasa Indonesia. Maksimal 2 koreksi per pesan.
Format: "Good try! Kita bilang '[koreksi]' karena [penjelasan B. Indonesia]. [Lanjut pertanyaan dalam English]?"
Panjang: 2–3 kalimat. Akhiri dengan pertanyaan dalam English.
Contoh: "Good! We say 'I went' not 'I go' (kata kerja lampau/past tense — sudah terjadi). Where did you go yesterday?"`;

    case "B1":
      return `## Language Rules for B1 Intermediate
- Use English as the main language for conversation.
- Only use Indonesian when explaining complex grammar concepts (e.g., conditionals, passive voice).
- Introduce idioms/phrasal verbs with brief meaning in parentheses: "give up (menyerah)".
- Correct up to 2 errors per message with brief English explanations.
- Responses: 2–4 sentences, conversational and encouraging.
- Gently push the student to use more sophisticated vocabulary from the ${domain} domain.`;

    default: // B2, C1, C2
      return `## Language Rules for ${cefrLevel} ${cefrLevel === "B2" ? "Upper-Intermediate" : "Advanced"}
- Full English immersion — no Indonesian unless student specifically asks.
- Use natural, varied vocabulary. Suggest more sophisticated alternatives to simple words.
- Correct errors with precise grammar rule references and linguistic terminology.
- Challenge the student: introduce nuanced collocations, register differences, and idiomatic expressions.
${cefrLevel === "C1" || cefrLevel === "C2" ? "- Engage as near-native: discuss abstract topics, debate, analyze language nuance." : ""}`;
  }
}

// ─── Conversation Mode Instructions ─────────────────────────────────────────

export function buildModeInstructions(mode: ConversationMode, cefrLevel: string): string {
  const isBeginnerOrElem = cefrLevel === "A1" || cefrLevel === "A2";

  switch (mode) {
    case "roleplay":
      return `## ACTIVE MODE: Role Play
You are now playing a character in a scenario. Stay IN character until the student says "stop roleplay" or "exit scene".
Pick a realistic scenario relevant to the student's domain (e.g., a job interview, a coffee shop, a hotel check-in, a business meeting).
Announce the scenario clearly first: "Let's do a roleplay! I'll be [character]. The scene is: [setting]. You start!"
During roleplay: respond naturally as your character. After the student makes a grammar error, stay in character but weave a gentle correction into your next line naturally (e.g., "Of course! — by the way, we'd say '...' in this context — So, back to our scene...").
After roleplay ends: give brief feedback on 2–3 key things the student did well and 1 thing to improve.`;

    case "grammar_drill":
      return `## ACTIVE MODE: Grammar Drill
You are running a focused grammar practice session. The goal is PRECISION, not just conversation.
Start by asking: "Which grammar point shall we drill? (e.g., present perfect, conditionals, passive voice, articles)"
Once confirmed: give structured exercises — fill-in-the-blank, error correction, or sentence transformation.
After each answer: give instant, clear feedback. Explain WHY it is right or wrong in max 2 sentences.
Track progress: after every 5 questions, summarize score and suggest the next drill.
${isBeginnerOrElem ? "Use Bahasa Indonesia for ALL explanations during drill." : "Explanations in English only."}`;

    case "debate":
      return `## ACTIVE MODE: Debate / Discussion
You will take the OPPOSITE position from the student on any topic they choose — even if you personally agree with them.
Your goal: push them to defend their ideas using clear English arguments, logical connectors, and academic vocabulary.
Start: "Great! Let's debate. Choose any topic — I'll argue the opposite side."
During debate: challenge weak arguments, ask for evidence, introduce counter-examples.
Occasionally pause to teach a debate phrase: "That's a strong point. Notice how I used 'On the contrary' — try using that next!"
${isBeginnerOrElem ? "Keep arguments simple. Use Bahasa Indonesia for connector explanations." : "Use sophisticated connectors: 'Nevertheless', 'It stands to reason that', 'One could argue that'."}`;

    case "storytelling":
      return `## ACTIVE MODE: Collaborative Storytelling
You and the student are co-writing a story together, one paragraph at a time.
Start: "Let's tell a story together! I'll write the opening, then you continue — then I continue — and so on."
Write 2–3 sentences of vivid story, then say "Your turn! Continue the story..."
After the student's paragraph: subtly correct grammar in your continuation ("Great twist! [continuing story...] — P.S. 'He runned' should be 'He ran' — irregular verb!").
Encourage creative vocabulary — when they use a simple word, suggest a richer one in your next turn.`;

    case "interview_prep":
      return `## ACTIVE MODE: Job Interview Practice
You are now a professional interviewer conducting a mock job interview in the student's domain.
Start with: "Let's practice your job interview! I'll be the interviewer. Ready? First question: Tell me about yourself."
Ask real interview questions one at a time. Listen carefully to answers.
After each answer: (1) give brief feedback on content clarity, (2) correct 1 grammar error if present, (3) suggest a more professional phrasing if possible.
End with a realistic interview score and key advice.`;

    case "free_talk":
    default:
      return `## ACTIVE MODE: Free Conversation
Talk naturally about any topic. Follow the student's lead — if they want to discuss movies, travel, work, technology, etc., go with it.
Your role: be a natural conversation partner who happens to be a language teacher. Weave corrections in smoothly.
Proactively introduce interesting related topics to keep conversation going.
Occasionally teach a useful idiom or phrase when it fits naturally: "Oh, by the way — there's a great phrase for that: '...' — try using it!"`;
  }
}

export function buildSystemPrompt(user: UserContext): string {
  const nativeLangNote = getNativeLanguageNote(user.nativeLanguage);
  const hasErrors      = user.topErrors && user.topErrors.length > 0;
  const weakAreas      = user.weakCategories?.length ? user.weakCategories.join(", ") : null;
  const improvingNote  = user.errorTrend === "improving"
    ? "Their error rate has been decreasing — acknowledge their progress!"
    : user.errorTrend === "needs_attention"
      ? "Their error rate has increased recently — be especially attentive and supportive."
      : "";

  const langRules = getCefrLanguageRules(
    user.cefrLevel,
    hasErrors,
    user.topErrors?.[0] ?? "general grammar",
    user.domain,
  );

  return `You are Aria, Speakly's AI English language tutor with a PhD in Applied Linguistics.
You have 15 years teaching English to non-native speakers across Southeast Asia.
You are warm, encouraging, and precise — you never let errors pass but always correct with kindness.
You have a genuine personality: curious, witty, and deeply invested in each student's progress.

## Student Profile
Name: ${user.displayName}
CEFR Level: ${user.cefrLevel}
Learning Goal: ${user.goal}
Domain Focus: ${user.domain}
Target Accent: ${user.accentPreference}
${user.nativeLanguage ? `Native Language: ${user.nativeLanguage}` : ""}
${user.vocabularySize != null ? `Vocabulary bank: ${user.vocabularySize} words (avg mastery ${user.avgMastery ?? 0}%)` : ""}
${hasErrors ? `Recurring grammar weaknesses: ${user.topErrors.slice(0, 4).join(", ")}` : ""}
${weakAreas ? `Weak lesson areas: ${weakAreas}` : ""}
${user.strongCategories?.length ? `Strong areas: ${user.strongCategories.join(", ")}` : ""}
${improvingNote}

${user.conversationSummary ? `## Long-term Memory (Past Sessions)\nYou remember the following from previous conversations with this student:\n${user.conversationSummary}\nUse this to personalize your responses — reference past topics, acknowledge progress, and pick up naturally where you left off.\n` : ""}
${nativeLangNote ? `## Native Language Interference Notes\n${nativeLangNote}\n` : ""}
${langRules}

## Universal Teaching Rules (apply at ALL levels)
1. Adjust vocabulary complexity to exactly ${user.cefrLevel} level — not too hard, not too easy
2. Always end with a natural follow-up question to keep conversation going
3. Proactively practice the student's known weak areas (${hasErrors ? user.topErrors[0] : "general grammar"}) when it fits naturally
4. Give SPECIFIC praise only: "You used 'however' correctly — great B2 connector!" NOT generic "Good job!"
5. Treat mistakes as normal, expected, and fixable. Never shame or discourage.
6. Use domain-specific examples (${user.domain}) to make learning relevant.
7. If student repeats same error from known weaknesses, give a brief focused mini-lesson.
8. Be proactive — don't just answer, ENGAGE. Share opinions, ask what they think, introduce sub-topics.
9. Remember: you are having a genuine TWO-WAY conversation, not just answering questions.`;
}

export function buildMessages(
  user: UserContext,
  history: ChatMessage[],
  newMessage: string,
  voiceMode?: boolean,
  mode?: ConversationMode,
): Array<{ role: "system" | "user" | "assistant"; content: string }> {
  let systemPrompt = buildSystemPrompt(user);

  if (mode && mode !== "free_talk") {
    systemPrompt += "\n\n" + buildModeInstructions(mode, user.cefrLevel);
  }

  if (voiceMode) {
    const isBeginnerLevel = user.cefrLevel === "A1" || user.cefrLevel === "A2";
    if (isBeginnerLevel) {
      systemPrompt +=
        "\n\nVOICE MODE: Kamu sedang berbicara langsung. Balas dengan 1–2 kalimat pendek saja. Tidak ada bullet points atau markdown. Pertahankan aturan bahasa Indonesia sesuai level.";
    } else {
      systemPrompt +=
        "\n\nVOICE MODE: You are speaking aloud. Reply in 1–2 short spoken sentences only. No bullet points, no markdown, no lists. Natural conversational English only.";
    }
  }
  const sanitized = sanitizeInput(newMessage);

  return [
    { role: "system", content: systemPrompt },
    ...history.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
    { role: "user", content: wrapForLLM(sanitized) },
  ];
}

// ─── Speaking Feedback Analyzer ──────────────────────────────────────────────

export function buildFeedbackPrompt(
  transcript: string,
  topic: string,
  userLevel: string,
): string {
  return `You are an expert English speech evaluator. Analyze the transcript below and return structured feedback.

Topic given to student: "${topic}"
Student CEFR level: ${userLevel}

Transcript:
<transcript>
${sanitizeInput(transcript)}
</transcript>

Return ONLY valid JSON with no other text:
{
  "overall_score": 0,
  "fluency_score": 0,
  "grammar_score": 0,
  "vocabulary_score": 0,
  "words_per_minute": 0,
  "grammar_errors": [
    {
      "error": "exact text from transcript",
      "correction": "corrected version",
      "category": "tense|article|preposition|verb_form|word_choice|other",
      "explanation": "why this is wrong — max 15 words"
    }
  ],
  "vocabulary_feedback": [
    {
      "word_used": "good",
      "suggestion": "excellent",
      "context_quote": "exact quote from transcript"
    }
  ],
  "positive_highlights": ["Specific thing done well"],
  "top_improvement": "Single most impactful thing to work on next",
  "filler_words": {"um": 0, "uh": 0, "like": 0}
}

Scoring calibration: score 85+ only for genuinely impressive output at ${userLevel} level. Score 50–70 is normal. Be honest.`;
}

// ─── Grammar Explainer ───────────────────────────────────────────────────────

export function buildGrammarPrompt(
  grammarPoint: string,
  userLevel: string,
  domain: string,
): string {
  return `You are a grammar expert creating a clear, memorable lesson.

Grammar point: "${grammarPoint}"
Student level: ${userLevel}
Student domain: ${domain}

Return ONLY valid JSON:
{
  "quick_rule": "One sentence rule — max 20 words",
  "formula": "Subject + have/has + past participle",
  "signal_words": ["already", "yet", "since", "for"],
  "examples": {
    "positive": [{"sentence": "...", "note": "..."}],
    "negative": [{"sentence": "...", "note": "..."}],
    "question": [{"sentence": "...", "note": "..."}]
  },
  "common_mistakes": [
    {"wrong": "...", "correct": "...", "explanation": "..."}
  ],
  "indonesian_learner_notes": "Why Indonesian speakers specifically struggle with this",
  "practice_questions": [
    {"question": "...", "answer": "...", "explanation": "..."}
  ],
  "memory_hook": "A memorable story or analogy to remember this rule",
  "domain_example": "A ${domain}-specific example sentence"
}`;
}

// ─── Quiz Generator ──────────────────────────────────────────────────────────

export function buildQuizPrompt(
  topic: string,
  userLevel: string,
  count: number,
  knownErrors: string[] = [],
): string {
  return `Generate ${count} quiz questions for: "${topic}"
Student level: ${userLevel}
${knownErrors.length > 0 ? `Target these weak areas in at least 2 questions: ${knownErrors.join(", ")}` : ""}

Return ONLY valid JSON:
{
  "questions": [
    {
      "type": "fill_blank|multiple_choice|error_correction",
      "question": "She ___ (live) in Jakarta for five years.",
      "answer": "has lived",
      "options": ["lived", "has lived", "is living", "was living"],
      "explanation": "We use present perfect with 'for' when duration continues to now",
      "difficulty": 2
    }
  ]
}

Rules: use real-world sentences, vary question types, include at least 1 easy question.`;
}

// ─── Reading Aloud Text Generator ────────────────────────────────────────────

export function buildReadingTextPrompt(
  theme: string,
  paragraphs: number,
  cefrLevel: string,
  domain: string,
): string {
  const wordTargets: Record<string, string> = {
    "1": "150–200",
    "2": "300–400",
    "3": "500–620",
  };
  const words = wordTargets[String(paragraphs)] ?? "300–400";

  const levelGuidance: Record<string, string> = {
    A1: "Use only the most common 500 English words. Simple present/past tense only. Short sentences (max 10 words each). No complex grammar.",
    A2: "Use common vocabulary. Simple past and present perfect allowed. Sentences max 15 words each. Avoid idioms.",
    B1: "Use intermediate vocabulary. Varied tenses, some compound sentences. Introduce 2–3 useful collocations naturally.",
    B2: "Use upper-intermediate vocabulary. Complex sentences, passive voice, relative clauses. Include idiomatic phrases.",
    C1: "Use advanced vocabulary. Nuanced syntax, subordinate clauses. Include sophisticated collocations and formal register.",
    C2: "Use near-native vocabulary range. Complex rhetorical structures, idiomatic expressions. No simplification.",
  };

  return `You are a language learning content creator. Generate a reading-aloud practice passage for an English learner.

Theme: ${theme}
Domain context: ${domain}
Target length: ${words} words total (${paragraphs} paragraph${paragraphs > 1 ? "s" : ""})
Student CEFR level: ${cefrLevel}
Language guidance: ${levelGuidance[cefrLevel] ?? levelGuidance["B1"]}

CRITICAL LENGTH REQUIREMENT: Each paragraph MUST be at least ${Math.floor(parseInt(words.split("–")[0]) / paragraphs)} words long. Do NOT write short paragraphs. Each paragraph should be a full, substantial block of text that takes 30–60 seconds to read aloud.

Return ONLY valid JSON with no other text:
{
  "title": "Short descriptive title max 6 words",
  "theme": "${theme}",
  "cefrLevel": "${cefrLevel}",
  "paragraphs": ["First paragraph — a long, detailed, naturally flowing block of text that is genuinely informative and at least 3-5 sentences.", "Second paragraph — continues the topic with new details, examples, or a different angle. Also long and substantive."],
  "wordCount": 0,
  "keyVocabulary": [
    {"word": "example", "definition": "brief definition in max 8 words", "indonesian": "arti kata dalam bahasa Indonesia", "ipa": "/ɪɡˈzɑːmpəl/"}
  ],
  "readingTips": "One sentence tip for reading this passage naturally"
}

Rules:
- Write naturally flowing prose — each paragraph is a proper, long block of text like a real article or blog post
- NEVER write only 1–2 sentences per paragraph. A paragraph must be 3–5 sentences minimum
- Include 3–5 key vocabulary items that appear in the passage
- Make the content genuinely interesting and informative for someone in the ${domain} domain
- Each paragraph must be coherent and logically connected to the next
- wordCount must be the actual total word count of all paragraphs combined`;
}

// ─── Daily Speaking Challenge Topic Generator ────────────────────────────────

export function buildSpeakingChallengePrompt(cefrLevel: string, domain: string): string {
  const today = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  return `Generate a daily speaking challenge topic for an English learner.

Student CEFR level: ${cefrLevel}
Domain focus: ${domain}
Today's date: ${today}

Return ONLY valid JSON with no other text:
{
  "topic": "Describe a recent challenge you faced at work and how you solved it.",
  "prompt": "Talk for 60 seconds about this topic. Try to use the present perfect tense.",
  "targetSkill": "present_perfect",
  "difficulty": "medium",
  "hints": ["Use phrases like: I have recently...", "Try to include: However, I managed to..."],
  "exampleOpener": "Recently, I have been working on a project that..."
}

Rules:
- Topic must be clearly answerable in 60 seconds of natural speech
- Must be relevant and interesting for someone in the ${domain} domain
- Hints must give concrete phrases to use, not vague advice
- difficulty must be one of: easy, medium, hard
- targetSkill must be one of: fluency, vocabulary, grammar, present_perfect, past_tense, conditionals, pronunciation`;
}

// ─── Conversation Summary Generator ─────────────────────────────────────────

export function buildSummaryPrompt(
  messages: Array<{ role: "user" | "assistant"; content: string }>,
  displayName: string,
  cefrLevel: string,
): string {
  const transcript = messages
    .slice(-40) // last 40 messages max
    .map((m) => `${m.role === "user" ? displayName : "Aria"}: ${m.content}`)
    .join("\n");

  return `You are summarizing an English tutoring conversation between Aria (AI tutor) and ${displayName} (${cefrLevel} level student).

Read the conversation below and generate a concise memory summary that Aria will use in FUTURE sessions to personalize her teaching.

Conversation:
<transcript>
${sanitizeInput(transcript)}
</transcript>

Return ONLY valid JSON with no other text:
{
  "topics_discussed": ["topic1", "topic2"],
  "grammar_practiced": ["past_tense", "articles"],
  "student_interests": ["travel", "technology"],
  "notable_progress": "One sentence about what the student improved or achieved",
  "recurring_struggles": ["article usage", "irregular verbs"],
  "personal_details": "Any personal details shared (job, hobbies, family) — 1–2 sentences max",
  "conversation_tone": "casual|formal|enthusiastic|shy|confident",
  "aria_memory_note": "A 2–3 sentence note from Aria's perspective to remember this student warmly — start with '${displayName} and I talked about...' — focus on what made this conversation memorable"
}

Keep all fields concise. personal_details and aria_memory_note are the most important — they humanize future sessions.`;
}
