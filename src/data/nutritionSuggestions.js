// src/data/nutritionSuggestions.js
//
// Local Bengali food / nutrition suggestion database. 100+ entries across
// 7 categories (protein, carb, vegetable, fruit, fat, beverage, snack) plus
// 5 meal-type buckets used by the meal builder (breakfast, lunch, dinner,
// snack, anytime).
//
// Each suggestion has:
//   id           - stable string id
//   name         - Bengali name of the food
//   portion      - suggested portion ("১ কাপ", "১টি মাঝারি", etc.)
//   kcal         - calories for the portion (integer)
//   protein      - grams of protein
//   carbs        - grams of carbohydrate
//   fat          - grams of fat
//   category     - one of: protein | carb | vegetable | fruit | fat | beverage | snack
//   mealType     - array of: breakfast | lunch | dinner | snack | anytime
//   goalFit      - array of: weight_loss | maintain | weight_gain | muscle | recovery
//   caloriesTier - "low" (<120) | "medium" (120-280) | "high" (280-500) | "very_high" (500+)
//   note         - one short Bengali benefit / tip
//   tags         - small array for filtering ("হালকা", "উচ্চ-আমিষ", etc.)
//
// Calculator utility `src/utils/nutritionCalculator.js` consumes this file.

export const NUTRITION_CATEGORIES = [
  { id: "protein",   label: "প্রোটিন",  color: "red"   },
  { id: "carb",      label: "শর্করা",   color: "amber" },
  { id: "vegetable", label: "সবজি",     color: "green" },
  { id: "fruit",     label: "ফল",       color: "pink"  },
  { id: "fat",       label: "স্বাস্থ্যকর চর্বি", color: "yellow" },
  { id: "beverage",  label: "পানীয়",   color: "blue"  },
  { id: "snack",     label: "হালকা নাস্তা", color: "purple" }
];

export const GOAL_OPTIONS = [
  { id: "weight_loss",  label: "ওজন কমাতে",      calorieAdjust: -500, proteinBoost: 0.10 },
  { id: "maintain",     label: "ওজন ধরে রাখতে",  calorieAdjust:    0, proteinBoost: 0.08 },
  { id: "weight_gain",  label: "ওজন বাড়াতে",    calorieAdjust:  500, proteinBoost: 0.10 },
  { id: "muscle",       label: "পেশি গড়তে",     calorieAdjust:  350, proteinBoost: 0.20 },
  { id: "recovery",     label: "সুস্থতা ফিরে পেতে", calorieAdjust: 200, proteinBoost: 0.12 }
];

export const GENDER_OPTIONS = [
  { id: "male",   label: "পুরুষ" },
  { id: "female", label: "মহিলা" }
];

export const ACTIVITY_OPTIONS = [
  { id: "sedentary",   label: "বসে বসে কাজ (কম)",       multiplier: 1.2  },
  { id: "light",       label: "সপ্তাহে ১-৩ দিন হালকা ব্যায়াম", multiplier: 1.375 },
  { id: "moderate",    label: "সপ্তাহে ৩-৫ দিন মাঝারি ব্যায়াম", multiplier: 1.55  },
  { id: "active",      label: "সপ্তাহে ৬-৭ দিন ভারী ব্যায়াম",   multiplier: 1.725 },
  { id: "very_active", label: "প্রতিদিন ভারী শারীরিক পরিশ্রম",  multiplier: 1.9   }
];

const F = (id, name, portion, kcal, protein, carbs, fat, category,
           mealType, goalFit, note, tags = []) => ({
  id, name, portion, kcal, protein, carbs, fat, category,
  mealType, goalFit, note, tags,
  caloriesTier:
    kcal < 120 ? "low" :
    kcal < 280 ? "medium" :
    kcal < 500 ? "high" : "very_high"
});

