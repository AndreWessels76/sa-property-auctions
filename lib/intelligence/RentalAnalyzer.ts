import type { PropertyDTO } from "@/lib/dto/PropertyDTO";

export interface RentalAnalysis {
  estimatedMonthlyRent: number | null;
  purchasePrice: number | null;
  /** Estimated Monthly Rent ÷ Purchase Price */
  rentalYield: number | null;
  /** Same ratio as a monthly percentage */
  rentalYieldPercent: number | null;
  /** Annualised gross yield: (monthly rent × 12) ÷ purchase price × 100 */
  annualRentalYieldPercent: number | null;
}

function locationFactor(property: PropertyDTO): number {
  const town = (property.town ?? "").toLowerCase();
  const province = (property.province ?? "").toLowerCase();

  if (
    town.includes("sandton") ||
    town.includes("cape town") ||
    town.includes("stellenbosch")
  ) {
    return 1.25;
  }

  if (
    town.includes("pretoria") ||
    town.includes("johannesburg") ||
    town.includes("durban") ||
    town.includes("centurion")
  ) {
    return 1.1;
  }

  if (province.includes("gauteng") || province.includes("western cape")) {
    return 1.05;
  }

  return 1;
}

function typeFactor(property: PropertyDTO): number {
  const type = (property.property_type ?? "").toLowerCase();

  if (type.includes("apartment") || type.includes("flat")) return 1.05;
  if (type.includes("townhouse")) return 1;
  if (type.includes("house") || type.includes("home")) return 0.95;
  if (type.includes("commercial")) return 1.15;
  if (type.includes("farm") || type.includes("land") || type.includes("vacant")) {
    return 0.4;
  }

  return 0.9;
}

/**
 * Rough SA market estimate when no rent comps exist.
 * Base ≈ R4 500 per bedroom, adjusted by type and location.
 */
export function estimateMonthlyRent(property: PropertyDTO): number | null {
  const bedrooms = property.bedrooms ?? 0;

  if (bedrooms <= 0 && !property.property_type) {
    return null;
  }

  const beds = Math.max(bedrooms, 1);
  const base = beds * 4500;
  const estimate = Math.round(base * typeFactor(property) * locationFactor(property));

  return estimate > 0 ? estimate : null;
}

export class RentalAnalyzer {
  /**
   * Rental Yield = Estimated Monthly Rent ÷ Purchase Price
   */
  static analyse(property: PropertyDTO): RentalAnalysis {
    const estimatedMonthlyRent = estimateMonthlyRent(property);
    const purchasePrice =
      (property.auction_price ?? 0) > 0 ? property.auction_price : null;

    if (
      estimatedMonthlyRent == null ||
      purchasePrice == null ||
      purchasePrice <= 0
    ) {
      return {
        estimatedMonthlyRent,
        purchasePrice,
        rentalYield: null,
        rentalYieldPercent: null,
        annualRentalYieldPercent: null,
      };
    }

    const rentalYield = estimatedMonthlyRent / purchasePrice;

    return {
      estimatedMonthlyRent,
      purchasePrice,
      rentalYield,
      rentalYieldPercent: Number((rentalYield * 100).toFixed(3)),
      annualRentalYieldPercent: Number((rentalYield * 12 * 100).toFixed(2)),
    };
  }
}
