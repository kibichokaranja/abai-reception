import { NextResponse } from "next/server";
import { validateSubmitNetwork } from "@/lib/geofence";
import { getSupabaseAnonClient } from "@/lib/supabase";
import { describeAnonKeySource, getSupabaseUrl } from "@/lib/supabase-env";
import {
  COMMENT_MAX_LENGTH,
  PURPOSE_OF_VISIT_OPTIONS,
  ROOM_NUMBER_MAX_LENGTH,
  STANDOUT_NAME_MAX_LENGTH,
  type GuestFeedbackInput,
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
  return value === null || value === undefined || isRating(value);
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

function parsePurposeServices(
  body: Record<string, unknown>,
): { ok: true; services: PurposeOfVisit[] | null } | { ok: false; error: string } {
  const raw = body.purpose_of_visit_services;
  if (raw === undefined || raw === null) {
    if (body.purpose_of_visit === undefined || body.purpose_of_visit === null) {
      return { ok: true, services: null };
    }
    if (!isPurposeOfVisit(body.purpose_of_visit)) {
      return {
        ok: false,
        error:
          "Services must be accommodation, conferencing_meeting, spa, restaurant, other_services, or recreation",
      };
    }
    return { ok: true, services: [body.purpose_of_visit] };
  }
  if (!Array.isArray(raw)) {
    return { ok: false, error: "Services must be an array of service keys" };
  }
  if (raw.length === 0) {
    return { ok: true, services: null };
  }
  const services: PurposeOfVisit[] = [];
  for (const item of raw) {
    if (!isPurposeOfVisit(item)) {
      return {
        ok: false,
        error:
          "Each service must be accommodation, conferencing_meeting, spa, restaurant, other_services, or recreation",
      };
    }
    if (!services.includes(item)) services.push(item);
  }
  return { ok: true, services };
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
  if (/approval_status/i.test(message ?? "")) {
    return " Run supabase/migrations/20260335_guest_feedback_approval.sql in the Supabase SQL Editor, then Redeploy.";
  }
  if (/room_number/i.test(message ?? "")) {
    return " Run supabase/migrations/20260334_guest_feedback_room_number.sql in the Supabase SQL Editor, then Redeploy.";
  }
  if (/submit_ip/i.test(message ?? "")) {
    return " Run supabase/migrations/20260339_guest_feedback_submit_ip.sql in the Supabase SQL Editor, then Redeploy.";
  }
  if (/submit_lat|submit_lng/i.test(message ?? "")) {
    return " Run supabase/migrations/20260337_guest_feedback_geofence_coords.sql in the Supabase SQL Editor, then Redeploy.";
  }
  if (/purpose_of_visit_services/i.test(message ?? "")) {
    return " Run supabase/migrations/20260329_purpose_services_array.sql in the Supabase SQL Editor, then Redeploy.";
  }
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
    body.value_for_money !== undefined ||
    body.purpose_of_visit_services !== undefined ||
    body.first_visit !== undefined ||
    body.room_number !== undefined
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
  return NextResponse.json({ ok: true, pending: true });
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

function parseRoomNumber(
  body: Record<string, unknown>,
): { ok: true; value: string | null } | { ok: false; error: string } {
  if (body.room_number === undefined || body.room_number === null) {
    return { ok: true, value: null };
  }
  if (typeof body.room_number !== "string") {
    return { ok: false, error: "Room number must be text or omitted" };
  }
  const trimmed = body.room_number.trim();
  if (trimmed.length > ROOM_NUMBER_MAX_LENGTH) {
    return {
      ok: false,
      error: `Room number must be ${ROOM_NUMBER_MAX_LENGTH} characters or fewer`,
    };
  }
  return { ok: true, value: trimmed.length > 0 ? trimmed : null };
}

function parseOptionalRatingField(
  body: Record<string, unknown>,
  key: string,
  label: string,
): { ok: true; value: number | null } | { ok: false; error: string } {
  const value = body[key];
  if (value === undefined || value === null) {
    return { ok: true, value: null };
  }
  if (!isOptionalRating(value)) {
    return { ok: false, error: `${label} must be 1–5 or null (N/A)` };
  }
  return { ok: true, value: value as number | null };
}

async function handleV2(
  body: Record<string, unknown>,
  request: Request,
) {
  const location = validateSubmitNetwork(request);
  if (!location.ok) {
    return NextResponse.json({ error: location.error }, { status: 403 });
  }

  const identity = parseIdentity(body);
  if ("error" in identity) {
    return NextResponse.json({ error: identity.error }, { status: 400 });
  }

  const roomParsed = parseRoomNumber(body);
  if (!roomParsed.ok) {
    return NextResponse.json({ error: roomParsed.error }, { status: 400 });
  }

  const ratingKeys: { key: string; label: string }[] = [
    { key: "reservation_ease", label: "Reservation ease" },
    { key: "welcome_check_in", label: "Welcome / check-in" },
    { key: "accommodation_comfort", label: "Accommodation" },
    { key: "conference_facilities", label: "Conference facilities" },
    { key: "wifi_quality", label: "Wi-Fi" },
    { key: "recreational_leisure", label: "Recreational / leisure" },
    { key: "spa_experience", label: "Spa experience" },
    { key: "cleanliness_upkeep", label: "Cleanliness" },
    { key: "food_taste_quality", label: "Food taste" },
    { key: "service_promptness", label: "Service promptness" },
    { key: "staff_friendliness", label: "Staff friendliness" },
    { key: "safety_security", label: "Safety / security" },
    { key: "overall_experience", label: "Overall experience" },
    { key: "recommend_score", label: "Likelihood to recommend" },
  ];

  const ratingValues: Record<string, number | null> = {};
  for (const { key, label } of ratingKeys) {
    const parsed = parseOptionalRatingField(body, key, label);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    ratingValues[key] = parsed.value;
  }

  let value_for_money: ValueForMoneyChoice | null = null;
  if (body.value_for_money !== undefined && body.value_for_money !== null) {
    if (!isValueForMoney(body.value_for_money)) {
      return NextResponse.json(
        { error: "Value for money must be yes, maybe, or no" },
        { status: 400 },
      );
    }
    value_for_money = body.value_for_money;
  }

  let first_visit: boolean | null = null;
  if (body.first_visit !== undefined && body.first_visit !== null) {
    if (typeof body.first_visit !== "boolean") {
      return NextResponse.json(
        { error: "First visit must be true, false, or omitted" },
        { status: 400 },
      );
    }
    first_visit = body.first_visit;
  }

  const servicesParsed = parsePurposeServices(body);
  if (!servicesParsed.ok) {
    return NextResponse.json({ error: servicesParsed.error }, { status: 400 });
  }
  const services = servicesParsed.services;

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

  return insertRow({
    guest_name: identity.guest_name,
    phone: identity.phone,
    room_number: roomParsed.value,
    visit_date: todayVisitDate(),
    first_visit,
    purpose_of_visit: services && services.length === 1 ? services[0] : null,
    purpose_of_visit_services: services,
    reservation_ease: ratingValues.reservation_ease,
    welcome_check_in: ratingValues.welcome_check_in,
    accommodation_comfort: ratingValues.accommodation_comfort,
    conference_facilities: ratingValues.conference_facilities,
    wifi_quality: ratingValues.wifi_quality,
    recreational_leisure: ratingValues.recreational_leisure,
    spa_experience: ratingValues.spa_experience,
    cleanliness_upkeep: ratingValues.cleanliness_upkeep,
    food_taste_quality: ratingValues.food_taste_quality,
    service_promptness: ratingValues.service_promptness,
    staff_friendliness: ratingValues.staff_friendliness,
    standout_staff_name,
    safety_security: ratingValues.safety_security,
    overall_experience: ratingValues.overall_experience,
    value_for_money,
    recommend_score: ratingValues.recommend_score,
    comment: identity.comment,
    approval_status: "pending",
    is_irrelevant: false,
    submit_lat: null,
    submit_lng: null,
    submit_ip: location.ip,
  });
}

async function handleLegacy(
  body: Partial<GuestFeedbackInput> & Record<string, unknown>,
  request: Request,
) {
  const location = validateSubmitNetwork(request);
  if (!location.ok) {
    return NextResponse.json({ error: location.error }, { status: 403 });
  }

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
    approval_status: "pending",
    is_irrelevant: false,
    submit_lat: null,
    submit_lng: null,
    submit_ip: location.ip,
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
      return await handleV2(body, request);
    }
    return await handleLegacy(body, request);
  } catch (err) {
    console.error(err);
    const message = err instanceof Error ? err.message : "Unknown server error";
    return NextResponse.json({ error: message, debug: debugPayload() }, { status: 500 });
  }
}
