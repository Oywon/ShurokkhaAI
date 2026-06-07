// src/utils/cognitiveGame.js
//
// Go/No-Go style reaction-time brain game. The component owns the timer
// loop and the UI; this module owns:
//
//   • the round shape (prompt, response window, response classification)
//   • the score model: brainScore (0-100), focusRating, accuracy
//
// Round rules (one round):
//   - A target color appears at a random delay between minDelay/maxDelay
//   - The user must TAP the target within responseWindowMs
//   - Tapping before the target appears counts as a "premature" error
//   - Missing the target within the window counts as a "miss"
//   - Tapping again after a correct response is ignored
//
// A full session runs N rounds (default 8) and returns aggregate metrics.

export const GAME_CONFIG = {
  totalRounds: 8,
  minDelayMs: 800,
  maxDelayMs: 2400,
  responseWindowMs: 1500,
  targetColor: "#10b981",      // emerald-500
  distractorColor: "#ef4444"   // red-500
};

export function makeEmptySessionState() {
  return {
    roundIndex: 0,
    phase: "idle",      // idle | waiting | live | done
    rounds: [],
    startedAt: null
  };
}

export function newRound(roundIndex) {
  const delay = randomBetween(GAME_CONFIG.minDelayMs, GAME_CONFIG.maxDelayMs);
  return {
    index: roundIndex,
    delay,
    shownAt: null,
    respondedAt: null,
    outcome: null       // hit | miss | premature | null
  };
}

export function classifyResponse(round, now) {
  if (!round) return null;
  if (round.outcome) return round.outcome;

  if (round.shownAt === null) {
    // User tapped before the target appeared
    return "premature";
  }
  const elapsed = now - round.shownAt;
  if (elapsed <= GAME_CONFIG.responseWindowMs) {
    return "hit";
  }
  return "miss";
}

export function summarizeSession(rounds) {
  if (!rounds.length) {
    return {
      brainScore: 0,
      accuracy: 0,
      meanRT: 0,
      hits: 0,
      misses: 0,
      premature: 0,
      totalRounds: 0,
      focusRating: "অনুপলব্ধ"
    };
  }

  const hits      = rounds.filter((r) => r.outcome === "hit").length;
  const misses    = rounds.filter((r) => r.outcome === "miss").length;
  const premature = rounds.filter((r) => r.outcome === "premature").length;

  const validRT = rounds
    .filter((r) => r.outcome === "hit" && r.shownAt !== null && r.respondedAt !== null)
    .map((r) => r.respondedAt - r.shownAt);
  const meanRT = validRT.length
    ? Math.round(validRT.reduce((a, b) => a + b, 0) / validRT.length)
    : 0;

  const accuracy = (hits / rounds.length) * 100;

  // brainScore combines accuracy (70%) and speed (30%). A perfect score is
  // 100. We use a soft penalty curve so a few slow-but-correct rounds don't
  // crush the score, and a few fast-but-wrong rounds are penalised.
  const speedScore = meanRT === 0
    ? 0
    : Math.max(0, 100 - (meanRT / 1000) * 50); // 1000ms ≈ 50 pts, 2000ms ≈ 0
  const brainScore = Math.round(accuracy * 0.7 + speedScore * 0.3);

  return {
    brainScore: clamp01to100(brainScore),
    accuracy: Math.round(accuracy),
    meanRT,
    hits,
    misses,
    premature,
    totalRounds: rounds.length,
    focusRating: focusRatingFromScore(brainScore, accuracy, premature)
  };
}

function focusRatingFromScore(brainScore, accuracy, premature) {
  // Penalise impulsivity (premature taps)
  const impulsivityPenalty = premature >= 2 ? 1 : 0;
  const ratings = ["চমৎকার ফোকাস", "ভালো ফোকাস", "মোটামুটি", "ফোকাস কম"];
  if (accuracy < 40 || brainScore < 30) return ratings[3 - impulsivityPenalty] || ratings[3];
  if (accuracy < 60 || brainScore < 50) return ratings[2];
  if (accuracy < 85 || brainScore < 75) return ratings[1 - impulsivityPenalty] || ratings[1];
  return ratings[0];
}

function clamp01to100(n) {
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function randomBetween(min, max) {
  return Math.floor(min + Math.random() * (max - min));
}
