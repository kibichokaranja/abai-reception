import { overallForRow, recommendLabelForRow } from "@/lib/staff-analytics";
import type { GuestFeedbackRow } from "@/lib/types";

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

function isPositive(row: GuestFeedbackRow): boolean {
  const overall = overallForRow(row);
  if (overall != null && overall >= 4) return true;
  if (
    typeof row.recommend_score === "number" &&
    row.recommend_score >= 4
  ) {
    return true;
  }
  if (row.recommend === "yes") return true;
  return false;
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
 * Public hotel-website reviews:
 * - approved only
 * - disappear after 1 year
 * - top 10 positive from the last 3 months (among those still eligible)
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
    if (!isPositive(row)) return false;
    const comment = row.comment?.trim() ?? "";
    return comment.length > 0;
  });

  eligible.sort((a, b) => {
    const oa = overallForRow(a) ?? 0;
    const ob = overallForRow(b) ?? 0;
    if (ob !== oa) return ob - oa;
    return (
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  });

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
