/**
 * Format a Date object as a Bengali date string,
 * e.g. "৪ জুন, ২০২৬".
 */
const monthsBn = [
  "জানুয়ারি", "ফেব্রুয়ারি", "মার্চ", "এপ্রিল", "মে", "জুন",
  "জুলাই", "আগস্ট", "সেপ্টেম্বর", "অক্টোবর", "নভেম্বর", "ডিসেম্বর"
];

const bnDigits = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];

const convertToBnDigits = (num) =>
  num
    .toString()
    .split("")
    .map((d) => bnDigits[parseInt(d, 10)] || d)
    .join("");

export function formatBnDate(date) {
  return `${convertToBnDigits(date.getDate())} ${monthsBn[date.getMonth()]}, ${convertToBnDigits(date.getFullYear())}`;
}

export function todayIsoDate(date = new Date()) {
  return date.toISOString().split("T")[0];
}

export const MOODS = [
  "ভালো আছি",
  "দুর্বল",
  "মাথাব্যথা",
  "জ্বর",
  "বমি",
  "ক্লান্ত"
];
