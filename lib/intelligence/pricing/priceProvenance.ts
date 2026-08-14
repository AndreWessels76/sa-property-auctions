import type { PriceBasis, PriceFieldKind, ReferenceBasis } from "./priceBasis";

export const PRICING_METHODOLOGY_VERSION = "2A.1.0";

export type PriceProvenance = {
  propertyId: string;
  propertyMasterId: string | null;
  auctionEventId: string | null;
  source: string | null;
  sourceUrl: string | null;
  verificationState: string | null;
  field: PriceFieldKind | "calculated";
  calculationType?: string;
  calculationTimestamp?: string;
  methodologyVersion: string;
  inputs?: Record<string, number | string | boolean | null>;
};

export function fieldProvenance(input: {
  propertyId: string;
  propertyMasterId?: string | null;
  auctionEventId?: string | null;
  source?: string | null;
  sourceUrl?: string | null;
  verificationState?: string | null;
  field: PriceFieldKind;
}): PriceProvenance {
  return {
    propertyId: input.propertyId,
    propertyMasterId: input.propertyMasterId ?? null,
    auctionEventId: input.auctionEventId ?? null,
    source: input.source ?? null,
    sourceUrl: input.sourceUrl ?? null,
    verificationState: input.verificationState ?? null,
    field: input.field,
    methodologyVersion: PRICING_METHODOLOGY_VERSION,
  };
}

export function calculatedProvenance(input: {
  propertyId: string;
  propertyMasterId?: string | null;
  auctionEventId?: string | null;
  source?: string | null;
  sourceUrl?: string | null;
  verificationState?: string | null;
  calculationType: string;
  inputs: Record<string, number | string | boolean | null>;
  priceBasis?: PriceBasis | ReferenceBasis;
}): PriceProvenance {
  return {
    propertyId: input.propertyId,
    propertyMasterId: input.propertyMasterId ?? null,
    auctionEventId: input.auctionEventId ?? null,
    source: input.source ?? null,
    sourceUrl: input.sourceUrl ?? null,
    verificationState: input.verificationState ?? null,
    field: "calculated",
    calculationType: input.calculationType,
    calculationTimestamp: new Date().toISOString(),
    methodologyVersion: PRICING_METHODOLOGY_VERSION,
    inputs: {
      ...input.inputs,
      priceBasis: input.priceBasis ?? null,
    },
  };
}
