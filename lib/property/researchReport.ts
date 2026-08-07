import type { PropertyDTO } from "@/lib/dto/PropertyDTO";
import type { AuctionIntelligencePanel } from "@/lib/property/auctionIntelligence";
import type { TimelineEvent } from "@/lib/property/propertyTimeline";
import { buildDocumentLinks } from "@/lib/property/detailExperience";
import { resolveAuctionAgency } from "@/lib/auction/agencyDisplay";

/**
 * Auction Research Report — verified fields only.
 * Missing data marked unavailable — never fabricated.
 */

export type ResearchFieldStatus = "verified" | "unavailable" | "pending_verification";

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
  classification: ResearchField[];
  ownership: ResearchField[];
  timeline: TimelineEvent[];
  locationOverview: ResearchField[];
  agencyInformation: ResearchField[];
  documents: Array<{ label: string; href: string | null; status: ResearchFieldStatus }>;
  verificationStatus: ResearchField[];
  provenance: ResearchField[];
  intelligenceSummary: {
    listingQualityPercent: number | null;
    verificationConfidence: string | null;
    comparableConfidence: string | null;
    areaActivity: string | null;
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
      status: status ?? "unavailable",
    };
  }
  return {
    label,
    value: String(value),
    status: status ?? "verified",
  };
}

export function buildAuctionResearchReport(input: {
  property: PropertyDTO;
  timeline: TimelineEvent[];
  intelligence?: AuctionIntelligencePanel | null;
  comparableCount?: number;
  siteUrl?: string;
}): AuctionResearchReport {
  const p = input.property;
  const agency = resolveAuctionAgency(p.source);
  const docs = buildDocumentLinks(p);
  const verified = p.verification_state === "verified";
  const pending = p.verification_state === "pending_verification";

  const location = [p.suburb, p.town, p.province].filter(Boolean).join(", ");
  const executiveSummary = [
    verified ? "Verified auction listing." : "Listing pending verification — not a verified research grade report.",
    p.property_type ? `${p.property_type}.` : null,
    location ? `Located in ${location}.` : null,
    p.auction_date ? `Auction date recorded: ${p.auction_date.slice(0, 10)}.` : "Auction date unavailable.",
    (p.auction_agency || p.source_name)
      ? `Agency: ${p.auction_agency || p.source_name}.`
      : "Agency unavailable.",
  ]
    .filter(Boolean)
    .join(" ");

  const ownershipStatus: ResearchFieldStatus = "unavailable";

  return {
    generatedAt: new Date().toISOString(),
    version: "3.0.0",
    propertyId: p.id,
    executiveSummary,
    propertySnapshot: [
      field("Title", p.title),
      field("Type", p.property_type),
      field("Town", p.town),
      field("Province", p.province),
      field("Bedrooms", p.bedrooms),
      field("Bathrooms", p.bathrooms),
      field("Erf size (m²)", p.erf_size),
      field("Floor size (m²)", p.floor_size),
    ],
    auctionInformation: [
      field("Auction date", p.auction_date?.slice(0, 10) ?? null),
      field("Auction time", p.auction_time),
      field("Venue", p.auction_venue),
      field("Guide / auction price", p.auction_price),
      field("Reserve", p.reserve_price, p.reserve_price != null ? "verified" : "unavailable"),
      field("Listing status", p.listing_status ?? p.status),
    ],
    classification: [
      field("Property type", p.property_type),
      field("Verification state", p.verification_state, verified ? "verified" : pending ? "pending_verification" : "unavailable"),
    ],
    ownership: [
      field("Owner", null, ownershipStatus),
      field("Title deed", null, ownershipStatus),
      {
        label: "Note",
        value: "Ownership details only shown when legally available from verified sources.",
        status: "unavailable",
      },
    ],
    timeline: input.timeline,
    locationOverview: [
      field("Address", p.address ?? p.street_address),
      field("Suburb", p.suburb),
      field("Town", p.town),
      field("Province", p.province),
      field("Postal code", p.postal_code),
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
              status: "unavailable" as const,
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
    ],
    intelligenceSummary: {
      listingQualityPercent: input.intelligence?.listingQuality.percent ?? null,
      verificationConfidence: input.intelligence?.verificationConfidence ?? null,
      comparableConfidence: input.intelligence?.comparableConfidence ?? null,
      areaActivity: input.intelligence?.areaActivity.label ?? null,
      notes: [
        "No investment recommendations are included.",
        "Comparable count: " + String(input.comparableCount ?? 0),
        "Missing fields remain marked unavailable.",
      ],
    },
    exportHints: {
      printReady: true,
      sharePath: `/properties/${p.id}/research`,
      pdfReserved: true,
    },
  };
}
