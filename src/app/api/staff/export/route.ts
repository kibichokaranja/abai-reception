import { NextResponse } from "next/server";
import { getDashboardPermissions } from "@/lib/dashboard-permissions";
import {
  getStaffSessionFromRequest,
  isOwnerRole,
} from "@/lib/staff-auth";
import { buildExcelBuffer, buildPdfBuffer } from "@/lib/staff-export";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { SURVEY_V2_SELECT_COLUMNS, type GuestFeedbackRow } from "@/lib/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function parseIsoDate(value: string | null): string | null {
  if (!value || !ISO_DATE.test(value)) return null;
  return value;
}

const LOW_SCORE_KEYS = [
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
] as const;

function rowHasLowScore(row: GuestFeedbackRow, threshold = 2.5): boolean {
  for (const key of LOW_SCORE_KEYS) {
    const value = row[key];
    if (typeof value === "number" && value <= threshold) return true;
  }
  return false;
}

async function canExport(session: {
  role: string;
  userId?: string;
}): Promise<boolean> {
  // Owner always entitled — never Unauthorized on export.
  if (isOwnerRole(session.role)) return true;
  if (session.role === "management" || session.role === "reception") {
    if (session.userId) {
      const { getUserDashboardPermissions } = await import(
        "@/lib/dashboard-permissions"
      );
      const perms = await getUserDashboardPermissions(
        session.userId,
        session.role as "management" | "reception",
      );
      return perms.show_export;
    }
    const perms = await getDashboardPermissions(
      session.role as "management" | "reception",
    );
    return perms.show_export;
  }
  return false;
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

/** Export filtered feedback as PDF or Excel (owner, or role with show_export). */
export async function GET(request: Request) {
  const session = await getStaffSessionFromRequest(request);
  if (!session || !(await canExport(session))) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401, headers: noStoreHeaders() },
    );
  }

  const { searchParams } = new URL(request.url);
  const format = (searchParams.get("format") || "xlsx").toLowerCase();
  if (format !== "xlsx" && format !== "pdf") {
    return NextResponse.json(
      { error: "format must be xlsx or pdf" },
      { status: 400, headers: noStoreHeaders() },
    );
  }

  const fromParam = parseIsoDate(searchParams.get("from"));
  const toParam = parseIsoDate(searchParams.get("to"));
  const lowOnly = searchParams.get("low") === "1";
  const hideIrrelevant = searchParams.get("hideIrrelevant") === "1";

  try {
    const supabase = getSupabaseAdminClient();
    let query = supabase
      .from("guest_feedback")
      .select(SURVEY_V2_SELECT_COLUMNS)
      .eq("approval_status", "approved")
      .order("created_at", { ascending: false })
      .limit(500);

    if (fromParam) query = query.gte("visit_date", fromParam);
    if (toParam) query = query.lte("visit_date", toParam);
    if (hideIrrelevant) query = query.eq("is_irrelevant", false);

    const { data, error } = await query;
    if (error) {
      console.error("export select failed", error);
      return NextResponse.json(
        { error: `Could not load feedback for export: ${error.message}` },
        { status: 500, headers: noStoreHeaders() },
      );
    }

    let rows = (data ?? []) as unknown as GuestFeedbackRow[];
    if (lowOnly) {
      rows = rows.filter((row) => rowHasLowScore(row, 2.5));
    }
    const stamp = new Date().toISOString().slice(0, 10);
    const meta = { from: fromParam, to: toParam };

    if (format === "pdf") {
      const buffer = buildPdfBuffer(rows, meta);
      return new NextResponse(buffer, {
        status: 200,
        headers: noStoreHeaders({
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="abai-feedback-summary-${stamp}.pdf"`,
        }),
      });
    }

    const buffer = await buildExcelBuffer(rows, meta);
    return new NextResponse(buffer, {
      status: 200,
      headers: noStoreHeaders({
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="abai-feedback-${stamp}.xlsx"`,
      }),
    });
  } catch (err) {
    console.error(err);
    const message = err instanceof Error ? err.message : "Unknown server error";
    return NextResponse.json(
      { error: message },
      { status: 500, headers: noStoreHeaders() },
    );
  }
}
