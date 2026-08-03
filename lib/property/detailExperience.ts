import type { PropertyDTO } from "@/lib/dto/PropertyDTO";
import {
  formatAgriculturalValue,
  isFarmPropertyType,
  type AgriculturalDetails,
} from "@/lib/property/agricultural";

export type AuctionType =
  | "Online Auction"
  | "Live Auction"
  | "Hybrid Auction"
  | "Auction format pending";

export type PropertyHighlight = {
  id: string;
  label: string;
  icon: string;
};

export type DocumentLink = {
  id: string;
  label: string;
  href: string;
  kind: "brochure" | "terms" | "catalogue" | "registration" | "other";
};

const ONLINE_PATTERN =
  /online|virtual|webcast|e-auction|eauction|bid\s*online|internet/i;
const LIVE_PATTERN =
  /live|physical|venue|hall|room|on-site|onsite|in\s*person/i;

export function inferAuctionType(property: {
  auction_venue?: string | null;
  registration_link?: string | null;
  source_url?: string | null;
  title?: string | null;
  description?: string | null;
  viewing_information?: string | null;
}): AuctionType {
  const corpus = [
    property.auction_venue,
    property.registration_link,
    property.source_url,
    property.title,
    property.description,
    property.viewing_information,
  ]
    .filter(Boolean)
    .join(" ");

  const online = ONLINE_PATTERN.test(corpus);
  const live = LIVE_PATTERN.test(corpus);

  if (online && live) return "Hybrid Auction";
  if (online) return "Online Auction";
  if (live) return "Live Auction";
  if (property.registration_link?.trim()) return "Online Auction";
  return "Auction format pending";
}

export function formatAuctionVenueDisplay(
  venue: string | null | undefined,
  auctionType: AuctionType,
): string {
  const trimmed = venue?.trim();
  if (trimmed && !ONLINE_PATTERN.test(trimmed)) {
    return trimmed;
  }
  if (
    auctionType === "Online Auction" ||
    auctionType === "Hybrid Auction" ||
    ONLINE_PATTERN.test(trimmed ?? "")
  ) {
    return "🌐 Online Auction";
  }
  if (trimmed) return trimmed;
  if (auctionType === "Live Auction") {
    return "Physical venue to be confirmed with the auction agency.";
  }
  return "🌐 Online Auction";
}

export function getVerificationStatusLabel(property: PropertyDTO): string {
  if (property.isSeedOrDemo) return "Seed data";
  if (property.verification_state === "verified") return "Verified";
  if (property.verification_state === "sold") return "Sold";
  if (property.isPendingVerification) return "Pending verification";
  return property.verification_label || "Verification pending";
}

export function getPropertyClassification(
  propertyType: string | null | undefined,
): string {
  const type = propertyType?.trim();
  if (!type) return "Classification pending";
  if (/farm|smallholding|agricultural|guest\s*farm/i.test(type)) return "Farm";
  if (/commercial/i.test(type)) return "Commercial";
  if (/industrial/i.test(type)) return "Industrial";
  if (/vacant|land/i.test(type)) return "Vacant Land";
  if (/house|apartment|townhouse|flat|residential/i.test(type)) {
    return "Residential";
  }
  return type;
}

export function formatLandSizeDisplay(
  erfSize: number | null | undefined,
  agricultural?: AgriculturalDetails | null,
): string | null {
  const totalHa = agricultural?.totalHectares;
  if (totalHa != null && totalHa > 0) {
    return `${totalHa.toLocaleString("en-ZA")} hectares`;
  }
  if (erfSize != null && erfSize > 0) {
    if (erfSize >= 10_000) {
      const ha = erfSize / 10_000;
      return `${ha.toLocaleString("en-ZA", { maximumFractionDigits: 3 })} hectares`;
    }
    return `${erfSize.toLocaleString("en-ZA")} m²`;
  }
  return null;
}

export function formatBuildingSize(
  floorSize: number | null | undefined,
): string | null {
  if (floorSize == null || floorSize <= 0) return null;
  return `${floorSize.toLocaleString("en-ZA")} m²`;
}

function pushHighlight(
  highlights: PropertyHighlight[],
  id: string,
  label: string,
  icon: string,
) {
  if (highlights.some((h) => h.id === id)) return;
  highlights.push({ id, label, icon });
}

