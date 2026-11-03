export type RecommendChoice = "yes" | "maybe" | "no";

export type GuestFeedbackInput = {
  guest_name: string;
  phone: string;
  overall_stay: number;
  check_in: number;
  room_cleanliness: number;
  food_drink: number;
  spa_fitness: number | null;
  staff_experience: number;
  comment: string | null;
  recommend: RecommendChoice;
};

/** DB row — staff_experience nullable for rows before the staff/comment migration. */
export type GuestFeedbackRow = Omit<GuestFeedbackInput, "staff_experience"> & {
  id: string;
  created_at: string;
  staff_experience: number | null;
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

export const COMMENT_MAX_LENGTH = 1000;
