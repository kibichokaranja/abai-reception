import type { StaffAnalytics } from "@/lib/staff-analytics";

function formatAvg(value: number | null): string {
  return value == null ? "—" : value.toFixed(1);
}

type Props = {
  analytics: StaffAnalytics | null;
  loading: boolean;
  lowOnly: boolean;
};

export function StaffAnalyticsSummary({ analytics, loading, lowOnly }: Props) {
  if (loading && !analytics) {
    return (
      <section
        aria-label="Analytics"
        className="rounded-xl border border-abai-navy/10 bg-white px-4 py-5 text-sm text-abai-muted"
      >
        Computing summary…
      </section>
    );
  }

  if (!analytics || analytics.total === 0) {
    return (
      <section
        aria-label="Analytics"
        className="rounded-xl border border-abai-navy/10 bg-white px-4 py-5 text-sm text-abai-muted"
      >
        No responses in this range yet — averages appear once guests submit.
      </section>
    );
  }

  const { total, averages, recommend, categories, weakAreas } = analytics;

  return (
    <section aria-label="Analytics" className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-display text-2xl font-semibold text-abai-navy">
          At a glance
        </h2>
        {lowOnly ? (
          <p className="text-xs text-abai-muted">
            Summary uses the low-score filter (≤2) currently on
          </p>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-abai-navy/10 bg-white px-4 py-4">
          <p className="text-xs font-medium uppercase tracking-wide text-abai-muted">
            Responses
          </p>
          <p className="mt-1 font-display text-3xl font-semibold text-abai-navy">
            {total}
          </p>
        </div>
        <div className="rounded-xl border border-abai-navy/10 bg-white px-4 py-4">
          <p className="text-xs font-medium uppercase tracking-wide text-abai-muted">
            Avg overall
          </p>
          <p className="mt-1 font-display text-3xl font-semibold text-abai-navy">
            {formatAvg(averages.overall_stay)}
            <span className="ml-1 text-base font-sans font-normal text-abai-muted">
              / 5
            </span>
          </p>
        </div>
        <div className="rounded-xl border border-abai-gold/40 bg-abai-navy px-4 py-4 text-white">
          <p className="text-xs font-medium uppercase tracking-wide text-abai-gold">
            Would recommend
          </p>
          <p className="mt-1 font-display text-3xl font-semibold">
            {recommend.yesPct}%
            <span className="ml-1 text-base font-sans font-normal text-white/70">
              yes
            </span>
          </p>
          <p className="mt-1 text-xs text-white/75">
            Yes {recommend.yes} · Maybe {recommend.maybe} · No {recommend.no}
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-abai-navy/10 bg-white px-4 py-4">
        <p className="text-xs font-medium uppercase tracking-wide text-abai-muted">
          Category averages
        </p>
        <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {categories
            .filter((c) => c.key !== "overall_stay")
            .map((cat) => (
              <li key={cat.key} className="min-w-0">
                <p className="truncate text-sm text-abai-muted">{cat.label}</p>
                <p
                  className={`font-display text-2xl font-semibold ${
                    cat.weak ? "text-red-700" : "text-abai-navy"
                  }`}
                >
                  {formatAvg(cat.average)}
                  {cat.key === "spa_fitness" && cat.count === 0 ? (
                    <span className="ml-1 text-sm font-sans font-normal text-abai-muted">
                      N/A
                    </span>
                  ) : null}
                </p>
              </li>
            ))}
        </ul>
      </div>

      {weakAreas.length > 0 ? (
        <p
          className="rounded-xl border border-abai-gold/50 bg-[#fff8e8] px-4 py-3 text-sm text-abai-navy"
          role="status"
        >
          <span className="font-semibold text-abai-gold-pressed">Needs attention: </span>
          {weakAreas.map((a) => `${a.label} (${formatAvg(a.average)})`).join(" · ")}
          <span className="text-abai-muted"> — average ≤ 3</span>
        </p>
      ) : (
        <p className="text-sm text-abai-muted">
          No weak areas in this range (all category averages above 3).
        </p>
      )}
    </section>
  );
}
