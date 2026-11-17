import { NextResponse } from "next/server";
import { getStaffSession } from "@/lib/staff-auth";
import { buildExcelBuffer, buildPdfBuffer } from "@/lib/staff-export";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { SURVEY_V2_SELECT_COLUMNS, type GuestFeedbackRow } from "@/lib/types";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function parseIsoDate(value: string | null): string | null {
  if (!value || !ISO_DATE.test(value)) return null;
  return value;
}

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

/** Owner-only export of the current filtered feedback set as PDF or Excel. */
export async function GET(request: Request) {
  const session = await getStaffSession();
  if (!session || session.role !== "owner") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const format = (searchParams.get("format") || "xlsx").toLowerCase();
  if (format !== "xlsx" && format !== "pdf") {
    return NextResponse.json(
      { error: "format must be xlsx or pdf" },
      { status: 400 },
    );
  }

  const fromParam = parseIsoDate(searchParams.get("from"));
  const toParam = parseIsoDate(searchParams.get("to"));
  const lowOnly = searchParams.get("low") === "1";

  try {
    const supabase = getSupabaseAdminClient();
    let query = supabase
      .from("guest_feedback")
      .select(SURVEY_V2_SELECT_COLUMNS)
      .order("created_at", { ascending: false })
      .limit(500);

    if (fromParam) query = query.gte("visit_date", fromParam);
    if (toParam) query = query.lte("visit_date", toParam);
    if (lowOnly) query = query.or(lowScoreOrFilter(2.5));

    const { data, error } = await query;
    if (error) {
      console.error("export select failed", error);
      return NextResponse.json(
        { error: `Could not load feedback for export: ${error.message}` },
        { status: 500 },
      );
    }

    const rows = (data ?? []) as unknown as GuestFeedbackRow[];
    const stamp = new Date().toISOString().slice(0, 10);

    if (format === "pdf") {
      const buffer = buildPdfBuffer(rows);
      return new NextResponse(buffer, {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="abai-feedback-${stamp}.pdf"`,
        },
      });
    }

    const buffer = await buildExcelBuffer(rows);
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="abai-feedback-${stamp}.xlsx"`,
      },
    });
  } catch (err) {
    console.error(err);
    const message = err instanceof Error ? err.message : "Unknown server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
