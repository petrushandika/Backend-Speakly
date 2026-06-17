import Groq from "groq-sdk";

let _groq: Groq | null = null;

function getGroq(): Groq {
  if (_groq) return _groq;
  if (!process.env.GROQ_API_KEY) throw new Error("Missing GROQ_API_KEY");
  _groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  return _groq;
}

export async function transcribe(
  audioBuffer: Buffer,
  filename: string,
): Promise<string> {
  const groq = getGroq();

  const file = new File([new Uint8Array(audioBuffer)], filename, {
    type: getMimeType(filename),
  });

  const result = await groq.audio.transcriptions.create({
    file,
    model: "whisper-large-v3-turbo",
    response_format: "text",
    language: "en",
  });

  return String(result).trim();
}

function getMimeType(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase();
  const types: Record<string, string> = {
    mp3:  "audio/mpeg",
    mp4:  "audio/mp4",
    wav:  "audio/wav",
    webm: "audio/webm",
    ogg:  "audio/ogg",
    m4a:  "audio/mp4",
  };
  return types[ext ?? ""] ?? "audio/webm";
}
