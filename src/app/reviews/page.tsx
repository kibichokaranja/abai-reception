import { BrandHeader } from "@/components/BrandHeader";
import {
  queryPublicReviewCandidates,
  selectPublicReviews,
} from "@/lib/public-reviews";
import { formatVisitDate } from "@/lib/visit-date";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function loadReviews() {
  try {
    const { rows, error } = await queryPublicReviewCandidates();
    if (error) {
      console.error(error);
      return [];
    }
    return selectPublicReviews(rows);
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
        <header className="animate-fade-up border-b border-abai-gold/40 pb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-abai-gold">
            Exclusivity Redefined
          </p>
          <h1 className="mt-2 font-display text-2xl font-semibold text-abai-navy sm:text-3xl">
            Guest reviews
          </h1>
          <p className="mt-2 max-w-xl text-abai-muted">
            The most recent guest reviews at Abai Lodges &amp; Spa.
          </p>
        </header>

        {reviews.length === 0 ? (
          <p className="mt-10 rounded-xl border border-abai-gold/30 bg-abai-navy/[0.03] px-4 py-10 text-center text-abai-muted">
            No public reviews are available yet.
          </p>
        ) : (
          <ul className="mt-8 space-y-5">
            {reviews.map((review, index) => (
              <li
                key={review.id}
                className="animate-fade-up relative overflow-hidden rounded-xl border border-abai-navy/10 bg-white pl-1 shadow-[0_1px_0_rgba(22,17,65,0.04)]"
                style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
              >
                <div className="absolute inset-y-0 left-0 w-1 bg-abai-gold" aria-hidden />
                <div className="px-5 py-5 sm:px-6">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="font-semibold text-abai-navy">
                      {review.guest_name
                        ? review.guest_name.split(/\s+/)[0]
                        : "Guest"}
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      {review.visit_date ? (
                        <span className="text-xs text-abai-muted">
                          {formatVisitDate(review.visit_date)}
                        </span>
                      ) : null}
                      {review.overall != null ? (
                        <span className="rounded-md bg-abai-navy px-2.5 py-1 text-xs font-semibold text-abai-gold">
                          {review.overall.toFixed(1)} / 5
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <p className="relative mt-4 font-display text-xl leading-relaxed text-abai-ink sm:text-2xl">
                    <span
                      className="mr-1 text-2xl text-abai-gold/80 sm:text-3xl"
                      aria-hidden
                    >
                      “
                    </span>
                    {review.comment}
                    <span className="ml-0.5 text-abai-gold/80" aria-hidden>
                      ”
                    </span>
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
