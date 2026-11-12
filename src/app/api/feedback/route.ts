import { NextResponse } from "next/server";
import { getSupabaseAnonClient } from "@/lib/supabase";
import { describeAnonKeySource, getSupabaseUrl } from "@/lib/supabase-env";
import {
  COMMENT_MAX_LENGTH,
  PURPOSE_OF_VISIT_OPTIONS,
  STANDOUT_NAME_MAX_LENGTH,
  type GuestFeedbackInput,
  type GuestFeedbackV2Input,
  type PurposeOfVisit,
  type RecommendChoice,
  type ValueForMoneyChoice,
} from "@/lib/types";
import { todayVisitDate } from "@/lib/visit-date";

const PURPOSE_VALUES = new Set(
  PURPOSE_OF_VISIT_OPTIONS.map((option) => option.value),
);

function isRating(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 5;
}

function isOptionalRating(value: unknown): value is number | null {
  return value === null || isRating(value);
}

function isRecommend(value: unknown): value is RecommendChoice {
  return value === "yes" || value === "maybe" || value === "no";
}

function isValueForMoney(value: unknown): value is ValueForMoneyChoice {
  return value === "yes" || value === "maybe" || value === "no";
}

function isPurposeOfVisit(value: unknown): value is PurposeOfVisit {
  return typeof value === "string" && PURPOSE_VALUES.has(value as PurposeOfVisit);
}

function debugPayload() {
  return {
    urlHost: (() => {
      try {
        return new URL(getSupabaseUrl() ?? "").host;
      } catch {
        return null;
      }
    })(),
    anonKeyEnv: describeAnonKeySource(),
  };
}

function migrationHint(message: string | undefined, code: string | undefined): string {
  if (/first_visit|purpose_of_visit/i.test(message ?? "")) {
    return " Run supabase/migrations/20260328_guest_feedback_first_visit_purpose.sql in the Supabase SQL Editor, then Redeploy.";
  }
  if (/visit_date/i.test(message ?? "")) {
    return " Run supabase/migrations/20260327_guest_feedback_visit_date.sql in the Supabase SQL Editor, then Redeploy.";
  }
  if (
    code === "PGRST204" ||
    /recommend_score|wifi_quality|value_for_money|standout_staff_name|overall_experience/i.test(
      message ?? "",
    )
  ) {
    return " Run supabase/migrations/20260325_guest_feedback_survey_v2.sql in the Supabase SQL Editor, then Redeploy.";
  }
  if (/staff_experience|comment/i.test(message ?? "")) {
    return " Run supabase/migrations/20260324_guest_feedback_staff_comment.sql in the Supabase SQL Editor, then try again.";
  }
  return "";
}

function isSurveyV2Body(body: Record<string, unknown>): boolean {
  return (
    body.survey_version === 2 ||
    body.recommend_score !== undefined ||
    body.wifi_quality !== undefined ||
    body.overall_experience !== undefined ||
    body.value_for_money !== undefined
  );
}

async function insertRow(row: Record<string, unknown>) {
  const supabase = getSupabaseAnonClient();
  const { error } = await supabase.from("guest_feedback").insert(row);
  if (error) {
    console.error("guest_feedback insert failed", error);
    const detail = [error.message, error.code && `code=${error.code}`, error.hint]
      .filter(Boolean)
      .join(" · ");
    return NextResponse.json(
      {
        error: `Could not save feedback: ${detail}.${migrationHint(error.message, error.code)}`,
        debug: debugPayload(),
      },
      { status: 500 },
    );
  }
  return NextResponse.json({ ok: true });
}

function parseIdentity(body: Record<string, unknown>) {
  const guest_name = typeof body.guest_name === "string" ? body.guest_name.trim() : "";
  const phone = typeof body.phone === "string" ? body.phone.trim() : "";
  const commentRaw = typeof body.comment === "string" ? body.comment.trim() : "";
  const comment = commentRaw.length > 0 ? commentRaw : null;

  if (guest_name.length > 120) {
    return { error: "Name must be 120 characters or fewer" } as const;
  }
  if (phone.length > 40) {
    return { error: "Phone must be 40 characters or fewer" } as const;
  }
  if (comment != null && comment.length > COMMENT_MAX_LENGTH) {
    return {
      error: `Comment must be ${COMMENT_MAX_LENGTH} characters or fewer`,
    } as const;
  }
  return { guest_name, phone, comment } as const;
}

function parseOptionalRating(
  body: Record<string, unknown>,
  key: string,
  label: string,
): { ok: true; value: number | null } | { ok: false; error: string } {
  const value = body[key];
  if (value === undefined) {
    return { ok: false, error: `${label} is required (1–5 or null for N/A)` };
  }
  if (!isOptionalRating(value)) {
    return { ok: false, error: `${label} must be 1–5 or null (N/A)` };
  }
  return { ok: true, value };
}

