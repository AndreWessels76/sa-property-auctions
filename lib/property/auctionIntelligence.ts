import type { PropertyDTO } from "@/lib/dto/PropertyDTO";
import type { Property } from "@/lib/types/property";
import { buildVerificationChecklist } from "@/lib/acquisition/verificationChecklist";
import { scoreMultiDimensionalQuality } from "@/lib/data/multiQualityScore";
import { resolveAuctionAgency } from "@/lib/auction/agencyDisplay";
import { getPropertyClassification } from "@/lib/property/detailExperience";
import { buildDocumentLinks } from "@/lib/property/detailExperience";

export type ConfidenceLevel = "High" | "Medium" | "Low";

export type AuctionIntelligencePanel = {
  daysUntilAuction: {
    label: string;
    days: number | null;
    status: "upcoming" | "today" | "tomorrow" | "completed" | "unknown";
  };
  listingQuality: {
    percent: number;
    factors: Array<{ key: string; present: boolean; label: string }>;
  };
  verificationConfidence: ConfidenceLevel;
  comparableConfidence: ConfidenceLevel;
  areaActivity: {
    label: string;
    auctionsThisWeek: number;
    activeNearby: number;
  };
  propertyTypeActivity: {
    label: string;
    count: number;
    classification: string;
  };
  agencyActivity: {
    label: string;
    agencyName: string;
    activeCount: number;
  };
  verificationStatus: {
    state: string;
    lastVerified: string | null;
    imported: string | null;
    updated: string | null;
    verifier: string;
  };
  sourceTrust: {
    label: string;
    importedFrom: string;
  };
  documents: {
    brochure: boolean;
    auctionRules: boolean;
    conditions: boolean;
    viewing: boolean;
  };
  futureReserved: Array<{
    title: string;
    note: string;
  }>;
};

export type VerifiedCatalogueStats = {
  totalVerified: number;
  byProvince: Record<string, number>;
  byTown: Record<string, number>;
  byType: Record<string, number>;
  byAgency: Record<string, number>;
  auctionsThisWeek: number;
  rows: Array<{
    id: string;
    province: string | null;
    town: string | null;
    property_type: string | null;
    auction_agency: string | null;
    source_name: string | null;
    auction_date: string | null;
  }>;
};

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function parseAuctionDay(iso: string | null | undefined): Date | null {
  if (!iso?.trim()) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return startOfDay(d);
}

export function computeDaysUntilAuction(
  auctionDate: string | null | undefined,
): AuctionIntelligencePanel["daysUntilAuction"] {
  const day = parseAuctionDay(auctionDate);
  if (!day) {
    return {
      label: "Auction date not yet confirmed",
      days: null,
      status: "unknown",
    };
  }
  const today = startOfDay(new Date());
  const diffMs = day.getTime() - today.getTime();
  const days = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (days < 0) {
    return { label: "Completed", days, status: "completed" };
  }
  if (days === 0) {
    return { label: "Auction Today", days: 0, status: "today" };
  }
  if (days === 1) {
    return { label: "Tomorrow", days: 1, status: "tomorrow" };
  }
  return {
    label: `In ${days} Days`,
    days,
    status: "upcoming",
  };
}

export function computeListingQualityPercent(input: {
  hasAddress: boolean;
  hasImages: boolean;
  hasAgency: boolean;
  hasAuctionDate: boolean;
  hasDescription: boolean;
  hasDocuments: boolean;
  isVerified: boolean;
}): { percent: number; factors: AuctionIntelligencePanel["listingQuality"]["factors"] } {
  const factors = [
    { key: "address", present: input.hasAddress, label: "Address" },
    { key: "images", present: input.hasImages, label: "Images" },
    { key: "agency", present: input.hasAgency, label: "Agency" },
    { key: "auction", present: input.hasAuctionDate, label: "Auction" },
    { key: "description", present: input.hasDescription, label: "Description" },
    { key: "documents", present: input.hasDocuments, label: "Documents" },
    { key: "verification", present: input.isVerified, label: "Verification" },
  ];
  const present = factors.filter((f) => f.present).length;
  const percent = Math.round((present / factors.length) * 100);
  return { percent, factors };
}