export function buildPropertyHighlights(
  property: PropertyDTO,
): PropertyHighlight[] {
  const highlights: PropertyHighlight[] = [];
  const isFarm = isFarmPropertyType(property.property_type);
  const isNonResidential = /land|commercial|farm|vacant|industrial/i.test(
    property.property_type ?? "",
  );

  if (!isNonResidential || (property.bedrooms ?? 0) > 0) {
    const beds = property.bedrooms ?? 0;
    if (beds > 0) {
      pushHighlight(
        highlights,
        "beds",
        `${beds} ${beds === 1 ? "Bedroom" : "Bedrooms"}`,
        "🛏️",
      );
    }
  }

  if (!isNonResidential || (property.bathrooms ?? 0) > 0) {
    const baths = property.bathrooms ?? 0;
    if (baths > 0) {
      pushHighlight(
        highlights,
        "baths",
        `${baths} ${baths === 1 ? "Bathroom" : "Bathrooms"}`,
        "🛁",
      );
    }
  }

  if (!isNonResidential || (property.garages ?? 0) > 0) {
    const garages = property.garages ?? 0;
    if (garages > 0) {
      pushHighlight(
        highlights,
        "garages",
        `${garages} ${garages === 1 ? "Garage" : "Garages"}`,
        "🚗",
      );
    }
  }

  const land = formatLandSizeDisplay(
    property.erf_size,
    property.agricultural_details,
  );
  if (land) {
    pushHighlight(highlights, "land", land, "🌾");
  }

  const building = formatBuildingSize(property.floor_size);
  if (building) {
    pushHighlight(highlights, "building", building, "🏠");
  }

  const ag = property.agricultural_details;
  if (ag?.gameFarm) {
    pushHighlight(highlights, "game", "Game farm", "🦌");
  }
  if (ag?.pivotIrrigation) {
    pushHighlight(highlights, "pivot", "Pivot irrigation", "💧");
  }
  if (ag?.waterRights?.trim()) {
    pushHighlight(highlights, "water", "Water rights", "🌊");
  }
  if (ag?.farmCategory?.trim()) {
    pushHighlight(highlights, "category", ag.farmCategory.trim(), "📋");
  }

  if (property.features?.trim()) {
    const tokens = property.features
      .split(/[,;|\n]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 2 && s.length < 48);

    for (const token of tokens.slice(0, 6)) {
      const icon = /view|mountain|river|sea|ocean/i.test(token)
        ? "🏔️"
        : /guest|lodge|hospitality/i.test(token)
          ? "🏡"
          : /commercial|rights/i.test(token)
            ? "🏢"
            : /fenc|game/i.test(token)
              ? "🦓"
              : "✨";
      pushHighlight(highlights, `feature-${token}`, token, icon);
    }
  }

  if (isFarm && /guest/i.test(property.title ?? "")) {
    pushHighlight(highlights, "guest-farm", "Guest farm", "🏡");
  }

  return highlights.slice(0, 12);
}

export function buildDocumentLinks(property: PropertyDTO): DocumentLink[] {
  const docs: DocumentLink[] = [];
  const add = (
    href: string | null | undefined,
    label: string,
    id: string,
    kind: DocumentLink["kind"],
  ) => {
    const trimmed = href?.trim();
    if (!trimmed || !/^https?:\/\//i.test(trimmed)) return;
    docs.push({ id, label, href: trimmed, kind });
  };

  add(property.brochure_link, "Property brochure", "brochure", "brochure");
  add(property.terms_link, "Conditions of sale", "terms", "terms");
  add(property.catalogue_link, "Auction catalogue", "catalogue", "catalogue");
  add(
    property.registration_link,
    "Auction registration",
    "registration",
    "registration",
  );

  return docs;
}

export function maskListingReference(value: string | null | undefined): string {
  if (!value?.trim()) {
    return "Reference not published";
  }
  const trimmed = value.trim();
  if (trimmed.length <= 8) return trimmed;
  return `${trimmed.slice(0, 4)}…${trimmed.slice(-4)}`;
}

export function getSourceReliabilityLabel(property: PropertyDTO): string {
  if (property.isSeedOrDemo) return "Illustrative — not production verified";
  if (property.verification_state === "verified") {
    return property.last_verified_at
      ? "Verified against original source"
      : "Verified listing";
  }
  if (property.verification_state === "sold") return "Sold — historical record";
  if (property.isPendingVerification) {
    return "Pending verification against source";
  }
  return "Confirm details with conducting agency";
}

export function getRegisterUrl(property: PropertyDTO): string | null {
  return (
    property.registration_link?.trim() ||
    property.source_url?.trim() ||
    null
  );
}

export function shouldHideExactLocation(property: PropertyDTO): boolean {
  return property.address_display_mode === "suburb_only" ||
    property.address_display_mode === "withheld";
}

export function buildAuctionDateTimeIso(
  auctionDate: string | null | undefined,
  auctionTime: string | null | undefined,
): string | null {
  if (!auctionDate?.trim()) return null;
  const datePart = auctionDate.trim().slice(0, 10);
  const timePart = auctionTime?.trim();
  if (timePart && /^\d{1,2}:\d{2}/.test(timePart)) {
    return `${datePart}T${timePart}:00`;
  }
  return datePart;
}
