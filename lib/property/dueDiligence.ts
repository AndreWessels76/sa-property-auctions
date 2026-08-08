import type { PropertyDTO } from "@/lib/dto/PropertyDTO";
import { buildDocumentLinks } from "@/lib/property/detailExperience";
import {
  corpusFromProperty,
  displayStatusLabel,
  isPresentStatus,
  runDueDiligenceExtraction,
  toDisplayStatus,
  type CompletenessScore,
  type DiligenceDisplayStatus,
  type DocumentDiscovery,
  type ExtractionResult,
  type FieldConflict,
  type FieldEvidence,
} from "@/lib/dueDiligence/extraction";

/**
 * Due Diligence Centre — verified / source-confirmed / extracted / not-supplied.
 * Never fabricates zoning, rates, servitudes, or legal facts.
 */

export type DiligenceStatus = DiligenceDisplayStatus;

/** @deprecated use DiligenceDisplayStatus — kept for gradual migration */
export type LegacyDiligenceStatus =
  | "verified"
  | "unavailable"
  | "pending_verification";

export type DiligenceItem = {
  key: string;
  label: string;
  status: DiligenceStatus;
  value: string | null;
  statusLabel: string;
  evidence?: FieldEvidence | null;
  group:
    | "property"
    | "auction"
    | "title"
    | "land"
    | "building"
    | "municipality"
    | "occupation"
    | "legal"
    | "utilities"
    | "risk"
    | "documents"
    | "location";
};

export type DueDiligenceCentre = {
  propertyId: string;
  generatedAt: string;
  items: DiligenceItem[];
  outstanding: string[];
  summary: {
    verifiedCount: number;
    sourceConfirmedCount: number;
    extractedCount: number;
    notSuppliedCount: number;
    notFoundCount: number;
    pendingCount: number;
    /** @deprecated — maps to notSupplied + notFound for older UI */
    unavailableCount: number;
  };
  completeness: CompletenessScore;
  extraction: ExtractionResult;
  conflicts: FieldConflict[];
  documents: DocumentDiscovery[];
  importantMissing: string[];
};

function fieldMap(fields: FieldEvidence[]): Map<string, FieldEvidence> {
  return new Map(fields.map((f) => [f.field, f]));
}

function fromEvidence(
  key: string,
  label: string,
  group: DiligenceItem["group"],
  evidence: FieldEvidence | undefined,
  fallbackStatus: DiligenceStatus = "not_supplied",
): DiligenceItem {
  if (!evidence || evidence.value == null || String(evidence.value).trim() === "") {
    const status = fallbackStatus;
    return {
      key,
      label,
      group,
      value: null,
      status,
      statusLabel: displayStatusLabel(status),
      evidence: null,
    };
  }
  const status = toDisplayStatus(evidence.verification_state);
  let value = String(evidence.value);
  if (evidence.approximate) {
    value = `±${value}${evidence.normalized?.hectares != null && evidence.field.includes("hectare") ? " ha" : ""}`;
  }
  if (evidence.conflict_with) {
    return {
      key,
      label,
      group,
      value: `${value} — Conflicting source information`,
      status: "pending_verification",
      statusLabel: displayStatusLabel("pending_verification"),
      evidence,
    };
  }
  return {
    key,
    label,
    group,
    value,
    status,
    statusLabel: displayStatusLabel(status),
    evidence,
  };
}

function notSupplied(
  key: string,
  label: string,
  group: DiligenceItem["group"],
): DiligenceItem {
  return fromEvidence(key, label, group, undefined, "not_supplied");
}

