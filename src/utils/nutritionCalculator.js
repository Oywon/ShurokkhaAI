// src/utils/nutritionCalculator.js
//
// Pure helpers that turn basic patient inputs (weight, height, age, gender,
// activity, goal) into:
//   - BMR (Mifflin-St Jeor)
//   - TDEE (BMR × activity multiplier)
//   - target daily calories (TDEE + goal adjustment)
//   - macro split (protein / carb / fat grams)
//   - per-meal calorie budget
//   - a concrete food plan (uses src/data/nutritionSuggestions.js)
//
// All functions are pure: no React, no Firebase. Easy to unit-test with Node.

import {
  NUTRITION_DATABASE,
  GOAL_OPTIONS,
  ACTIVITY_OPTIONS,
  GENDER_OPTIONS
} from "../data/nutritionSuggestions.js";

// ── safety / ranges ────────────────────────────────────────
const RANGES = {
  weight:        { min: 30,  max: 200, label: "ওজন (কেজি)" },
  height:        { min: 100, max: 220, label: "উচ্চতা (সেমি)" },
  age:           { min: 5,   max: 100, label: "বয়স (বছর)" },
  exerciseHours: { min: 0,   max: 25,  label: "সাপ্তাহিক ব্যায়াম (ঘণ্টা)" }
};

// Map an exercise-hour value to an ACTIVITY_OPTIONS tier.
function activityForHours(hours) {
  if (hours <= 1)  return ACTIVITY_OPTIONS[0]; // sedentary
  if (hours <= 3)  return ACTIVITY_OPTIONS[1]; // light
  if (hours <= 5)  return ACTIVITY_OPTIONS[2]; // moderate
  if (hours <= 8)  return ACTIVITY_OPTIONS[3]; // active
  return ACTIVITY_OPTIONS[4];                  // very active
}

function goalById(id) {
  return GOAL_OPTIONS.find((g) => g.id === id) || GOAL_OPTIONS[1];
}

// Mifflin-St Jeor BMR.
// male   : 10*kg + 6.25*cm - 5*age + 5
// female : 10*kg + 6.25*cm - 5*age - 161
export function calculateBMR({ weight, height, age, gender }) {
  const base = 10 * weight + 6.25 * height - 5 * age;
  return gender === "female" ? base - 161 : base + 5;
}

// BMR * activity multiplier
export function calculateTDEE(bmr, activityId) {
  const opt = ACTIVITY_OPTIONS.find((a) => a.id === activityId) || ACTIVITY_OPTIONS[0];
  return bmr * opt.multiplier;
}

// Macro split:
// - protein: 25% of calories (rises to 30% for muscle)
// - fat:     25% of calories
// - carbs:   50% of calories
// Calorie densities: 4 kcal/g protein & carbs, 9 kcal/g fat
export function calculateMacros(targetKcal, goalId) {
  const proteinPct = goalId === "muscle" ? 0.30 : 0.25;
  const fatPct     = 0.25;
  const carbPct    = 1 - proteinPct - fatPct;
  return {
    protein: Math.round((targetKcal * proteinPct) / 4),
    fat:     Math.round((targetKcal * fatPct)     / 9),
    carbs:   Math.round((targetKcal * carbPct)    / 4),
    split: {
      protein: Math.round(proteinPct * 100),
      fat:     Math.round(fatPct     * 100),
      carbs:   Math.round(carbPct    * 100)
    }
  };
}

// Per-meal calorie budget (percentages)
export const MEAL_DISTRIBUTION = {
  breakfast: 0.25,
  lunch:     0.35,
  snack:     0.10,
  dinner:    0.30
};

// Pick N items for a meal slot that satisfy the calorie budget.
// Strategy:
//   1. Filter DB by mealType & goalFit
//   2. Drop items already used
//   3. Sort by a "fit score" — closer to target, balanced macros
//   4. Greedily pick until budget is filled (or 4 items max)
function buildMeal(mealType, budgetKcal, goalId, usedIds) {
  const candidates = NUTRITION_DATABASE.filter((f) =>
    f.mealType.includes(mealType) &&
    f.goalFit.includes(goalId) &&
    !usedIds.has(f.id)
  );

  // If no candidates match goalFit, relax to any mealType fit
  const pool = candidates.length > 0 ? candidates : NUTRITION_DATABASE.filter((f) =>
    f.mealType.includes(mealType) && !usedIds.has(f.id)
  );

  // Score: smaller kcal difference to budget ÷ 2 per item
  const perItemBudget = budgetKcal / 2;
  const scored = pool.map((f) => {
    const diff = Math.abs(f.kcal - perItemBudget);
    // Bonus for protein-dominant items if macro target is muscle
    const macroBonus = (goalId === "muscle" && f.protein >= 10) ? 30 : 0;
    return { f, score: diff - macroBonus };
  }).sort((a, b) => a.score - b.score);

  const picks = [];
  let used = 0;
  for (const { f } of scored) {
    if (picks.length >= 4) break;
    if (used + f.kcal > budgetKcal * 1.25) continue; // allow 25% over
    picks.push(f);
    used += f.kcal;
    usedIds.add(f.id);
    if (used >= budgetKcal * 0.9) break;
  }

  // Sum totals
  const totals = picks.reduce(
    (acc, p) => ({
      kcal:    acc.kcal    + p.kcal,
      protein: acc.protein + p.protein,
      carbs:   acc.carbs   + p.carbs,
      fat:     acc.fat     + p.fat
    }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0 }
  );

  return { items: picks, totals, budget: Math.round(budgetKcal) };
}

