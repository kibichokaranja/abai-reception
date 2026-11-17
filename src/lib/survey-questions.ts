import type {
  CategoryAverage,
  ChoiceMix,
  StaffAnalytics,
} from "@/lib/staff-analytics";
import { recommendLabelForRow } from "@/lib/staff-analytics";
import {
  RECOMMEND_SCORE_LABELS,
  VALUE_FOR_MONEY_OPTIONS,
  type GuestFeedbackRow,
  type RecommendScore,
} from "@/lib/types";

/**
 * The 17 scorable / choosable survey questions (guest form #1–13, #15–18).
 * Standout name (#14) and free-text comment (#19) are excluded from the carousel.
 */
export type SurveyQuestionSlide = {
  number: number;
  key: string;
  shortLabel: string;
  fullLabel: string;
  kind: "rating" | "choice" | "services" | "first_visit";
};

export const SURVEY_QUESTION_SLIDES: SurveyQuestionSlide[] = [
  {
    number: 1,
    key: "first_visit",
    shortLabel: "First visit",
    fullLabel: "Is this your first visit?",
    kind: "first_visit",
  },
  {
    number: 2,
    key: "purpose_of_visit_services",
    shortLabel: "Services experienced",
    fullLabel: "Which Abai services did you get to experience?",
    kind: "services",
  },
  {
    number: 3,
    key: "reservation_ease",
    shortLabel: "Reservation",
    fullLabel:
      "How would you describe the ease and convenience of making your reservation?",
    kind: "rating",
  },
  {
    number: 4,
    key: "welcome_check_in",
    shortLabel: "Welcome / check-in",
    fullLabel: "What was your impression of the welcome and check-in process?",
    kind: "rating",
  },
  {
    number: 5,
    key: "accommodation_comfort",
    shortLabel: "Accommodation",
    fullLabel:
      "How would you describe the comfort and quality of your accommodation?",
    kind: "rating",
  },
  {
    number: 6,
    key: "conference_facilities",
    shortLabel: "Conference",
    fullLabel:
      "To what extent did our conference facilities meet your expectations?",
    kind: "rating",
  },
  {
    number: 7,
    key: "wifi_quality",
    shortLabel: "Wi‑Fi",
    fullLabel:
      "How would you rate the speed, reliability and quality of our Wi-Fi?",
    kind: "rating",
  },
  {
    number: 8,
    key: "recreational_leisure",
    shortLabel: "Leisure",
    fullLabel:
      "What was your impression of our recreational and leisure facilities?",
    kind: "rating",
  },
  {
    number: 9,
    key: "spa_experience",
    shortLabel: "Spa",
    fullLabel: "How would you describe the quality of your spa experience?",
    kind: "rating",
  },
  {
    number: 10,
    key: "cleanliness_upkeep",
    shortLabel: "Cleanliness",
    fullLabel:
      "How satisfied were you with the cleanliness and general upkeep of our facilities?",
    kind: "rating",
  },
  {
    number: 11,
    key: "food_taste_quality",
    shortLabel: "Food",
    fullLabel: "What was your impression of the taste and quality of our food?",
    kind: "rating",
  },
  {
    number: 12,
    key: "service_promptness",
    shortLabel: "Service",
    fullLabel:
      "How would you assess the promptness and efficiency of our service?",
    kind: "rating",
  },
  {
    number: 13,
    key: "staff_friendliness",
    shortLabel: "Staff",
    fullLabel:
      "To what extent did our staff demonstrate friendliness, courtesy and helpfulness?",
    kind: "rating",
  },
  {
    number: 15,
    key: "safety_security",
    shortLabel: "Safety",
    fullLabel:
      "How would you rate the level of safety and security within the hotel?",
    kind: "rating",
  },
  {
    number: 16,
    key: "overall_experience",
    shortLabel: "Overall experience",
    fullLabel:
      "Taking everything into account, how would you rate your overall experience at Abai Lodges & Spa?",
    kind: "rating",
  },
  {
    number: 17,
    key: "value_for_money",
    shortLabel: "Value for money",
    fullLabel: "Did your overall experience represent good value for money?",
    kind: "choice",
  },
  {
    number: 18,
    key: "recommend_score",
    shortLabel: "Recommend",
    fullLabel:
      "On a scale of 1–5, how likely are you to recommend Abai Lodges & Spa to friends, family or colleagues?",
    kind: "rating",
  },
];

