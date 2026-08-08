import type { ExtractionCorpus, FieldEvidence } from "./types";
import { structuredEvidence, textEvidence } from "./evidenceBuilder";

const SA_PROVINCES = [
  "Limpopo",
  "Gauteng",
  "Western Cape",
  "Eastern Cape",
  "Northern Cape",
  "Free State",
  "KwaZulu-Natal",
  "Mpumalanga",
  "North West",
];

/**
 * Location extraction — never fabricate municipality / ward.
 */
export function extractLocationFields(
  corpus: ExtractionCorpus,
  text: string,
): FieldEvidence[] {
  const out: FieldEvidence[] = [];
  const push = (e: FieldEvidence | null) => {
    if (e) out.push(e);
  };

  push(structuredEvidence("province", corpus.province, corpus));
  push(structuredEvidence("town", corpus.town, corpus));
  push(structuredEvidence("suburb", corpus.suburb, corpus));
  push(structuredEvidence("street_address", corpus.street_address ?? corpus.address, corpus));
  push(structuredEvidence("postal_code", corpus.postal_code, corpus));

  const has = (f: string) => out.some((e) => e.field === f);

  if (!has("province")) {
    for (const p of SA_PROVINCES) {
      const re = new RegExp(`\\b${p.replace(/\s+/g, "\\s+")}\\b`, "i");
      const m = text.match(re);
      if (m) {
        out.push(textEvidence("province", p, m[0], corpus));
        break;
      }
    }
  }

  // Pattern: "in Benoni SS The Orchards, Crystal Park"
  // Town before SS, suburb after comma
  const benoniStyle = text.match(
    /\bin\s+([A-Za-z][A-Za-z\s-]{1,40}?)\s+SS\s+[^,]+,\s*([A-Za-z][A-Za-z\s-]{1,40})/i,
  );
  if (benoniStyle) {
    if (!has("town")) {
      out.push(textEvidence("town", benoniStyle[1]!.trim(), benoniStyle[0], corpus));
    }
    if (!has("suburb")) {
      out.push(
        textEvidence(
          "suburb",
          benoniStyle[2]!.trim().replace(/[.]$/, ""),
          benoniStyle[0],
          corpus,
        ),
      );
    }
  }

  // "Haenertsburg, Magoebaskloof, Limpopo"
  if (!has("town")) {
    const townMatch = text.match(
      /\bin\s+([A-Za-z][A-Za-z\s-]{1,40}?)(?:,|\s+(?:Magoebaskloof|Limpopo|Gauteng))/i,
    );
    if (townMatch) {
      out.push(textEvidence("town", townMatch[1]!.trim(), townMatch[0], corpus));
    }
  }

  // Explicit municipality — only if source says so (never guess)
  const mun = text.match(/\bmunicipality\s*[:\-]?\s*([A-Za-z][A-Za-z\s-]{2,60})/i);
  if (mun) {
    out.push(textEvidence("municipality", mun[1]!.trim(), mun[0], corpus, {
      requireVerification: true,
    }));
  }

  const ward = text.match(/\bward\s*[:\-]?\s*([0-9]+)/i);
  if (ward) {
    out.push(textEvidence("ward", ward[1]!, ward[0], corpus, {
      requireVerification: true,
    }));
  }

  const postal = text.match(/\b(?:postal\s*code|code)\s*[:\-]?\s*(\d{4})\b/i);
  if (postal && !has("postal_code")) {
    out.push(textEvidence("postal_code", postal[1]!, postal[0], corpus));
  }

  return out;
}
