import { NextResponse } from "next/server";
import { selectPublicReviews } from "@/lib/public-reviews";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { SURVEY_V2_SELECT_COLUMNS, type GuestFeedbackRow } from "@/lib/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function noStoreHeaders(
  extra: Record<string, string> = {},
): Record<string, string> {
  return {
    "Cache-Control": "no-store, no-cache, must-revalidate, private",
    Pragma: "no-cache",
    "Access-Control-Allow-Origin": "*",
    ...extra,
  };
}

/**
 * Public guest reviews for the hotel website page (/reviews).
 * Same selection rules as /api/website/reviews but no API key
 * (read-only positive snippets only — no phones/emails).
 */
export async function GET() {
  try {
    const supabase = getSupabaseAdminClient();
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    const { data, error } = await supabase
      .from("guest_feedback")
      .select(SURVEY_V2_SELECT_COLUMNS)
      .eq("approval_status", "approved")
      .eq("is_irrelevant", false)
      .gte("created_at", oneYearAgo.toISOString())
      .order("created_at", { ascending: false })
      .limit(500);

    if (error) {
      console.error("public reviews select failed", error);
      return NextResponse.json(
        { error: `Could not load reviews: ${error.message}` },
        { status: 500, headers: noStoreHeaders() },
      );
    }

    const rows = (data ?? []) as unknown as GuestFeedbackRow[];
    const reviews = selectPublicReviews(rows).map((r) => ({
      id: r.id,
      visit_date: r.visit_date,
      // First name only / anonymous if blank
      guest_name: r.guest_name
        ? r.guest_name.split(/\s+/)[0]
        : "Guest",
      overall: r.overall,
      recommend: r.recommend,
      comment: r.comment,
    }));

    return NextResponse.json(
      { reviews, meta: { limit: 10, windowMonths: 3, expireAfterYears: 1 } },
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
