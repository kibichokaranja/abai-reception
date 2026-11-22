import { NextResponse } from "next/server";
import {
  getDashboardPermissions,
  type DashboardPermissions,
} from "@/lib/dashboard-permissions";
import { computeStaffAnalytics } from "@/lib/staff-analytics";
import { getStaffSessionFromRequest } from "@/lib/staff-auth";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { describeServiceKeySource, getSupabaseUrl } from "@/lib/supabase-env";
import {
  SURVEY_V2_SELECT_COLUMNS,
  type ApprovalStatus,
  type GuestFeedbackRow,
} from "@/lib/types";
import { defaultReceptionVisitWindow } from "@/lib/visit-date";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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

function noStoreHeaders(
  extra: Record<string, string> = {},
): Record<string, string> {
  return {
    "Cache-Control": "no-store, no-cache, must-revalidate, private",
    Pragma: "no-cache",
    ...extra,
  };
}

const OWNER_FULL: DashboardPermissions = {
  role: "management",
  show_analytics: true,
  show_category_averages: true,
  show_question_carousel: true,
  show_feedback_list: true,
  show_comments: true,
  show_guest_details: true,
  show_date_filters: true,
  show_low_score_filter: true,
  show_export: true,
};

function normalizeRows(data: unknown[]): GuestFeedbackRow[] {
  return (data as GuestFeedbackRow[]).map((row) => ({
    ...row,
    approval_status: (row.approval_status ?? "approved") as ApprovalStatus,
    is_irrelevant: Boolean(row.is_irrelevant),
    room_number: row.room_number ?? null,
    approved_at: row.approved_at ?? null,
    approved_by: row.approved_by ?? null,
    submit_lat: row.submit_lat ?? null,
    submit_lng: row.submit_lng ?? null,
  }));
}

export async function GET(request: Request) {
  const session = await getStaffSessionFromRequest(request);
  if (!session) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401, headers: noStoreHeaders() },
    );
  }

  const permissions =
    session.role === "owner"
      ? { ...OWNER_FULL, role: "management" as const }
      : await getDashboardPermissions(session.role);
  // Staff desk (reception) never receives the question carousel.
  if (session.role === "reception") {
    permissions.show_question_carousel = false;
  }

  const { searchParams } = new URL(request.url);
  const fromParam = parseIsoDate(searchParams.get("from"));
  const toParam = parseIsoDate(searchParams.get("to"));
  const canFilterLow =
    permissions.show_low_score_filter &&
    (session.role === "owner" ||
      session.role === "management" ||
      session.role === "reception");
  const lowOnly = canFilterLow && searchParams.get("low") === "1";
  const hideIrrelevant = searchParams.get("hideIrrelevant") === "1";
  const pendingOnly =
    (session.role === "owner" || session.role === "management") &&
    searchParams.get("pending") === "1";

  try {
    const supabase = getSupabaseAdminClient();
    let query = supabase
      .from("guest_feedback")
      .select(SURVEY_V2_SELECT_COLUMNS)
      .order("created_at", { ascending: false })
      .limit(500);

    // Dashboards show approved only — except the pending queue for owner/management.
    if (pendingOnly) {
      query = query.eq("approval_status", "pending");
    } else {
      query = query.eq("approval_status", "approved");
    }

    if (hideIrrelevant && !pendingOnly) {
      query = query.eq("is_irrelevant", false);
    }

    if (session.role === "reception") {
      const defaults = defaultReceptionVisitWindow(7);
      const from = fromParam ?? defaults.from;
      const to = toParam ?? defaults.to;
      query = query.gte("visit_date", from).lte("visit_date", to);
    } else {
      if (fromParam) query = query.gte("visit_date", fromParam);
      if (toParam) query = query.lte("visit_date", toParam);
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
      const approvalHint = /approval_status|is_irrelevant|room_number/i.test(
        error.message ?? "",
      )
        ? " Run batch 4 migrations 20260334–20260337 in the Supabase SQL Editor, then Redeploy."
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
          error: `Could not load feedback from Supabase: ${detail}.${grantHint}${approvalHint}${servicesHint}${firstVisitPurposeHint}${visitDateHint}${missingTableHint}`,
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
        { status: 500, headers: noStoreHeaders() },
      );
    }

    const feedback = normalizeRows(data ?? []);
    const needsAnalytics =
      !pendingOnly &&
      (session.role === "owner" ||
        permissions.show_analytics ||
        permissions.show_category_averages ||
        permissions.show_question_carousel);

    // Analytics exclude irrelevant rows even when the list still shows them.
    const analyticsRows = hideIrrelevant
      ? feedback
      : feedback.filter((r) => !r.is_irrelevant);

    return NextResponse.json(
      {
        feedback: permissions.show_feedback_list || pendingOnly ? feedback : [],
        analytics: needsAnalytics
          ? computeStaffAnalytics(
              hideIrrelevant ? feedback : analyticsRows,
            )
          : null,
        rowsForStats:
          !permissions.show_feedback_list && needsAnalytics
            ? hideIrrelevant
              ? feedback
              : analyticsRows
            : undefined,
        role: session.role,
        pendingMode: pendingOnly,
        permissions:
          session.role === "owner"
            ? {
                ...OWNER_FULL,
                show_export: true,
              }
            : permissions,
      },
      { headers: noStoreHeaders() },
    );
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
      { status: 500, headers: noStoreHeaders() },
    );
  }
}

