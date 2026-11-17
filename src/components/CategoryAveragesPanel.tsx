"use client";

import type { StaffAnalytics } from "@/lib/staff-analytics";

function formatAvg(value: number | null): string {
  return value == null ? "—" : value.toFixed(1);
}

type Props = {
  analytics: StaffAnalytics | null;
  loading?: boolean;
  title?: string;
};

export function CategoryAveragesPanel({
  analytics,
  loading,
  title = "Category averages",
}: Props) {
  if (loading && !analytics) {
    return (
      <section
        aria-label={title}
        className="rounded-xl border border-abai-navy/10 bg-white px-4 py-5 text-sm text-abai-muted"
      >
        Computing averages…
      </section>
    );
  }

  if (!analytics || analytics.total === 0) {
    return (
      <section
        aria-label={title}
        className="rounded-xl border border-abai-navy/10 bg-white px-4 py-5 text-sm text-abai-muted"
      >
        No responses in this range yet — averages appear once guests submit.
      </section>
    );
  }

  const categories = analytics.categories.filter(
    (c) => c.key !== "overall_experience" && c.key !== "overall_stay",
  );
  const value = analytics.valueForMoney;

  return (
    <section aria-label={title} className="space-y-3">
      <div className="rounded-xl border border-abai-navy/10 bg-white px-4 py-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-display text-2xl font-semibold text-abai-navy">
            {title}
          </h2>
          <p className="text-xs text-abai-muted">
            {analytics.total} response{analytics.total === 1 ? "" : "s"} · N/A
            excluded
          </p>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-abai-navy/10 px-3 py-3">
            <p className="text-xs uppercase tracking-wide text-abai-muted">
              Avg overall
            </p>
            <p className="font-display text-3xl font-semibold text-abai-navy">
              {formatAvg(analytics.overallAvg)}
            </p>
          </div>
          <div className="rounded-lg border border-abai-navy/10 px-3 py-3">
            <p className="text-xs uppercase tracking-wide text-abai-muted">
              Avg recommend
            </p>
            <p className="font-display text-3xl font-semibold text-abai-navy">
              {formatAvg(analytics.recommendScoreAvg)}
            </p>
          </div>
          <div className="rounded-lg border border-abai-gold/40 bg-abai-navy px-3 py-3 text-white sm:col-span-2">
            <p className="text-xs uppercase tracking-wide text-abai-gold">
              Value for money
            </p>
            {value.total > 0 ? (
              <p className="mt-1 font-display text-3xl font-semibold">
                {value.yesPct}%
                <span className="ml-2 text-base font-sans font-normal text-white/70">
                  yes · Y {value.yes} / N {value.no} / M {value.maybe}
                </span>
              </p>
            ) : (
              <p className="mt-1 font-display text-3xl font-semibold text-white/80">
                —
              </p>
            )}
          </div>
        </div>

        <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {categories.map((cat) => (
            <li key={cat.key} className="min-w-0">
              <p className="truncate text-sm text-abai-muted">{cat.label}</p>
              <p
                className={`font-display text-2xl font-semibold text-abai-navy ${
                  cat.weak ? "font-bold" : ""
                }`}
              >
                {formatAvg(cat.average)}
                {cat.count === 0 ? (
                  <span className="ml-1 text-sm font-sans font-normal text-abai-muted">
                    N/A
                  </span>
                ) : null}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
