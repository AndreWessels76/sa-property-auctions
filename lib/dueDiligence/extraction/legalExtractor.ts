import type { ExtractionCorpus, FieldEvidence } from "./types";
import { textEvidence } from "./evidenceBuilder";

/**
 * Legal extraction — ONLY when source explicitly mentions facts.
 * Never guess servitudes, restrictions, zoning, rates, title.
 */
export function extractLegalFields(
  corpus: ExtractionCorpus,
  text: string,
): FieldEvidence[] {
  const out: FieldEvidence[] = [];

  const servitude = text.match(
    /\b(servitude|right\s+of\s+way)s?\b[^\n.]{0,100}/i,
  );
  if (servitude) {
    out.push(
      textEvidence("servitudes", servitude[0].trim(), servitude[0], corpus, {
        requireVerification: true,
      }),
    );
  }

  const restrictions = text.match(
    /\b(special\s+conditions?|restrictive\s+conditions?|building\s+line)[^\n.]{0,120}/i,
  );
  if (restrictions) {
    out.push(
      textEvidence(
        "known_restrictions",
        restrictions[0].trim(),
        restrictions[0],
        corpus,
        { requireVerification: true },
      ),
    );
  }

  const zoning = text.match(/\bzoning\s*[:\-]?\s*([A-Za-z0-9][^\n.]{1,60})/i);
  if (zoning) {
    out.push(
      textEvidence("zoning", zoning[1]!.trim(), zoning[0], corpus, {
        requireVerification: true,
      }),
    );
  }

  const occupation = text.match(
    /\b(vacant\s+occupation|tenanted|owner[\s-]occupied|subject\s+to\s+lease)[^\n.]{0,80}/i,
  );
  if (occupation) {
    out.push(
      textEvidence("occupation_status", occupation[0].trim(), occupation[0], corpus, {
        requireVerification: true,
      }),
    );
  }

  const lease = text.match(/\blease\s*(?:agreement|information)?\s*[:\-]?\s*([^\n.]{3,100})/i);
  if (lease) {
    out.push(
      textEvidence("lease_information", lease[0].trim(), lease[0], corpus, {
        requireVerification: true,
      }),
    );
  }

  // Utilities — only explicit
  const utilities: Array<[string, RegExp]> = [
    ["electricity", /\belectricity\b/i],
    ["water_utility", /\bmunicipal\s+water\b|\bwater\s+connection\b/i],
    ["sewerage", /\bsewer(?:age)?\b|\bseptic\b/i],
  ];
  for (const [field, re] of utilities) {
    const m = text.match(re);
    if (m) {
      out.push(
        textEvidence(field, m[0], m[0], corpus, { requireVerification: true }),
      );
    }
  }

  void corpus;
  return out;
}
