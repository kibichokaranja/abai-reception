export type RecommendChoice = "yes" | "maybe" | "no";
export type ValueForMoneyChoice = "yes" | "no" | "maybe";
export type FirstVisitChoice = "yes" | "no";
export type PurposeOfVisit =
  | "accommodation"
  | "conferencing_meeting"
  | "spa"
  | "restaurant"
  | "other_services"
  | "recreation";

/** Legacy guest form payload (pre survey v2). */
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

/** Survey v2 — 17 questions (+ name/phone + first visit / purpose). N/A scores are null. */
export type GuestFeedbackV2Input = {
  guest_name: string;
  phone: string;
  first_visit: boolean;
  purpose_of_visit: PurposeOfVisit;
  reservation_ease: number | null;
  welcome_check_in: number | null;
  accommodation_comfort: number | null;
  conference_facilities: number | null;
  wifi_quality: number;
  recreational_leisure: number | null;
  spa_experience: number | null;
  cleanliness_upkeep: number;
  food_taste_quality: number;
  service_promptness: number;
  staff_friendliness: number;
  standout_staff_name: string | null;
  safety_security: number;
  overall_experience: number;
  value_for_money: ValueForMoneyChoice;
  recommend_score: number;
  comment: string | null;
};

/** Combined row shape for staff select (legacy + v2 columns). */
export type GuestFeedbackRow = {
  id: string;
  created_at: string;
  /** Calendar date of visit (YYYY-MM-DD), Africa/Nairobi. */
  visit_date: string;
  guest_name: string;
  phone: string;
  first_visit: boolean | null;
  purpose_of_visit: PurposeOfVisit | null;
  // Legacy
  overall_stay: number | null;
  check_in: number | null;
  room_cleanliness: number | null;
  food_drink: number | null;
  spa_fitness: number | null;
  staff_experience: number | null;
  recommend: RecommendChoice | null;
  comment: string | null;
  // Survey v2
  reservation_ease: number | null;
  welcome_check_in: number | null;
  accommodation_comfort: number | null;
  conference_facilities: number | null;
  wifi_quality: number | null;
  recreational_leisure: number | null;
  spa_experience: number | null;
  cleanliness_upkeep: number | null;
  food_taste_quality: number | null;
  service_promptness: number | null;
  staff_friendliness: number | null;
  standout_staff_name: string | null;
  safety_security: number | null;
  overall_experience: number | null;
  value_for_money: ValueForMoneyChoice | null;
  recommend_score: number | null;
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

export const VALUE_FOR_MONEY_OPTIONS: {
  value: ValueForMoneyChoice;
  label: string;
}[] = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
  { value: "maybe", label: "Maybe" },
];

export const FIRST_VISIT_OPTIONS: {
  value: FirstVisitChoice;
  label: string;
}[] = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
];

export const PURPOSE_OF_VISIT_OPTIONS: {
  value: PurposeOfVisit;
  label: string;
}[] = [
  { value: "accommodation", label: "Accommodation" },
  { value: "conferencing_meeting", label: "Conferencing/meeting" },
  { value: "spa", label: "Spa" },
  { value: "restaurant", label: "Restaurant" },
  { value: "other_services", label: "Other services" },
  { value: "recreation", label: "Recreation" },
];

export const PURPOSE_OF_VISIT_LABELS: Record<PurposeOfVisit, string> = {
  accommodation: "Accommodation",
  conferencing_meeting: "Conferencing/meeting",
  spa: "Spa",
  restaurant: "Restaurant",
  other_services: "Other services",
  recreation: "Recreation",
};

export const COMMENT_MAX_LENGTH = 1000;
export const STANDOUT_NAME_MAX_LENGTH = 120;

export const SURVEY_V2_SELECT_COLUMNS = [
  "id",
  "guest_name",
  "phone",
  "first_visit",
  "purpose_of_visit",
  "overall_stay",
  "check_in",
  "room_cleanliness",
  "food_drink",
  "spa_fitness",
  "staff_experience",
  "comment",
  "recommend",
  "reservation_ease",
  "welcome_check_in",
  "accommodation_comfort",
  "conference_facilities",
  "wifi_quality",
  "recreational_leisure",
  "spa_experience",
  "cleanliness_upkeep",
  "food_taste_quality",
  "service_promptness",
  "staff_friendliness",
  "standout_staff_name",
  "safety_security",
  "overall_experience",
  "value_for_money",
  "recommend_score",
  "visit_date",
  "created_at",
].join(", ");