export function confidenceFromRatio(present: number, total: number): ConfidenceLevel {
  if (total <= 0) return "Low";
  const ratio = present / total;
  if (ratio >= 0.8) return "High";
  if (ratio >= 0.5) return "Medium";
  return "Low";
}

export function computeComparableConfidence(
  comparableCount: number,
): ConfidenceLevel {
  if (comparableCount >= 5) return "High";
  if (comparableCount >= 2) return "Medium";
  return "Low";
}

function isWithinCurrentWeek(iso: string | null | undefined, now = new Date()): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return false;
  const day = now.getDay(); // 0 Sun
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = startOfDay(now);
  monday.setDate(monday.getDate() + mondayOffset);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  return d >= monday && d <= sunday;
}

function agencyKey(name: string | null | undefined): string {
  return (name ?? "").trim().toLowerCase();
}

/**
 * Build catalogue aggregates from verified rows only (single query upstream).
 */
export function buildVerifiedCatalogueStats(
  verifiedRows: Array<{
    id: string;
    province: string | null;
    town: string | null;
    property_type: string | null;
    auction_agency: string | null;
    source_name: string | null;
    auction_date: string | null;
  }>,
): VerifiedCatalogueStats {
  const byProvince: Record<string, number> = {};
  const byTown: Record<string, number> = {};
  const byType: Record<string, number> = {};
  const byAgency: Record<string, number> = {};
  let auctionsThisWeek = 0;

  for (const row of verifiedRows) {
    const province = row.province?.trim() || "Unknown";
    const town = row.town?.trim() || "Unknown";
    const type = getPropertyClassification(row.property_type);
    const agency =
      row.auction_agency?.trim() ||
      row.source_name?.trim() ||
      "Unknown agency";

    byProvince[province] = (byProvince[province] ?? 0) + 1;
    byTown[town] = (byTown[town] ?? 0) + 1;
    byType[type] = (byType[type] ?? 0) + 1;
    byAgency[agency] = (byAgency[agency] ?? 0) + 1;

    if (isWithinCurrentWeek(row.auction_date)) {
      auctionsThisWeek += 1;
    }
  }

  return {
    totalVerified: verifiedRows.length,
    byProvince,
    byTown,
    byType,
    byAgency,
    auctionsThisWeek,
    rows: verifiedRows,
  };
}