// ── main entry point ───────────────────────────────────────
export function calculateNutritionPlan(input) {
  const {
    weight, height, age, gender,
    exerciseHours = 0, goal = "maintain"
  } = input || {};

  // Validate ranges — return errors object instead of NaN
  const errors = {};
  for (const k of Object.keys(RANGES)) {
    const v = Number(input?.[k]);
    if (!Number.isFinite(v))            errors[k] = `${RANGES[k].label} প্রদান করুন`;
    else if (v < RANGES[k].min)         errors[k] = `${RANGES[k].label} সর্বনিম্ন ${RANGES[k].min}`;
    else if (v > RANGES[k].max)         errors[k] = `${RANGES[k].label} সর্বোচ্চ ${RANGES[k].max}`;
  }
  if (gender !== "male" && gender !== "female") {
    errors.gender = "লিঙ্গ নির্বাচন করুন";
  }
  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  const activity = activityForHours(Number(exerciseHours));
  const goalMeta = goalById(goal);

  const bmr       = Math.round(calculateBMR({ weight, height, age, gender }));
  const tdee      = Math.round(calculateTDEE(bmr, activity.id));
  const targetKcal = Math.max(1000, Math.round(tdee + goalMeta.calorieAdjust));
  const macros    = calculateMacros(targetKcal, goal);
  const bmi       = Math.round((weight / Math.pow(height / 100, 2)) * 10) / 10;
  const bmiCategory = bmiCategoryBn(bmi);

  // Build each meal
  const usedIds = new Set();
  const meals = {
    breakfast: buildMeal("breakfast", targetKcal * MEAL_DISTRIBUTION.breakfast, goal, usedIds),
    lunch:     buildMeal("lunch",     targetKcal * MEAL_DISTRIBUTION.lunch,     goal, usedIds),
    snack:     buildMeal("snack",     targetKcal * MEAL_DISTRIBUTION.snack,     goal, usedIds),
    dinner:    buildMeal("dinner",    targetKcal * MEAL_DISTRIBUTION.dinner,    goal, usedIds)
  };

  return {
    ok: true,
    bmr,
    tdee,
    targetKcal,
    macros,
    bmi,
    bmiCategory,
    waterIntake: Math.round(weight * 0.033 * 10) / 10, // litres
    activity: { id: activity.id, label: activity.label, multiplier: activity.multiplier },
    goal: { id: goal, label: goalMeta.label, adjust: goalMeta.calorieAdjust },
    gender: GENDER_OPTIONS.find((g) => g.id === gender)?.label || "",
    meals,
    mealOrder: ["breakfast", "lunch", "snack", "dinner"],
    tips: tipsForGoal(goal)
  };
}

// BMI category in Bengali
export function bmiCategoryBn(bmi) {
  if (bmi < 18.5) return { id: "under",    label: "কম ওজন",            color: "blue"   };
  if (bmi < 25)   return { id: "normal",   label: "স্বাভাবিক",          color: "green"  };
  if (bmi < 30)   return { id: "over",     label: "সামান্য বেশি",       color: "amber"  };
  return                { id: "obese",  label: "স্থূলতা",            color: "red"    };
}

// Quick tip lines for the chosen goal
function tipsForGoal(goal) {
  switch (goal) {
    case "weight_loss":
      return [
        "প্রতিদিন ক্যালোরি ঘাটতি রাখুন — চিনি ও তেল কমান।",
        "বেশি ফল ও সবজি, কম ভাত/রুটি খান।",
        "সপ্তাহে ৫ দিন ৩০ মিনিট হাঁটুন বা ব্যায়াম করুন।"
      ];
    case "weight_gain":
      return [
        "দিনে ৫-৬ বার অল্প অল্প করে খান।",
        "ঘি-ভাত, ডিম, ডাল ও ছানা পর্যাপ্ত রাখুন।",
        "ব্যায়ামের পর প্রোটিন-সমৃদ্ধ খাবার খান।"
      ];
    case "muscle":
      return [
        "প্রতিবেলায় প্রোটিন ২০-৩০ গ্রাম রাখুন।",
        "ডিম, মাছ, মুরগি, ছানা ও ডাল অগ্রাধিকার দিন।",
        "প্রতিদিন ৭-৮ ঘণ্টা ঘুম নিশ্চিত করুন।"
      ];
    case "recovery":
      return [
        "ভিটামিন সি ও প্রোটিন বেশি রাখুন।",
        "ডাবের পানি, ফল ও সবজি স্যুপ সহায়ক।",
        "প্রক্রিয়াজাত খাবার ও চিনি এড়িয়ে চলুন।"
      ];
    case "maintain":
    default:
      return [
        "সব খাবারের সঠিক ভারসাম্য রাখুন।",
        "দৈনিক ২-৩ লিটার পানি পান করুন।",
        "সময়মতো ঘুম ও হালকা ব্যায়াম বজায় রাখুন।"
      ];
  }
}

// Re-export commonly used maps for UI
export { GOAL_OPTIONS, ACTIVITY_OPTIONS, GENDER_OPTIONS, RANGES };
