/**
 * Pronunciation scoring using Word Error Rate (WER).
 * Compares Whisper transcript against expected text.
 *
 * WER = (S + D + I) / N
 * S = substitutions, D = deletions, I = insertions, N = ref word count
 *
 * Score = (1 - WER) * 100, clamped to [0, 100]
 */

function normalize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s']/g, "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

function levenshteinMatrix(ref: string[], hyp: string[]): number[][] {
  const m = ref.length;
  const n = hyp.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
  );

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (ref[i - 1] === hyp[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }
  return dp;
}

export interface PronunciationResult {
  score:       number;  // 0–100
  wer:         number;  // 0.0–1.0+
  correct:     boolean; // score >= 80
  feedback:    string;
  transcript:  string;
  expected:    string;
  mismatchedWords: Array<{ expected: string; said: string | null }>;
}

export function scorePronunciation(
  expected: string,
  transcript: string,
): PronunciationResult {
  const ref = normalize(expected);
  const hyp = normalize(transcript);

  if (ref.length === 0) {
    return {
      score: 100, wer: 0, correct: true,
      feedback: "Good pronunciation!",
      transcript, expected,
      mismatchedWords: [],
    };
  }

  if (hyp.length === 0) {
    return {
      score: 0, wer: 1, correct: false,
      feedback: "No speech detected. Please try again.",
      transcript, expected,
      mismatchedWords: ref.map((w) => ({ expected: w, said: null })),
    };
  }

  const dp = levenshteinMatrix(ref, hyp);
  const editDistance = dp[ref.length][hyp.length];
  const wer = editDistance / ref.length;
  const score = Math.round(Math.max(0, (1 - wer) * 100));

  // Trace back to find mismatched words
  const mismatchedWords: Array<{ expected: string; said: string | null }> = [];
  let i = ref.length;
  let j = hyp.length;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && ref[i - 1] === hyp[j - 1]) {
      i--; j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] < dp[i - 1][j] && dp[i][j - 1] < dp[i - 1][j - 1])) {
      j--; // insertion — skip
    } else if (i > 0 && (j === 0 || dp[i - 1][j] < dp[i][j - 1] && dp[i - 1][j] < dp[i - 1][j - 1])) {
      mismatchedWords.push({ expected: ref[i - 1], said: null });
      i--; // deletion
    } else {
      mismatchedWords.push({ expected: ref[i - 1], said: hyp[j - 1] });
      i--; j--; // substitution
    }
  }

  const feedback = buildFeedback(score, mismatchedWords, ref.length);

  return {
    score,
    wer: Math.round(wer * 100) / 100,
    correct: score >= 80,
    feedback,
    transcript,
    expected,
    mismatchedWords: mismatchedWords.reverse(),
  };
}

function buildFeedback(
  score: number,
  mismatches: Array<{ expected: string; said: string | null }>,
  totalWords: number,
): string {
  if (score >= 95) return "Excellent pronunciation! Native-like clarity.";
  if (score >= 85) return "Great pronunciation! Very clear and natural.";
  if (score >= 70) {
    if (mismatches.length === 0) return "Good attempt! A few sounds could be clearer.";
    const word = mismatches[0].expected;
    return `Good try! Focus on the word "${word}" — try pronouncing it more clearly.`;
  }
  if (score >= 50) {
    const problem = mismatches[0];
    if (problem?.said) {
      return `You said "${problem.said}" but the word is "${problem.expected}". Keep practicing!`;
    }
    return `Some words were unclear. Try speaking slowly and clearly.`;
  }
  return `Let's practice again. Try to say each word slowly: "${totalWords <= 3 ? "word by word" : "phrase by phrase"}".`;
}
