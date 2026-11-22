import ExcelJS from "exceljs";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import {
  computeStaffAnalytics,
  overallForRow,
  recommendLabelForRow,
} from "@/lib/staff-analytics";
import { firstVisitYesCount } from "@/lib/survey-questions";
import {
  servicesLabelForRow,
  type GuestFeedbackRow,
} from "@/lib/types";
import { formatVisitDate } from "@/lib/visit-date";

function firstVisitLabel(value: boolean | null): string {
  if (value === true) return "Yes";
  if (value === false) return "No";
  return "";
}

function visitLabel(row: GuestFeedbackRow): string {
  const date = row.visit_date ? formatVisitDate(row.visit_date) : "";
  let time = "";
  try {
    time = new Intl.DateTimeFormat("en-KE", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(row.created_at));
  } catch {
    time = "";
  }
  return [date, time].filter(Boolean).join(" ");
}

function topComments(
  rows: GuestFeedbackRow[],
  kind: "praise" | "complaint",
  limit = 5,
): string[] {
  const scored = rows
    .map((row) => {
      const comment = row.comment?.trim() || "";
      if (!comment) return null;
      const overall = overallForRow(row);
      return { comment, overall };
    })
    .filter((x): x is { comment: string; overall: number | null } => x != null);

  if (kind === "praise") {
    return scored
      .filter((x) => x.overall == null || x.overall >= 4)
      .sort((a, b) => (b.overall ?? 0) - (a.overall ?? 0))
      .slice(0, limit)
      .map((x) => x.comment.slice(0, 160));
  }
  return scored
    .filter((x) => x.overall == null || x.overall <= 2.5)
    .sort((a, b) => (a.overall ?? 5) - (b.overall ?? 5))
    .slice(0, limit)
    .map((x) => x.comment.slice(0, 160));
}

function dateRangeLabel(
  rows: GuestFeedbackRow[],
  from?: string | null,
  to?: string | null,
): string {
  if (from || to) {
    return `${from || "…"} → ${to || "…"}`;
  }
  const dates = rows
    .map((r) => r.visit_date)
    .filter(Boolean)
    .sort();
  if (dates.length === 0) return "All dates";
  return `${dates[0]} → ${dates[dates.length - 1]}`;
}

function rowCells(row: GuestFeedbackRow): string[] {
  return [
    visitLabel(row),
    row.guest_name?.trim() || "",
    row.phone?.trim() || "",
    row.room_number?.trim() || "",
    firstVisitLabel(row.first_visit),
    servicesLabelForRow(row) === "—" ? "" : servicesLabelForRow(row),
    overallForRow(row) == null ? "" : String(overallForRow(row)),
    recommendLabelForRow(row) === "—" ? "" : recommendLabelForRow(row),
    row.value_for_money ?? "",
    row.standout_staff_name?.trim() || "",
    row.comment?.trim() || "",
    row.reservation_ease == null ? "" : String(row.reservation_ease),
    row.welcome_check_in == null ? "" : String(row.welcome_check_in),
    row.accommodation_comfort == null ? "" : String(row.accommodation_comfort),
    row.conference_facilities == null ? "" : String(row.conference_facilities),
    row.wifi_quality == null ? "" : String(row.wifi_quality),
    row.recreational_leisure == null ? "" : String(row.recreational_leisure),
    row.spa_experience == null ? "" : String(row.spa_experience),
    row.cleanliness_upkeep == null ? "" : String(row.cleanliness_upkeep),
    row.food_taste_quality == null ? "" : String(row.food_taste_quality),
    row.service_promptness == null ? "" : String(row.service_promptness),
    row.staff_friendliness == null ? "" : String(row.staff_friendliness),
    row.safety_security == null ? "" : String(row.safety_security),
    row.overall_experience == null ? "" : String(row.overall_experience),
    row.recommend_score == null ? "" : String(row.recommend_score),
  ];
}

const HEADERS = [
  "Visit",
  "Name",
  "Phone",
  "Room",
  "First visit",
  "Services",
  "Overall",
  "Recommend",
  "Value",
  "Standout",
  "Comment",
  "Reservation",
  "Welcome",
  "Accommodation",
  "Conference",
  "Wi-Fi",
  "Leisure",
  "Spa",
  "Cleanliness",
  "Food",
  "Service",
  "Staff",
  "Safety",
  "Overall exp",
  "Recommend score",
];

export type ExportMeta = {
  from?: string | null;
  to?: string | null;
};

