import type { PropertyDTO } from "@/lib/dto/PropertyDTO";
import type { AuctionIntelligencePanel } from "@/lib/property/auctionIntelligence";
import type { TimelineEvent } from "@/lib/property/propertyTimeline";
import { buildDocumentLinks } from "@/lib/property/detailExperience";
import { resolveAuctionAgency } from "@/lib/auction/agencyDisplay";
import type { DueDiligenceCentre } from "@/lib/property/dueDiligence";
import { isPresentStatus } from "@/lib/dueDiligence/extraction";

/**
 * Auction Research Report — verified / source-confirmed fields only.
 * Uses Due Diligence extraction when provided. Never fabricates.
 */

export type ResearchFieldStatus =
  | "verified"
  | "unavailable"
  | "pending_verification"
  | "source_confirmed"
  | "extracted"
  | "not_supplied";

export type ResearchField = {
  label: string;
  value: string | null;
  status: ResearchFieldStatus;
};

export type AuctionResearchReport = {
  generatedAt: string;
  version: string;
  propertyId: string;
  executiveSummary: string;
  propertySnapshot: ResearchField[];
  auctionInformation: ResearchField[];
  landInformation: ResearchField[];
  classification: ResearchField[];
  ownership: ResearchField[];
  timeline: TimelineEvent[];
  locationOverview: ResearchField[];
  agencyInformation: ResearchField[];
  documents: Array<{ label: string; href: string | null; status: ResearchFieldStatus }>;
  verificationStatus: ResearchField[];
  provenance: ResearchField[];
  missingInformation: string[];
  evidenceNotes: string[];
  intelligenceSummary: {
    listingQualityPercent: number | null;
    verificationConfidence: string | null;
    comparableConfidence: string | null;
    areaActivity: string | null;
    completenessOverall: number | null;
    notes: string[];
  };
  exportHints: {
    printReady: boolean;
    sharePath: string;
    pdfReserved: true;
  };
};

function field(
  label: string,
  value: string | number | null | undefined,
  status?: ResearchFieldStatus,
): ResearchField {
  if (value == null || String(value).trim() === "") {
    return {
      label,
      value: null,
      status: status ?? "not_supplied",
    };
  }
  return {
    label,
    value: String(value),
    status: status ?? "verified",
  };
}

function fromDd(
  centre: DueDiligenceCentre | undefined,
  key: string,
  label: string,
): ResearchField {
  const item = centre?.items.find((i) => i.key === key);
  if (!item || !isPresentStatus(item.status)) {
    return field(
      label,
      null,
      item?.status === "pending_verification"
        ? "pending_verification"
        : "not_supplied",
    );
  }
  const status: ResearchFieldStatus =
    item.status === "verified"
      ? "verified"
      : item.status === "source_confirmed"
        ? "source_confirmed"
        : item.status === "extracted"
          ? "extracted"
          : "pending_verification";
  return field(label, item.value, status);
}