/** Approve / reject / mark irrelevant — owner + management only. */
export async function PATCH(request: Request) {
  const session = await getStaffSessionFromRequest(request);
  if (
    !session ||
    (session.role !== "owner" && session.role !== "management")
  ) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401, headers: noStoreHeaders() },
    );
  }

  let id = "";
  let action: "approve" | "reject" | "mark_irrelevant" | "clear_irrelevant" | null =
    null;

  try {
    const body = (await request.json()) as {
      id?: string;
      action?: string;
    };
    id = typeof body.id === "string" ? body.id.trim() : "";
    if (
      body.action === "approve" ||
      body.action === "reject" ||
      body.action === "mark_irrelevant" ||
      body.action === "clear_irrelevant"
    ) {
      action = body.action;
    }
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400, headers: noStoreHeaders() },
    );
  }

  if (!id || !action) {
    return NextResponse.json(
      {
        error:
          "id and action (approve | reject | mark_irrelevant | clear_irrelevant) are required",
      },
      { status: 400, headers: noStoreHeaders() },
    );
  }

  try {
    const supabase = getSupabaseAdminClient();
    const actor = session.role;
    let patch: Record<string, unknown>;

    if (action === "approve") {
      patch = {
        approval_status: "approved",
        approved_at: new Date().toISOString(),
        approved_by: actor,
      };
    } else if (action === "reject") {
      patch = {
        approval_status: "rejected",
        approved_at: new Date().toISOString(),
        approved_by: actor,
      };
    } else if (action === "mark_irrelevant") {
      patch = { is_irrelevant: true };
    } else {
      patch = { is_irrelevant: false };
    }

    const { data, error } = await supabase
      .from("guest_feedback")
      .update(patch)
      .eq("id", id)
      .select(SURVEY_V2_SELECT_COLUMNS)
      .single();

    if (error) {
      console.error("feedback patch failed", error);
      return NextResponse.json(
        {
          error: `Could not update feedback: ${error.message}. Run batch 4 migrations if needed.`,
        },
        { status: 500, headers: noStoreHeaders() },
      );
    }

    return NextResponse.json(
      { ok: true, feedback: data },
      { headers: noStoreHeaders() },
    );
  } catch (err) {
    console.error(err);
    const message = err instanceof Error ? err.message : "Unknown server error";
    return NextResponse.json(
      { error: message },
      { status: 500, headers: noStoreHeaders() },
    );
  }
}
