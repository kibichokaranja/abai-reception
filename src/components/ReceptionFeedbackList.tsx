"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  overallForRow,
  recommendLabelForRow,
} from "@/lib/staff-analytics";
import type { GuestFeedbackRow } from "@/lib/types";
import {
  defaultReceptionVisitWindow,
  formatVisitDate,
} from "@/lib/visit-date";

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

function visitDateLabel(row: GuestFeedbackRow) {
  if (row.visit_date) return formatVisitDate(row.visit_date);
  try {
    return new Intl.DateTimeFormat("en-KE", {
      timeZone: "Africa/Nairobi",
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(new Date(row.created_at));
  } catch {
    return "—";
  }
}

function scoreTone(value: number | null) {
  if (value == null) return "text-abai-muted";
  if (value <= 2) return "text-red-700 font-semibold";
  if (value === 3) return "text-amber-700";
  return "text-emerald-800";
}

function TextCell({ text }: { text: string | null }) {
  const [open, setOpen] = useState(false);
  if (!text) {
    return <span className="text-abai-muted">—</span>;
  }
  const long = text.length > 80;
  return (
    <div className="max-w-[16rem]">
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

export function ReceptionFeedbackList() {
  const router = useRouter();
  const [rows, setRows] = useState<GuestFeedbackRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fromDate, setFromDate] = useState(
    () => defaultReceptionVisitWindow(7).from,
  );
  const [toDate, setToDate] = useState(
    () => defaultReceptionVisitWindow(7).to,
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (fromDate) params.set("from", fromDate);
      if (toDate) params.set("to", toDate);
      const res = await fetch(`/api/staff/feedback?${params.toString()}`);
      const data = (await res.json()) as {
        feedback?: GuestFeedbackRow[];
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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate]);

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
            Reception desk
          </h1>
          <p className="mt-1 text-abai-muted">
            Recent guest feedback by visit date · {countLabel}
          </p>
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
          <span className="font-medium text-abai-navy">Visit from</span>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="block min-h-10 rounded-lg border border-abai-navy/15 px-3"
          />
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium text-abai-navy">Visit to</span>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="block min-h-10 rounded-lg border border-abai-navy/15 px-3"
          />
        </label>
        <button
          type="button"
          onClick={() => {
            const next = defaultReceptionVisitWindow(7);
            setFromDate(next.from);
            setToDate(next.to);
          }}
          className="min-h-10 rounded-lg border border-abai-navy/20 px-4 text-sm font-medium text-abai-navy hover:bg-white"
        >
          Last 7 days
        </button>
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
              <th className="px-3 py-3 font-medium">Visit date</th>
              <th className="px-3 py-3 font-medium">Guest</th>
              <th className="px-3 py-3 font-medium">Phone</th>
              <th className="px-3 py-3 font-medium">Overall</th>
              <th className="px-3 py-3 font-medium">Recommend</th>
              <th className="px-3 py-3 font-medium">Comment</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && !loading ? (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-abai-muted">
                  No feedback in this visit-date range.
                </td>
              </tr>
            ) : null}
            {rows.map((row) => {
              const overall = overallForRow(row);
              return (
                <tr
                  key={row.id}
                  className="border-t border-abai-navy/10 align-top"
                >
                  <td className="whitespace-nowrap px-3 py-3 text-abai-muted">
                    {formatDate(row.created_at)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-abai-ink">
                    {visitDateLabel(row)}
                  </td>
                  <td className="px-3 py-3 font-medium text-abai-ink">
                    {row.guest_name.trim() ? (
                      row.guest_name
                    ) : (
                      <span className="font-normal text-abai-muted">—</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3">
                    {row.phone.trim() ? (
                      row.phone
                    ) : (
                      <span className="text-abai-muted">—</span>
                    )}
                  </td>
                  <td className={`px-3 py-3 ${scoreTone(overall)}`}>
                    {overall == null ? "—" : String(overall)}
                  </td>
                  <td className="px-3 py-3 capitalize">
                    {recommendLabelForRow(row)}
                  </td>
                  <td className="px-3 py-3">
                    <TextCell text={row.comment} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
