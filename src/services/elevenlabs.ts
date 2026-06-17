const ELEVENLABS_API = "https://api.elevenlabs.io/v1";

function getApiKey(): string {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) throw new Error("Missing ELEVENLABS_API_KEY");
  return key;
}

// ElevenLabs premade voice IDs (always available, no subscription needed)
// US:  Sarah  — EXAVITQu4vr4xnSDxMaL
// UK:  Daniel — onwK4e9ZLuTAKqWW03F9
// AU:  Charlie — IKne3meq5aSn9XLyUdCD  (native Australian accent)
// CA:  Antoni — ErXwobaYiN019PkySvjV   (North American, close to Canadian)
// IE:  Fin    — D38z5RcWu1voky8WS1ja   (Irish accent)
// NZ:  James  — ZQe5CZNOzWyzPSCn5a3c  (Australian-NZ)
// ZA:  Callum — N2lVS1w4EtoT3dr4eOWO  (transatlantic, closest to SA)
// IN:  Daniel — onwK4e9ZLuTAKqWW03F9  (formal British, most natural fallback for Indian)
// SG:  Sarah  — EXAVITQu4vr4xnSDxMaL  (neutral American, clear for Singaporean context)
function getVoiceId(accent: string): string {
  const US = process.env.ELEVENLABS_VOICE_US ?? "EXAVITQu4vr4xnSDxMaL";
  const UK = process.env.ELEVENLABS_VOICE_UK ?? "onwK4e9ZLuTAKqWW03F9";
  const AU = process.env.ELEVENLABS_VOICE_AU ?? "IKne3meq5aSn9XLyUdCD"; // Charlie (Australian)
  const CA = process.env.ELEVENLABS_VOICE_CA ?? "ErXwobaYiN019PkySvjV"; // Antoni (North American)
  const IE = process.env.ELEVENLABS_VOICE_IE ?? "SOYHLrjzK2X1ezoPC6cr"; // Harry (British-Irish, closest available)
  const NZ = process.env.ELEVENLABS_VOICE_NZ ?? "IKne3meq5aSn9XLyUdCD"; // Charlie (AU/NZ very similar)
  const ZA = process.env.ELEVENLABS_VOICE_ZA ?? "N2lVS1w4EtoT3dr4eOWO"; // Callum (transatlantic)
  const IN = process.env.ELEVENLABS_VOICE_IN ?? "JBFqnCBsd6RMkjVDRZzb"; // George (British formal)
  const SG = process.env.ELEVENLABS_VOICE_SG ?? "pNInz6obpgDQGcFmaJgB"; // Adam (clear neutral US)

  const voices: Record<string, string> = {
    american:      US,
    british:       UK,
    australian:    AU,
    neutral:       US,
    canadian:      CA,
    irish:         IE,
    newzealand:    NZ,
    south_african: ZA,
    indian:        IN,
    singaporean:   SG,
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