export function buildAuctionIntelligencePanel(input: {
  property: PropertyDTO;
  hasImages: boolean;
  comparableCount: number;
  catalogue: VerifiedCatalogueStats;
}): AuctionIntelligencePanel {
  const { property, hasImages, comparableCount, catalogue } = input;

  const docs = buildDocumentLinks(property);
  const hasDocuments = docs.length > 0;
  const hasAddress = Boolean(
    property.address?.trim() ||
      property.street_address?.trim() ||
      property.suburb?.trim() ||
      property.town?.trim(),
  );
  const hasAgency = Boolean(
    property.auction_agency?.trim() || property.source_name?.trim(),
  );
  const hasAuctionDate = Boolean(property.auction_date);
  const hasDescription = Boolean(property.description?.trim());
  const isVerified = property.verification_state === "verified";

  const quality = computeListingQualityPercent({
    hasAddress,
    hasImages,
    hasAgency,
    hasAuctionDate,
    hasDescription,
    hasDocuments,
    isVerified,
  });

  // Verification confidence from checklist completeness (deterministic)
  const asProperty = property as unknown as Property;
  const checklist = buildVerificationChecklist(
    asProperty,
    hasImages,
    quality.percent,
  );
  const checklistPresent = [
    checklist.address,
    checklist.images,
    checklist.agency,
    checklist.auctionDate,
    checklist.propertyMetadata,
    checklist.source,
  ].filter(Boolean).length;
  const verificationConfidence = confidenceFromRatio(checklistPresent, 6);

  const province = property.province?.trim() || "";
  const town = property.town?.trim() || "";
  const activeNearby =
    (town && catalogue.byTown[town] ? catalogue.byTown[town] : 0) ||
    (province && catalogue.byProvince[province]
      ? catalogue.byProvince[province]
      : 0);
  // Exclude self from nearby count when possible
  const nearbyAdjusted = Math.max(0, activeNearby - (activeNearby > 0 ? 1 : 0));

  let areaLabel: string;
  if (catalogue.auctionsThisWeek > 0 && nearbyAdjusted > 0) {
    areaLabel = `${catalogue.auctionsThisWeek} auction${catalogue.auctionsThisWeek === 1 ? "" : "s"} this week · ${nearbyAdjusted} active nearby`;
  } else if (nearbyAdjusted > 0) {
    areaLabel = `${nearbyAdjusted} active auction${nearbyAdjusted === 1 ? "" : "s"} nearby`;
  } else if (catalogue.auctionsThisWeek > 0) {
    areaLabel = `${catalogue.auctionsThisWeek} auction${catalogue.auctionsThisWeek === 1 ? "" : "s"} this week`;
  } else {
    areaLabel = "No recent verified activity";
  }

  const classification = getPropertyClassification(property.property_type);
  const typeCount = catalogue.byType[classification] ?? 0;
  const typeLabel =
    typeCount > 0
      ? `${typeCount} ${classification}${typeCount === 1 ? "" : "s"} currently on auction`
      : `No other verified ${classification.toLowerCase()} listings yet`;

  const agencyName =
    property.auction_agency?.trim() ||
    property.source_name?.trim() ||
    resolveAuctionAgency(property.source).name ||
    "Auction agency";
  const agencyCount =
    catalogue.byAgency[agencyName] ??
    Object.entries(catalogue.byAgency).find(
      ([k]) => agencyKey(k) === agencyKey(agencyName),
    )?.[1] ??
    0;
  const agencyActive = Math.max(0, agencyCount - (agencyCount > 0 ? 1 : 0));
  const agencyLabel =
    agencyActive > 0
      ? `${agencyActive} more active auction${agencyActive === 1 ? "" : "s"} from this agency`
      : "No other verified listings from this agency yet";

  const sourceName =
    property.source_name?.trim() ||
    property.auction_agency?.trim() ||
    "Verified auction source";

  return {
    daysUntilAuction: computeDaysUntilAuction(property.auction_date),
    listingQuality: quality,
    verificationConfidence,
    comparableConfidence: computeComparableConfidence(comparableCount),
    areaActivity: {
      label: areaLabel,
      auctionsThisWeek: catalogue.auctionsThisWeek,
      activeNearby: nearbyAdjusted,
    },
    propertyTypeActivity: {
      label: typeLabel,
      count: typeCount,
      classification,
    },
    agencyActivity: {
      label: agencyLabel,
      agencyName,
      activeCount: agencyActive,
    },
    verificationStatus: {
      state:
        property.verification_state === "verified"
          ? "Verified"
          : property.verification_label || "Pending",
      lastVerified: property.last_verified_at,
      imported: property.imported_at,
      updated: null,
      verifier: "Operations Centre",
    },
    sourceTrust: {
      label: isVerified ? "Verified Source" : "Source pending verification",
      importedFrom: sourceName,
    },
    documents: {
      brochure: docs.some((d) => d.kind === "brochure"),
      auctionRules: docs.some((d) => d.kind === "catalogue"),
      conditions: docs.some((d) => d.kind === "terms"),
      viewing: Boolean(property.viewing_information?.trim()),
    },
    futureReserved: [
      {
        title: "Neighbourhood Intelligence",
        note: "Reserved for verified amenity and area insights.",
      },
      {
        title: "Market Trends",
        note: "Reserved for verified price movement over time.",
      },
      {
        title: "Heat Maps",
        note: "Reserved for auction density visualisation.",
      },
      {
        title: "Auction Density",
        note: "Reserved for regional concentration metrics.",
      },
    ],
  };
}

/** Lightweight property→DTO-compatible scoring helper for scripts */
export function scoreListingForApproval(
  property: Property,
  hasImages: boolean,
) {
  const agency = resolveAuctionAgency(property.source);
  return scoreMultiDimensionalQuality({
    ...property,
    hasImages,
    auction_agency: property.auction_agency ?? agency.name,
    agency_website: property.agency_website ?? agency.website,
    agency_contact: property.agency_contact ?? agency.contact,
  });
}
