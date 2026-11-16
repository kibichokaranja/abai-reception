"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { TapChoices } from "@/components/TapChoices";
import {
  COMMENT_MAX_LENGTH,
  FIRST_VISIT_OPTIONS,
  PURPOSE_OF_VISIT_OPTIONS,
  RATING_LABELS,
  RECOMMEND_SCORE_OPTIONS,
  STANDOUT_NAME_MAX_LENGTH,
  VALUE_FOR_MONEY_OPTIONS,
  type FirstVisitChoice,
  type PurposeOfVisit,
  type ValueForMoneyChoice,
} from "@/lib/types";
import { formatVisitDate, todayVisitDate } from "@/lib/visit-date";

const RESET_MS = 5000;

type RatingOrNa = number | "na";

type FormState = {
  guest_name: string;
  phone: string;
  first_visit: FirstVisitChoice | null;
  purpose_of_visit_services: PurposeOfVisit[];
  reservation_ease: RatingOrNa | null;
  welcome_check_in: RatingOrNa | null;
  accommodation_comfort: RatingOrNa | null;
  conference_facilities: RatingOrNa | null;
  wifi_quality: number | null;
  recreational_leisure: RatingOrNa | null;
  spa_experience: RatingOrNa | null;
  cleanliness_upkeep: number | null;
  food_taste_quality: number | null;
  service_promptness: number | null;
  staff_friendliness: number | null;
  standout_staff_name: string;
  safety_security: number | null;
  overall_experience: number | null;
  value_for_money: ValueForMoneyChoice | null;
  recommend_score: number | null;
  comment: string;
};

const emptyForm: FormState = {
  guest_name: "",
  phone: "",
  first_visit: null,
  purpose_of_visit_services: [],
  reservation_ease: null,
  welcome_check_in: null,
  accommodation_comfort: null,
  conference_facilities: null,
  wifi_quality: null,
  recreational_leisure: null,
  spa_experience: null,
  cleanliness_upkeep: null,
  food_taste_quality: null,
  service_promptness: null,
  staff_friendliness: null,
  standout_staff_name: "",
  safety_security: null,
  overall_experience: null,
  value_for_money: null,
  recommend_score: null,
  comment: "",
};

const RATING_WITH_NA = [
  ...RATING_LABELS.map((r) => ({
    value: r.value as RatingOrNa,
    label: r.label,
  })),
  { value: "na" as const, label: "Not applicable" },
];

function toNullableScore(value: RatingOrNa | null): number | null {
  if (value == null || value === "na") return null;
  return value;
}

