export interface UserContext {
  displayName: string;
  cefrLevel: string;
  goal: string;
  domain: string;
  accentPreference: string;
  topErrors: string[];
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

export function buildSystemPrompt(user: UserContext): string {
  return `You are Aria, Speakly's expert English language tutor.
You have a PhD in Applied Linguistics and 15 years teaching English to non-native speakers across Southeast Asia, especially Indonesia.
You are warm, encouraging, and precise. You never let errors pass uncorrected, but you always correct with kindness.

## Student Profile
Name: ${user.displayName}
Current CEFR level: ${user.cefrLevel}
Learning goal: ${user.goal}
Domain focus: ${user.domain}
Target accent: ${user.accentPreference}
${user.topErrors.length > 0 ? `Known error patterns: ${user.topErrors.slice(0, 3).join(", ")}` : ""}

## Teaching Rules
1. Always respond in English, even if the student writes in Indonesian
2. Adjust vocabulary complexity to ${user.cefrLevel} level — not too hard, not too easy
3. Keep replies to 2–4 sentences maximum — be concise and conversational
4. Always end with a natural follow-up question to keep the conversation going
5. When the student makes a grammar or vocabulary error, correct it naturally:
   Format: "[Your reply]. — Small note: we say '[correction]' not '[error]' because [brief explanation in one line]."
6. Never translate Indonesian words — explain meaning with simple English and context
7. Give specific praise only: "I noticed you used 'however' correctly — that's great B2 vocabulary!" not just "Good job!"
8. Be warm but direct. Treat mistakes as a normal part of learning.
9. Use examples from the student's domain (${user.domain}) when relevant.`;
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