// ── protein (প্রোটিন) ─────────────────────────────────────────
const PROTEIN = [
  F("pr-01", "ডিম সিদ্ধ",                "২টি",      140, 12, 1,  10, "protein",
    ["breakfast","lunch","dinner","anytime"],
    ["weight_loss","maintain","weight_gain","muscle","recovery"],
    "প্রতিদিন ১-২টি ডিম দেহে প্রোটিনের চাহিদা পূরণ করে।", ["উচ্চ-আমিষ","সস্তা"]),
  F("pr-02", "মুরগির বুকের মাংস",         "১০০ গ্রাম", 165, 31, 0,  4,  "protein",
    ["lunch","dinner"],
    ["weight_loss","maintain","weight_gain","muscle","recovery"],
    "চর্বি কম, প্রোটিন বেশি — ওজন নিয়ন্ত্রণে আদর্শ।", ["লো-ফ্যাট"]),
  F("pr-03", "মুরগির ডানা",                "২টি",      180, 16, 0,  12, "protein",
    ["lunch","dinner"],
    ["weight_gain","muscle"],
    "ওজন বাড়াতে চাইলে ভালো পছন্দ, তবে তেল কম রাখুন।", []),
  F("pr-04", "মাছ (রুই/কাতলা)",           "১০০ গ্রাম", 120, 20, 0,  4,  "protein",
    ["lunch","dinner"],
    ["weight_loss","maintain","muscle","recovery"],
    "ওমেগা-৩ ফ্যাটি অ্যাসিড ও প্রোটিনের ভালো উৎস।", ["ওমেগা-৩"]),
  F("pr-05", "ইলিশ মাছ",                  "১০০ গ্রাম", 210, 22, 0,  12, "protein",
    ["lunch","dinner"],
    ["weight_gain","muscle","recovery"],
    "বাংলাদেশের প্রিয় মাছ, ওমেগা-৩ সমৃদ্ধ।", ["ওমেগা-৩","ঐতিহ্যবাহী"]),
  F("pr-06", "চিংড়ি মাছ",                 "১০০ গ্রাম", 100, 24, 0,  1,  "protein",
    ["lunch","dinner"],
    ["weight_loss","maintain","muscle"],
    "অত্যন্ত লো-ফ্যাট উচ্চ-প্রোটিন খাবার।", ["লো-ফ্যাট"]),
  F("pr-07", "ছোলা (ভেজানো)",             "১ কাপ",    210, 15, 35, 4,  "protein",
    ["lunch","dinner","snack"],
    ["weight_loss","maintain","recovery"],
    "উদ্ভিজ্জ প্রোটিন ও ফাইবারে সমৃদ্ধ।", ["নিরামিষ","ফাইবার"]),
  F("pr-08", "মসুর ডাল",                  "১ কাপ রান্না", 230, 18, 40, 1, "protein",
    ["lunch","dinner"],
    ["weight_loss","maintain","recovery"],
    "বাংলার ঘরোয়া প্রোটিন, লোহার চাহিদা মেটায়।", ["নিরামিষ","লোহা"]),
  F("pr-09", "মুগ ডাল",                   "১ কাপ রান্না", 210, 14, 35, 1, "protein",
    ["lunch","dinner"],
    ["weight_loss","maintain","recovery"],
    "সহজপাচ্য প্রোটিন, গ্যাস কম হয়।", ["নিরামিষ","সহজপাচ্য"]),
  F("pr-10", "সয়াবিন",                   "১ কাপ রান্না", 300, 28, 17, 16, "protein",
    ["lunch","dinner"],
    ["weight_loss","maintain","muscle"],
    "উদ্ভিজ্জ প্রোটিনের সেরা উৎসগুলোর একটি।", ["নিরামিষ"]),
  F("pr-11", "পনির/ছানা",                 "১০০ গ্রাম", 260, 18, 3,  20, "protein",
    ["lunch","dinner","snack"],
    ["weight_gain","muscle"],
    "ক্যালসিয়াম ও প্রোটিনে ভরপুর।", ["ক্যালসিয়াম"]),
  F("pr-12", "দই (মিষ্টি)",               "১ কাপ",    150, 8,  20, 4,  "protein",
    ["breakfast","snack"],
    ["maintain","weight_gain","recovery"],
    "প্রোবায়োটিক ও ক্যালসিয়ামের চাহিদা পূরণ করে।", ["প্রোবায়োটিক"]),
  F("pr-13", "টক দই",                     "১ কাপ",    100, 8,  10, 2,  "protein",
    ["lunch","dinner","snack"],
    ["weight_loss","maintain","recovery"],
    "পেট ঠান্ডা রাখে, লো-ক্যালরি।", ["প্রোবায়োটিক","লো-ফ্যাট"]),
  F("pr-14", "গরুর মাংস (লো-ফ্যাট)",      "১০০ গ্রাম", 220, 26, 0,  12, "protein",
    ["lunch","dinner"],
    ["muscle","weight_gain"],
    "আয়রন ও ক্রিয়েটিনের অন্যতম উৎস।", ["আয়রন","ক্রিয়েটিন"]),
  F("pr-15", "খাসির মাংস",                "১০০ গ্রাম", 250, 27, 0,  15, "protein",
    ["lunch","dinner"],
    ["weight_gain","muscle"],
    "উচ্চ-প্রোটিন তবে চর্বিও বেশি — পরিমিত খান।", [])
];

