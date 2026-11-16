import { NextResponse } from "next/server";
import { computeStaffAnalytics } from "@/lib/staff-analytics";
import { getStaffSession } from "@/lib/staff-auth";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { describeServiceKeySource, getSupabaseUrl } from "@/lib/supabase-env";
import { SURVEY_V2_SELECT_COLUMNS, type GuestFeedbackRow } from "@/lib/types";
import { defaultReceptionVisitWindow } from "@/lib/visit-date";

function safeSupabaseError(error: {
  message?: string;
  code?: string;
  details?: string | null;
  hint?: string | null;
}): string {
  const parts = [
    error.message,
    error.code ? `code=${error.code}` : null,
    error.hint ? `hint=${error.hint}` : null,
    error.details ? `details=${error.details}` : null,
  ].filter(Boolean);
  return parts.join(" · ") || "Unknown Supabase error";
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function parseIsoDate(value: string | null): string | null {
  if (!value || !ISO_DATE.test(value)) return null;
  return value;
}

/** PostgREST "or" filter for any score ≤ threshold (default 2.5). */
function lowScoreOrFilter(threshold = 2.5): string {
  const keys = [
    "overall_stay",
    "check_in",
    "room_cleanliness",
    "food_drink",
    "spa_fitness",
    "staff_experience",
    "wifi_quality",
    "cleanliness_upkeep",
    "food_taste_quality",
    "service_promptness",
    "staff_friendliness",
    "safety_security",
    "overall_experience",
    "recommend_score",
    "reservation_ease",
    "welcome_check_in",
    "accommodation_comfort",
    "conference_facilities",
    "recreational_leisure",
    "spa_experience",
  ];
  return keys.map((k) => `${k}.lte.${threshold}`).join(",");
}

export async function GET(request: Request) {
  const session = await getStaffSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const fromParam = parseIsoDate(searchParams.get("from"));
  const toParam = parseIsoDate(searchParams.get("to"));
  const canFilterLow =
    session.role === "owner" || session.role === "management";
  const lowOnly = canFilterLow && searchParams.get("low") === "1";

  try {
    const supabase = getSupabaseAdminClient();
    let query = supabase
      .from("guest_feedback")
      .select(SURVEY_V2_SELECT_COLUMNS)
      .order("created_at", { ascending: false })
      .limit(500);

    if (session.role === "reception") {
      const defaults = defaultReceptionVisitWindow(7);
      const from = fromParam ?? defaults.from;
      const to = toParam ?? defaults.to;
      query = query.gte("visit_date", from).lte("visit_date", to);
    } else {
      // Owner + management: filter by visit_date consistently.
      if (fromParam) {
        query = query.gte("visit_date", fromParam);
      }
      if (toParam) {
        query = query.lte("visit_date", toParam);
      }
    }

    if (lowOnly) {
      query = query.or(lowScoreOrFilter(2.5));
    }

    const { data, error } = await query;
    if (error) {
      console.error("staff feedback select failed", error);
      const detail = safeSupabaseError(error);
      const grantHint =
        error.code === "42501" ||
        /permission denied|row-level security/i.test(error.message ?? "")
          ? " Run supabase/migrations/20260323_guest_feedback_service_role_grants.sql (GRANT to service_role)."
          : "";
      const servicesHint = /purpose_of_visit_services/i.test(error.message ?? "")
        ? " Run supabase/migrations/20260329_purpose_services_array.sql in the Supabase SQL Editor, then Redeploy."
        : "";
      const firstVisitPurposeHint =
        !servicesHint && /first_visit|purpose_of_visit/i.test(error.message ?? "")
          ? " Run supabase/migrations/20260328_guest_feedback_first_visit_purpose.sql in the Supabase SQL Editor, then Redeploy."
          : "";
      const visitDateHint =
        !servicesHint &&
        !firstVisitPurposeHint &&
        /visit_date/i.test(error.message ?? "")
          ? " Run supabase/migrations/20260327_guest_feedback_visit_date.sql in the Supabase SQL Editor, then Redeploy."
          : "";
      const missingTableHint =
        !servicesHint &&
        !firstVisitPurposeHint &&
        !visitDateHint &&
        (error.code === "42P01" || /does not exist/i.test(error.message ?? ""))
          ? " Run supabase/migrations/20260322_guest_feedback.sql in the Supabase SQL Editor."
          : "";
      return NextResponse.json(
        {
          error: `Could not load feedback from Supabase: ${detail}.${grantHint}${servicesHint}${firstVisitPurposeHint}${visitDateHint}${missingTableHint}`,
          debug: {
            urlHost: (() => {
              try {
                return new URL(getSupabaseUrl() ?? "").host;
              } catch {
                return null;
              }
            })(),
            serviceKeyEnv: describeServiceKeySource(),
            supabaseCode: error.code ?? null,
          },
        },
        { status: 500 },
      );
    }

    const feedback = (data ?? []) as unknown as GuestFeedbackRow[];
    if (session.role === "reception") {
      return NextResponse.json({
        feedback,
        role: "reception" as const,
      });
    }

    return NextResponse.json({
      feedback,
      analytics: computeStaffAnalytics(feedback),
      role: session.role,
    });
  } catch (err) {
    console.error(err);
    const message = err instanceof Error ? err.message : "Unknown server error";
    return NextResponse.json(
      {
        error: message,
        debug: {
          urlHost: (() => {
            try {
              return new URL(getSupabaseUrl() ?? "").host;
            } catch {
              return null;
            }
          })(),
          serviceKeyEnv: describeServiceKeySource(),
        },
      },
      { status: 500 },
    );
  }
}
