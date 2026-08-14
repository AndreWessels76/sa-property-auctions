import type { PropertyDTO } from "@/lib/dto/PropertyDTO";
import type { AuctionEventRow } from "@/lib/identity";
import { isFarmPropertyType } from "@/lib/property/agricultural";
import {
  NOT_ENOUGH_VERIFIED_DATA,
  NOT_SUPPLIED,
} from "@/lib/intelligence/notSupplied";
import {
  PRICE_FIELD_LABELS,
  selectReferencePrice,
  unitAnalysisLabel,
  type ReferenceBasis,
} from "./priceBasis";
import {
  calculateDifference,
  calculateHistoricalChange,
  calculatePricePerUnit,
  isValidPositiveAmount,
  isValidPositiveArea,
  roundCurrency,
  roundPercent,
} from "./priceCalculations";
import {
  calculatedProvenance,
  fieldProvenance,
  PRICING_METHODOLOGY_VERSION,
  type PriceProvenance,
} from "./priceProvenance";

export type PricingDisplayStatus =
  | "verified"
  | "source_confirmed"
  | "extracted"
  | "not_supplied"
  | "pending"
  | "conflict"
  | "historical"
  | "calculated";

export type PricedField = {
  kind: string;
  label: string;
  value: number | null;
  display: string;
  status: PricingDisplayStatus;
  provenance: PriceProvenance | null;
};

export type DifferenceResult = {
  absolute: number;
  absoluteDisplay: string;
  percentage: number;
  percentageDisplay: string;
  narrative: string;
  referenceLabel: string;
  referenceBasis: ReferenceBasis;
  provenance: PriceProvenance;
};

export type UnitAnalysisResult = {
  label: string;
  value: number | null;
  display: string;
  available: boolean;
  reason: string | null;
  approximate: boolean;
  provenance: PriceProvenance | null;
};

export type HistoricalPricePoint = {
  auctionEventId: string;
  auctionDate: string | null;
  status: string;
  price: number;
  priceKind: string;
  priceLabel: string;
  source: string | null;
  sourceUrl: string | null;
  verificationState: string | null;
  historical: true;
};

export type HistoricalPriceChange = {
  fromDate: string | null;
  toDate: string | null;
  fromPrice: number;
  toPrice: number;
  absolute: number;
  absoluteDisplay: string;
  percentage: number;
  percentageDisplay: string;
  narrative: string;
  provenance: PriceProvenance;
};

export type PriceDataQuality = {
  priceDataAvailable: boolean;
  referencePriceAvailable: boolean;
  buildingSizeAvailable: boolean;
  landSizeAvailable: boolean;
  historicalPriceDataAvailable: boolean;
  sourceVerified: boolean;
};

export type AuctionPriceIntelligence = {
  propertyId: string;
  propertyMasterId: string | null;
  premium: boolean;
  methodologyVersion: string;
  current: {
    auctionPrice: PricedField;
    reservePrice: PricedField;
    guidePrice: PricedField;
    estimatedValue: PricedField;
    auctionDate: string | null;
    auctionType: string | null;
    agency: string | null;
  };
  difference: DifferenceResult | null;
  unitAnalysis: {
    perBuildingM2: UnitAnalysisResult;
    perHectare: UnitAnalysisResult;
  };
  historical: {
    timeline: HistoricalPricePoint[];
    change: HistoricalPriceChange | null;
    note: string | null;
  };
  dataQuality: PriceDataQuality;
  methodology: string[];
  limitations: string[];
  conflictNote: string | null;
};

function moneyDisplay(value: number | null): string {
  if (!isValidPositiveAmount(value)) return NOT_SUPPLIED;
  return new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
    maximumFractionDigits: 0,
  }).format(value);
}

function percentDisplay(value: number): string {
  const rounded = roundPercent(value);
  const sign = rounded > 0 ? "+" : "";
  return `${sign}${rounded.toFixed(1)}%`;
}

function signedMoneyClean(value: number): string {
  const formatted = new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
    maximumFractionDigits: 0,
  }).format(Math.abs(roundCurrency(value)));
  if (value > 0) return `+${formatted}`;
  if (value < 0) return `-${formatted}`;
  return formatted;
}

function listingStatus(verificationState: string | null | undefined): PricingDisplayStatus {
  if (verificationState === "verified") return "verified";
  if (verificationState === "pending_verification") return "pending";
  return "source_confirmed";
}

