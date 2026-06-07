// src/utils/mentalHealthQuiz.js
//
// Lightweight psychometric self-check used by the "🧠 মানসিক সুস্থতা" modal
// in Profile.jsx. 12 Likert items, four-point scale (0..3), each item
// contributes to one or two of six target categories:
//
//   sad | anxious | stressed | lonely | angry | ok
//
// Pure data + a small scoring helper. The component renders the questions
// and calls `scoreQuiz(answers)` to get a normalized result.

export const QUIZ_OPTIONS = [
  { value: 0, label: "একদমই না" },
  { value: 1, label: "মাঝে মাঝে" },
  { value: 2, label: "প্রায়ই"    },
  { value: 3, label: "প্রতিদিন"   }
];

// `weights` lets a single item contribute to multiple categories. The
// `reverse` flag flips the polarity (e.g. an "ok" item with reverse=true
// means a higher answer should *decrease* the ok score, because it actually
// reflects a problem).
export const QUIZ_ITEMS = [
  {
    id: "q1",
    text: "গত ৭ দিনে আমি বিষণ্ণ বা আশাহীন বোধ করেছি।",
    weights: { sad: 1, ok: -1 },
    reverse: true
  },
  {
    id: "q2",
    text: "আমি কোনো কাজে আগ্রহ বা আনন্দ পাইনি।",
    weights: { sad: 1, ok: -1 },
    reverse: true
  },
  {
    id: "q3",
    text: "আমি চিন্তিত, উদ্বিগ্ন বা ভীত বোধ করেছি।",
    weights: { anxious: 1, ok: -1 },
    reverse: true
  },
  {
    id: "q4",
    text: "আমি দ্রুত রাগান্বিত হয়েছি বা ধৈর্য হারিয়েছি।",
    weights: { angry: 1, stressed: 1, ok: -1 },
    reverse: true
  },
  {
    id: "q5",
    text: "কাজের চাপ বা দায়িত্ব আমাকে অতিরিক্ত চাপ দিয়েছে।",
    weights: { stressed: 1, anxious: 0.5, ok: -1 },
    reverse: true
  },
  {
    id: "q6",
    text: "আমি একাকী বোধ করেছি, এমনকি অন্যদের সাথেও।",
    weights: { lonely: 1, sad: 0.5, ok: -1 },
    reverse: true
  },
  {
    id: "q7",
    text: "আমি ভালো ঘুমিয়েছি এবং সতেজ বোধ করেছি।",
    weights: { ok: 1, stressed: -0.5, anxious: -0.5 },
    reverse: false
  },
  {
    id: "q8",
    text: "আমি কাউকে বলতে পেরেছি কেমন বোধ করছি।",
    weights: { ok: 1, lonely: -0.5, sad: -0.5 },
    reverse: false
  },
  {
    id: "q9",
    text: "আমি নিজের যত্ন নিতে পেরেছি (খাওয়া, গোসল, ঘুম)।",
    weights: { ok: 1, sad: -0.5, stressed: -0.5 },
    reverse: false
  },
  {
    id: "q10",
    text: "আমি ছোট ছোট কাজ সম্পন্ন করতে পেরেছি।",
    weights: { ok: 1, stressed: -0.5, sad: -0.5 },
    reverse: false
  },
  {
    id: "q11",
    text: "আমি ভবিষ্যৎ নিয়ে আশাবাদী।",
    weights: { ok: 1, sad: -0.5, anxious: -0.5 },
    reverse: false
  },
  {
    id: "q12",
    text: "আমি নিজেকে মূল্যবান মনে করেছি।",
    weights: { ok: 1, sad: -0.5, anxious: -0.5 },
    reverse: false
  }
];

const CATEGORY_LABELS = {
  sad:      "বিষণ্ণতা",
  anxious:  "উদ্বেগ",
  stressed: "চাপ",
  lonely:   "একাকীত্ব",
  angry:    "রাগ",
  ok:       "সুস্থতা"
};

