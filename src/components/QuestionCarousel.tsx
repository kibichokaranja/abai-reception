"use client";

import { useMemo, useState } from "react";
import type { StaffAnalytics } from "@/lib/staff-analytics";
import type { GuestFeedbackRow } from "@/lib/types";
import {
  buildQuestionSlideStats,
  formatRecommendAverage,
  SURVEY_QUESTION_SLIDES,
} from "@/lib/survey-questions";

type Props = {
  rows: GuestFeedbackRow[];
  analytics: StaffAnalytics | null;
  loading?: boolean;
};

function formatAvg(value: number | null): string {
  return value == null ? "—" : value.toFixed(1);
}

export function QuestionCarousel({ rows, analytics, loading }: Props) {
  const slides = useMemo(
    () => buildQuestionSlideStats(rows, analytics),
    [rows, analytics],
  );
  const [index, setIndex] = useState(0);
  const total = slides.length;
  const current = slides[Math.min(index, total - 1)];

  if (loading && rows.length === 0) {
    return (
      <section
        aria-label="Question carousel"
        className="rounded-xl border border-abai-navy/10 bg-white px-4 py-5 text-sm text-abai-muted"
      >
        Loading questions…
      </section>
    );
  }

  if (!current) return null;

  function go(delta: number) {
    setIndex((i) => (i + delta + total) % total);
  }

  const { slide, average, count, weak, choiceMix, firstVisitYes, firstVisitNo, serviceCounts } =
    current;

  return (
    <section
      aria-label="Question carousel"
      className="overflow-hidden rounded-xl border border-abai-navy/10 bg-white"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-abai-navy/10 bg-abai-navy px-4 py-3 text-white">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-abai-gold">
            Question {slide.number} of 17
          </p>
          <h2 className="font-display text-xl font-semibold sm:text-2xl">
            {slide.shortLabel}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => go(-1)}
            className="min-h-10 rounded-lg border border-white/30 px-3 text-sm font-medium hover:bg-white/10"
            aria-label="Previous question"
          >
            Prev
          </button>
          <button
            type="button"
            onClick={() => go(1)}
            className="min-h-10 rounded-lg bg-abai-gold px-3 text-sm font-semibold text-abai-navy hover:bg-abai-gold-hover"
            aria-label="Next question"
          >
            Next
          </button>
        </div>
      </div>

      <div className="space-y-4 px-4 py-5 sm:px-6">
        <p className="text-base text-abai-ink sm:text-lg">{slide.fullLabel}</p>

        {slide.kind === "rating" ? (
          <div>
            <p
              className={`font-display text-4xl font-semibold text-abai-navy ${
                weak ? "underline decoration-abai-gold decoration-4 underline-offset-4" : ""
              }`}
            >
              {slide.key === "recommend_score"
                ? formatRecommendAverage(average)
                : formatAvg(average)}
              {slide.key !== "recommend_score" && average != null ? (
                <span className="ml-2 text-lg font-sans font-normal text-abai-muted">
                  / 5 avg
                </span>
              ) : null}
            </p>
            <p className="mt-1 text-sm text-abai-muted">
              {count} response{count === 1 ? "" : "s"}
              {weak ? " · needs attention (≤2.5)" : ""}
            </p>
          </div>
        ) : null}

        {slide.kind === "choice" && choiceMix ? (
          <div>
            <p className="font-display text-4xl font-semibold text-abai-navy">
              {choiceMix.total > 0 ? `${choiceMix.yesPct}%` : "—"}
              <span className="ml-2 text-lg font-sans font-normal text-abai-muted">
                yes
              </span>
            </p>
            <p className="mt-1 text-sm text-abai-muted">
              Yes {choiceMix.yes} · No {choiceMix.no} · Maybe {choiceMix.maybe}
            </p>
          </div>
        ) : null}

        {slide.kind === "first_visit" ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-abai-navy/10 px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-abai-muted">Yes</p>
              <p className="font-display text-3xl font-semibold text-abai-navy">
                {firstVisitYes}
              </p>
            </div>
            <div className="rounded-lg border border-abai-navy/10 px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-abai-muted">No</p>
              <p className="font-display text-3xl font-semibold text-abai-navy">
                {firstVisitNo}
              </p>
            </div>
          </div>
        ) : null}

        {slide.kind === "services" ? (
          serviceCounts.length === 0 ? (
            <p className="text-sm text-abai-muted">No services selected yet.</p>
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2">
              {serviceCounts.map((s) => (
                <li
                  key={s.label}
                  className="flex items-center justify-between rounded-lg border border-abai-navy/10 px-3 py-2 text-sm"
                >
                  <span className="capitalize text-abai-ink">{s.label}</span>
                  <span className="font-semibold text-abai-navy">{s.count}</span>
                </li>
              ))}
            </ul>
          )
        ) : null}

        <div className="flex flex-wrap gap-1.5 pt-1" aria-hidden>
          {SURVEY_QUESTION_SLIDES.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setIndex(i)}
              className={`h-2 w-2 rounded-full ${
                i === index ? "bg-abai-gold" : "bg-abai-navy/20"
              }`}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
