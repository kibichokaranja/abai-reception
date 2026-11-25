import { overallForRow, recommendLabelForRow } from "@/lib/staff-analytics";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { SURVEY_V2_SELECT_COLUMNS, type GuestFeedbackRow } from "@/lib/types";
import type { SupabaseClient } from "@supabase/supabase-js";

export type PublicReview = {
  id: string;
  visit_date: string;
  guest_name: string | null;
  overall: number | null;
  recommend: string;
  comment: string;
  created_at: string;
};

const MS_DAY = 24 * 60 * 60 * 1000;

/**
 * Positive for public display:
 * - If an overall score exists, it must be >= 4 (recommend alone cannot promote a weak stay).
 * - Otherwise fall back to recommend_score >= 4, then legacy recommend === "yes".
 */
export function isPositiveReview(row: GuestFeedbackRow): boolean {
  const overall = overallForRow(row);
  if (overall != null) {
    return overall >= 4;
  }
  if (typeof row.recommend_score === "number") {
    return row.recommend_score >= 4;
  }
  return row.recommend === "yes";
}

function withinMonths(iso: string, months: number, now = Date.now()): boolean {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return false;
  return now - t <= months * 30 * MS_DAY;
}

function withinYears(iso: string, years: number, now = Date.now()): boolean {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return false;
  return now - t <= years * 365 * MS_DAY;
}

/**
 * PostgREST OR filter matching {@link isPositiveReview}.
 * Excludes rows whose set overall is below 4 even when recommend is "yes".
 */
export const PUBLIC_POSITIVE_OR_FILTER = [
  "overall_experience.gte.4",
  "and(overall_experience.is.null,overall_stay.gte.4)",
  "and(overall_experience.is.null,overall_stay.is.null,recommend_score.gte.4)",
  "and(overall_experience.is.null,overall_stay.is.null,recommend_score.is.null,recommend.eq.yes)",
].join(",");

/**
 * Public hotel-website reviews:
 * - approved only
 * - disappear after 1 year
 * - 10 most recent positive from the last 3 months (among those still eligible)
 */
export function selectPublicReviews(
  rows: GuestFeedbackRow[],
  now = Date.now(),
): PublicReview[] {
  const eligible = rows.filter((row) => {
    if (row.approval_status !== "approved") return false;
    if (row.is_irrelevant) return false;
    const stamp = row.created_at || row.visit_date;
    if (!withinYears(stamp, 1, now)) return false;
    if (!withinMonths(stamp, 3, now)) return false;
    if (!isPositiveReview(row)) return false;
    const comment = row.comment?.trim() ?? "";
    return comment.length > 0;
  });

  eligible.sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );

  return eligible.slice(0, 10).map((row) => ({
    id: row.id,
    visit_date: row.visit_date,
    guest_name: row.guest_name?.trim() || null,
    overall: overallForRow(row),
    recommend: recommendLabelForRow(row),
    comment: row.comment!.trim(),
    created_at: row.created_at,
  }));
}

/**
 * Shared Supabase query for /reviews and public/website review APIs.
 * Positive filtering is enforced in the query (OR filter) and again in
 * {@link selectPublicReviews}.
 */
export async function queryPublicReviewCandidates(
  supabase: SupabaseClient = getSupabaseAdminClient(),
): Promise<{ rows: GuestFeedbackRow[]; error: { message: string } | null }> {
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

  const { data, error } = await supabase
    .from("guest_feedback")
    .select(SURVEY_V2_SELECT_COLUMNS)
    .eq("approval_status", "approved")
    .eq("is_irrelevant", false)
    .gte("created_at", oneYearAgo.toISOString())
    .not("comment", "is", null)
    .neq("comment", "")
    .or(PUBLIC_POSITIVE_OR_FILTER)
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) {
    return { rows: [], error: { message: error.message } };
  }

  return {
    rows: (data ?? []) as unknown as GuestFeedbackRow[],
    error: null,
  };
}