function detectApproximateHectares(
  property: PropertyDTO,
): boolean {
  const ag = property.agricultural_details;
  if (!ag) return false;
  const hay = [
    ag.cropInformation,
    ag.additionalImprovements,
    ag.farmCategory,
  ]
    .filter(Boolean)
    .join(" ");
  return /[±~≈]/.test(hay);
}

function eventPrice(
  event: AuctionEventRow,
): { price: number; kind: string; label: string } | null {
  // Prefer explicit winning/sale outcomes, then guide, then reserve — never invent.
  if (isValidPositiveAmount(event.winning_bid)) {
    return {
      price: event.winning_bid,
      kind: "winning_bid",
      label: PRICE_FIELD_LABELS.winning_bid,
    };
  }
  if (isValidPositiveAmount(event.guide_price)) {
    return {
      price: event.guide_price,
      kind: "guide_price",
      label: PRICE_FIELD_LABELS.guide_price,
    };
  }
  if (isValidPositiveAmount(event.reserve_price)) {
    return {
      price: event.reserve_price,
      kind: "reserve_price",
      label: PRICE_FIELD_LABELS.reserve_price,
    };
  }
  if (isValidPositiveAmount(event.opening_bid)) {
    return {
      price: event.opening_bid,
      kind: "opening_bid",
      label: PRICE_FIELD_LABELS.opening_bid,
    };
  }
  return null;
}

function buildPricedField(
  property: PropertyDTO,
  kind: "auction_price" | "reserve_price" | "guide_price" | "estimated_value",
  value: number | null,
  masterId: string | null,
): PricedField {
  const ok = isValidPositiveAmount(value);
  return {
    kind,
    label: PRICE_FIELD_LABELS[kind],
    value: ok ? value : null,
    display: ok ? moneyDisplay(value) : NOT_SUPPLIED,
    status: ok ? listingStatus(property.verification_state) : "not_supplied",
    provenance: ok
      ? fieldProvenance({
          propertyId: property.id,
          propertyMasterId: masterId,
          source: property.source_name ?? property.source,
          sourceUrl: property.source_url,
          verificationState: property.verification_state,
          field: kind,
        })
      : null,
  };
}

export type BuildAuctionPriceIntelligenceInput = {
  property: PropertyDTO;
  propertyMasterId?: string | null;
  auctionEvents?: AuctionEventRow[];
  /** Explicit guide price only — never pass auction_price here. */
  explicitGuidePrice?: number | null;
  premium: boolean;
  conflictDetected?: boolean;
};

/**
 * Deterministic Auction Price Intelligence 2A builder.
 * Free tier gets current fields + basic per-m² when valid.
 * Premium adds reference difference, hectares, historical timeline.
 */
