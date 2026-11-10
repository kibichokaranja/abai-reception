"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { StaffAnalyticsSummary } from "@/components/StaffAnalyticsSummary";
import {
  isSurveyV2Row,
  overallForRow,
  recommendLabelForRow,
  type StaffAnalytics,
} from "@/lib/staff-analytics";
import type { GuestFeedbackRow } from "@/lib/types";

function formatDate(iso: string) {
  try {
    return new Intl.DateTimeFormat("en-KE", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function scoreTone(value: number | null) {
  if (value == null) return "text-abai-muted";
  if (value <= 2) return "text-red-700 font-semibold";
  if (value === 3) return "text-amber-700";
  return "text-emerald-800";
}

function formatScore(value: number | null | undefined, naLabel = "N/A") {
  if (value == null) return naLabel;
  return String(value);
}

function TextCell({ text }: { text: string | null }) {
  const [open, setOpen] = useState(false);
  if (!text) {
    return <span className="text-abai-muted">—</span>;
  }
  const long = text.length > 80;
  return (
    <div className="max-w-[14rem]">
      <p className={`text-abai-ink ${open ? "whitespace-pre-wrap" : "line-clamp-2"}`}>
        {text}
      </p>
      {long ? (
        <button
          type="button"
          className="mt-1 text-xs font-medium text-abai-navy underline-offset-2 hover:underline"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? "Show less" : "Show more"}
        </button>
      ) : null}
    </div>
  );
}

const V2_DETAIL_FIELDS: { key: keyof GuestFeedbackRow; label: string }[] = [
  { key: "reservation_ease", label: "Reservation" },
  { key: "welcome_check_in", label: "Welcome / check-in" },
  { key: "accommodation_comfort", label: "Accommodation" },
  { key: "conference_facilities", label: "Conference" },
  { key: "wifi_quality", label: "Wi‑Fi" },
  { key: "recreational_leisure", label: "Leisure" },
  { key: "spa_experience", label: "Spa" },
  { key: "cleanliness_upkeep", label: "Cleanliness" },
  { key: "food_taste_quality", label: "Food" },
  { key: "service_promptness", label: "Service" },
  { key: "staff_friendliness", label: "Staff" },
  { key: "safety_security", label: "Safety" },
  { key: "overall_experience", label: "Overall" },
  { key: "recommend_score", label: "Recommend" },
  { key: "value_for_money", label: "Value for money" },
];

const LEGACY_DETAIL_FIELDS: { key: keyof GuestFeedbackRow; label: string }[] = [
  { key: "overall_stay", label: "Overall stay" },
  { key: "check_in", label: "Check-in" },
  { key: "room_cleanliness", label: "Room" },
  { key: "food_drink", label: "F&B" },
  { key: "spa_fitness", label: "Spa" },
  { key: "staff_experience", label: "Staff" },
  { key: "recommend", label: "Recommend" },
];

function DetailScores({ row }: { row: GuestFeedbackRow }) {
  const v2 = isSurveyV2Row(row);
  const fields = v2 ? V2_DETAIL_FIELDS : LEGACY_DETAIL_FIELDS;
  return (
    <dl className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
      {fields.map(({ key, label }) => {
        const raw = row[key];
        const display =
          raw == null
            ? v2 && typeof raw !== "string"
              ? "N/A"
              : "—"
            : String(raw);
        const tone =
          typeof raw === "number" ? scoreTone(raw) : "text-abai-ink capitalize";
        return (
          <div key={String(key)} className="min-w-0">
            <dt className="text-xs text-abai-muted">{label}</dt>
            <dd className={`text-sm font-medium ${tone}`}>{display}</dd>
          </div>
        );
      })}
    </dl>
  );
}

function FeedbackRow({ row }: { row: GuestFeedbackRow }) {
  const [open, setOpen] = useState(false);
  const overall = overallForRow(row);
  const v2 = isSurveyV2Row(row);

  return (
    <>
      <tr className="border-t border-abai-navy/10 align-top">
        <td className="whitespace-nowrap px-3 py-3 text-abai-muted">
          {formatDate(row.created_at)}
        </td>
        <td className="px-3 py-3 font-medium text-abai-ink">{row.guest_name}</td>
        <td className="whitespace-nowrap px-3 py-3">{row.phone}</td>
        <td className={`px-3 py-3 ${scoreTone(overall)}`}>
          {formatScore(overall, "—")}
          {!v2 ? (
            <span className="ml-1 text-xs font-normal text-abai-muted">legacy</span>
          ) : null}
        </td>
        <td className="px-3 py-3 capitalize">{recommendLabelForRow(row)}</td>
        <td className="px-3 py-3 capitalize">
          {row.value_for_money ?? "—"}
        </td>
        <td className="px-3 py-3">
          <TextCell text={row.standout_staff_name} />
        </td>
        <td className="px-3 py-3">
          <TextCell text={row.comment} />
        </td>
        <td className="px-3 py-3">
          <button
            type="button"
            className="text-xs font-medium text-abai-navy underline-offset-2 hover:underline"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
          >
            {open ? "Hide" : "Scores"}
          </button>
        </td>
      </tr>
      {open ? (
        <tr className="border-t border-abai-navy/5 bg-white/70">
          <td colSpan={9} className="px-3 py-4">
            <DetailScores row={row} />
          </td>
        </tr>
      ) : null}
    </>
  );
}

export function StaffFeedbackList() {
  const router = useRouter();
  const [rows, setRows] = useState<GuestFeedbackRow[]>([]);
  const [analytics, setAnalytics] = useState<StaffAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [lowOnly, setLowOnly] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (fromDate) params.set("from", fromDate);
      if (toDate) params.set("to", toDate);
      if (lowOnly) params.set("low", "1");
      const res = await fetch(`/api/staff/feedback?${params.toString()}`);
      const data = (await res.json()) as {
        feedback?: GuestFeedbackRow[];
        analytics?: StaffAnalytics;
        error?: string;
        debug?: {
          urlHost?: string | null;
          serviceKeyEnv?: string;
          supabaseCode?: string | null;
        };
      };
      if (!res.ok) {
        const debugBits = data.debug
          ? [
              data.debug.serviceKeyEnv && `env=${data.debug.serviceKeyEnv}`,
              data.debug.urlHost && `host=${data.debug.urlHost}`,
              data.debug.supabaseCode && `code=${data.debug.supabaseCode}`,
            ]
              .filter(Boolean)
              .join(", ")
          : "";
        throw new Error(
          [data.error || "Failed to load feedback", debugBits]
            .filter(Boolean)
            .join(" "),
        );
      }
      setRows(data.feedback ?? []);
      setAnalytics(data.analytics ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
      setAnalytics(null);
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate, lowOnly]);

  useEffect(() => {
    void load();
  }, [load]);

  const countLabel = useMemo(() => {
    if (loading) return "Loading…";
    return `${rows.length} response${rows.length === 1 ? "" : "s"}`;
  }, [loading, rows.length]);

  async function logout() {
    await fetch("/api/staff/logout", { method: "POST" });
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold text-abai-navy sm:text-4xl">
            Guest feedback
          </h1>
          <p className="mt-1 text-abai-muted">{countLabel}</p>
        </div>
        <button
          type="button"
          onClick={() => void logout()}
          className="rounded-lg border border-abai-navy/20 px-4 py-2 text-sm font-medium text-abai-navy hover:bg-white"
        >
          Sign out
        </button>
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-abai-navy/10 bg-white p-4">
        <label className="space-y-1 text-sm">
          <span className="font-medium text-abai-navy">From</span>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="block min-h-10 rounded-lg border border-abai-navy/15 px-3"
          />
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium text-abai-navy">To</span>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="block min-h-10 rounded-lg border border-abai-navy/15 px-3"
          />
        </label>
        <label className="flex min-h-10 items-center gap-2 text-sm font-medium text-abai-navy">
          <input
            type="checkbox"
            checked={lowOnly}
            onChange={(e) => setLowOnly(e.target.checked)}
            className="size-4 accent-abai-gold"
          />
          Low scores only (≤2)
        </label>
        <button
          type="button"
          onClick={() => void load()}
          className="min-h-10 rounded-lg bg-abai-navy px-4 text-sm font-medium text-white"
        >
          Refresh
        </button>
      </div>

      {error ? (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-red-800" role="alert">
          {error}
        </p>
      ) : null}

      {!error ? (
        <StaffAnalyticsSummary
          analytics={analytics}
          loading={loading}
          lowOnly={lowOnly}
        />
      ) : null}

      <div className="overflow-x-auto rounded-xl border border-abai-navy/10 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-abai-navy text-white">
            <tr>
              <th className="px-3 py-3 font-medium">When</th>
              <th className="px-3 py-3 font-medium">Guest</th>
              <th className="px-3 py-3 font-medium">Phone</th>
              <th className="px-3 py-3 font-medium">Overall</th>
              <th className="px-3 py-3 font-medium">Recommend</th>
              <th className="px-3 py-3 font-medium">Value</th>
              <th className="px-3 py-3 font-medium">Standout</th>
              <th className="px-3 py-3 font-medium">Comment</th>
              <th className="px-3 py-3 font-medium">Detail</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && !loading ? (
              <tr>
                <td colSpan={9} className="px-3 py-8 text-center text-abai-muted">
                  No feedback matches these filters.
                </td>
              </tr>
            ) : null}
            {rows.map((row) => (
              <FeedbackRow key={row.id} row={row} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
