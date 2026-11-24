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

/** Abai brand colours for PDF (navy / gold / cream). */
const ABAI_NAVY: [number, number, number] = [22, 17, 65];
const ABAI_GOLD: [number, number, number] = [209, 167, 69];
const ABAI_CREAM: [number, number, number] = [247, 244, 236];
const ABAI_MUTED: [number, number, number] = [92, 88, 112];

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
    row.spa_experience == null ? "" : String(row.spa_experience),
    row.recreational_leisure == null ? "" : String(row.recreational_leisure),
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
  "Spa",
  "Leisure",
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
  workbook.creator = "Abai Lodges & Spa";
  const analytics = computeStaffAnalytics(rows);
  const firstVisit = firstVisitYesCount(rows);

  const summary = workbook.addWorksheet("Summary");
  summary.addRow(["Abai Lodges & Spa — Guest feedback summary"]);
  summary.addRow(["Exclusivity Redefined"]);
  summary.addRow(["Date range", dateRangeLabel(rows, meta.from, meta.to)]);
  summary.addRow(["Total responses", analytics.total]);
  summary.addRow([
    "Overall average (out of 5)",
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
  summary.addRow(["Category", "Average (out of 5)", "Responses"]);
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
  summary.getRow(1).font = { bold: true, color: { argb: "FF161141" }, size: 14 };
  summary.getRow(2).font = { italic: true, color: { argb: "FFD1A745" } };
  summary.columns = [{ width: 36 }, { width: 18 }, { width: 14 }];

  const sheet = workbook.addWorksheet("Responses");
  sheet.addRow(HEADERS);
  for (const row of rows) {
    sheet.addRow(rowCells(row));
  }
  sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  sheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF161141" },
  };
  sheet.columns.forEach((col) => {
    col.width = 14;
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return buffer as ArrayBuffer;
}

/**
 * Abai-branded PDF summary:
 * navy/gold header band, cream accents, category averages out of 5.
 */
export function buildPdfBuffer(
  rows: GuestFeedbackRow[],
  meta: ExportMeta = {},
): ArrayBuffer {
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const analytics = computeStaffAnalytics(rows);
  const firstVisit = firstVisitYesCount(rows);

  // Brand header band
  doc.setFillColor(...ABAI_NAVY);
  doc.rect(0, 0, pageWidth, 72, "F");
  doc.setFillColor(...ABAI_GOLD);
  doc.rect(0, 72, pageWidth, 4, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("Abai Lodges & Spa", 40, 32);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...ABAI_GOLD);
  doc.text("Exclusivity Redefined", 40, 48);
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.text("Guest feedback summary", 40, 64);

  doc.setTextColor(...ABAI_NAVY);
  doc.setFontSize(10);
  let y = 100;
  doc.text(`Date range: ${dateRangeLabel(rows, meta.from, meta.to)}`, 40, y);
  y += 16;
  doc.text(
    `Total responses: ${analytics.total} · Overall avg: ${
      analytics.overallAvg == null
        ? "—"
        : `${analytics.overallAvg.toFixed(1)} / 5`
    }`,
    40,
    y,
  );
  y += 16;
  doc.text(
    `First visit yes: ${
      firstVisit.total === 0
        ? "—"
        : `${firstVisit.yesPct}% (${firstVisit.yes}/${firstVisit.total})`
    }`,
    40,
    y,
  );
  y += 16;
  doc.text(
    `Value for money yes: ${
      analytics.valueForMoney.total === 0
        ? "—"
        : `${analytics.valueForMoney.yesPct}% (${analytics.valueForMoney.yes}/${analytics.valueForMoney.total})`
    }`,
    40,
    y,
  );

  autoTable(doc, {
    startY: y + 16,
    head: [["Category", "Average", "Responses"]],
    body: analytics.categories.map((cat) => [
      cat.label,
      cat.average == null ? "—" : `${cat.average.toFixed(1)} / 5`,
      String(cat.count),
    ]),
    styles: {
      fontSize: 9,
      cellPadding: 5,
      textColor: ABAI_NAVY,
      fillColor: ABAI_CREAM,
    },
    headStyles: {
      fillColor: ABAI_NAVY,
      textColor: [255, 255, 255],
      fontStyle: "bold",
    },
    alternateRowStyles: { fillColor: [255, 255, 255] },
    margin: { left: 40, right: 40 },
  });

  const afterCategories =
    // @ts-expect-error jspdf-autotable adds lastAutoTable
    (doc.lastAutoTable?.finalY as number | undefined) ?? 200;

  doc.setTextColor(...ABAI_NAVY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Top praise", 40, afterCategories + 28);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...ABAI_MUTED);
  const praise = topComments(rows, "praise");
  let textY = afterCategories + 44;
  if (praise.length === 0) {
    doc.text("—", 40, textY);
    textY += 14;
  } else {
    for (const line of praise) {
      const wrapped = doc.splitTextToSize(`• ${line}`, 515);
      doc.setTextColor(...ABAI_NAVY);
      doc.text(wrapped, 40, textY);
      textY += wrapped.length * 12 + 4;
    }
  }

  textY += 10;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...ABAI_NAVY);
  doc.text("Top complaints / improvement notes", 40, textY);
  textY += 16;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const complaints = topComments(rows, "complaint");
  if (complaints.length === 0) {
    doc.setTextColor(...ABAI_MUTED);
    doc.text("—", 40, textY);
  } else {
    for (const line of complaints) {
      if (textY > 760) {
        doc.addPage();
        doc.setFillColor(...ABAI_NAVY);
        doc.rect(0, 0, pageWidth, 28, "F");
        doc.setFillColor(...ABAI_GOLD);
        doc.rect(0, 28, pageWidth, 3, "F");
        textY = 48;
      }
      const wrapped = doc.splitTextToSize(`• ${line}`, 515);
      doc.setTextColor(...ABAI_NAVY);
      doc.text(wrapped, 40, textY);
      textY += wrapped.length * 12 + 4;
    }
  }

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i += 1) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(...ABAI_MUTED);
    doc.text(
      "Abai Lodges & Spa · Confidential staff summary",
      40,
      doc.internal.pageSize.getHeight() - 24,
    );
    doc.text(
      `Page ${i} of ${pageCount}`,
      pageWidth - 40,
      doc.internal.pageSize.getHeight() - 24,
      { align: "right" },
    );
  }

  return doc.output("arraybuffer");
}