export function buildAuctionPriceIntelligence(
  input: BuildAuctionPriceIntelligenceInput,
): AuctionPriceIntelligence {
  const { property, premium } = input;
  const masterId = input.propertyMasterId ?? null;
  const events = (input.auctionEvents ?? []).slice();

  // Listing semantics: auction_price is Auction price — never labelled Guide.
  // Guide only when an explicit separate guide is supplied.
  const auctionPrice = buildPricedField(
    property,
    "auction_price",
    property.auction_price,
    masterId,
  );
  const reservePrice = buildPricedField(
    property,
    "reserve_price",
    property.reserve_price,
    masterId,
  );
  const guidePrice = buildPricedField(
    property,
    "guide_price",
    input.explicitGuidePrice ?? null,
    masterId,
  );
  const estimatedValue = buildPricedField(
    property,
    "estimated_value",
    property.estimated_value,
    masterId,
  );

  const methodology: string[] = [
    "Price per m² is calculated using a verified price divided by the verified building/floor area. It is not an independent valuation.",
    "Price per hectare is calculated using a verified price divided by the recorded agricultural land extent (agricultural_details.totalHectares). Approximate land sizes produce approximate calculations.",
    "Percentage difference compares the auction price with the selected verified reference value. It does not represent a guaranteed market discount.",
    "Reserve, guide, estimated value, and sale price are separate concepts and are never inferred from each other.",
  ];

  const limitations: string[] = [];
  if (!isValidPositiveAmount(property.auction_price)) {
    limitations.push("Auction price not supplied.");
  }
  if (!isValidPositiveAmount(property.estimated_value)) {
    limitations.push("Estimated value not supplied.");
  }
  if (!isValidPositiveArea(property.floor_size)) {
    limitations.push("Building size not supplied — price per m² unavailable.");
  }

  // --- Reference difference (premium; free gets a limited one-line if both exist) ---
  let difference: DifferenceResult | null = null;
  const reference = selectReferencePrice({
    estimatedValue: property.estimated_value,
    guidePrice: input.explicitGuidePrice ?? null,
    // Do not use reserve as default reference for "discount-like" framing on free;
    // still allowed as labelled reference when no estimate/guide exists (premium path).
    reservePrice: premium ? property.reserve_price : null,
    historicalSalePrice: null,
  });

  if (
    isValidPositiveAmount(property.auction_price) &&
    reference &&
    (premium || reference.basis === "estimated_value")
  ) {
    const diff = calculateDifference(property.auction_price, reference.value);
    if (diff) {
      const pct = roundPercent(diff.percentage);
      const narrative =
        diff.direction === "equal"
          ? `Auction price equals reference (${reference.label})`
          : diff.direction === "below"
            ? `${Math.abs(pct).toFixed(1)}% below reference price`
            : `${Math.abs(pct).toFixed(1)}% above reference price`;
      difference = {
        absolute: roundCurrency(diff.absolute),
        absoluteDisplay: signedMoneyClean(diff.absolute),
        percentage: pct,
        percentageDisplay: percentDisplay(pct),
        narrative,
        referenceLabel: reference.label,
        referenceBasis: reference.basis,
        provenance: calculatedProvenance({
          propertyId: property.id,
          propertyMasterId: masterId,
          source: property.source_name ?? property.source,
          sourceUrl: property.source_url,
          verificationState: property.verification_state,
          calculationType: "auction_vs_reference_difference",
          priceBasis: "auction_price",
          inputs: {
            auction_price: property.auction_price,
            reference_value: reference.value,
            reference_basis: reference.basis,
          },
        }),
      };
    }
  }

  // --- Unit analysis ---
  const buildingOk = isValidPositiveArea(property.floor_size);
  let perBuildingM2: UnitAnalysisResult;
  if (
    isValidPositiveAmount(property.auction_price) &&
    buildingOk
  ) {
    const raw = calculatePricePerUnit(
      property.auction_price,
      property.floor_size!,
    );
    perBuildingM2 = {
      label: unitAnalysisLabel("auction_price", "building_m2"),
      value: raw != null ? roundCurrency(raw) : null,
      display:
        raw != null
          ? `${moneyDisplay(roundCurrency(raw))}/m²`
          : "Not available",
      available: raw != null,
      reason: null,
      approximate: false,
      provenance: calculatedProvenance({
        propertyId: property.id,
        propertyMasterId: masterId,
        source: property.source_name ?? property.source,
        sourceUrl: property.source_url,
        verificationState: property.verification_state,
        calculationType: "auction_price_per_building_m2",
        priceBasis: "auction_price",
        inputs: {
          auction_price: property.auction_price,
          floor_size_m2: property.floor_size,
        },
      }),
    };
  } else {
    perBuildingM2 = {
      label: unitAnalysisLabel("auction_price", "building_m2"),
      value: null,
      display: "Not available",
      available: false,
      reason: !isValidPositiveAmount(property.auction_price)
        ? "Auction price not supplied"
        : "Building size not supplied",
      approximate: false,
      provenance: null,
    };
  }

  const hectares = property.agricultural_details?.totalHectares ?? null;
  const hectaresApprox = detectApproximateHectares(property);
  const farm = isFarmPropertyType(property.property_type);
  let perHectare: UnitAnalysisResult;
  if (
    premium &&
    farm &&
    isValidPositiveAmount(property.auction_price) &&
    isValidPositiveArea(hectares)
  ) {
    const raw = calculatePricePerUnit(property.auction_price, hectares!);
    perHectare = {
      label: unitAnalysisLabel("auction_price", "hectares"),
      value: raw != null ? roundCurrency(raw) : null,
      display:
        raw != null
          ? `${hectaresApprox ? "≈ " : ""}${moneyDisplay(roundCurrency(raw))}/Ha`
          : "Not available",
      available: raw != null,
      reason: hectaresApprox
        ? "Based on approximate agricultural land extent"
        : null,
      approximate: hectaresApprox,
      provenance: calculatedProvenance({
        propertyId: property.id,
        propertyMasterId: masterId,
        source: property.source_name ?? property.source,
        sourceUrl: property.source_url,
        verificationState: property.verification_state,
        calculationType: "auction_price_per_hectare",
        priceBasis: "auction_price",
        inputs: {
          auction_price: property.auction_price,
          totalHectares: hectares,
          approximate: hectaresApprox,
        },
      }),
    };
  } else {
    let reason = "Not available";
    if (!premium) reason = "Premium required for price per hectare analysis";
    else if (!farm) reason = "Not an agricultural / farm listing";
    else if (!isValidPositiveAmount(property.auction_price))
      reason = "Auction price not supplied";
    else if (!isValidPositiveArea(hectares))
      reason = "Hectares not supplied (agricultural_details.totalHectares)";
    perHectare = {
      label: unitAnalysisLabel("auction_price", "hectares"),
      value: null,
      display: "Not available",
      available: false,
      reason,
      approximate: false,
      provenance: null,
    };
    if (!isValidPositiveArea(hectares) && farm) {
      limitations.push(
        "Hectares not supplied — price per hectare unavailable.",
      );
    }
  }

  // --- Historical timeline (premium) ---
  const timeline: HistoricalPricePoint[] = [];
  if (premium && masterId) {
    const chronological = [...events].sort((a, b) => {
      const da = a.auction_date ? new Date(a.auction_date).getTime() : 0;
      const db = b.auction_date ? new Date(b.auction_date).getTime() : 0;
      return da - db;
    });
    for (const event of chronological) {
      const priced = eventPrice(event as AuctionEventRow);
      if (!priced) continue;
      timeline.push({
        auctionEventId: event.id,
        auctionDate: event.auction_date,
        status: event.status,
        price: priced.price,
        priceKind: priced.kind,
        priceLabel: priced.label,
        source: event.source_name,
        sourceUrl: event.source_url,
        verificationState: event.verification_state,
        historical: true,
      });
    }
  }

  let change: HistoricalPriceChange | null = null;
  if (premium && timeline.length >= 2) {
    const first = timeline[0]!;
    const last = timeline[timeline.length - 1]!;
    const delta = calculateHistoricalChange(first.price, last.price);
    if (delta) {
      const pct = roundPercent(delta.percentage);
      change = {
        fromDate: first.auctionDate,
        toDate: last.auctionDate,
        fromPrice: first.price,
        toPrice: last.price,
        absolute: roundCurrency(delta.absolute),
        absoluteDisplay: signedMoneyClean(delta.absolute),
        percentage: pct,
        percentageDisplay: percentDisplay(pct),
        narrative: `Historical auction-price change ${percentDisplay(pct)}`,
        provenance: calculatedProvenance({
          propertyId: property.id,
          propertyMasterId: masterId,
          calculationType: "historical_auction_price_change",
          inputs: {
            from_price: first.price,
            to_price: last.price,
            from_event_id: first.auctionEventId,
            to_event_id: last.auctionEventId,
          },
        }),
      };
    }
  }

  let historicalNote: string | null = null;
  if (!premium) {
    historicalNote =
      "Historical auction-price timeline is available on Premium.";
  } else if (!masterId) {
    historicalNote =
      "Insufficient verified historical price data — no Property Master linked.";
  } else if (timeline.length === 0) {
    historicalNote = "Insufficient verified historical price data.";
  }

  const dataQuality: PriceDataQuality = {
    priceDataAvailable: isValidPositiveAmount(property.auction_price),
    referencePriceAvailable: Boolean(reference),
    buildingSizeAvailable: buildingOk,
    landSizeAvailable: isValidPositiveArea(hectares),
    historicalPriceDataAvailable: timeline.length > 0,
    sourceVerified: property.verification_state === "verified",
  };

  return {
    propertyId: property.id,
    propertyMasterId: masterId,
    premium,
    methodologyVersion: PRICING_METHODOLOGY_VERSION,
    current: {
      auctionPrice,
      reservePrice,
      guidePrice,
      estimatedValue,
      auctionDate: property.auction_date,
      auctionType: property.listing_status ?? property.status,
      agency: property.auction_agency ?? property.source_name,
    },
    difference: premium || difference ? difference : null,
    // Free users still see basic per-m²; hectares gated above.
    unitAnalysis: {
      perBuildingM2,
      perHectare: premium
        ? perHectare
        : {
            ...perHectare,
            available: false,
            display: "Not available",
            reason: "Premium required for price per hectare analysis",
            provenance: null,
          },
    },
    historical: {
      timeline: premium ? timeline : [],
      change: premium ? change : null,
      note: historicalNote,
    },
    dataQuality,
    methodology,
    limitations,
    conflictNote: input.conflictDetected
      ? "Price conflict detected — verified listing price is protected; new source evidence requires review."
      : null,
  };
}

export { NOT_SUPPLIED, NOT_ENOUGH_VERIFIED_DATA };
