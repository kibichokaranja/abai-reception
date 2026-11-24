import { BrandHeader } from "@/components/BrandHeader";
import { selectPublicReviews } from "@/lib/public-reviews";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { SURVEY_V2_SELECT_COLUMNS, type GuestFeedbackRow } from "@/lib/types";
import { formatVisitDate } from "@/lib/visit-date";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function loadReviews() {
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
      console.error(error);
      return [];
    }
    return selectPublicReviews((data ?? []) as unknown as GuestFeedbackRow[]);
  } catch (err) {
    console.error(err);
    return [];
  }
}

export default async function PublicReviewsPage() {
  const reviews = await loadReviews();

  return (
    <div className="min-h-dvh pb-20">
      <BrandHeader />
      <main className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="font-display text-3xl font-semibold text-abai-navy sm:text-4xl">
          Guest reviews
        </h1>
        <p className="mt-2 text-abai-muted">
          Top positive experiences from the last three months at Abai Lodges
          &amp; Spa. Reviews older than one year are not shown.
        </p>

        {reviews.length === 0 ? (
          <p className="mt-10 rounded-xl border border-abai-navy/10 bg-white px-4 py-8 text-center text-abai-muted">
            No public reviews are available yet.
          </p>
        ) : (
          <ul className="mt-8 space-y-5">
            {reviews.map((review) => (
              <li
                key={review.id}
                className="rounded-xl border border-abai-navy/10 bg-white px-5 py-4"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-medium text-abai-navy">
                    {review.guest_name
                      ? review.guest_name.split(/\s+/)[0]
                      : "Guest"}
                  </p>
                  <p className="text-xs text-abai-muted">
                    {review.visit_date
                      ? formatVisitDate(review.visit_date)
                      : ""}
                    {review.overall != null
                      ? ` · ${review.overall.toFixed(1)} / 5`
                      : ""}
                  </p>
                </div>
                <p className="mt-3 text-abai-ink leading-relaxed">
                  “{review.comment}”
                </p>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