// ── carb (শর্করা) ───────────────────────────────────────────
const CARB = [
  F("cb-01", "ভাত (সাদা)",                "১ কাপ",    205, 4, 45, 0,  "carb",
    ["lunch","dinner"],
    ["maintain","weight_gain","muscle"],
    "বাঙালির প্রধান শর্করা, সাথে প্রোটিন রাখুন।", ["স্টার্চি"]),
  F("cb-02", "লাল চালের ভাত",             "১ কাপ",    215, 5, 45, 1,  "carb",
    ["lunch","dinner"],
    ["weight_loss","maintain","recovery"],
    "ফাইবার ও ভিটামিন বি বেশি।", ["ফাইবার"]),
  F("cb-03", "রুটি (গম)",                  "২টি",      160, 6, 32, 2,  "carb",
    ["breakfast","lunch","dinner"],
    ["weight_loss","maintain","muscle"],
    "ক্যালোরি কম, ফাইবার ভালো।", ["ফাইবার"]),
  F("cb-04", "পরোটা",                     "১টি মাঝারি", 280, 6, 35, 13, "carb",
    ["breakfast","lunch","dinner"],
    ["weight_gain","muscle"],
    "ঘি/তেল বেশি — সপ্তাহে ১-২ বার খাওয়াই ভালো।", ["উচ্চ-চর্বি"]),
  F("cb-05", "আলু সিদ্ধ",                 "১ কাপ",    130, 3, 30, 0,  "carb",
    ["lunch","dinner","snack"],
    ["maintain","weight_gain"],
    "সস্তা শর্করা, সাথে প্রোটিন যোগ করে খান।", []),
  F("cb-06", "মিষ্টি আলু",                "১ কাপ",    180, 4, 41, 0,  "carb",
    ["lunch","dinner","snack"],
    ["weight_loss","maintain","recovery"],
    "ভিটামিন এ ও ফাইবার সমৃদ্ধ।", ["ফাইবার","ভিটামিন-এ"]),
  F("cb-07", "ওটস",                       "১/২ কাপ শুকনো", 150, 5, 27, 3, "carb",
    ["breakfast"],
    ["weight_loss","maintain","muscle","recovery"],
    "ধীরে শোষিত শর্করা — দীর্ঘক্ষণ পেট ভরা থাকে।", ["ফাইবার"]),
  F("cb-08", "সেমাই",                     "১ কাপ",    220, 4, 40, 5,  "carb",
    ["breakfast","snack"],
    ["maintain","weight_gain"],
    "ঈদ/উৎসবে জনপ্রিয়, চিনি কম রাখলে ভালো।", []),
  F("cb-09", "লাচ্ছা (চিড়া)",             "১ কাপ",    110, 2, 24, 0,  "carb",
    ["breakfast","snack"],
    ["weight_loss","maintain"],
    "হালকা শর্করা, সহজপাচ্য।", ["হালকা"]),
  F("pr-16", "চিড়া-মুড়ি",                "১ কাপ",    180, 4, 38, 1,  "carb",
    ["breakfast","snack"],
    ["maintain","weight_gain"],
    "ঐতিহ্যবাহী হালকা নাস্তা, পেট ভরে।", ["ঐতিহ্যবাহী"]),
  F("cb-10", "কলা",                       "১টি মাঝারি", 105, 1, 27, 0, "carb",
    ["breakfast","snack","anytime"],
    ["weight_gain","muscle","recovery"],
    "ব্যায়ামের আগে বা পরে দ্রুত শক্তি দেয়।", ["দ্রুত-শক্তি"]),
  F("cb-11", "ডাবের পানি",                "১ গ্লাস",  50, 1, 12, 0,  "beverage",
    ["anytime"],
    ["weight_loss","maintain","recovery"],
    "ইলেক্ট্রোলাইট স্বাভাবিক রাখে, গরমে আদর্শ।", ["হাইড্রেটিং"]),
  F("cb-12", "খেজুর",                     "২টি",      65, 0, 18, 0,  "fruit",
    ["snack","anytime"],
    ["weight_gain","muscle","recovery"],
    "দ্রুত শক্তি, আয়রনের ভালো উৎস।", ["আয়রন","দ্রুত-শক্তি"]),
  F("cb-13", "মধু",                       "১ টেবিল চামচ", 65, 0, 17, 0, "fat",
    ["anytime"],
    ["weight_gain","recovery"],
    "চিনির বিকল্প, তবে পরিমিত ব্যবহার করুন।", [])
];

