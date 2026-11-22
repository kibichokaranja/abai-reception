"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CategoryAveragesPanel } from "@/components/CategoryAveragesPanel";
import { StaffAnalyticsSummary } from "@/components/StaffAnalyticsSummary";
import type { DashboardPermissions } from "@/lib/dashboard-permissions";
import { defaultPermissionsForRole } from "@/lib/dashboard-permissions";
import type { StaffAnalytics } from "@/lib/staff-analytics";
import { STAFF_DESK_LABEL, type GuestFeedbackRow } from "@/lib/types";
import { defaultReceptionVisitWindow } from "@/lib/visit-date";

/**
 * Staff desk dashboard (`/reception`).
 * Respects owner-configured dashboard_permissions (except question carousel).
 * Always approved-only feedback.
 */
export function ReceptionFeedbackList() {
  const router = useRouter();
  const [statsRows, setStatsRows] = useState<GuestFeedbackRow[]>([]);
  const [listRows, setListRows] = useState<GuestFeedbackRow[]>([]);
  const [analytics, setAnalytics] = useState<StaffAnalytics | null>(null);
  const [permissions, setPermissions] = useState<DashboardPermissions | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fromDate, setFromDate] = useState(
    () => defaultReceptionVisitWindow(7).from,
  );
  const [toDate, setToDate] = useState(
    () => defaultReceptionVisitWindow(7).to,
  );

  const effective = permissions ?? defaultPermissionsForRole("reception");

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
        headers: { "Cache-Control": "no-cache" },
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
      setListRows(data.feedback ?? []);
      setStatsRows(
        (data.rowsForStats && data.rowsForStats.length > 0
          ? data.rowsForStats
          : data.feedback) ?? [],
      );
      setAnalytics(data.analytics ?? null);
      if (data.permissions) {
        setPermissions({
          ...data.permissions,
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
    return `${total} approved response${total === 1 ? "" : "s"}`;
  }, [loading, analytics, statsRows.length]);

  async function logout() {
    await fetch("/api/staff/logout", {
      method: "POST",
      credentials: "include",
    });
    router.refresh();
  }

  const anySection =
    effective.show_analytics ||
    effective.show_category_averages ||
    effective.show_feedback_list;

  return (
    <div className="mx-auto max-w-none space-y-6 px-4 py-8 lg:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold text-abai-navy sm:text-4xl">
            {STAFF_DESK_LABEL}
          </h1>
          <p className="mt-1 text-abai-muted">
            Approved feedback only · {countLabel}
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

      {effective.show_date_filters ? (
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

      {!error && effective.show_analytics ? (
        <StaffAnalyticsSummary
          analytics={analytics}
          loading={loading}
          lowOnly={false}
        />
      ) : null}

      {!error &&
      effective.show_category_averages &&
      !effective.show_analytics ? (
        <CategoryAveragesPanel analytics={analytics} loading={loading} />
      ) : null}

      {!error && effective.show_feedback_list ? (
        <div className="overflow-x-auto rounded-xl border border-abai-navy/10 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-abai-navy text-white">
              <tr>
                <th className="px-3 py-3 font-medium">Visit</th>
                {effective.show_guest_details ? (
                  <>
                    <th className="px-3 py-3 font-medium">Guest</th>
                    <th className="px-3 py-3 font-medium">Phone</th>
                    <th className="px-3 py-3 font-medium">Room</th>
                  </>
                ) : null}
                <th className="px-3 py-3 font-medium">Overall</th>
                {effective.show_comments ? (
                  <th className="px-3 py-3 font-medium">Comment</th>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {listRows.length === 0 && !loading ? (
                <tr>
                  <td
                    colSpan={
                      2 +
                      (effective.show_guest_details ? 3 : 0) +
                      (effective.show_comments ? 1 : 0)
                    }
                    className="px-3 py-8 text-center text-abai-muted"
                  >
                    No approved feedback in this date range.
                  </td>
                </tr>
              ) : null}
              {listRows.map((row) => (
                <tr key={row.id} className="border-t border-abai-navy/10">
                  <td className="whitespace-nowrap px-3 py-3">
                    {row.visit_date || "—"}
                  </td>
                  {effective.show_guest_details ? (
                    <>
                      <td className="px-3 py-3">
                        {row.guest_name?.trim() || "—"}
                      </td>
                      <td className="px-3 py-3">
                        {row.phone?.trim() || "—"}
                      </td>
                      <td className="px-3 py-3">
                        {row.room_number?.trim() || "—"}
                      </td>
                    </>
                  ) : null}
                  <td className="px-3 py-3">
                    {row.overall_experience ?? row.overall_stay ?? "—"}
                  </td>
                  {effective.show_comments ? (
                    <td className="max-w-[16rem] px-3 py-3">
                      {row.comment?.trim() || "—"}
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {!error && !anySection ? (
        <p className="rounded-xl border border-abai-navy/10 bg-white px-4 py-5 text-sm text-abai-muted">
          No dashboard sections are enabled for {STAFF_DESK_LABEL.toLowerCase()}.
          Ask the owner to update visibility on /staff.
        </p>
      ) : null}
    </div>
  );
}
