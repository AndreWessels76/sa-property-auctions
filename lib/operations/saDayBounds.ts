/**
 * South Africa (Africa/Johannesburg) calendar-day bounds for admin metrics.
 * Server-side only — never use browser-local time for DB counts.
 */

export const OPERATIONS_METRICS_TIMEZONE = "Africa/Johannesburg";

export type SaDayBounds = {
  startIso: string;
  endIso: string;
  dateLabel: string;
};

function saDateParts(date: Date): { y: number; m: number; d: number } {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: OPERATIONS_METRICS_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = fmt.formatToParts(date);
  const y = Number(parts.find((p) => p.type === "year")?.value);
  const m = Number(parts.find((p) => p.type === "month")?.value);
  const d = Number(parts.find((p) => p.type === "day")?.value);
  return { y, m, d };
}

/** Offset in ms for Africa/Johannesburg at the given UTC instant (includes DST rules). */
function saOffsetMs(atUtc: Date): number {
  const utcStr = atUtc.toLocaleString("en-US", { timeZone: "UTC" });
  const saStr = atUtc.toLocaleString("en-US", { timeZone: OPERATIONS_METRICS_TIMEZONE });
  return new Date(saStr).getTime() - new Date(utcStr).getTime();
}

export function saDayBounds(at: Date = new Date()): SaDayBounds {
  const { y, m, d } = saDateParts(at);
  const dateLabel = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

  const noonUtc = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  const offsetMs = saOffsetMs(noonUtc);
  const startUtcMs = Date.UTC(y, m - 1, d, 0, 0, 0) - offsetMs;
  const endUtcMs = startUtcMs + 24 * 60 * 60 * 1000;

  return {
    startIso: new Date(startUtcMs).toISOString(),
    endIso: new Date(endUtcMs).toISOString(),
    dateLabel,
  };
}
