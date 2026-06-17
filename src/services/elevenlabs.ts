const ELEVENLABS_API = "https://api.elevenlabs.io/v1";

function getApiKey(): string {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) throw new Error("Missing ELEVENLABS_API_KEY");
  return key;
}

function getVoiceId(accent: string): string {
  const US = process.env.ELEVENLABS_VOICE_US ?? "EXAVITQu4vr4xnSDxMaL";
  const UK = process.env.ELEVENLABS_VOICE_UK ?? "onwK4e9ZLuTAKqWW03F9";
  const AU = process.env.ELEVENLABS_VOICE_AU ?? "EXAVITQu4vr4xnSDxMaL";

  const voices: Record<string, string> = {
    american:     US,
    british:      UK,
    australian:   AU,
    neutral:      US,
    // Additional accents — configure via env vars, fall back to nearest native accent
    indian:       process.env.ELEVENLABS_VOICE_IN ?? US,
    irish:        process.env.ELEVENLABS_VOICE_IE ?? UK,
    canadian:     process.env.ELEVENLABS_VOICE_CA ?? US,
    newzealand:   process.env.ELEVENLABS_VOICE_NZ ?? AU,
    south_african: process.env.ELEVENLABS_VOICE_ZA ?? UK,
    singaporean:  process.env.ELEVENLABS_VOICE_SG ?? US,
  };
  return voices[accent] ?? US;
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