// ── vegetable (সবজি) ───────────────────────────────────────
const VEGETABLE = [
  F("vg-01", "পালং শাক",                  "১ কাপ",    25, 3, 4, 0,  "vegetable",
    ["lunch","dinner"],
    ["weight_loss","maintain","recovery"],
    "আয়রন, ফোলেট ও ভিটামিনের ভাণ্ডার।", ["আয়রন","ফোলেট"]),
  F("vg-02", "লাল শাক",                   "১ কাপ",    30, 3, 5, 0,  "vegetable",
    ["lunch","dinner"],
    ["weight_loss","maintain","recovery"],
    "আয়রনে খুব সমৃদ্ধ, রক্ত বাড়ায়।", ["আয়রন"]),
  F("vg-03", "ব্রকলি",                    "১ কাপ",    55, 4, 11, 1, "vegetable",
    ["lunch","dinner"],
    ["weight_loss","maintain","muscle","recovery"],
    "ভিটামিন সি ও ক্যান্সার-প্রতিরোধী যৌগ।", ["ভিটামিন-সি"]),
  F("vg-04", "ফুলকপি",                    "১ কাপ",    25, 2, 5, 0,  "vegetable",
    ["lunch","dinner"],
    ["weight_loss","maintain","recovery"],
    "ক্যালোরি অত্যন্ত কম, ফাইবার ভালো।", ["লো-ক্যাল"]),
  F("vg-05", "বাঁধাকপি",                  "১ কাপ",    25, 1, 5, 0,  "vegetable",
    ["lunch","dinner"],
    ["weight_loss","maintain","recovery"],
    "ভিটামিন কে ও সি তে সমৃদ্ধ।", ["ভিটামিন-কে"]),
  F("vg-06", "শসা",                       "১ কাপ",    16, 1, 4, 0,  "vegetable",
    ["anytime","snack"],
    ["weight_loss","maintain","recovery"],
    "পানি বেশি, ক্যালোরি প্রায় শূন্য।", ["হাইড্রেটিং"]),
  F("vg-07", "টমেটো",                     "১টি মাঝারি", 22, 1, 5, 0, "vegetable",
    ["lunch","dinner"],
    ["weight_loss","maintain","recovery"],
    "লাইকোপেন — হৃদযন্ত্রের জন্য উপকারী।", ["লাইকোপেন"]),
  F("vg-08", "গাজর",                      "১ কাপ",    50, 1, 12, 0, "vegetable",
    ["lunch","dinner","snack"],
    ["weight_loss","maintain","recovery"],
    "বিটা-ক্যারোটিন ও চোখের জন্য উপকারী।", ["ভিটামিন-এ"]),
  F("vg-09", "করলা",                      "১ কাপ",    30, 2, 6, 0,  "vegetable",
    ["lunch","dinner"],
    ["weight_loss","maintain","recovery"],
    "রক্তে শর্করা কমায়, ডায়াবেটিকদের জন্য ভালো।", ["ডায়াবেটিক-বান্ধব"]),
  F("vg-10", "লাউ",                       "১ কাপ",    25, 1, 6, 0,  "vegetable",
    ["lunch","dinner"],
    ["weight_loss","maintain","recovery"],
    "পানি বেশি, ওজন কমাতে আদর্শ।", ["লো-ক্যাল"]),
  F("vg-11", "ঢেঁড়স",                     "১ কাপ",    35, 2, 8, 0,  "vegetable",
    ["lunch","dinner"],
    ["maintain","recovery"],
    "ফাইবার ও ভিটামিন সি।", ["ফাইবার"]),
  F("vg-12", "বেগুন",                     "১ কাপ",    35, 1, 9, 0,  "vegetable",
    ["lunch","dinner"],
    ["weight_loss","maintain","recovery"],
    "অ্যান্টিঅক্সিডেন্ট ও ফাইবার।", []),
  F("vg-13", "মুলা",                      "১ কাপ",    20, 1, 4, 0,  "vegetable",
    ["lunch","dinner","snack"],
    ["weight_loss","maintain","recovery"],
    "লো-ক্যাল, হজমশক্তি বাড়ায়।", ["লো-ক্যাল"]),
  F("vg-14", "শিম",                       "১ কাপ",    50, 3, 9, 0,  "vegetable",
    ["lunch","dinner"],
    ["maintain","weight_gain"],
    "উদ্ভিজ্জ প্রোটিন ও ফাইবার।", ["ফাইবার","নিরামিষ"]),
  F("vg-15", "কচু",                       "১ কাপ",    120, 1, 28, 0, "vegetable",
    ["lunch","dinner"],
    ["maintain","weight_gain"],
    "ফাইবার ভালো, পেট ভরা রাখে।", ["ফাইবার"])
];