export function GuestFeedbackForm() {
  const [form, setForm] = useState<FormState>(emptyForm);
  const [consentChecked, setConsentChecked] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [thanks, setThanks] = useState(false);
  // Display only — visit_date is stamped server-side on submit.
  const visitDateDisplay = useMemo(
    () => formatVisitDate(todayVisitDate()),
    [],
  );
  const canSubmit = consentChecked && !submitting;

  useEffect(() => {
    if (!thanks) return;
    const timer = window.setTimeout(() => {
      setForm(emptyForm);
      setConsentChecked(false);
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

    // Submit stays disabled until consent is ticked; keep a defensive guard.
    if (!consentChecked) {
      return;
    }

    if (form.guest_name.trim().length > 120) {
      setError("Name must be 120 characters or fewer.");
      return;
    }
    if (form.phone.trim().length > 40) {
      setError("Phone must be 40 characters or fewer.");
      return;
    }

    const standout = form.standout_staff_name.trim();
    if (standout.length > STANDOUT_NAME_MAX_LENGTH) {
      setError(
        `Standout staff name must be ${STANDOUT_NAME_MAX_LENGTH} characters or fewer.`,
      );
      return;
    }

    const comment = form.comment.trim();
    if (comment.length > COMMENT_MAX_LENGTH) {
      setError(`Comments must be ${COMMENT_MAX_LENGTH} characters or fewer.`);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          survey_version: 2,
          guest_name: form.guest_name.trim(),
          phone: form.phone.trim(),
          first_visit:
            form.first_visit == null ? null : form.first_visit === "yes",
          purpose_of_visit_services: form.purpose_of_visit_services,
          reservation_ease: toNullableScore(form.reservation_ease),
          welcome_check_in: toNullableScore(form.welcome_check_in),
          accommodation_comfort: toNullableScore(form.accommodation_comfort),
          conference_facilities: toNullableScore(form.conference_facilities),
          wifi_quality: form.wifi_quality,
          recreational_leisure: toNullableScore(form.recreational_leisure),
          spa_experience: toNullableScore(form.spa_experience),
          cleanliness_upkeep: form.cleanliness_upkeep,
          food_taste_quality: form.food_taste_quality,
          service_promptness: form.service_promptness,
          staff_friendliness: form.staff_friendliness,
          standout_staff_name: standout.length > 0 ? standout : null,
          safety_security: form.safety_security,
          overall_experience: form.overall_experience,
          value_for_money: form.value_for_money,
          recommend_score: form.recommend_score,
          comment: comment.length > 0 ? comment : null,
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
          Thank you for staying with us.
        </h2>
        <p className="mt-3 max-w-md text-lg text-abai-muted">
          We look forward to welcoming you back to Abai Lodges &amp; Spa.
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
          Guest Feedback
        </h1>
        <p className="mt-2 text-base text-abai-muted sm:text-lg">
          All questions are optional. Tap Excellent through Poor (or Not
          applicable). Consent is required to submit.
        </p>
      </div>

      <div className="animate-fade-up grid gap-4 sm:grid-cols-3">
        <label className="block space-y-2">
          <span className="text-sm font-semibold uppercase tracking-wide text-abai-navy">
            Name
          </span>
          <span className="block text-xs text-abai-muted">Optional</span>
          <input
            type="text"
            name="guest_name"
            autoComplete="name"
            maxLength={120}
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
          <span className="block text-xs text-abai-muted">Optional</span>
          <input
            type="tel"
            name="phone"
            autoComplete="tel"
            maxLength={40}
            value={form.phone}
            onChange={(e) => update("phone", e.target.value)}
            className="min-h-14 w-full rounded-lg border-2 border-abai-navy/15 bg-white px-4 text-lg text-abai-ink outline-none focus:border-abai-gold"
            placeholder="07xx xxx xxx"
          />
        </label>
        <div className="block space-y-2">
          <span className="text-sm font-semibold uppercase tracking-wide text-abai-navy">
            Date of visit
          </span>
          <span className="block text-xs text-abai-muted">Today</span>
          <div
            className="flex min-h-14 w-full items-center rounded-lg border-2 border-abai-navy/10 bg-abai-navy/[0.03] px-4 text-lg text-abai-ink"
            aria-readonly="true"
          >
            {visitDateDisplay}
          </div>
        </div>
      </div>

      <TapChoices
        number={1}
        label="Is this your first visit?"
        options={FIRST_VISIT_OPTIONS}
        value={form.first_visit}
        onChange={(v) => update("first_visit", v)}
        columns={2}
      />
      <TapChoices
        number={2}
        label="Which Abai services did you get to experience?"
        options={PURPOSE_OF_VISIT_OPTIONS}
        value={form.purpose_of_visit_services}
        onChange={(v) => update("purpose_of_visit_services", v)}
        columns={3}
        multiple
      />

      <TapChoices
        number={3}
        label="How would you describe the ease and convenience of making your reservation?"
        options={RATING_WITH_NA}
        value={form.reservation_ease}
        onChange={(v) => update("reservation_ease", v)}
        columns={6}
      />
      <TapChoices
        number={4}
        label="What was your impression of the welcome and check-in process?"
        options={RATING_WITH_NA}
        value={form.welcome_check_in}
        onChange={(v) => update("welcome_check_in", v)}
        columns={6}
      />
      <TapChoices
        number={5}
        label="How would you describe the comfort and quality of your accommodation?"
        options={RATING_WITH_NA}
        value={form.accommodation_comfort}
        onChange={(v) => update("accommodation_comfort", v)}
        columns={6}
      />
      <TapChoices
        number={6}
        label="To what extent did our conference facilities meet your expectations?"
        options={RATING_WITH_NA}
        value={form.conference_facilities}
        onChange={(v) => update("conference_facilities", v)}
        columns={6}
      />
      <TapChoices
        number={7}
        label="How would you rate the speed, reliability and quality of our Wi-Fi?"
        options={RATING_LABELS}
        value={form.wifi_quality}
        onChange={(v) => update("wifi_quality", v)}
      />
      <TapChoices
        number={8}
        label="What was your impression of our recreational and leisure facilities?"
        options={RATING_WITH_NA}
        value={form.recreational_leisure}
        onChange={(v) => update("recreational_leisure", v)}
        columns={6}
      />
      <TapChoices
        number={9}
        label="How would you describe the quality of your spa experience?"
        options={RATING_WITH_NA}
        value={form.spa_experience}
        onChange={(v) => update("spa_experience", v)}
        columns={6}
      />
      <TapChoices
        number={10}
        label="How satisfied were you with the cleanliness and general upkeep of our facilities?"
        options={RATING_LABELS}
        value={form.cleanliness_upkeep}
        onChange={(v) => update("cleanliness_upkeep", v)}
      />
      <TapChoices
        number={11}
        label="What was your impression of the taste and quality of our food?"
        options={RATING_LABELS}
        value={form.food_taste_quality}
        onChange={(v) => update("food_taste_quality", v)}
      />
      <TapChoices
        number={12}
        label="How would you assess the promptness and efficiency of our service?"
        options={RATING_LABELS}
        value={form.service_promptness}
        onChange={(v) => update("service_promptness", v)}
      />
      <TapChoices
        number={13}
        label="To what extent did our staff demonstrate friendliness, courtesy and helpfulness?"
        options={RATING_LABELS}
        value={form.staff_friendliness}
        onChange={(v) => update("staff_friendliness", v)}
      />

      <label className="animate-fade-up block space-y-2">
        <span className="font-display text-xl font-semibold text-abai-ink sm:text-2xl">
          14. Was there a member of our team whose service stood out? Kindly
          mention their name.
        </span>
        <span className="block text-sm text-abai-muted">Optional</span>
        <input
          type="text"
          name="standout_staff_name"
          maxLength={STANDOUT_NAME_MAX_LENGTH}
          value={form.standout_staff_name}
          onChange={(e) => update("standout_staff_name", e.target.value)}
          className="min-h-14 w-full rounded-lg border-2 border-abai-navy/15 bg-white px-4 text-lg text-abai-ink outline-none focus:border-abai-gold"
          placeholder="Name of a team member who stood out"
        />
      </label>

      <TapChoices
        number={15}
        label="How would you rate the level of safety and security within the hotel?"
        options={RATING_LABELS}
        value={form.safety_security}
        onChange={(v) => update("safety_security", v)}
      />
      <TapChoices
        number={16}
        label="Taking everything into account, how would you rate your overall experience at Abai Lodges & Spa?"
        options={RATING_LABELS}
        value={form.overall_experience}
        onChange={(v) => update("overall_experience", v)}
      />
      <TapChoices
        number={17}
        label="Did your overall experience represent good value for money?"
        options={VALUE_FOR_MONEY_OPTIONS}
        value={form.value_for_money}
        onChange={(v) => update("value_for_money", v)}
        columns={3}
      />
      <TapChoices
        number={18}
        label="On a scale of 1–5, how likely are you to recommend Abai Lodges & Spa to friends, family or colleagues?"
        options={RECOMMEND_SCORE_OPTIONS}
        value={form.recommend_score}
        onChange={(v) => update("recommend_score", v)}
      />

      <label className="animate-fade-up block space-y-2">
        <span className="font-display text-xl font-semibold text-abai-ink sm:text-2xl">
          19. What else would you like to share with us or suggest for
          improvement?
        </span>
        <span className="block text-sm text-abai-muted">Optional</span>
        <textarea
          name="comment"
          rows={4}
          maxLength={COMMENT_MAX_LENGTH}
          value={form.comment}
          onChange={(e) => update("comment", e.target.value)}
          className="w-full rounded-lg border-2 border-abai-navy/15 bg-white px-4 py-3 text-base text-abai-ink outline-none focus:border-abai-gold"
          placeholder="Anything else you’d like to share"
        />
        <span className="block text-right text-xs text-abai-muted">
          {form.comment.length}/{COMMENT_MAX_LENGTH}
        </span>
      </label>

      <div className="animate-fade-up space-y-3 rounded-xl border-2 border-abai-navy/15 bg-white/70 px-4 py-4">
        <p className="text-sm leading-relaxed text-abai-muted">
          By submitting this form, you allow Abai Lodges &amp; Spa to collect
          your guest information and review for service and quality improvement.
        </p>
        <label className="flex cursor-pointer items-start gap-3 text-base text-abai-ink">
          <input
            type="checkbox"
            name="consent"
            checked={consentChecked}
            onChange={(e) => setConsentChecked(e.target.checked)}
            className="mt-1 size-5 shrink-0 rounded border-2 border-abai-navy/30 accent-abai-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-abai-gold"
          />
          <span>
            I agree to the collection and review of my guest information as
            described above.
          </span>
        </label>
      </div>

      {error ? (
        <p
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-800"
          role="alert"
        >
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={!canSubmit}
        aria-disabled={!canSubmit}
        className="animate-soft-pulse min-h-16 w-full rounded-xl bg-abai-gold text-xl font-semibold text-abai-navy transition hover:bg-abai-gold-hover active:bg-abai-gold-pressed disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-abai-gold"
      >
        {submitting ? "Sending…" : "Submit feedback"}
      </button>
    </form>
  );
}
