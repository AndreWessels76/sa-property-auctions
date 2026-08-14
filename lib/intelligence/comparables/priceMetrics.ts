/**
 * Price per m² and price per hectare — verified inputs only.
 */

import { isValidPositiveAmount, isValidPositiveArea } from "@/lib/intelligence/pricing/priceCalculations";
import type { PricePerUnit, SaleEvidence } from "./types";

export function pricePerM2(
  evidence: SaleEvidence,
  floorSizeM2: number | null,
): PricePerUnit {
  if (evidence.salePriceConflict) {
    return {
      value: null,
      label: "Price/m²",
      calculable: false,
      reason: evidence.salePriceConflictNote,
      approximate: false,
    };
  }
  if (!isValidPositiveAmount(evidence.salePrice)) {
    return {
      value: null,
      label: "Price/m²",
      calculable: false,
      reason: "Not enough verified data — verified sale price required",
      approximate: false,
    };
  }
  if (!isValidPositiveArea(floorSizeM2)) {
    return {
      value: null,
      label: "Price/m²",
      calculable: false,
      reason: "Not enough verified data — verified floor/building size required",
      approximate: false,
    };
  }
  return {
    value: evidence.salePrice! / floorSizeM2!,
    label: "Price/m² (sale price ÷ floor size)",
    calculable: true,
    reason: null,
    approximate: false,
  };
}

export function pricePerHa(
  evidence: SaleEvidence,
  hectares: number | null,
  hectaresApproximate: boolean,
): PricePerUnit {
  if (evidence.salePriceConflict) {
    return {
      value: null,
      label: "Price/ha",
      calculable: false,
      reason: evidence.salePriceConflictNote,
      approximate: false,
    };
  }
  if (!isValidPositiveAmount(evidence.salePrice)) {
    return {
      value: null,
      label: "Price/ha",
      calculable: false,
      reason: "Not enough verified data — verified sale price required",
      approximate: false,
    };
  }
  if (!isValidPositiveArea(hectares)) {
    return {
      value: null,
      label: "Price/ha",
      calculable: false,
      reason: "Not enough verified data — verified agricultural hectares required",
      approximate: false,
    };
  }
  return {
    value: evidence.salePrice! / hectares!,
    label: hectaresApproximate
      ? "Price/ha (approximate hectares)"
      : "Price/ha (sale price ÷ hectares)",
    calculable: true,
    reason: null,
    approximate: hectaresApproximate,
  };
}

/** Land size must never substitute for floor size. */
export function rejectLandAsFloor(floorSize: number | null, landSize: number | null): boolean {
  return !isValidPositiveArea(floorSize) && isValidPositiveArea(landSize);
}