export function buildAuctionResearchReport(input: {
  property: PropertyDTO;
  timeline: TimelineEvent[];
  intelligence?: AuctionIntelligencePanel | null;
  comparableCount?: number;
  siteUrl?: string;
  dueDiligence?: DueDiligenceCentre | null;
}): AuctionResearchReport {
  const p = input.property;
  const dd = input.dueDiligence ?? undefined;
  const agency = resolveAuctionAgency(p.source);
  const docs = buildDocumentLinks(p);
  const verified = p.verification_state === "verified";
  const pending = p.verification_state === "pending_verification";

  const location = [p.suburb, p.town, p.province].filter(Boolean).join(", ");
  const executiveSummary = [
    verified
      ? "Verified auction listing."
      : "Listing pending verification — not a verified research grade report.",
    p.property_type ? `${p.property_type}.` : null,
    location ? `Located in ${location}.` : null,
    p.auction_date
      ? `Auction date recorded: ${p.auction_date.slice(0, 10)}.`
      : "Auction date not supplied by auction source.",
    p.auction_agency || p.source_name
      ? `Agency: ${p.auction_agency || p.source_name}.`
      : "Agency not supplied.",
    dd ? `Due diligence completeness: ${dd.completeness.overall}%.` : null,
  ]
    .filter(Boolean)
    .join(" ");

  const bedrooms =
    p.bedrooms != null
      ? field("Bedrooms", p.bedrooms)
      : fromDd(dd, "bedrooms", "Bedrooms");
  const bathrooms =
    p.bathrooms != null
      ? field("Bathrooms", p.bathrooms)
      : fromDd(dd, "bathrooms", "Bathrooms");
  const scheme = fromDd(dd, "scheme", "Scheme");
  const suburb =
    p.suburb != null ? field("Suburb", p.suburb) : fromDd(dd, "suburb", "Suburb");
  const town = p.town != null ? field("Town", p.town) : fromDd(dd, "town", "Town");

  const missingInformation = dd?.importantMissing ?? [
    "Title information",
    "Municipality",
    "Zoning",
    "Rates information",
  ];

  const evidenceNotes =
    dd?.items
      .filter(
        (i) =>
          isPresentStatus(i.status) &&
          i.evidence?.extraction_method === "deterministic_text" &&
          i.evidence.original_text,
      )
      .slice(0, 8)
      .map(
        (i) =>
          `${i.label}: “${i.evidence!.original_text!.slice(0, 100)}”`,
      ) ?? [];

  return {
    generatedAt: new Date().toISOString(),
    version: "3.1.0",
    propertyId: p.id,
    executiveSummary,
    propertySnapshot: [
      field("Title", p.title),
      p.property_type != null
        ? field("Type", p.property_type)
        : fromDd(dd, "property_type", "Type"),
      town,
      field("Province", p.province),
      suburb,
      bedrooms,
      bathrooms,
      scheme,
      fromDd(dd, "unit_number", "Unit number"),
      field("Erf size (m²)", p.erf_size),
      field("Floor size (m²)", p.floor_size),
    ],
    auctionInformation: [
      field("Auction date", p.auction_date?.slice(0, 10) ?? null),
      field("Auction time", p.auction_time),
      fromDd(dd, "auction_open_at", "Auction opening"),
      fromDd(dd, "auction_close_at", "Auction closing"),
      fromDd(dd, "auction_mode", "Auction mode"),
      fromDd(dd, "auction_type", "Auction type"),
      field("Venue", p.auction_venue),
      field("Guide / auction price", p.auction_price),
      field(
        "Reserve",
        p.reserve_price,
        p.reserve_price != null ? "verified" : "not_supplied",
      ),
      fromDd(dd, "deposit", "Deposit"),
      fromDd(dd, "viewing", "Viewing"),
      field("Listing status", p.listing_status ?? p.status),
    ],
    landInformation: [
      fromDd(dd, "land_size_source_text", "Land size (source text)"),
      fromDd(dd, "land_size_hectares", "Hectares"),
      fromDd(dd, "land_size_m2", "Square metres"),
      fromDd(dd, "farm_name", "Farm name"),
      fromDd(dd, "farm_portions", "Farm portions"),
    ],
    classification: [
      field("Property type", p.property_type),
      field(
        "Verification state",
        p.verification_state,
        verified
          ? "verified"
          : pending
            ? "pending_verification"
            : "not_supplied",
      ),
    ],
    ownership: [
      field("Owner", null, "not_supplied"),
      field("Title deed", null, "not_supplied"),
      {
        label: "Note",
        value:
          "Ownership details only shown when legally available from verified sources.",
        status: "not_supplied",
      },
    ],
    timeline: input.timeline,
    locationOverview: [
      field("Address", p.address ?? p.street_address),
      suburb,
      town,
      field("Province", p.province),
      field("Postal code", p.postal_code),
      fromDd(dd, "municipality", "Municipality"),
      field("Latitude", p.latitude),
      field("Longitude", p.longitude),
    ],
    agencyInformation: [
      field("Agency", p.auction_agency || agency.name || p.source_name),
      field("Contact", p.agency_contact),
      field("Website", p.agency_website || agency.website),
    ],
    documents: [
      ...docs.map((d) => ({
        label: d.label,
        href: d.href,
        status: "verified" as const,
      })),
      ...(docs.length === 0
        ? [
            {
              label: "Documents",
              href: null,
              status: "not_supplied" as const,
            },
          ]
        : []),
    ],
    verificationStatus: [
      field("State", p.verification_label || p.verification_state),
      field("Last verified", p.last_verified_at),
      field("Imported", p.imported_at),
      field("Source", p.source_name),
    ],
    provenance: [
      field("Source URL", p.source_url),
      field("External ID", p.external_listing_id),
      field("Provenance notes", p.provenance_notes),
      field("Extraction version", dd?.extraction.extraction_version ?? null),
      field("Source content hash", dd?.extraction.source_hash ?? null),
    ],
    missingInformation,
    evidenceNotes,
    intelligenceSummary: {
      listingQualityPercent: input.intelligence?.listingQuality.percent ?? null,
      verificationConfidence: input.intelligence?.verificationConfidence ?? null,
      comparableConfidence: input.intelligence?.comparableConfidence ?? null,
      areaActivity: input.intelligence?.areaActivity.label ?? null,
      completenessOverall: dd?.completeness.overall ?? null,
      notes: [
        "No investment recommendations are included.",
        "Comparable count: " + String(input.comparableCount ?? 0),
        "Missing fields are labelled not supplied — never fabricated.",
        dd?.conflicts.length
          ? `Conflicts requiring verification: ${dd.conflicts.map((c) => c.field).join(", ")}`
          : "No field conflicts detected.",
      ],
    },
    exportHints: {
      printReady: true,
      sharePath: `/properties/${p.id}/research`,
      pdfReserved: true,
    },
  };
}