// Score a flat array of answers [{id, value}, ...] OR an object {q1:2, q2:1, ...}
export function scoreQuiz(input) {
  const answers = Array.isArray(input)
    ? input
    : QUIZ_ITEMS.map((it) => ({ id: it.id, value: input?.[it.id] ?? null }));

  const categoryScores = { sad: 0, anxious: 0, stressed: 0, lonely: 0, angry: 0, ok: 0 };
  const categoryMax    = { sad: 0, anxious: 0, stressed: 0, lonely: 0, angry: 0, ok: 0 };
  const answered = [];

  for (const item of QUIZ_ITEMS) {
    const ans = answers.find((a) => a.id === item.id);
    if (!ans || ans.value === null || ans.value === undefined) continue;
    const v = Number(ans.value);
    if (Number.isNaN(v)) continue;

    answered.push({ id: item.id, value: v });
    for (const [cat, w] of Object.entries(item.weights || {})) {
      const absW = Math.abs(w);
      // Worst case: |weight| * value=3 — track the theoretical max per category
      categoryMax[cat] = (categoryMax[cat] || 0) + absW * 3;
      // Direction: if reverse=true, higher value hurts that category; otherwise helps it.
      // We add to categoryScores as a "raw" value where positive = the category is doing well.
      const direction = item.reverse ? -1 : 1;
      categoryScores[cat] = (categoryScores[cat] || 0) + direction * v * w;
    }
  }

  // Convert each category to a 0-100 "risk" score (100 = worst). For ok we
  // invert because higher score = healthier.
  const risk = {
    sad:      categoryToRisk(categoryScores.sad,      categoryMax.sad),
    anxious:  categoryToRisk(categoryScores.anxious,  categoryMax.anxious),
    stressed: categoryToRisk(categoryScores.stressed, categoryMax.stressed),
    lonely:   categoryToRisk(categoryScores.lonely,   categoryMax.lonely),
    angry:    categoryToRisk(categoryScores.angry,    categoryMax.angry)
  };
  const wellbeing = 100 - categoryToRisk(categoryScores.ok, categoryMax.ok);

  // Decide dominant category. If wellbeing is high and no individual risk
  // stands out, the user is doing ok. Otherwise pick the highest risk.
  const sortedRisk = Object.entries(risk).sort((a, b) => b[1] - a[1]);
  const topRisk = sortedRisk[0];

  let dominantCategory;
  // Threshold: when wellbeing >= 60 and the worst risk isn't much worse
  // than the next, prefer "ok". This also handles the all-zero case
  // (everything neutral → fall back to "ok").
  const secondRisk = sortedRisk[1]?.[1] ?? 50;
  const riskSpread = topRisk[1] - secondRisk;
  if (wellbeing >= 60 && topRisk[1] < 55) {
    dominantCategory = "ok";
  } else if (topRisk[1] < 55 && wellbeing >= 50 && riskSpread < 5) {
    dominantCategory = "ok";
  } else {
    dominantCategory = topRisk[0];
  }

  const intensity = intensityFromRisk(
    dominantCategory === "ok" ? 100 - wellbeing : topRisk[1]
  );

  return {
    answered,
    categoryScores,
    categoryMax,
    risk,
    wellbeing,
    dominantCategory,
    intensity,
    categoryLabel: CATEGORY_LABELS[dominantCategory],
    totalAnswered: answered.length,
    totalItems: QUIZ_ITEMS.length,
    completed: answered.length === QUIZ_ITEMS.length
  };
}

// Convert a raw category score (negative = bad, positive = good) and the
// theoretical maximum to a 0-100 risk scale.
function categoryToRisk(score, max) {
  if (!max) return 50;
  // score is in [-max, +max]; map to risk in [0, 100]
  const ratio = -score / max; // -1 (best) ... +1 (worst)
  return clamp01to100(((ratio + 1) / 2) * 100);
}

function intensityFromRisk(risk) {
  if (risk < 35) return "mild";
  if (risk < 65) return "moderate";
  return "severe";
}

function clamp01to100(n) {
  if (Number.isNaN(n)) return 50;
  return Math.max(0, Math.min(100, Math.round(n)));
}

export const QUIZ_CATEGORY_LABELS = CATEGORY_LABELS;
