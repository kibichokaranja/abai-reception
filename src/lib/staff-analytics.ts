import {
  RATING_LABELS,
  RECOMMEND_SCORE_LABELS,
  type GuestFeedbackRow,
  type RecommendChoice,
  type RecommendScore,
  type ValueForMoneyChoice,
} from "@/lib/types";

export type CategoryKey =
  | "reservation_ease"
  | "welcome_check_in"
  | "accommodation_comfort"
  | "conference_facilities"
  | "wifi_quality"
  | "recreational_leisure"
  | "spa_experience"
  | "cleanliness_upkeep"
  | "food_taste_quality"
  | "service_promptness"
  | "staff_friendliness"
  | "safety_security"
  | "overall_experience"
  | "recommend_score"
  | "overall_stay"
  | "check_in"
  | "room_cleanliness"
  | "food_drink"
  | "spa_fitness"
  | "staff_experience";

export type CategoryAverage = {
  key: CategoryKey;
  label: string;
  average: number | null;
  count: number;
  weak: boolean;
};

export type ChoiceMix = {
  yes: number;
  maybe: number;
  no: number;
  yesPct: number;
  maybePct: number;
  noPct: number;
  total: number;
};

export type StaffAnalytics = {
  total: number;
  v2Count: number;
  legacyCount: number;
  /** Prefer overall_experience; fall back to legacy overall_stay per row. */
  overallAvg: number | null;
  recommendScoreAvg: number | null;
  valueForMoney: ChoiceMix;
  /** Legacy yes/maybe/no recommend (older rows). */
  legacyRecommend: ChoiceMix;
  categories: CategoryAverage[];
  weakAreas: CategoryAverage[];
};

const V2_CATEGORIES: { key: CategoryKey; label: string }[] = [
  { key: "reservation_ease", label: "Reservation" },
  { key: "welcome_check_in", label: "Welcome / check-in" },
  { key: "accommodation_comfort", label: "Accommodation" },
  { key: "conference_facilities", label: "Conference" },
  { key: "wifi_quality", label: "Wi‑Fi" },
  { key: "recreational_leisure", label: "Leisure" },
  { key: "spa_experience", label: "Spa" },
  { key: "cleanliness_upkeep", label: "Cleanliness" },
  { key: "food_taste_quality", label: "Food" },
  { key: "service_promptness", label: "Service" },
  { key: "staff_friendliness", label: "Staff" },
  { key: "safety_security", label: "Safety" },
  { key: "overall_experience", label: "Overall" },
  { key: "recommend_score", label: "Recommend (1/3/5)" },
];

const LEGACY_CATEGORIES: { key: CategoryKey; label: string }[] = [
  { key: "overall_stay", label: "Overall (legacy)" },
  { key: "check_in", label: "Check-in (legacy)" },
  { key: "room_cleanliness", label: "Room (legacy)" },
  { key: "food_drink", label: "F&B (legacy)" },
  { key: "spa_fitness", label: "Spa (legacy)" },
  { key: "staff_experience", label: "Staff (legacy)" },
];

const WEAK_AVG_MAX = 3;

export function isSurveyV2Row(row: GuestFeedbackRow): boolean {
  return (
    row.recommend_score != null ||
    row.overall_experience != null ||
    row.wifi_quality != null ||
    row.value_for_money != null
  );
}

export function overallForRow(row: GuestFeedbackRow): number | null {
  return row.overall_experience ?? row.overall_stay ?? null;
}

export function recommendLabelForRow(row: GuestFeedbackRow): string {
  if (row.recommend_score != null) {
    const mapped =
      RECOMMEND_SCORE_LABELS[row.recommend_score as RecommendScore];
    if (mapped) return mapped;
    // Pre–3-point rows may still hold 2 or 4 from Poor–Excellent.
    const legacy = RATING_LABELS.find((r) => r.value === row.recommend_score);
    return legacy?.label ?? String(row.recommend_score);
  }
  if (row.recommend) return row.recommend;
  return "—";
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function averageOf(
  rows: GuestFeedbackRow[],
  key: CategoryKey,
): { average: number | null; count: number } {
  let sum = 0;
  let count = 0;
  for (const row of rows) {
    const value = row[key];
    if (typeof value !== "number") continue;
    sum += value;
    count += 1;
  }
  if (count === 0) return { average: null, count: 0 };
  return { average: round1(sum / count), count };
}

function averageOverall(rows: GuestFeedbackRow[]): number | null {
  let sum = 0;
  let count = 0;
  for (const row of rows) {
    const value = overallForRow(row);
    if (value == null) continue;
    sum += value;
    count += 1;
  }
  if (count === 0) return null;
  return round1(sum / count);
}

function pct(part: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((part / total) * 1000) / 10;
}

function mixFromCounts(
  counts: Record<"yes" | "maybe" | "no", number>,
): ChoiceMix {
  const total = counts.yes + counts.maybe + counts.no;
  return {
    yes: counts.yes,
    maybe: counts.maybe,
    no: counts.no,
    yesPct: pct(counts.yes, total),
    maybePct: pct(counts.maybe, total),
    noPct: pct(counts.no, total),
    total,
  };
}

export function computeStaffAnalytics(rows: GuestFeedbackRow[]): StaffAnalytics {
  const v2Rows = rows.filter(isSurveyV2Row);
  const legacyRows = rows.filter((r) => !isSurveyV2Row(r));

  const valueCounts: Record<ValueForMoneyChoice, number> = {
    yes: 0,
    maybe: 0,
    no: 0,
  };
  for (const row of rows) {
    if (
      row.value_for_money === "yes" ||
      row.value_for_money === "maybe" ||
      row.value_for_money === "no"
    ) {
      valueCounts[row.value_for_money] += 1;
    }
  }

  const legacyRecommendCounts: Record<RecommendChoice, number> = {
    yes: 0,
    maybe: 0,
    no: 0,
  };
  for (const row of rows) {
    if (row.recommend === "yes" || row.recommend === "maybe" || row.recommend === "no") {
      legacyRecommendCounts[row.recommend] += 1;
    }
  }

  const v2Categories: CategoryAverage[] = V2_CATEGORIES.map(({ key, label }) => {
    const { average, count } = averageOf(rows, key);
    return {
      key,
      label,
      average,
      count,
      weak: average != null && average <= WEAK_AVG_MAX,
    };
  });

  const legacyCategories: CategoryAverage[] = LEGACY_CATEGORIES.map(
    ({ key, label }) => {
      const { average, count } = averageOf(legacyRows, key);
      return {
        key,
        label,
        average,
        count,
        weak: average != null && average <= WEAK_AVG_MAX,
      };
    },
  ).filter((c) => c.count > 0);

  const displayCategories =
    v2Rows.length > 0
      ? [...v2Categories, ...legacyCategories]
      : legacyCategories.length > 0
        ? legacyCategories
        : v2Categories;

  const recommendScore = averageOf(rows, "recommend_score");

  return {
    total: rows.length,
    v2Count: v2Rows.length,
    legacyCount: legacyRows.length,
    overallAvg: averageOverall(rows),
    recommendScoreAvg: recommendScore.average,
    valueForMoney: mixFromCounts(valueCounts),
    legacyRecommend: mixFromCounts(legacyRecommendCounts),
    categories: displayCategories,
    weakAreas: displayCategories.filter(
      (c) => c.weak && c.key !== "recommend_score",
    ),
  };
}