/** Excel: summary sheet + detail rows (owner export). */
export async function buildExcelBuffer(
  rows: GuestFeedbackRow[],
  meta: ExportMeta = {},
): Promise<ArrayBuffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Abai Staff desk";
  const analytics = computeStaffAnalytics(rows);
  const firstVisit = firstVisitYesCount(rows);

  const summary = workbook.addWorksheet("Summary");
  summary.addRow(["Abai Lodges & Spa — Guest feedback summary"]);
  summary.addRow(["Date range", dateRangeLabel(rows, meta.from, meta.to)]);
  summary.addRow(["Total responses", analytics.total]);
  summary.addRow([
    "Overall average",
    analytics.overallAvg == null ? "—" : analytics.overallAvg,
  ]);
  summary.addRow([
    "First visit yes %",
    firstVisit.total === 0 ? "—" : `${firstVisit.yesPct}% (${firstVisit.yes}/${firstVisit.total})`,
  ]);
  summary.addRow([
    "Value for money yes %",
    analytics.valueForMoney.total === 0
      ? "—"
      : `${analytics.valueForMoney.yesPct}% (${analytics.valueForMoney.yes}/${analytics.valueForMoney.total})`,
  ]);
  summary.addRow([]);
  summary.addRow(["Category", "Average", "Responses"]);
  for (const cat of analytics.categories) {
    summary.addRow([
      cat.label,
      cat.average == null ? "—" : cat.average,
      cat.count,
    ]);
  }
  summary.addRow([]);
  summary.addRow(["Top praise"]);
  for (const line of topComments(rows, "praise")) {
    summary.addRow([line]);
  }
  summary.addRow(["Top complaints / improvement notes"]);
  for (const line of topComments(rows, "complaint")) {
    summary.addRow([line]);
  }
  summary.getRow(1).font = { bold: true };
  summary.columns = [{ width: 36 }, { width: 18 }, { width: 14 }];

  const sheet = workbook.addWorksheet("Responses");
  sheet.addRow(HEADERS);
  for (const row of rows) {
    sheet.addRow(rowCells(row));
  }
  sheet.getRow(1).font = { bold: true };
  sheet.columns.forEach((col) => {
    col.width = 14;
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return buffer as ArrayBuffer;
}

/**
 * PDF choice A — summary report only:
 * date range, totals, category averages, first-visit / value yes %, top complaints/praise.
 */
export function buildPdfBuffer(
  rows: GuestFeedbackRow[],
  meta: ExportMeta = {},
): ArrayBuffer {
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  const analytics = computeStaffAnalytics(rows);
  const firstVisit = firstVisitYesCount(rows);

  doc.setFontSize(16);
  doc.text("Abai Lodges & Spa — Feedback summary", 40, 40);
  doc.setFontSize(10);
  doc.text(`Date range: ${dateRangeLabel(rows, meta.from, meta.to)}`, 40, 60);
  doc.text(
    `Total responses: ${analytics.total} · Overall avg: ${
      analytics.overallAvg == null ? "—" : analytics.overallAvg.toFixed(1)
    }`,
    40,
    76,
  );
  doc.text(
    `First visit yes: ${
      firstVisit.total === 0
        ? "—"
        : `${firstVisit.yesPct}% (${firstVisit.yes}/${firstVisit.total})`
    }`,
    40,
    92,
  );
  doc.text(
    `Value for money yes: ${
      analytics.valueForMoney.total === 0
        ? "—"
        : `${analytics.valueForMoney.yesPct}% (${analytics.valueForMoney.yes}/${analytics.valueForMoney.total})`
    }`,
    40,
    108,
  );

  autoTable(doc, {
    startY: 124,
    head: [["Category", "Average", "Responses"]],
    body: analytics.categories.map((cat) => [
      cat.label,
      cat.average == null ? "—" : cat.average.toFixed(1),
      String(cat.count),
    ]),
    styles: { fontSize: 9, cellPadding: 4 },
    headStyles: { fillColor: [26, 43, 74] },
    margin: { left: 40, right: 40 },
  });

  const afterCategories =
    // @ts-expect-error jspdf-autotable adds lastAutoTable
    (doc.lastAutoTable?.finalY as number | undefined) ?? 200;

  doc.setFontSize(12);
  doc.text("Top praise", 40, afterCategories + 28);
  doc.setFontSize(9);
  const praise = topComments(rows, "praise");
  let y = afterCategories + 44;
  if (praise.length === 0) {
    doc.text("—", 40, y);
    y += 14;
  } else {
    for (const line of praise) {
      const wrapped = doc.splitTextToSize(`• ${line}`, 515);
      doc.text(wrapped, 40, y);
      y += wrapped.length * 12 + 4;
    }
  }

  y += 10;
  doc.setFontSize(12);
  doc.text("Top complaints / improvement notes", 40, y);
  y += 16;
  doc.setFontSize(9);
  const complaints = topComments(rows, "complaint");
  if (complaints.length === 0) {
    doc.text("—", 40, y);
  } else {
    for (const line of complaints) {
      if (y > 760) {
        doc.addPage();
        y = 40;
      }
      const wrapped = doc.splitTextToSize(`• ${line}`, 515);
      doc.text(wrapped, 40, y);
      y += wrapped.length * 12 + 4;
    }
  }

  return doc.output("arraybuffer");
}
