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

export type StaffUserRole = "owner" | "management" | "reception";

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

export type ApprovalStatus = "pending" | "approved" | "rejected";

/** Survey v2 — all survey answers optional; consent enforced client-side. */
export type GuestFeedbackV2Input = {
  guest_name: string;
  phone: string;
  room_number: string | null;
  first_visit: boolean | null;
  /** Legacy single purpose (older rows / optional mirror). */
  purpose_of_visit: PurposeOfVisit | null;
  /** Multi-select services (preferred for new submits). */
  purpose_of_visit_services: PurposeOfVisit[] | null;
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
  comment: string | null;
};

/** Combined row shape for staff select (legacy + v2 columns). */
export type GuestFeedbackRow = {
  id: string;
  created_at: string;
  /** Calendar date of visit (YYYY-MM-DD), Africa/Nairobi — stamped server-side. */
  visit_date: string;
  guest_name: string;
  phone: string;
  /** Optional room number (replaces Date of visit on the guest form UI). */
  room_number: string | null;
  first_visit: boolean | null;
  purpose_of_visit: PurposeOfVisit | null;
  purpose_of_visit_services: PurposeOfVisit[] | null;
  approval_status: ApprovalStatus;
  approved_at: string | null;
  approved_by: string | null;
  /** When true, exclude from analytics if “hide irrelevant” filter is on. */
  is_irrelevant: boolean;
  submit_lat: number | null;
  submit_lng: number | null;
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

/** Excellent → Poor display order (values remain 5 → 1). */
export const RATING_LABELS = [
  { value: 5, label: "Excellent" },
  { value: 4, label: "Very good" },
  { value: 3, label: "Good" },
  { value: 2, label: "Fair" },
  { value: 1, label: "Poor" },
] as const;

/**
 * Likelihood to recommend — Highly → Least (values 5 → 1).
 */
export type RecommendScore = 1 | 2 | 3 | 4 | 5;

export const RECOMMEND_SCORE_OPTIONS: {
  value: RecommendScore;
  label: string;
}[] = [
  { value: 5, label: "Highly likely" },
  { value: 4, label: "Very likely" },
  { value: 3, label: "Somewhat likely" },
  { value: 2, label: "Slightly likely" },
  { value: 1, label: "Least likely" },
];

export const RECOMMEND_SCORE_LABELS: Record<RecommendScore, string> = {
  1: "Least likely",
  2: "Slightly likely",
  3: "Somewhat likely",
  4: "Very likely",
  5: "Highly likely",
};

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

/** Join multi-select services (or fall back to legacy single purpose). */
export function servicesLabelForRow(row: {
  purpose_of_visit_services?: PurposeOfVisit[] | null;
  purpose_of_visit?: PurposeOfVisit | null;
}): string {
  const services = row.purpose_of_visit_services;
  if (Array.isArray(services) && services.length > 0) {
    return services
      .map((s) => PURPOSE_OF_VISIT_LABELS[s] ?? s)
      .join(", ");
  }
  if (row.purpose_of_visit) {
    return PURPOSE_OF_VISIT_LABELS[row.purpose_of_visit] ?? row.purpose_of_visit;
  }
  return "—";
}

export const COMMENT_MAX_LENGTH = 1000;
export const STANDOUT_NAME_MAX_LENGTH = 120;

export const SURVEY_V2_SELECT_COLUMNS = [
  "id",
  "guest_name",
  "phone",
  "room_number",
  "first_visit",
  "purpose_of_visit",
  "purpose_of_visit_services",
  "approval_status",
  "approved_at",
  "approved_by",
  "is_irrelevant",
  "submit_lat",
  "submit_lng",
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

export const ROOM_NUMBER_MAX_LENGTH = 40;

export const STAFF_USER_ROLES: { value: StaffUserRole; label: string }[] = [
  { value: "owner", label: "Owner" },
  { value: "management", label: "Management" },
  { value: "reception", label: "Staff desk" },
];

/** UI label for the reception role / portal (route stays `/reception`). */
export const STAFF_DESK_LABEL = "Staff desk";
