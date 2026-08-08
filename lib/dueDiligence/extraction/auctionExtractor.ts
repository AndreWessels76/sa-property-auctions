import type { ExtractionCorpus, FieldEvidence } from "./types";
import { structuredEvidence, textEvidence } from "./evidenceBuilder";

const MONTHS: Record<string, number> = {
  jan: 1,
  january: 1,
  feb: 2,
  february: 2,
  mar: 3,
  march: 3,
  apr: 4,
  april: 4,
  may: 5,
  jun: 6,
  june: 6,
  jul: 7,
  july: 7,
  aug: 8,
  august: 8,
  sep: 9,
  sept: 9,
  september: 9,
  oct: 10,
  october: 10,
  nov: 11,
  november: 11,
  dec: 12,
  december: 12,
};

function toIsoDate(day: number, month: number, year: number): string | null {
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const y = year;
  const m = String(month).padStart(2, "0");
  const d = String(day).padStart(2, "0");
  const iso = `${y}-${m}-${d}`;
  const dt = new Date(`${iso}T12:00:00Z`);
  if (Number.isNaN(dt.getTime())) return null;
  return iso;
}

function parseDayMonth(
  dayStr: string,
  monthStr: string,
  yearHint?: number,
): string | null {
  const day = Number(dayStr);
  const month = MONTHS[monthStr.toLowerCase()];
  if (!month || !Number.isFinite(day)) return null;
  const year = yearHint ?? new Date().getFullYear();
  return toIsoDate(day, month, year);
}

/**
 * Auction extraction — open/close periods preserved (never collapse incorrectly).
 */
export function extractAuctionFields(
  corpus: ExtractionCorpus,
  text: string,
): FieldEvidence[] {
  const out: FieldEvidence[] = [];
  const push = (e: FieldEvidence | null) => {
    if (e) out.push(e);
  };

  push(structuredEvidence("auction_date", corpus.auction_date, corpus));
  push(structuredEvidence("auction_time", corpus.auction_time, corpus));
  push(structuredEvidence("auction_venue", corpus.auction_venue, corpus));
  push(structuredEvidence("deposit", corpus.deposit_requirements, corpus));
  push(structuredEvidence("viewing", corpus.viewing_information, corpus));

  // Online / on-site / hybrid
  if (/\bhybrid\b/i.test(text)) {
    const m = text.match(/\bhybrid\b/i)!;
    out.push(textEvidence("auction_mode", "Hybrid", m[0], corpus));
  } else if (/\bon[\s-]?site\b|\bin[\s-]?person\b|\blive\s+auction\b/i.test(text)) {
    const m = text.match(/\bon[\s-]?site\b|\bin[\s-]?person\b|\blive\s+auction\b/i)!;
    out.push(textEvidence("auction_mode", "On-site", m[0], corpus));
  } else if (/\bonline\s+auction\b|\bonline\b/i.test(text) || /\bonline\b/i.test(corpus.title ?? "")) {
    const m =
      text.match(/\bonline\s+auction\b|\bonline\b/i) ??
      (corpus.title ?? "").match(/\bonline\b/i);
    if (m) out.push(textEvidence("auction_mode", "Online", m[0], corpus));
  }

  // Auction type
  if (/\binsolvent\s+estate\b/i.test(text)) {
    const m = text.match(/\binsolvent\s+estate\b/i)!;
    out.push(textEvidence("auction_type", "Insolvent Estate", m[0], corpus));
  } else if (/\bdeceased\s+estate\b/i.test(text)) {
    const m = text.match(/\bdeceased\s+estate\b/i)!;
    out.push(textEvidence("auction_type", "Deceased Estate", m[0], corpus));
  } else if (/\bonline\s+auction\b/i.test(text) || /\bonline\s+auction\b/i.test(corpus.title ?? "")) {
    const m =
      text.match(/\bonline\s+auction\b/i) ??
      (corpus.title ?? "").match(/\bonline\s+auction\b/i);
    if (m) out.push(textEvidence("auction_type", "Online Auction", m[0], corpus));
  }

  // Open Aug 11, close Aug 12. / Opens 11 August, closes 12 August
  const yearHintMatch = text.match(/\b(20\d{2})\b/);
  const yearHint = yearHintMatch ? Number(yearHintMatch[1]) : undefined;

  const openClose = text.match(
    /open(?:s|ing)?\s+(?:on\s+)?(\d{1,2})\s*([A-Za-z]+)\s*(?:20\d{2})?[,;\s]+(?:and\s+)?clos(?:e|es|ing)\s+(?:on\s+)?(\d{1,2})\s*([A-Za-z]+)/i,
  );
  if (openClose) {
    const openIso = parseDayMonth(openClose[1]!, openClose[2]!, yearHint);
    const closeIso = parseDayMonth(openClose[3]!, openClose[4]!, yearHint);
    if (openIso) {
      out.push(
        textEvidence("auction_open_at", openIso, openClose[0], corpus, {
          normalized: { auction_open_at: openIso },
        }),
      );
    }
    if (closeIso) {
      out.push(
        textEvidence("auction_close_at", closeIso, openClose[0], corpus, {
          normalized: { auction_close_at: closeIso },
        }),
      );
    }
  } else {
    // Shorter: "Open Aug 11, close Aug 12"
    const short = text.match(
      /open\s+([A-Za-z]+)\s+(\d{1,2}).{0,40}?close\s+([A-Za-z]+)\s+(\d{1,2})/i,
    );
    if (short) {
      const openIso = parseDayMonth(short[2]!, short[1]!, yearHint);
      const closeIso = parseDayMonth(short[4]!, short[3]!, yearHint);
      if (openIso) {
        out.push(textEvidence("auction_open_at", openIso, short[0], corpus));
      }
      if (closeIso) {
        out.push(textEvidence("auction_close_at", closeIso, short[0], corpus));
      }
    }
  }

  // Deposit percentage
  const depPct = text.match(/(\d+(?:\.\d+)?)\s*%\s*(?:deposit|of\s+(?:the\s+)?purchase)/i);
  if (depPct) {
    const n = Number(depPct[1]);
    if (Number.isFinite(n) && n > 0 && n <= 100) {
      out.push(textEvidence("deposit_percentage", n, depPct[0], corpus));
    }
  }

  // Registration closing
  const regClose = text.match(
    /registration\s+(?:clos(?:e|es|ing)|deadline)\s*[:\-]?\s*([^\n.]{3,80})/i,
  );
  if (regClose) {
    out.push(textEvidence("registration_closing", regClose[1]!.trim(), regClose[0], corpus));
  }

  // Viewing date/time
  const viewing = text.match(
    /viewing\s*[:\-]?\s*([^\n.]{3,120})/i,
  );
  if (viewing && !out.some((e) => e.field === "viewing")) {
    out.push(textEvidence("viewing", viewing[1]!.trim(), viewing[0], corpus));
  }

  // Online auction URL (explicit http)
  const onlineUrl = text.match(
    /(?:bid|auction|register)\s*(?:at|via|url)?\s*[:\-]?\s*((?:https?:\/\/)[^\s<"']+)/i,
  );
  if (onlineUrl) {
    out.push(textEvidence("online_auction_url", onlineUrl[1]!, onlineUrl[0], corpus));
  }

  return out;
}
