"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
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

export function StaffFeedbackList() {
  const router = useRouter();
  const [rows, setRows] = useState<GuestFeedbackRow[]>([]);
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
        error?: string;
      };
      if (!res.ok) {
        throw new Error(data.error || "Failed to load feedback");
      }
      setRows(data.feedback ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
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
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
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

      <div className="overflow-x-auto rounded-xl border border-abai-navy/10 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-abai-navy text-white">
            <tr>
              <th className="px-3 py-3 font-medium">When</th>
              <th className="px-3 py-3 font-medium">Guest</th>
              <th className="px-3 py-3 font-medium">Phone</th>
              <th className="px-3 py-3 font-medium">Overall</th>
              <th className="px-3 py-3 font-medium">Check-in</th>
              <th className="px-3 py-3 font-medium">Room</th>
              <th className="px-3 py-3 font-medium">F&amp;B</th>
              <th className="px-3 py-3 font-medium">Spa</th>
              <th className="px-3 py-3 font-medium">Recommend</th>
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
              <tr key={row.id} className="border-t border-abai-navy/10">
                <td className="whitespace-nowrap px-3 py-3 text-abai-muted">
                  {formatDate(row.created_at)}
                </td>
                <td className="px-3 py-3 font-medium text-abai-ink">
                  {row.guest_name}
                </td>
                <td className="whitespace-nowrap px-3 py-3">{row.phone}</td>
                <td className={`px-3 py-3 ${scoreTone(row.overall_stay)}`}>
                  {row.overall_stay}
                </td>
                <td className={`px-3 py-3 ${scoreTone(row.check_in)}`}>
                  {row.check_in}
                </td>
                <td className={`px-3 py-3 ${scoreTone(row.room_cleanliness)}`}>
                  {row.room_cleanliness}
                </td>
                <td className={`px-3 py-3 ${scoreTone(row.food_drink)}`}>
                  {row.food_drink}
                </td>
                <td className={`px-3 py-3 ${scoreTone(row.spa_fitness)}`}>
                  {row.spa_fitness ?? "N/A"}
                </td>
                <td className="px-3 py-3 capitalize">{row.recommend}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