async function handleV2(body: Record<string, unknown>) {
  const identity = parseIdentity(body);
  if ("error" in identity) {
    return NextResponse.json({ error: identity.error }, { status: 400 });
  }

  const optionalKeys: { key: keyof GuestFeedbackV2Input; label: string }[] = [
    { key: "reservation_ease", label: "Reservation ease" },
    { key: "welcome_check_in", label: "Welcome / check-in" },
    { key: "accommodation_comfort", label: "Accommodation" },
    { key: "conference_facilities", label: "Conference facilities" },
    { key: "wifi_quality", label: "Wi‑Fi" },
    { key: "recreational_leisure", label: "Recreational / leisure" },
    { key: "spa_experience", label: "Spa experience" },
    { key: "cleanliness_upkeep", label: "Cleanliness" },
    { key: "food_taste_quality", label: "Food" },
    { key: "service_promptness", label: "Service" },
  ];

  const optionalValues: Record<string, number | null> = {};
  for (const { key, label } of optionalKeys) {
    const parsed = parseOptionalRating(body, key, label);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    optionalValues[key] = parsed.value;
  }

  if (
    !isRating(body.staff_friendliness) ||
    !isRating(body.safety_security) ||
    !isRating(body.overall_experience) ||
    !isRating(body.recommend_score)
  ) {
    return NextResponse.json(
      { error: "Required ratings must be integers 1–5" },
      { status: 400 },
    );
  }

  if (!isValueForMoney(body.value_for_money)) {
    return NextResponse.json(
      { error: "Value for money must be yes, maybe, or no" },
      { status: 400 },
    );
  }

  if (typeof body.first_visit !== "boolean") {
    return NextResponse.json(
      { error: "First visit must be true or false" },
      { status: 400 },
    );
  }

  if (!isPurposeOfVisit(body.purpose_of_visit)) {
    return NextResponse.json(
      {
        error:
          "Purpose of visit must be accommodation, conferencing_meeting, spa, restaurant, other_services, or recreation",
      },
      { status: 400 },
    );
  }

  let standout_staff_name: string | null = null;
  if (typeof body.standout_staff_name === "string") {
    const trimmed = body.standout_staff_name.trim();
    if (trimmed.length > STANDOUT_NAME_MAX_LENGTH) {
      return NextResponse.json(
        {
          error: `Standout staff name must be ${STANDOUT_NAME_MAX_LENGTH} characters or fewer`,
        },
        { status: 400 },
      );
    }
    standout_staff_name = trimmed.length > 0 ? trimmed : null;
  } else if (body.standout_staff_name != null) {
    return NextResponse.json(
      { error: "Standout staff name must be text or omitted" },
      { status: 400 },
    );
  }

  // New rows: write v2 columns only (do not write legacy recommend yes/maybe/no).
  // visit_date is always stamped server-side (ignore any client value).
  return insertRow({
    guest_name: identity.guest_name,
    phone: identity.phone,
    visit_date: todayVisitDate(),
    first_visit: body.first_visit,
    purpose_of_visit: body.purpose_of_visit,
    reservation_ease: optionalValues.reservation_ease,
    welcome_check_in: optionalValues.welcome_check_in,
    accommodation_comfort: optionalValues.accommodation_comfort,
    conference_facilities: optionalValues.conference_facilities,
    wifi_quality: optionalValues.wifi_quality,
    recreational_leisure: optionalValues.recreational_leisure,
    spa_experience: optionalValues.spa_experience,
    cleanliness_upkeep: optionalValues.cleanliness_upkeep,
    food_taste_quality: optionalValues.food_taste_quality,
    service_promptness: optionalValues.service_promptness,
    staff_friendliness: body.staff_friendliness,
    standout_staff_name,
    safety_security: body.safety_security,
    overall_experience: body.overall_experience,
    value_for_money: body.value_for_money,
    recommend_score: body.recommend_score,
    comment: identity.comment,
  });
}

async function handleLegacy(body: Partial<GuestFeedbackInput> & Record<string, unknown>) {
  const identity = parseIdentity(body);
  if ("error" in identity) {
    return NextResponse.json({ error: identity.error }, { status: 400 });
  }

  if (
    !isRating(body.overall_stay) ||
    !isRating(body.check_in) ||
    !isRating(body.room_cleanliness) ||
    !isRating(body.food_drink) ||
    !isRating(body.staff_experience)
  ) {
    return NextResponse.json({ error: "Ratings must be integers 1–5" }, { status: 400 });
  }
  if (body.spa_fitness !== null && body.spa_fitness !== undefined && !isRating(body.spa_fitness)) {
    return NextResponse.json(
      { error: "Spa/fitness must be 1–5 or null (N/A)" },
      { status: 400 },
    );
  }
  if (!isRecommend(body.recommend)) {
    return NextResponse.json({ error: "Recommend must be yes, maybe, or no" }, { status: 400 });
  }

  return insertRow({
    guest_name: identity.guest_name,
    phone: identity.phone,
    visit_date: todayVisitDate(),
    overall_stay: body.overall_stay,
    check_in: body.check_in,
    room_cleanliness: body.room_cleanliness,
    food_drink: body.food_drink,
    spa_fitness: body.spa_fitness ?? null,
    staff_experience: body.staff_experience,
    comment: identity.comment,
    recommend: body.recommend,
  });
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    if (isSurveyV2Body(body)) {
      return await handleV2(body);
    }
    return await handleLegacy(body);
  } catch (err) {
    console.error(err);
    const message = err instanceof Error ? err.message : "Unknown server error";
    return NextResponse.json({ error: message, debug: debugPayload() }, { status: 500 });
  }
}