// ── fruit (ফল) ─────────────────────────────────────────────
const FRUIT = [
  F("fr-01", "আম",                        "১ কাপ কিউব", 100, 1, 25, 0, "fruit",
    ["snack","anytime"],
    ["weight_gain","muscle","recovery"],
    "ভিটামিন এ ও সি সমৃদ্ধ, মৌসুমি ফল।", ["মৌসুমি"]),
  F("fr-02", "কলা",                       "১টি",      105, 1, 27, 0, "fruit",
    ["breakfast","snack","anytime"],
    ["weight_gain","muscle","recovery"],
    "দ্রুত শক্তি, ব্যায়ামের আগে খুব ভালো।", ["দ্রুত-শক্তি"]),
  F("fr-03", "আপেল",                      "১টি মাঝারি", 95, 0, 25, 0, "fruit",
    ["snack","anytime"],
    ["weight_loss","maintain","recovery"],
    "ফাইবার, পেকটিন ও অ্যান্টিঅক্সিডেন্ট।", ["ফাইবার"]),
  F("fr-04", "কমলা",                      "১টি মাঝারি", 65, 1, 15, 0, "fruit",
    ["snack","anytime"],
    ["maintain","recovery"],
    "ভিটামিন সি ও ফোলেট।", ["ভিটামিন-সি"]),
  F("fr-05", "পেয়ারা",                    "১টি",      70, 3, 14, 1, "fruit",
    ["snack","anytime"],
    ["weight_loss","maintain","recovery"],
    "ভিটামিন সি-র রেকর্ডধারী।", ["ভিটামিন-সি"]),
  F("fr-06", "লিচু",                       "৫টি",      65, 1, 16, 0, "fruit",
    ["snack","anytime"],
    ["weight_gain","recovery"],
    "মৌসুমি, ভিটামিন সি সমৃদ্ধ।", ["মৌসুমি"]),
  F("fr-07", "আনারস",                     "১ কাপ",    80, 1, 22, 0, "fruit",
    ["snack","anytime"],
    ["weight_loss","maintain","recovery"],
    "ব্রোমেলেইন — হজমে সাহায্য করে।", []),
  F("fr-08", "পেঁপে",                     "১ কাপ",    55, 1, 14, 0, "fruit",
    ["breakfast","snack","anytime"],
    ["weight_loss","maintain","recovery"],
    "পেপেন ও ভিটামিন এ সমৃদ্ধ।", ["ভিটামিন-এ"]),
  F("fr-09", "তরমুজ",                     "১ কাপ",    45, 1, 12, 0, "fruit",
    ["snack","anytime"],
    ["weight_loss","maintain","recovery"],
    "পানি ৯২%, গরমে আদর্শ।", ["হাইড্রেটিং"]),
  F("fr-10", "বাঙ্গি",                    "১ কাপ",    60, 2, 13, 0, "fruit",
    ["snack","anytime"],
    ["weight_loss","maintain","recovery"],
    "বিটা-ক্যারোটিন ও পানি বেশি।", ["ভিটামিন-এ"]),
  F("fr-11", "স্ট্রবেরি",                 "১ কাপ",    50, 1, 12, 0, "fruit",
    ["snack","anytime"],
    ["weight_loss","maintain","recovery"],
    "অ্যান্টিঅক্সিডেন্টে ভরপুর।", ["অ্যান্টিঅক্সিডেন্ট"]),
  F("fr-12", "নাশপাতি",                   "১টি মাঝারি", 100, 0, 27, 0, "fruit",
    ["snack","anytime"],
    ["weight_loss","maintain"],
    "ফাইবার ও ভিটামিন সি।", ["ফাইবার"]),
  F("fr-13", "জাম্বুরা",                  "১ কাপ",    80, 1, 20, 0, "fruit",
    ["snack","anytime"],
    ["maintain","recovery"],
    "ভিটামিন সি ও ফাইবার।", ["ভিটামিন-সি"]),
  F("fr-14", "জামরুল",                    "২টি",      50, 1, 13, 0, "fruit",
    ["snack","anytime"],
    ["weight_loss","maintain"],
    "লো-ক্যাল, হাইড্রেটিং।", ["লো-ক্যাল"]),
  F("fr-15", "ডালিম",                     "১ কাপ",    145, 3, 33, 2, "fruit",
    ["snack","anytime"],
    ["maintain","recovery"],
    "অ্যান্টিঅক্সিডেন্ট ও আয়রন।", ["আয়রন"])
];