export type QuestionSlideStats = {
  slide: SurveyQuestionSlide;
  average: number | null;
  count: number;
  weak: boolean;
  choiceMix: ChoiceMix | null;
  firstVisitYes: number;
  firstVisitNo: number;
  serviceCounts: { label: string; count: number }[];
};

function emptyMix(): ChoiceMix {
  return {
    yes: 0,
    maybe: 0,
    no: 0,
    yesPct: 0,
    maybePct: 0,
    noPct: 0,
    total: 0,
  };
}

function pct(part: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((part / total) * 1000) / 10;
}

export function buildQuestionSlideStats(
  rows: GuestFeedbackRow[],
  analytics: StaffAnalytics | null,
): QuestionSlideStats[] {
  const categoryByKey = new Map<string, CategoryAverage>();
  for (const cat of analytics?.categories ?? []) {
    categoryByKey.set(cat.key, cat);
  }

  return SURVEY_QUESTION_SLIDES.map((slide) => {
    if (slide.kind === "rating") {
      const cat = categoryByKey.get(slide.key);
      return {
        slide,
        average: cat?.average ?? null,
        count: cat?.count ?? 0,
        weak: cat?.weak ?? false,
        choiceMix: null,
        firstVisitYes: 0,
        firstVisitNo: 0,
        serviceCounts: [],
      };
    }

    if (slide.kind === "choice") {
      const mix = analytics?.valueForMoney ?? emptyMix();
      return {
        slide,
        average: null,
        count: mix.total,
        weak: false,
        choiceMix: mix,
        firstVisitYes: 0,
        firstVisitNo: 0,
        serviceCounts: [],
      };
    }

    if (slide.kind === "first_visit") {
      let yes = 0;
      let no = 0;
      for (const row of rows) {
        if (row.first_visit === true) yes += 1;
        else if (row.first_visit === false) no += 1;
      }
      return {
        slide,
        average: null,
        count: yes + no,
        weak: false,
        choiceMix: null,
        firstVisitYes: yes,
        firstVisitNo: no,
        serviceCounts: [],
      };
    }

    // services
    const counts = new Map<string, number>();
    for (const row of rows) {
      const services = row.purpose_of_visit_services;
      if (Array.isArray(services)) {
        for (const s of services) {
          counts.set(s, (counts.get(s) ?? 0) + 1);
        }
      } else if (row.purpose_of_visit) {
        counts.set(
          row.purpose_of_visit,
          (counts.get(row.purpose_of_visit) ?? 0) + 1,
        );
      }
    }
    const serviceCounts = [...counts.entries()]
      .map(([label, count]) => ({
        label: label.replace(/_/g, " "),
        count,
      }))
      .sort((a, b) => b.count - a.count);

    return {
      slide,
      average: null,
      count: serviceCounts.reduce((sum, s) => sum + s.count, 0),
      weak: false,
      choiceMix: null,
      firstVisitYes: 0,
      firstVisitNo: 0,
      serviceCounts,
    };
  });
}

export function formatRecommendAverage(avg: number | null): string {
  if (avg == null) return "—";
  const nearest = Math.round(avg) as RecommendScore;
  const label = RECOMMEND_SCORE_LABELS[nearest];
  return label ? `${avg.toFixed(1)} · ~${label}` : avg.toFixed(1);
}

export function valueForMoneyLabel(value: string): string {
  return (
    VALUE_FOR_MONEY_OPTIONS.find((o) => o.value === value)?.label ?? value
  );
}

export function sampleRecommendLabels(rows: GuestFeedbackRow[], limit = 5) {
  return rows
    .map((r) => recommendLabelForRow(r))
    .filter((l) => l !== "—")
    .slice(0, limit);
}

export { pct };
