"use client";

import { FormEvent, useEffect, useState } from "react";
import { TapChoices } from "@/components/TapChoices";
import {
  COMMENT_MAX_LENGTH,
  RATING_LABELS,
  RECOMMEND_OPTIONS,
  RecommendChoice,
} from "@/lib/types";

const RESET_MS = 5000;

type FormState = {
  guest_name: string;
  phone: string;
  overall_stay: number | null;
  check_in: number | null;
  room_cleanliness: number | null;
  food_drink: number | null;
  spa_fitness: number | "na" | null;
  staff_experience: number | null;
  comment: string;
  recommend: RecommendChoice | null;
};

const emptyForm: FormState = {
  guest_name: "",
  phone: "",
  overall_stay: null,
  check_in: null,
  room_cleanliness: null,
  food_drink: null,
  spa_fitness: null,
  staff_experience: null,
  comment: "",
  recommend: null,
};

const SPA_OPTIONS = [
  ...RATING_LABELS.map((r) => ({ value: r.value as number | "na", label: r.label })),
  { value: "na" as const, label: "N/A" },
];

export function GuestFeedbackForm() {
  const [form, setForm] = useState<FormState>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [thanks, setThanks] = useState(false);

  useEffect(() => {
    if (!thanks) return;
    const timer = window.setTimeout(() => {
      setForm(emptyForm);
      setThanks(false);
      setError(null);
    }, RESET_MS);
    return () => window.clearTimeout(timer);
  }, [thanks]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (!form.guest_name.trim() || !form.phone.trim()) {
      setError("Please enter your name and phone number.");
      return;
    }
    if (
      form.overall_stay == null ||
      form.check_in == null ||
      form.room_cleanliness == null ||
      form.food_drink == null ||
      form.spa_fitness == null ||
      form.staff_experience == null ||
      form.recommend == null
    ) {
      setError("Please answer every rating with a tap (the review text is optional).");
      return;
    }

    const comment = form.comment.trim();
    if (comment.length > COMMENT_MAX_LENGTH) {
      setError(`Review text must be ${COMMENT_MAX_LENGTH} characters or fewer.`);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guest_name: form.guest_name.trim(),
          phone: form.phone.trim(),
          overall_stay: form.overall_stay,
          check_in: form.check_in,
          room_cleanliness: form.room_cleanliness,
          food_drink: form.food_drink,
          spa_fitness: form.spa_fitness === "na" ? null : form.spa_fitness,
          staff_experience: form.staff_experience,
          comment: comment.length > 0 ? comment : null,
          recommend: form.recommend,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        throw new Error(data.error || "Could not submit feedback.");
      }
      setThanks(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  if (thanks) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-4 text-center">
        <div className="animate-check-pop mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-abai-gold text-3xl text-abai-navy">
          ✓
        </div>
        <h2 className="font-display text-4xl font-semibold text-abai-navy sm:text-5xl">
          Thank you
        </h2>
        <p className="mt-3 max-w-md text-lg text-abai-muted">
          We appreciate your feedback. Wishing you a wonderful day at Abai Lodges
          &amp; Spa.
        </p>
        <p className="mt-8 text-sm text-abai-muted">
          Resetting for the next guest…
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="mx-auto max-w-2xl space-y-8 px-4 py-8 sm:py-10"
    >
      <div className="animate-fade-up text-center">
        <h1 className="font-display text-3xl font-semibold text-abai-navy sm:text-4xl">
          How was your stay?
        </h1>
        <p className="mt-2 text-base text-abai-muted sm:text-lg">
          A quick tap-through for our front desk — ratings required; a short
          written review is optional.
        </p>
      </div>

      <div className="animate-fade-up grid gap-4 sm:grid-cols-2">
        <label className="block space-y-2">
          <span className="text-sm font-semibold uppercase tracking-wide text-abai-navy">
            Name
          </span>
          <input
            type="text"
            name="guest_name"
            autoComplete="name"
            required
            value={form.guest_name}
            onChange={(e) => update("guest_name", e.target.value)}
            className="min-h-14 w-full rounded-lg border-2 border-abai-navy/15 bg-white px-4 text-lg text-abai-ink outline-none focus:border-abai-gold"
            placeholder="Your name"
          />
        </label>
        <label className="block space-y-2">
          <span className="text-sm font-semibold uppercase tracking-wide text-abai-navy">
            Phone
          </span>
          <input
            type="tel"
            name="phone"
            autoComplete="tel"
            required
            value={form.phone}
            onChange={(e) => update("phone", e.target.value)}
            className="min-h-14 w-full rounded-lg border-2 border-abai-navy/15 bg-white px-4 text-lg text-abai-ink outline-none focus:border-abai-gold"
            placeholder="07xx xxx xxx"
          />
        </label>
      </div>

      <TapChoices
        label="Overall stay"
        options={RATING_LABELS}
        value={form.overall_stay}
        onChange={(v) => update("overall_stay", v)}
      />
      <TapChoices
        label="Check-in & reception"
        options={RATING_LABELS}
        value={form.check_in}
        onChange={(v) => update("check_in", v)}
      />
      <TapChoices
        label="Room cleanliness"
        options={RATING_LABELS}
        value={form.room_cleanliness}
        onChange={(v) => update("room_cleanliness", v)}
      />
      <TapChoices
        label="Food & drink"
        options={RATING_LABELS}
        value={form.food_drink}
        onChange={(v) => update("food_drink", v)}
      />
      <TapChoices
        label="Spa / fitness"
        options={SPA_OPTIONS}
        value={form.spa_fitness}
        onChange={(v) => update("spa_fitness", v)}
        columns={6}
      />
      <TapChoices
        label="Customer experience with staff"
        options={RATING_LABELS}
        value={form.staff_experience}
        onChange={(v) => update("staff_experience", v)}
      />
      <TapChoices
        label="Would you recommend us?"
        options={RECOMMEND_OPTIONS}
        value={form.recommend}
        onChange={(v) => update("recommend", v)}
        columns={3}
      />

      <label className="animate-fade-up block space-y-2">
        <span className="font-display text-xl font-semibold text-abai-ink sm:text-2xl">
          Anything else you’d like to share?
        </span>
        <span className="block text-sm text-abai-muted">Optional</span>
        <textarea
          name="comment"
          rows={4}
          maxLength={COMMENT_MAX_LENGTH}
          value={form.comment}
          onChange={(e) => update("comment", e.target.value)}
          className="w-full rounded-lg border-2 border-abai-navy/15 bg-white px-4 py-3 text-base text-abai-ink outline-none focus:border-abai-gold"
          placeholder="Tell us more about your stay (optional)"
        />
        <span className="block text-right text-xs text-abai-muted">
          {form.comment.length}/{COMMENT_MAX_LENGTH}
        </span>
      </label>

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-800" role="alert">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={submitting}
        className="animate-soft-pulse min-h-16 w-full rounded-xl bg-abai-gold text-xl font-semibold text-abai-navy transition hover:bg-abai-gold-hover active:bg-abai-gold-pressed disabled:cursor-not-allowed disabled:opacity-70"
      >
        {submitting ? "Sending…" : "Submit feedback"}
      </button>
    </form>
  );
}
