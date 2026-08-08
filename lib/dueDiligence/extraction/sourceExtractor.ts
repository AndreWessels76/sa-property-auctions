import type {
  CompletenessScore,
  ExtractionCorpus,
  FieldConflict,
  FieldEvidence,
  SourcePriority,
} from "./types";
import { SOURCE_PRIORITY_RANK } from "./types";

/**
 * Conflict detection — never silently choose when sources disagree.
 */
export function detectConflicts(fields: FieldEvidence[]): FieldConflict[] {
  const byField = new Map<string, FieldEvidence[]>();
  for (const f of fields) {
    if (f.value == null) continue;
    const list = byField.get(f.field) ?? [];
    list.push(f);
    byField.set(f.field, list);
  }

  const conflicts: FieldConflict[] = [];
  for (const [field, list] of byField) {
    const unique = new Map<string, FieldEvidence>();
    for (const item of list) {
      const key = String(item.value);
      if (!unique.has(key)) unique.set(key, item);
    }
    if (unique.size <= 1) continue;

    conflicts.push({
      field,
      values: [...unique.values()].map((v) => ({
        value: v.value,
        source: v.source,
        original_text: v.original_text,
        priority: methodToPriority(v.extraction_method),
      })),
      message: "Conflicting source information",
    });
  }
  return conflicts;
}

function methodToPriority(
  method: FieldEvidence["extraction_method"],
): SourcePriority {
  switch (method) {
    case "structured_field":
      return "official_partner_feed";
    case "document_link":
      return "official_auction_document";
    case "geocoder":
      return "trusted_geocoder";
    default:
      return "official_auction_page";
  }
}

/**
 * Evidence priority — never replace stronger with weaker.
 * When conflict exists, keep all and mark conflict; winner for display is highest priority.
 */
export function selectDisplayFields(
  fields: FieldEvidence[],
  conflicts: FieldConflict[],
): FieldEvidence[] {
  const conflictFields = new Set(conflicts.map((c) => c.field));
  const byField = new Map<string, FieldEvidence[]>();
  for (const f of fields) {
    const list = byField.get(f.field) ?? [];
    list.push(f);
    byField.set(f.field, list);
  }

  const selected: FieldEvidence[] = [];
  for (const [field, list] of byField) {
    if (conflictFields.has(field)) {
      // Keep strongest for display but flag conflict
      const ranked = [...list].sort(
        (a, b) =>
          SOURCE_PRIORITY_RANK[methodToPriority(b.extraction_method)] -
          SOURCE_PRIORITY_RANK[methodToPriority(a.extraction_method)],
      );
      const top = ranked[0]!;
      selected.push({
        ...top,
        conflict_with: "Conflicting source information",
        verification_state: "pending_verification",
      });
      continue;
    }
    // Prefer structured over text
    const ranked = [...list].sort(
      (a, b) =>
        SOURCE_PRIORITY_RANK[methodToPriority(b.extraction_method)] -
        SOURCE_PRIORITY_RANK[methodToPriority(a.extraction_method)],
    );
    selected.push(ranked[0]!);
  }
  return selected;
}

const PROPERTY_KEYS = [
  "property_description",
  "property_type",
  "bedrooms",
  "bathrooms",
  "garages",
  "floor_size",
  "erf_size",
  "unit_number",
  "erf_number",
  "portion_number",
  "scheme",
];
const AUCTION_KEYS = [
  "auction_date",
  "auction_time",
  "auction_mode",
  "auction_type",
  "auction_open_at",
  "auction_close_at",
  "viewing",
  "deposit",
  "deposit_percentage",
  "auction_venue",
  "online_auction_url",
  "conditions_of_sale",
  "auction_catalogue",
  "registration_documents",
];
const LOCATION_KEYS = [
  "province",
  "town",
  "suburb",
  "street_address",
  "postal_code",
  "municipality",
  "ward",
  "farm_name",
  "farm_number",
];
const LAND_KEYS = [
  "land_size_hectares",
  "land_size_m2",
  "land_size_source_text",
  "farm_portions",
  "erf_size",
];
const DOCUMENT_KEYS = [
  "conditions_of_sale",
  "auction_catalogue",
  "property_information_pack",
  "registration_documents",
  "title_deed",
  "title_information",
  "rates_information",
  "zoning_documents",
];
const LEGAL_KEYS = [
  "servitudes",
  "known_restrictions",
  "zoning",
  "occupation_status",
  "lease_information",
];
const BUILDING_KEYS = ["floor_size", "garages", "parking"];
const UTILITY_KEYS = ["electricity", "water_utility", "sewerage", "boreholes"];

function pct(present: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((present / total) * 100);
}

export function scoreCompleteness(fields: FieldEvidence[]): CompletenessScore {
  const present = new Set(
    fields.filter((f) => f.value != null && String(f.value).trim() !== "").map((f) => f.field),
  );
  const count = (keys: string[]) => keys.filter((k) => present.has(k)).length;

  const property = pct(count(PROPERTY_KEYS), PROPERTY_KEYS.length);
  const auction = pct(count(AUCTION_KEYS), AUCTION_KEYS.length);
  const location = pct(count(LOCATION_KEYS), LOCATION_KEYS.length);
  const land = pct(count(LAND_KEYS), LAND_KEYS.length);
  const documents = pct(count(DOCUMENT_KEYS), DOCUMENT_KEYS.length);
  const legal = pct(count(LEGAL_KEYS), LEGAL_KEYS.length);
  const building = pct(count(BUILDING_KEYS), BUILDING_KEYS.length);
  const utilities = pct(count(UTILITY_KEYS), UTILITY_KEYS.length);

  const overall = Math.round(
    (property + auction + location + land + documents + legal + building + utilities) / 8,
  );

  return {
    property,
    auction,
    location,
    land,
    documents,
    legal,
    building,
    utilities,
    overall,
  };
}

export function missingKeyFields(fields: FieldEvidence[]): string[] {
  const present = new Set(
    fields.filter((f) => f.value != null && String(f.value).trim() !== "").map((f) => f.field),
  );
  const keys = [
    "bedrooms",
    "bathrooms",
    "property_type",
    "town",
    "province",
    "auction_date",
    "land_size_hectares",
    "conditions_of_sale",
    "municipality",
    "zoning",
    "title_information",
  ];
  return keys.filter((k) => !present.has(k));
}

export function corpusFromProperty(property: {
  title?: string | null;
  description?: string | null;
  features?: string | null;
  viewing_information?: string | null;
  deposit_requirements?: string | null;
  property_type?: string | null;
  province?: string | null;
  town?: string | null;
  suburb?: string | null;
  address?: string | null;
  street_address?: string | null;
  postal_code?: string | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  garages?: number | null;
  erf_size?: number | null;
  floor_size?: number | null;
  auction_date?: string | null;
  auction_time?: string | null;
  auction_venue?: string | null;
  terms_link?: string | null;
  brochure_link?: string | null;
  catalogue_link?: string | null;
  registration_link?: string | null;
  source_name?: string | null;
  source_url?: string | null;
  verification_state?: string | null;
  agricultural_details?: Record<string, unknown> | null;
  source_page_text?: string | null;
}): ExtractionCorpus {
  return { ...property };
}
