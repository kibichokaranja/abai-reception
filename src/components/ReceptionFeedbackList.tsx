"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CategoryAveragesPanel } from "@/components/CategoryAveragesPanel";
import type { DashboardPermissions } from "@/lib/dashboard-permissions";
import { defaultPermissionsForRole } from "@/lib/dashboard-permissions";
import type { StaffAnalytics } from "@/lib/staff-analytics";
import type { GuestFeedbackRow } from "@/lib/types";
import { defaultReceptionVisitWindow } from "@/lib/visit-date";

export function ReceptionFeedbackList() {
  const router = useRouter();
  const [statsRows, setStatsRows] = useState<GuestFeedbackRow[]>([]);
  const [analytics, setAnalytics] = useState<StaffAnalytics | null>(null);
  const [permissions, setPermissions] = useState<DashboardPermissions>(() =>
    defaultPermissionsForRole("reception"),
  );
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
      const res = await fetch(`/api/staff/feedback?${params.toString()}`, {
        credentials: "include",
        cache: "no-store",
      });
      const data = (await res.json()) as {
        feedback?: GuestFeedbackRow[];
        rowsForStats?: GuestFeedbackRow[];
        analytics?: StaffAnalytics | null;
        permissions?: DashboardPermissions;
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
      // When list is hidden, API puts rows in rowsForStats; analytics still computed.
      setStatsRows(
        (data.rowsForStats && data.rowsForStats.length > 0
          ? data.rowsForStats
          : data.feedback) ?? [],
      );
      setAnalytics(data.analytics ?? null);
      if (data.permissions) {
        setPermissions({
          ...data.permissions,
          // Hard rule: reception never shows the question carousel.
          show_question_carousel: false,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
      setAnalytics(null);
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate]);

  useEffect(() => {
    void load();
  }, [load]);

  const countLabel = useMemo(() => {
    if (loading) return "Loading…";
    const total = analytics?.total ?? statsRows.length;
    return `${total} response${total === 1 ? "" : "s"}`;
  }, [loading, analytics, statsRows.length]);

  async function logout() {
    await fetch("/api/staff/logout", {
      method: "POST",
      credentials: "include",
    });
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-none space-y-6 px-4 py-8 lg:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold text-abai-navy sm:text-4xl">
            Reception desk
          </h1>
          <p className="mt-1 text-abai-muted">
            Category averages by visit date · {countLabel}
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

      {permissions.show_date_filters ? (
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
      ) : null}

      {error ? (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-red-800" role="alert">
          {error}
        </p>
      ) : null}

      {!error && permissions.show_category_averages ? (
        <CategoryAveragesPanel analytics={analytics} loading={loading} />
      ) : null}

      {!error && !permissions.show_category_averages ? (
        <p className="rounded-xl border border-abai-navy/10 bg-white px-4 py-5 text-sm text-abai-muted">
          No dashboard sections are enabled for reception. Ask the owner to
          update visibility on /staff.
        </p>
      ) : null}
    </div>
  );
}
