import type { PropertyDTO } from "@/lib/dto/PropertyDTO";
import { formatAuctionDate, formatCurrency } from "@/lib/format";
import { NOT_SUPPLIED, displaySupplied, hasNumericValue } from "./notSupplied";

export type ComparisonGroup =
  | "property"
  | "auction"
  | "pricing"
  | "agricultural";

export type ComparisonCell = {
  text: string;
  supplied: boolean;
};

export type ComparisonRow = {
  key: string;
  label: string;
  group: ComparisonGroup;
  premiumOnly?: boolean;
  cells: ComparisonCell[];
};

export type PropertyComparison = {
  properties: Array<{
    id: string;
    title: string;
    href: string;
    verification_state: string | null;
  }>;
  rows: ComparisonRow[];
  truncated: boolean;
  limit: number;
  methodology:
    "Side-by-side verified listing fields only. Missing values are Not supplied. Reserve is never inferred from guide, estimate, or auction price.";
};

function textCell(value: string | null | undefined): ComparisonCell {
  return displaySupplied(value);
}

function numberCell(value: number | null | undefined, suffix = ""): ComparisonCell {
  if (!hasNumericValue(value)) return { text: NOT_SUPPLIED, supplied: false };
  return { text: `${value}${suffix}`, supplied: true };
}

function moneyCell(value: number | null | undefined): ComparisonCell {
  if (!hasNumericValue(value) || (value as number) <= 0) {
    return { text: NOT_SUPPLIED, supplied: false };
  }
  return { text: formatCurrency(value as number), supplied: true };
}

function dateCell(value: string | null | undefined): ComparisonCell {
  if (!value?.trim()) return { text: NOT_SUPPLIED, supplied: false };
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return { text: NOT_SUPPLIED, supplied: false };
  return { text: formatAuctionDate(value), supplied: true };
}

function auctionChannel(property: PropertyDTO): ComparisonCell {
  const hay = [
    property.auction_venue,
    property.title,
    property.listing_status,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  if (!hay.trim()) return { text: NOT_SUPPLIED, supplied: false };
  if (/\bonline\b/.test(hay)) return { text: "Online", supplied: true };
  if (/\blive\b/.test(hay) && /venue|hall|hotel|on-site|onsite/.test(hay)) {
    return { text: "Live", supplied: true };
  }
  if (property.auction_venue?.trim()) {
    return { text: "Live venue listed", supplied: true };
  }
  return { text: NOT_SUPPLIED, supplied: false };
}

function row(
  key: string,
  label: string,
  group: ComparisonGroup,
  cells: ComparisonCell[],
  premiumOnly = false,
): ComparisonRow {
  return { key, label, group, cells, premiumOnly };
}

/**
 * Build a comparison matrix. Pricing rows appear only when at least one
 * listing actually has that field — never inferred across columns.
 */
export function buildPropertyComparison(
  properties: PropertyDTO[],
  options: { premium: boolean; limit: number },
): PropertyComparison {
  const limited = properties.slice(0, options.limit);
  const truncated = properties.length > limited.length;

  const summaries = limited.map((p) => ({
    id: p.id,
    title: p.title,
    href: `/properties/${p.id}`,
    verification_state: p.verification_state,
  }));

  const propertyRows: ComparisonRow[] = [
    row("property_type", "Property type", "property", limited.map((p) => textCell(p.property_type))),
    row("province", "Province", "property", limited.map((p) => textCell(p.province))),
    row("town", "Town", "property", limited.map((p) => textCell(p.town))),
    row("suburb", "Suburb", "property", limited.map((p) => textCell(p.suburb))),
    row(
      "land_size",
      "Land size (m²)",
      "property",
      limited.map((p) => numberCell(p.erf_size, " m²")),
      true,
    ),
    row(
      "building_size",
      "Building size (m²)",
      "property",
      limited.map((p) => numberCell(p.floor_size, " m²")),
      true,
    ),
    row("bedrooms", "Bedrooms", "property", limited.map((p) => numberCell(p.bedrooms))),
    row("bathrooms", "Bathrooms", "property", limited.map((p) => numberCell(p.bathrooms))),
    row("garages", "Garages", "property", limited.map((p) => numberCell(p.garages))),
  ];

  const auctionRows: ComparisonRow[] = [
    row("auction_date", "Auction date", "auction", limited.map((p) => dateCell(p.auction_date))),
    row(
      "listing_status",
      "Auction status",
      "auction",
      limited.map((p) => textCell(p.listing_status ?? p.status)),
    ),
    row("channel", "Online / live", "auction", limited.map((p) => auctionChannel(p))),
    row("venue", "Auction venue", "auction", limited.map((p) => textCell(p.auction_venue))),
    row(
      "agency",
      "Agency",
      "auction",
      limited.map((p) => textCell(p.auction_agency ?? p.source_name)),
    ),
    row("source", "Source", "auction", limited.map((p) => textCell(p.source_name ?? p.source))),
    row(
      "registration",
      "Registration",
      "auction",
      limited.map((p) => textCell(p.registration_link)),
      true,
    ),
  ];

  const pricingDefs: Array<{
    key: string;
    label: string;
    get: (p: PropertyDTO) => number | null;
  }> = [
    { key: "reserve", label: "Reserve", get: (p) => p.reserve_price },
    { key: "guide", label: "Guide / auction price", get: (p) => p.auction_price },
    { key: "estimated", label: "Estimated value", get: (p) => p.estimated_value },
  ];

  const pricingRows: ComparisonRow[] = pricingDefs
    .filter((def) => limited.some((p) => hasNumericValue(def.get(p)) && (def.get(p) as number) > 0))
    .map((def) =>
      row(
        def.key,
        def.label,
        "pricing",
        limited.map((p) => moneyCell(def.get(p))),
        true,
      ),
    );

  const agriRows: ComparisonRow[] = [
    row(
      "hectares",
      "Hectares",
      "agricultural",
      limited.map((p) => numberCell(p.agricultural_details?.totalHectares, " ha")),
      true,
    ),
    row(
      "farm_category",
      "Farm type",
      "agricultural",
      limited.map((p) => textCell(p.agricultural_details?.farmCategory)),
      true,
    ),
  ];

  let rows = [...propertyRows, ...auctionRows, ...pricingRows, ...agriRows];
  if (!options.premium) {
    rows = rows.filter((r) => !r.premiumOnly);
  }

  return {
    properties: summaries,
    rows,
    truncated,
    limit: options.limit,
    methodology:
      "Side-by-side verified listing fields only. Missing values are Not supplied. Reserve is never inferred from guide, estimate, or auction price.",
  };
}