export function buildDueDiligenceCentre(
  property: PropertyDTO,
  opts?: { source_page_text?: string | null },
): DueDiligenceCentre {
  const corpus = corpusFromProperty({
    ...property,
    agricultural_details: property.agricultural_details as Record<
      string,
      unknown
    > | null,
    source_page_text: opts?.source_page_text ?? null,
  });

  const extraction = runDueDiligenceExtraction(corpus);
  const map = fieldMap(extraction.fields);
  const docs = buildDocumentLinks(property);
  const listingPending = property.verification_state === "pending_verification";

  const items: DiligenceItem[] = [
    // Property
    fromEvidence("property_type", "Property type", "property", map.get("property_type")),
    fromEvidence("bedrooms", "Bedrooms", "property", map.get("bedrooms")),
    fromEvidence("bathrooms", "Bathrooms", "property", map.get("bathrooms")),
    fromEvidence("garages", "Garages", "property", map.get("garages")),
    fromEvidence("parking", "Parking", "property", map.get("parking")),
    fromEvidence("unit_number", "Unit number", "property", map.get("unit_number")),
    fromEvidence("scheme", "Sectional title scheme", "property", map.get("scheme")),
    fromEvidence("erf_number", "Erf number", "property", map.get("erf_number")),
    fromEvidence("portion_number", "Portion", "property", map.get("portion_number")),
    fromEvidence(
      "description",
      "Property description",
      "property",
      map.get("property_description") ??
        (property.description
          ? {
              field: "property_description",
              value: property.description.slice(0, 200),
              original_text: property.description.slice(0, 200),
              source: property.source_name,
              source_url: property.source_url,
              extraction_method: "structured_field",
              extracted_at: extraction.extracted_at,
              verification_state: listingPending
                ? "pending_verification"
                : property.verification_state === "verified"
                  ? "verified"
                  : "source_confirmed",
            }
          : undefined),
    ),

    // Auction
    fromEvidence("auction_type", "Auction type", "auction", map.get("auction_type")),
    fromEvidence("auction_mode", "Online / On-site / Hybrid", "auction", map.get("auction_mode")),
    fromEvidence("auction_date", "Auction date", "auction", map.get("auction_date")),
    fromEvidence("auction_time", "Auction time", "auction", map.get("auction_time")),
    fromEvidence("auction_open_at", "Auction opening", "auction", map.get("auction_open_at")),
    fromEvidence("auction_close_at", "Auction closing", "auction", map.get("auction_close_at")),
    fromEvidence("viewing", "Viewing", "auction", map.get("viewing")),
    fromEvidence("deposit", "Deposit", "auction", map.get("deposit")),
    fromEvidence(
      "deposit_percentage",
      "Deposit percentage",
      "auction",
      map.get("deposit_percentage"),
    ),
    fromEvidence("auction_venue", "Venue", "auction", map.get("auction_venue")),
    fromEvidence(
      "online_auction_url",
      "Online auction URL",
      "auction",
      map.get("online_auction_url"),
    ),
    fromEvidence(
      "registration",
      "Registration",
      "auction",
      map.get("registration_documents") ??
        (property.registration_link
          ? {
              field: "registration_documents",
              value: property.registration_link,
              original_text: property.registration_link,
              source: property.source_name,
              source_url: property.source_url,
              extraction_method: "document_link",
              extracted_at: extraction.extracted_at,
              verification_state: "verified",
            }
          : undefined),
    ),
    fromEvidence(
      "conditions_of_sale",
      "Conditions of sale",
      "auction",
      map.get("conditions_of_sale"),
    ),
    fromEvidence(
      "auction_catalogue",
      "Auction catalogue / rules",
      "auction",
      map.get("auction_catalogue") ?? map.get("property_information_pack"),
    ),

    // Land
    fromEvidence(
      "land_size_source_text",
      "Land size (source text)",
      "land",
      map.get("land_size_source_text"),
    ),
    fromEvidence(
      "land_size_hectares",
      "Land size (hectares)",
      "land",
      map.get("land_size_hectares"),
    ),
    fromEvidence("land_size_m2", "Land size (m²)", "land", map.get("land_size_m2")),
    fromEvidence(
      "erf_size",
      "Erf / land size (m² structured)",
      "land",
      map.get("erf_size"),
    ),
    fromEvidence("farm_name", "Farm name", "land", map.get("farm_name")),
    fromEvidence("farm_number", "Farm number", "land", map.get("farm_number")),
    fromEvidence("farm_portions", "Farm portions", "land", map.get("farm_portions")),

    // Location
    fromEvidence("province", "Province", "location", map.get("province")),
    fromEvidence("town", "Town", "location", map.get("town")),
    fromEvidence("suburb", "Suburb", "location", map.get("suburb")),
    fromEvidence("street_address", "Street address", "location", map.get("street_address")),
    fromEvidence("postal_code", "Postal code", "location", map.get("postal_code")),

    // Municipality — never fabricate
    fromEvidence("municipality", "Municipality", "municipality", map.get("municipality")),
    fromEvidence("ward", "Ward", "municipality", map.get("ward")),
    fromEvidence("zoning", "Zoning", "municipality", map.get("zoning")),
    notSupplied("rates", "Rates information", "municipality"),

    // Title / legal — never fabricate
    notSupplied("title_info", "Title information", "title"),
    fromEvidence("servitudes", "Servitudes", "legal", map.get("servitudes")),
    fromEvidence(
      "restrictions",
      "Known restrictions",
      "legal",
      map.get("known_restrictions"),
    ),

    // Occupation
    fromEvidence(
      "occupation",
      "Occupation status",
      "occupation",
      map.get("occupation_status"),
    ),
    fromEvidence("lease", "Lease information", "occupation", map.get("lease_information")),

    // Building
    fromEvidence("building_size", "Building / floor size (m²)", "building", map.get("floor_size")),

    // Utilities
    fromEvidence("electricity", "Electricity", "utilities", map.get("electricity")),
    fromEvidence("water_utility", "Water", "utilities", map.get("water_utility")),
    fromEvidence("sewerage", "Sewerage", "utilities", map.get("sewerage")),
    fromEvidence("boreholes", "Borehole", "utilities", map.get("boreholes")),

    // Risk
    notSupplied("risk_notices", "Risk notices", "risk"),
  ];

  for (const d of docs) {
    items.push({
      key: `doc_${d.kind}`,
      label: d.label,
      group: "documents",
      value: d.href,
      status: "verified",
      statusLabel: displayStatusLabel("verified"),
      evidence: null,
    });
  }

  if (docs.length === 0 && extraction.documents.length === 0) {
    items.push({
      key: "documents_none",
      label: "Legal / auction documents",
      group: "documents",
      value: null,
      status: "not_supplied",
      statusLabel: displayStatusLabel("not_supplied"),
      evidence: null,
    });
  }

  for (const doc of extraction.documents) {
    if (items.some((i) => i.value === doc.url)) continue;
    items.push({
      key: `discovered_${doc.document_type.replace(/\s+/g, "_").toLowerCase()}`,
      label: doc.document_type,
      group: "documents",
      value: doc.url,
      status: toDisplayStatus(doc.verification_state),
      statusLabel: displayStatusLabel(toDisplayStatus(doc.verification_state)),
      evidence: null,
    });
  }

  const outstanding = items
    .filter((i) => !isPresentStatus(i.status))
    .map((i) => i.label);

  const importantMissing = [
    "Title information",
    "Municipality",
    "Zoning",
    "Rates information",
    "Servitudes",
  ].filter((label) =>
    items.some((i) => i.label === label && !isPresentStatus(i.status)),
  );

  const summary = {
    verifiedCount: items.filter((i) => i.status === "verified").length,
    sourceConfirmedCount: items.filter((i) => i.status === "source_confirmed").length,
    extractedCount: items.filter((i) => i.status === "extracted").length,
    notSuppliedCount: items.filter((i) => i.status === "not_supplied").length,
    notFoundCount: items.filter((i) => i.status === "not_found").length,
    pendingCount: items.filter((i) => i.status === "pending_verification").length,
    unavailableCount: 0,
  };
  summary.unavailableCount =
    summary.notSuppliedCount + summary.notFoundCount;

  return {
    propertyId: property.id,
    generatedAt: new Date().toISOString(),
    items,
    outstanding,
    summary,
    completeness: extraction.completeness,
    extraction,
    conflicts: extraction.conflicts,
    documents: extraction.documents,
    importantMissing,
  };
}
