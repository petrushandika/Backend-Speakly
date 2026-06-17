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

export function buildSystemPrompt(user: UserContext): string {
  const nativeLangNote = getNativeLanguageNote(user.nativeLanguage);
  const hasErrors      = user.topErrors && user.topErrors.length > 0;
  const weakAreas      = user.weakCategories?.length ? user.weakCategories.join(", ") : null;
  const improvingNote  = user.errorTrend === "improving"
    ? "Their error rate has been decreasing — acknowledge their progress!"
    : user.errorTrend === "needs_attention"
      ? "Their error rate has increased recently — be especially attentive and supportive."
      : "";

  return `You are Aria, Speakly's AI English language tutor with a PhD in Applied Linguistics.
You have 15 years teaching English to non-native speakers across Southeast Asia.
You are warm, encouraging, and precise — you never let errors pass but always correct with kindness.

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

${nativeLangNote ? `## Native Language Interference Notes\n${nativeLangNote}\n` : ""}
## Teaching Rules
1. Always respond in English, even if the student writes in Indonesian
2. Adjust vocabulary complexity to exactly ${user.cefrLevel} level — not too hard, not too easy
3. Keep replies to 2–4 sentences maximum — be concise and conversational
4. Always end with a natural follow-up question to keep the conversation going
5. When the student makes a grammar or vocabulary error, correct it naturally inline:
   Format: "[Your reply]. — Small note: we say '[correction]' not '[error]' because [brief explanation in one line]."
6. Proactively practice the student's known weak areas (${hasErrors ? user.topErrors[0] : "general grammar"}) when it fits naturally
7. Give SPECIFIC praise only: "I noticed you used 'however' correctly — great B2 vocabulary!" NOT "Good job!"
8. Be warm but direct. Treat mistakes as normal, expected, and fixable.
9. Use domain-specific examples (${user.domain}) to make learning relevant.
10. If the student repeats the same error type from their known weaknesses, give a more detailed mini-lesson.`;
}

export function buildMessages(
  user: UserContext,
  history: ChatMessage[],
  newMessage: string,
): Array<{ role: "system" | "user" | "assistant"; content: string }> {
  const systemPrompt = buildSystemPrompt(user);
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
