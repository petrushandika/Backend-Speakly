import OpenAI from "openai";

let _openai: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (_openai) return _openai;
  if (!process.env.OPENAI_API_KEY) throw new Error("Missing OPENAI_API_KEY");
  _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return _openai;
}

export async function transcribe(
  audioBuffer: Buffer,
  filename: string,
  language = "en",
): Promise<string> {
  const openai = getOpenAI();

  const file = new File([new Uint8Array(audioBuffer)], filename, { type: getMimeType(filename) });

  const result = await openai.audio.transcriptions.create({
    file,
    model: "whisper-1",
    language,
    response_format: "text",
  });

  return typeof result === "string" ? result.trim() : "";
}

function getMimeType(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase();
  const types: Record<string, string> = {
    mp3: "audio/mpeg",
    mp4: "audio/mp4",
    wav: "audio/wav",
    webm: "audio/webm",
    ogg: "audio/ogg",
    m4a: "audio/mp4",
  };
  return types[ext ?? ""] ?? "audio/webm";
}