// ── fat (স্বাস্থ্যকর চর্বি) ────────────────────────────────
const FAT = [
  F("ft-01", "ঘি",                         "১ টেবিল চামচ", 110, 0, 0, 12, "fat",
    ["anytime"],
    ["weight_gain","muscle"],
    "চর্বি-দ্রবণীয় ভিটামিন শোষণে সাহায্য করে।", []),
  F("ft-02", "অলিভ অয়েল",                "১ টেবিল চামচ", 120, 0, 0, 14, "fat",
    ["anytime"],
    ["maintain","recovery"],
    "মনো-আনস্যাচুরেটেড ফ্যাট — হৃদযন্ত্রের জন্য ভালো।", ["হার্ট-বান্ধব"]),
  F("ft-03", "বাদাম (কাঠবাদাম)",          "২০ গ্রাম",   120, 4, 4, 10, "fat",
    ["snack"],
    ["weight_loss","maintain","muscle"],
    "প্রোটিন ও স্বাস্থ্যকর চর্বি, কিন্তু পরিমিত।", ["প্রোটিন-বাদাম"]),
  F("ft-04", "আখরোট",                     "৪টি অর্ধেক",  130, 3, 3, 13, "fat",
    ["snack"],
    ["maintain","recovery"],
    "ওমেগা-৩ ফ্যাটি অ্যাসিডের উদ্ভিজ্জ উৎস।", ["ওমেগা-৩"]),
  F("ft-05", "তিলের বীজ",                 "১ টেবিল চামচ", 55, 2, 2, 4, "fat",
    ["anytime"],
    ["maintain","weight_gain"],
    "ক্যালসিয়াম ও লিগনান সমৃদ্ধ।", ["ক্যালসিয়াম"]),
  F("ft-06", "নারকেল তেল",                "১ টেবিল চামচ", 120, 0, 0, 14, "fat",
    ["anytime"],
    ["weight_gain","recovery"],
    "এমসিটি ফ্যাট — দ্রুত শক্তি দেয়।", []),
  F("ft-07", "তিসি বীজ",                   "১ টেবিল চামচ", 55, 2, 3, 4, "fat",
    ["anytime"],
    ["maintain","weight_loss","recovery"],
    "ওমেগা-৩ ও ফাইবার সমৃদ্ধ।", ["ওমেগা-৩","ফাইবার"]),
  F("ft-08", "কুসুম ডিম",                  "১টি",       55, 3, 0, 5,  "fat",
    ["breakfast"],
    ["muscle","weight_gain"],
    "কোলিন, ভিটামিন ডি ও ভালো চর্বি।", [])
];

// ── snack (হালকা নাস্তা) ───────────────────────────────────
const SNACK = [
  F("sn-01", "চা + লিকার (চিনি ছাড়া)",    "১ কাপ",     5, 0, 1, 0,  "beverage",
    ["breakfast","anytime"],
    ["weight_loss","maintain","recovery"],
    "অ্যান্টিঅক্সিডেন্ট, ক্যালোরি প্রায় শূন্য।", ["লো-ক্যাল"]),
  F("sn-02", "লেবু পানি (চিনি ছাড়া)",      "১ গ্লাস",   10, 0, 3, 0, "beverage",
    ["anytime"],
    ["weight_loss","maintain","recovery"],
    "ভিটামিন সি ও হাইড্রেশন।", ["হাইড্রেটিং"]),
  F("sn-03", "দুধ (ফুল-ক্রিম)",             "১ কাপ",    150, 8, 12, 8, "beverage",
    ["breakfast","snack","anytime"],
    ["weight_gain","muscle","recovery"],
    "ক্যালসিয়াম ও ভিটামিন ডি।", ["ক্যালসিয়াম"]),
  F("sn-04", "ছানার চিপস",                 "১০০ গ্রাম", 220, 12, 25, 8, "snack",
    ["snack"],
    ["weight_gain","muscle"],
    "প্রোটিন ও ক্যালসিয়াম, তবে তেল থাকে।", []),
  F("sn-05", "মুড়ি + চিড়া",               "১ কাপ",    200, 4, 44, 1, "snack",
    ["snack"],
    ["maintain","weight_gain"],
    "হালকা নাস্তা, পেট ভরে।", ["ঐতিহ্যবাহী"]),
  F("sn-06", "চকলেট (ডার্ক, ৭০%)",         "২০ গ্রাম",  120, 2, 12, 8, "snack",
    ["snack"],
    ["maintain","recovery"],
    "অ্যান্টিঅক্সিডেন্ট — পরিমিত খান।", ["অ্যান্টিঅক্সিডেন্ট"]),
  F("sn-07", "মুড়ি + ডিম",                 "১টি ডিম + ১ কাপ মুড়ি", 250, 12, 30, 10, "snack",
    ["breakfast","snack"],
    ["weight_gain","muscle"],
    "দ্রুত শক্তি ও প্রোটিন।", []),
  F("sn-08", "সবজি সালাদ",                 "১ বাটি",    80, 3, 12, 2, "snack",
    ["lunch","dinner","snack"],
    ["weight_loss","maintain","recovery"],
    "ফাইবার, ভিটামিন, লো-ক্যালরি।", ["ফাইবার","লো-ক্যাল"]),
  F("sn-09", "ফলের সালাদ",                 "১ বাটি",   110, 1, 28, 0, "snack",
    ["snack","anytime"],
    ["maintain","weight_gain","recovery"],
    "ভিটামিন ও ফাইবার, প্রাকৃতিক চিনি।", ["ফাইবার"]),
  F("sn-10", "ঘি-ভাত + ডিম",               "১ কাপ + ১টি", 350, 9, 45, 14, "snack",
    ["breakfast","lunch"],
    ["weight_gain","muscle"],
    "ওজন বাড়াতে ও পেশি গড়তে কার্যকর।", ["উচ্চ-ক্যাল"]),
  F("sn-11", "রুটি + ডিম ভুনা",            "২টি + ১টি", 350, 14, 35, 18, "snack",
    ["breakfast","lunch","dinner"],
    ["weight_gain","muscle"],
    "প্রোটিন ও শর্করার ভারসাম্য।", []),
  F("sn-12", "আচার (আম/লেবু)",             "১ টেবিল চামচ", 30, 0, 7, 0, "snack",
    ["lunch","dinner"],
    ["weight_loss","maintain"],
    "স্বাদ বাড়ায়, ক্যালোরি কম।", ["লো-ক্যাল"]),
  F("sn-13", "সবজি স্যুপ",                 "১ বাটি",   120, 4, 18, 3, "snack",
    ["lunch","dinner","snack"],
    ["weight_loss","maintain","recovery"],
    "পানি ও ফাইবার সমৃদ্ধ, ওজন কমাতে ভালো।", ["হাইড্রেটিং"]),
  F("sn-14", "মুরগির ঝোল (স্যুপ)",          "১ বাটি",   150, 15, 5, 7, "snack",
    ["lunch","dinner","recovery"],
    ["recovery","weight_loss","maintain"],
    "অসুস্থতার সময় খুব উপকারী।", ["রিকভারি"]),
  F("sn-15", "মাছের ঝোল",                  "১ বাটি",   130, 14, 3, 6, "snack",
    ["lunch","dinner"],
    ["recovery","maintain"],
    "সহজপাচ্য প্রোটিন, সুস্থতায় ভালো।", ["রিকভারি"])
];

