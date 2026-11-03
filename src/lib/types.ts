export type RecommendChoice = "yes" | "maybe" | "no";

export type GuestFeedbackInput = {
  guest_name: string;
  phone: string;
  overall_stay: number;
  check_in: number;
  room_cleanliness: number;
  food_drink: number;
  spa_fitness: number | null;
  recommend: RecommendChoice;
};

export type GuestFeedbackRow = GuestFeedbackInput & {
  id: string;
  created_at: string;
};

export const RATING_LABELS = [
  { value: 1, label: "Poor" },
  { value: 2, label: "Fair" },
  { value: 3, label: "Good" },
  { value: 4, label: "Very good" },
  { value: 5, label: "Excellent" },
] as const;

export const RECOMMEND_OPTIONS: { value: RecommendChoice; label: string }[] = [
  { value: "yes", label: "Yes" },
  { value: "maybe", label: "Maybe" },
  { value: "no", label: "No" },
];
