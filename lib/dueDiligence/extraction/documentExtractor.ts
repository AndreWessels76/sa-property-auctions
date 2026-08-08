import type { DocumentDiscovery, ExtractionCorpus, FieldEvidence } from "./types";
import { textEvidence } from "./evidenceBuilder";

type DocSpec = {
  field: string;
  document_type: string;
  url: string | null | undefined;
};

/**
 * Document discovery from structured links + explicit URLs in text.
 */
export function extractDocuments(
  corpus: ExtractionCorpus,
  text: string,
): { documents: DocumentDiscovery[]; fields: FieldEvidence[] } {
  const now = new Date().toISOString();
  const documents: DocumentDiscovery[] = [];
  const fields: FieldEvidence[] = [];
  const seen = new Set<string>();

  const specs: DocSpec[] = [
    { field: "conditions_of_sale", document_type: "Conditions of Sale", url: corpus.terms_link },
    { field: "auction_catalogue", document_type: "Auction Catalogue", url: corpus.catalogue_link },
    {
      field: "property_information_pack",
      document_type: "Property Information Pack",
      url: corpus.brochure_link,
    },
    {
      field: "registration_documents",
      document_type: "Registration Documents",
      url: corpus.registration_link,
    },
  ];

  for (const spec of specs) {
    if (!spec.url?.trim()) continue;
    const url = spec.url.trim();
    if (seen.has(url)) continue;
    seen.add(url);
    const file_type = guessFileType(url);
    documents.push({
      url,
      document_type: spec.document_type,
      source: corpus.source_name ?? null,
      discovered_at: now,
      availability: "available",
      file_type,
      verification_state:
        corpus.verification_state === "verified" ? "verified" : "source_confirmed",
    });
    fields.push(
      textEvidence(spec.field, url, url, corpus),
    );
  }

  // Discover typed links in free text
  const linkPatterns: Array<[string, string, RegExp]> = [
    ["title_deed", "Title Deed", /title\s*deed[^<\n]{0,40}((?:https?:\/\/)[^\s<"']+)/i],
    ["title_information", "Title Information", /title\s*information[^<\n]{0,40}((?:https?:\/\/)[^\s<"']+)/i],
    ["rates_information", "Rates Information", /rates[^<\n]{0,40}((?:https?:\/\/)[^\s<"']+)/i],
    ["zoning_documents", "Zoning Documents", /zoning[^<\n]{0,40}((?:https?:\/\/)[^\s<"']+)/i],
    ["lease_documents", "Lease Documents", /lease[^<\n]{0,40}((?:https?:\/\/)[^\s<"']+)/i],
    [
      "conditions_of_sale",
      "Conditions of Sale",
      /conditions?\s+of\s+sale[^<\n]{0,40}((?:https?:\/\/)[^\s<"']+)/i,
    ],
    [
      "auction_catalogue",
      "Auction Catalogue",
      /(?:auction\s+)?catalogue[^<\n]{0,40}((?:https?:\/\/)[^\s<"']+)/i,
    ],
  ];

  for (const [field, docType, re] of linkPatterns) {
    const m = text.match(re);
    if (!m?.[1]) continue;
    const url = m[1];
    if (seen.has(url)) continue;
    seen.add(url);
    documents.push({
      url,
      document_type: docType,
      source: corpus.source_name ?? null,
      discovered_at: now,
      availability: "available",
      file_type: guessFileType(url),
      verification_state: "extracted_not_yet_verified",
    });
    if (!fields.some((f) => f.field === field)) {
      fields.push(textEvidence(field, url, m[0], corpus, { requireVerification: true }));
    }
  }

  return { documents, fields };
}

function guessFileType(url: string): string | null {
  const lower = url.toLowerCase();
  if (lower.includes(".pdf")) return "pdf";
  if (lower.includes(".doc")) return "doc";
  if (lower.includes(".xls")) return "xls";
  if (lower.includes(".jpg") || lower.includes(".jpeg") || lower.includes(".png")) {
    return "image";
  }
  return null;
}
