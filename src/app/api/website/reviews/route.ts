import { NextResponse } from "next/server";
import { selectPublicReviews } from "@/lib/public-reviews";
import {
  verifyWebsiteApiKey,
  websiteApiKeyConfigured,
  websiteApiKeyFromRequest,
} from "@/lib/staff-auth";
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
    "Access-Control-Allow-Headers": "Authorization, X-Api-Key, Content-Type",
    ...extra,
  };
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: noStoreHeaders({
      "Access-Control-Allow-Methods": "GET, OPTIONS",
    }),
  });
}

/**
 * Hotel website API: top 10 positive approved reviews from the last 3 months
 * (eligible reviews expire after 1 year).
 *
 * Auth: `Authorization: Bearer <WEBSITE_API_KEY>` or `X-Api-Key: <WEBSITE_API_KEY>`.
 * Create a `website_api` staff user in the owner UI for documentation; the key
 * is the env secret, not the user password.
 */
export async function GET(request: Request) {
  if (!websiteApiKeyConfigured()) {
    return NextResponse.json(
      {
        error:
          "WEBSITE_API_KEY is not configured on the server. Set it in Vercel and Redeploy.",
      },
      { status: 503, headers: noStoreHeaders() },
    );
  }

  const provided = websiteApiKeyFromRequest(request);
  if (!verifyWebsiteApiKey(provided)) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401, headers: noStoreHeaders() },
    );
  }

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
      console.error("website reviews select failed", error);
      return NextResponse.json(
        { error: `Could not load reviews: ${error.message}` },
        { status: 500, headers: noStoreHeaders() },
      );
    }

    const rows = (data ?? []) as unknown as GuestFeedbackRow[];
    const reviews = selectPublicReviews(rows);

    return NextResponse.json(
      {
        reviews,
        meta: {
          limit: 10,
          windowMonths: 3,
          expireAfterYears: 1,
          count: reviews.length,
        },
      },
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
