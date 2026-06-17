const ELEVENLABS_API = "https://api.elevenlabs.io/v1";

function getApiKey(): string {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) throw new Error("Missing ELEVENLABS_API_KEY");
  return key;
}

function getVoiceId(accent: string): string {
  const voices: Record<string, string> = {
    american:   process.env.ELEVENLABS_VOICE_US  ?? "EXAVITQu4vr4xnSDxMaL",
    british:    process.env.ELEVENLABS_VOICE_UK  ?? "onwK4e9ZLuTAKqWW03F9",
    australian: process.env.ELEVENLABS_VOICE_AU  ?? "EXAVITQu4vr4xnSDxMaL",
    neutral:    process.env.ELEVENLABS_VOICE_US  ?? "EXAVITQu4vr4xnSDxMaL",
  };
  return voices[accent] ?? voices.american;
}

export async function synthesize(
  text: string,
  accent = "american",
): Promise<Buffer> {
  const voiceId = getVoiceId(accent);

  const response = await fetch(
    `${ELEVENLABS_API}/text-to-speech/${voiceId}`,
    {
      method: "POST",
      headers: {
        "xi-api-key": getApiKey(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_turbo_v2_5",
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      }),
    },
  );

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`ElevenLabs error: ${err}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
