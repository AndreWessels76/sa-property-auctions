import type { PropertyDTO } from "@/lib/dto/PropertyDTO";

/**
 * Auction Calendar + ICS export — verified upcoming/live auctions only.
 */

export type CalendarAuctionItem = {
  id: string;
  title: string;
  auctionDate: string;
  auctionTime: string | null;
  province: string | null;
  town: string | null;
  agency: string | null;
  propertyType: string | null;
  venue: string | null;
  url: string;
};

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function toIcsDate(iso: string, time?: string | null): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  if (time && /^\d{1,2}:\d{2}/.test(time)) {
    const [hh, mm] = time.split(":").map((x) => Number(x));
    return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(hh || 0)}${pad(mm || 0)}00`;
  }
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}`;
}

function escapeIcs(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

export function buildCalendarItems(
  properties: PropertyDTO[],
  siteUrl: string,
): CalendarAuctionItem[] {
  return properties
    .filter((p) => p.auction_date)
    .map((p) => ({
      id: p.id,
      title: p.title || "Auction property",
      auctionDate: p.auction_date!,
      auctionTime: p.auction_time,
      province: p.province,
      town: p.town,
      agency: p.auction_agency || p.source_name,
      propertyType: p.property_type,
      venue: p.auction_venue,
      url: `${siteUrl.replace(/\/$/, "")}/properties/${p.id}`,
    }))
    .sort((a, b) => a.auctionDate.localeCompare(b.auctionDate));
}

export function filterCalendarItems(
  items: CalendarAuctionItem[],
  filters: {
    province?: string;
    town?: string;
    agency?: string;
    propertyType?: string;
    from?: string;
    to?: string;
  },
): CalendarAuctionItem[] {
  return items.filter((item) => {
    if (filters.province && item.province !== filters.province) return false;
    if (filters.town && item.town !== filters.town) return false;
    if (
      filters.agency &&
      !(item.agency || "").toLowerCase().includes(filters.agency.toLowerCase())
    ) {
      return false;
    }
    if (filters.propertyType && item.propertyType !== filters.propertyType) {
      return false;
    }
    const day = item.auctionDate.slice(0, 10);
    if (filters.from && day < filters.from) return false;
    if (filters.to && day > filters.to) return false;
    return true;
  });
}

export function toIcsCalendar(
  items: CalendarAuctionItem[],
  calendarName = "SA Property Auctions",
): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//SA Property Auctions//Auction Calendar//EN",
    `X-WR-CALNAME:${escapeIcs(calendarName)}`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];

  for (const item of items) {
    const dt = toIcsDate(item.auctionDate, item.auctionTime);
    if (!dt) continue;
    const allDay = dt.length === 8;
    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${item.id}@sa-property-auctions`);
    lines.push(`DTSTAMP:${toIcsDate(new Date().toISOString())}Z`);
    if (allDay) {
      lines.push(`DTSTART;VALUE=DATE:${dt}`);
    } else {
      lines.push(`DTSTART:${dt}`);
    }
    lines.push(`SUMMARY:${escapeIcs(item.title)}`);
    const desc = [
      item.agency ? `Agency: ${item.agency}` : null,
      item.town || item.province
        ? `Location: ${[item.town, item.province].filter(Boolean).join(", ")}`
        : null,
      item.url,
    ]
      .filter(Boolean)
      .join("\\n");
    lines.push(`DESCRIPTION:${escapeIcs(desc)}`);
    if (item.venue) lines.push(`LOCATION:${escapeIcs(item.venue)}`);
    lines.push(`URL:${item.url}`);
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

export function groupByDay(items: CalendarAuctionItem[]): Record<string, CalendarAuctionItem[]> {
  const out: Record<string, CalendarAuctionItem[]> = {};
  for (const item of items) {
    const day = item.auctionDate.slice(0, 10);
    out[day] = out[day] ?? [];
    out[day].push(item);
  }
  return out;
}