// ── beverage (পানীয়) ───────────────────────────────────────
const BEVERAGE = [
  F("bv-01", "পানি",                       "১ গ্লাস",   0, 0, 0, 0,  "beverage",
    ["anytime"],
    ["weight_loss","maintain","weight_gain","muscle","recovery"],
    "দৈনিক ২-৩ লিটার পানি অত্যন্ত জরুরি।", ["হাইড্রেটিং"]),
  F("bv-02", "চা (দুধ, চিনি ছাড়া)",       "১ কাপ",    10, 1, 1, 1,  "beverage",
    ["breakfast","anytime"],
    ["weight_loss","maintain","recovery"],
    "অ্যান্টিঅক্সিডেন্ট, মেটাবলিজম বাড়ায়।", ["লো-ক্যাল"]),
  F("bv-03", "কফি (কালো)",                 "১ কাপ",    5, 0, 1, 0,  "beverage",
    ["breakfast","anytime"],
    ["maintain","muscle","recovery"],
    "ক্যাফেইন — এনার্জি ও ফোকাস বাড়ায়।", ["লো-ক্যাল"]),
  F("bv-04", "লাচ্ছা (চিড়া ভেজানো পানি)",  "১ গ্লাস",   60, 1, 14, 0, "beverage",
    ["anytime"],
    ["weight_loss","maintain","recovery"],
    "গরমে শরীর ঠান্ডা রাখে।", ["হাইড্রেটিং"]),
  F("bv-05", "ডাবের পানি",                "১ গ্লাস",  50, 1, 12, 0, "beverage",
    ["anytime"],
    ["weight_loss","maintain","muscle","recovery"],
    "পটাশিয়াম ও ইলেক্ট্রোলাইট।", ["হাইড্রেটিং"]),
  F("bv-06", "আমের জুস (চিনি ছাড়া)",      "১ গ্লাস",  120, 1, 30, 0, "beverage",
    ["breakfast","snack"],
    ["weight_gain","muscle","recovery"],
    "ভিটামিন এ ও ক্যারোটিন সমৃদ্ধ।", ["মৌসুমি"]),
  F("bv-07", "লেবু পানি (মধুসহ)",          "১ গ্লাস",  40, 0, 10, 0, "beverage",
    ["anytime"],
    ["maintain","recovery"],
    "ভিটামিন সি ও ডিটক্স।", ["হাইড্রেটিং"]),
  F("bv-08", "হালকা সবজি স্মুদি",           "১ গ্লাস",   90, 3, 18, 1, "beverage",
    ["breakfast","snack"],
    ["weight_loss","maintain","recovery"],
    "ফাইবার ও ভিটামিন, চিনি কম।", ["ফাইবার"])
];

