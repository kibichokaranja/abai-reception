import type { GuestFeedbackRow, RecommendChoice } from "@/lib/types";

export type CategoryKey =
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

export type StaffAnalytics = {
  total: number;
  averages: {
    overall_stay: number | null;
    check_in: number | null;
    room_cleanliness: number | null;
    food_drink: number | null;
    spa_fitness: number | null;
    staff_experience: number | null;
  };
  categories: CategoryAverage[];
  recommend: {
    yes: number;
    maybe: number;
    no: number;
    yesPct: number;
    maybePct: number;
    noPct: number;
  };
  weakAreas: CategoryAverage[];
};

const CATEGORIES: { key: CategoryKey; label: string; excludeNull: boolean }[] = [
  { key: "overall_stay", label: "Overall stay", excludeNull: false },
  { key: "check_in", label: "Check-in", excludeNull: false },
  { key: "room_cleanliness", label: "Room", excludeNull: false },
  { key: "food_drink", label: "Food & drink", excludeNull: false },
  { key: "spa_fitness", label: "Spa / fitness", excludeNull: true },
  { key: "staff_experience", label: "Staff experience", excludeNull: true },
];

const WEAK_AVG_MAX = 3;

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function averageOf(
  rows: GuestFeedbackRow[],
  key: CategoryKey,
  excludeNull: boolean,
): { average: number | null; count: number } {
  let sum = 0;
  let count = 0;
  for (const row of rows) {
    const value = row[key];
    if (value == null) {
      if (excludeNull) continue;
      continue;
    }
    sum += value;
    count += 1;
  }
  if (count === 0) return { average: null, count: 0 };
  return { average: round1(sum / count), count };
}

function pct(part: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((part / total) * 1000) / 10;
}

export function computeStaffAnalytics(rows: GuestFeedbackRow[]): StaffAnalytics {
  const recommendCounts: Record<RecommendChoice, number> = {
    yes: 0,
    maybe: 0,
    no: 0,
  };
  for (const row of rows) {
    if (row.recommend === "yes" || row.recommend === "maybe" || row.recommend === "no") {
      recommendCounts[row.recommend] += 1;
    }
  }

  const total = rows.length;
  const categories: CategoryAverage[] = CATEGORIES.map(({ key, label, excludeNull }) => {
    const { average, count } = averageOf(rows, key, excludeNull);
    return {
      key,
      label,
      average,
      count,
      weak: average != null && average <= WEAK_AVG_MAX,
    };
  });

  const averages = {
    overall_stay: categories.find((c) => c.key === "overall_stay")?.average ?? null,
    check_in: categories.find((c) => c.key === "check_in")?.average ?? null,
    room_cleanliness:
      categories.find((c) => c.key === "room_cleanliness")?.average ?? null,
    food_drink: categories.find((c) => c.key === "food_drink")?.average ?? null,
    spa_fitness: categories.find((c) => c.key === "spa_fitness")?.average ?? null,
    staff_experience:
      categories.find((c) => c.key === "staff_experience")?.average ?? null,
  };

  return {
    total,
    averages,
    categories,
    recommend: {
      yes: recommendCounts.yes,
      maybe: recommendCounts.maybe,
      no: recommendCounts.no,
      yesPct: pct(recommendCounts.yes, total),
      maybePct: pct(recommendCounts.maybe, total),
      noPct: pct(recommendCounts.no, total),
    },
    weakAreas: categories.filter((c) => c.weak),
  };
}
