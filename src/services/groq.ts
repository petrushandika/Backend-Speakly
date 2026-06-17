import Groq from "groq-sdk";

const MODEL_PRIMARY = "llama-3.3-70b-versatile";
const MODEL_FAST = "llama-3.1-8b-instant";
const MODEL_FALLBACK = "gemma2-9b-it";

let _groq: Groq | null = null;

function getGroq(): Groq {
  if (_groq) return _groq;
  if (!process.env.GROQ_API_KEY) throw new Error("Missing GROQ_API_KEY");
  _groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  return _groq;
}

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type GroqModel = "primary" | "fast" | "fallback";

function resolveModel(model: GroqModel): string {
  if (model === "fast") return MODEL_FAST;
  if (model === "fallback") return MODEL_FALLBACK;
  return MODEL_PRIMARY;
}

/**
 * Non-streaming completion — for feedback, quiz generation, and short tasks.
 */
export async function complete(
  messages: ChatMessage[],
  opts: {
    model?: GroqModel;
    temperature?: number;
    maxTokens?: number;
  } = {},
): Promise<string> {
  const groq = getGroq();

  try {
    const completion = await groq.chat.completions.create({
      model: resolveModel(opts.model ?? "primary"),
      messages,
      temperature: opts.temperature ?? 0.5,
      max_tokens: opts.maxTokens ?? 1024,
      stream: false,
    });

    return completion.choices[0]?.message?.content ?? "";
  } catch (err: unknown) {
    // Fallback to smaller model on rate limit
    if (
      err instanceof Error &&
      err.message.includes("rate_limit") &&
      opts.model !== "fallback"
    ) {
      return complete(messages, { ...opts, model: "fallback" });
    }
    throw err;
  }
}

/**
 * Streaming completion — for AI chat. Returns an async iterable of content chunks.
 */
export async function* stream(
  messages: ChatMessage[],
  opts: {
    model?: GroqModel;
    temperature?: number;
    maxTokens?: number;
  } = {},
): AsyncGenerator<string> {
  const groq = getGroq();

  const completion = await groq.chat.completions.create({
    model: resolveModel(opts.model ?? "primary"),
    messages,
    temperature: opts.temperature ?? 0.7,
    max_tokens: opts.maxTokens ?? 1024,
    stream: true,
  });

  for await (const chunk of completion) {
    const content = chunk.choices[0]?.delta?.content;
    if (content) yield content;
  }
}