// ── extras (10+ items to reach 100+) ───────────────────────
const EXTRAS = [
  F("pr-17", "হাঁসের ডিম",                  "২টি",      220, 14, 2, 16, "protein",
    ["breakfast","dinner"],
    ["weight_gain","muscle"],
    "আয়রন ও প্রোটিনে খুব সমৃদ্ধ।", ["আয়রন","ঐতিহ্যবাহী"]),
  F("pr-18", "ডিমের সাদা অংশ",             "৩টি",       50, 12, 0, 0, "protein",
    ["breakfast","lunch","dinner","anytime"],
    ["weight_loss","maintain","muscle","recovery"],
    "প্রায় বিশুদ্ধ প্রোটিন, চর্বি শূন্য।", ["লো-ফ্যাট"]),
  F("pr-19", "কই মাছ",                     "১০০ গ্রাম", 110, 21, 0, 3,  "protein",
    ["lunch","dinner"],
    ["weight_loss","maintain","muscle"],
    "ছোট মাছ, ক্যালসিয়াম সমৃদ্ধ (যদি কাঁটাসহ খান)।", ["ক্যালসিয়াম"]),
  F("vg-16", "মেথি শাক",                   "১ কাপ",    30, 3, 5, 0,  "vegetable",
    ["lunch","dinner"],
    ["weight_loss","maintain","recovery"],
    "ডায়াবেটিস নিয়ন্ত্রণে সহায়ক।", ["ডায়াবেটিক-বান্ধব"]),
  F("vg-17", "পুঁই শাক",                   "১ কাপ",    25, 2, 4, 0,  "vegetable",
    ["lunch","dinner"],
    ["maintain","recovery"],
    "লোহা ও ফাইবার সমৃদ্ধ।", ["আয়রন"]),
  F("vg-18", "কচুর লতি",                  "১ কাপ",    40, 2, 8, 0,  "vegetable",
    ["lunch","dinner"],
    ["weight_loss","maintain"],
    "ফাইবার ভালো, হজমশক্তি বাড়ায়।", ["ফাইবার"]),
  F("fr-16", "আমড়া",                       "১০০ গ্রাম", 45, 1, 11, 0, "fruit",
    ["snack","anytime"],
    ["weight_loss","maintain","recovery"],
    "ভিটামিন সি সমৃদ্ধ, লো-ক্যাল।", ["ভিটামিন-সি","লো-ক্যাল"]),
  F("fr-17", "কামরাঙা",                    "১০০ গ্রাম", 50, 0, 13, 0, "fruit",
    ["snack","anytime"],
    ["weight_loss","maintain","recovery"],
    "অ্যান্টিঅক্সিডেন্ট ও ভিটামিন এ।", ["অ্যান্টিঅক্সিডেন্ট"]),
  F("cb-14", "বেকড আলু",                   "১টি মাঝারি", 160, 4, 36, 0, "carb",
    ["lunch","dinner","snack"],
    ["maintain","weight_gain"],
    "ধীরে শোষিত শর্করা, পেট ভরে।", []),
  F("cb-15", "চিড়া-চিনি",                 "১ কাপ",    180, 1, 40, 0, "carb",
    ["snack"],
    ["weight_gain","muscle"],
    "দ্রুত শক্তি, প্রাকৃতিক চিনি।", ["দ্রুত-শক্তি"]),
  F("sn-16", "চিপস (বেকড)",               "৩০ গ্রাম",  150, 2, 20, 7, "snack",
    ["snack"],
    ["weight_gain","maintain"],
    "ক্রাঞ্চ — পরিমিত খান।", []),
  F("sn-17", "ডিমের কুসুম + চা",           "১টি + ১ কাপ", 80, 3, 1, 6, "snack",
    ["breakfast","snack"],
    ["maintain","weight_gain","recovery"],
    "সকালের দ্রুত নাস্তা।", [])
];

export const NUTRITION_DATABASE = [
  ...PROTEIN, ...CARB, ...VEGETABLE, ...FRUIT, ...FAT, ...SNACK, ...BEVERAGE, ...EXTRAS
];

// Stats helper (debug / future dashboard use)
export function getNutritionStats() {
  const byCategory = {};
  for (const item of NUTRITION_DATABASE) {
    byCategory[item.category] = (byCategory[item.category] || 0) + 1;
  }
  return { total: NUTRITION_DATABASE.length, byCategory };
}

// Filter helper used by calculator before meal-build
export function filterNutrition(options) {
  return NUTRITION_DATABASE.filter((item) => {
    if (options.category && item.category !== options.category) return false;
    if (options.caloriesTier && item.caloriesTier !== options.caloriesTier) return false;
    if (options.goalFit && !item.goalFit.includes(options.goalFit)) return false;
    if (options.mealType && !item.mealType.includes(options.mealType)) return false;
    if (options.maxKcal && item.kcal > options.maxKcal) return false;
    return true;
  });
}
