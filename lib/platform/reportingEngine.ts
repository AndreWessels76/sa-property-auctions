/**
 * Reporting Engine — CSV exports from verified aggregates.
 * No fabricated rows. PDF/Excel reserved (structured payloads ready).
 */

export type ReportFormat = "csv" | "json";

export function toCsv(
  headers: string[],
  rows: Array<Array<string | number | null | undefined>>,
): string {
  const escape = (v: string | number | null | undefined) => {
    const s = v == null ? "" : String(v);
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  return [headers.map(escape).join(","), ...rows.map((r) => r.map(escape).join(","))].join(
    "\n",
  );
}

export function buildProvinceReportCsv(
  rows: Array<{ province: string; count: number; active: number }>,
): string {
  return toCsv(
    ["province", "total_verified", "active_upcoming_live"],
    rows.map((r) => [r.province, r.count, r.active]),
  );
}

export function buildAgencyReportCsv(
  rows: Array<{
    agency: string;
    active: number;
    completed: number;
    verificationRate: number | null;
    averageQuality: number | null;
  }>,
): string {
  return toCsv(
    [
      "agency",
      "active_auctions",
      "completed_auctions",
      "verification_rate_pct",
      "average_listing_quality",
    ],
    rows.map((r) => [
      r.agency,
      r.active,
      r.completed,
      r.verificationRate,
      r.averageQuality,
    ]),
  );
}

export function buildTownReportCsv(
  rows: Array<{
    town: string;
    province: string | null;
    upcoming: number;
    historical: number;
    averageReserve: number | null;
  }>,
): string {
  return toCsv(
    ["town", "province", "upcoming", "historical", "average_reserve"],
    rows.map((r) => [
      r.town,
      r.province,
      r.upcoming,
      r.historical,
      r.averageReserve,
    ]),
  );
}
