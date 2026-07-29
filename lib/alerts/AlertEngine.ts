import type { PropertyDTO } from "@/lib/dto/PropertyDTO";
import type { PropertySearchDTO } from "@/lib/dto/PropertySearchDTO";
import type { SavedSearchDTO } from "@/lib/dto/SavedSearchDTO";
import type { AlertType } from "@/lib/repositories/AlertRepository";
import { IntelligenceAlertDetector } from "./IntelligenceAlertDetector";

export interface AlertMatch {
  savedSearchId?: string;
  userId: string;
  propertyId: string;
  type: AlertType;
  title: string;
  message: string;
}

function isWildcard(value?: string | null): boolean {
  return !value || value.trim() === "" || value === "All";
}

function matchesText(property: PropertyDTO, term: string): boolean {
  const needle = term.trim().toLowerCase();

  if (!needle) {
    return true;
  }

  const haystack = [
    property.title,
    property.town,
    property.suburb,
    property.province,
    property.address,
    property.property_type,
    property.description,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return haystack.includes(needle);
}

export function propertyMatchesFilters(
  property: PropertyDTO,
  filters: PropertySearchDTO,
): boolean {
  if (filters.search && !matchesText(property, filters.search)) {
    return false;
  }

  if (
    !isWildcard(filters.province) &&
    property.province !== filters.province
  ) {
    return false;
  }

  if (filters.town && property.town !== filters.town) {
    return false;
  }

  if (filters.suburb && property.suburb !== filters.suburb) {
    return false;
  }

  if (
    !isWildcard(filters.propertyType) &&
    property.property_type !== filters.propertyType
  ) {
    return false;
  }

  const price = property.auction_price ?? 0;

  if (filters.minPrice != null && price < filters.minPrice) {
    return false;
  }

  if (filters.maxPrice != null && filters.maxPrice > 0 && price > filters.maxPrice) {
    return false;
  }

  if (
    filters.minBedrooms != null &&
    (property.bedrooms ?? 0) < filters.minBedrooms
  ) {
    return false;
  }

  if (
    filters.maxBedrooms != null &&
    (property.bedrooms ?? 0) > filters.maxBedrooms
  ) {
    return false;
  }

  if (
    filters.minBathrooms != null &&
    (property.bathrooms ?? 0) < filters.minBathrooms
  ) {
    return false;
  }

  if (filters.source && property.source !== filters.source) {
    return false;
  }

  if (filters.status && property.status !== filters.status) {
    return false;
  }

  return true;
}

export function propertyMatchesSavedSearch(
  property: PropertyDTO,
  savedSearch: SavedSearchDTO,
): boolean {
  if (!savedSearch.active) {
    return false;
  }

  return propertyMatchesFilters(property, savedSearch.filters);
}

export class AlertEngine {
  static matches(
    property: PropertyDTO,
    savedSearch: SavedSearchDTO,
  ): boolean {
    return propertyMatchesSavedSearch(property, savedSearch);
  }

  static findSearchMatches(
    property: PropertyDTO,
    savedSearches: SavedSearchDTO[],
  ): AlertMatch[] {
    return savedSearches
      .filter((savedSearch) => this.matches(property, savedSearch))
      .map((savedSearch) => ({
        savedSearchId: savedSearch.id,
        userId: savedSearch.userId,
        propertyId: property.id,
        type: "NEW_MATCH" as const,
        title: `Match: ${savedSearch.name}`,
        message: buildMatchMessage(property, savedSearch),
      }));
  }

  static evaluate(
    property: PropertyDTO,
    savedSearches: SavedSearchDTO[],
    options?: {
      previousPrice?: number | null;
      extraUserIds?: string[];
    },
  ): {
    matched: boolean;
    matches: AlertMatch[];
  } {
    const searchMatches = this.findSearchMatches(property, savedSearches);
    const signals = IntelligenceAlertDetector.detect(
      property,
      options?.previousPrice,
    );

    const interestedUserIds = new Set<string>([
      ...searchMatches.map((match) => match.userId),
      ...(options?.extraUserIds ?? []),
    ]);

    const matches: AlertMatch[] = [...searchMatches];

    for (const userId of interestedUserIds) {
      for (const signal of signals) {
        matches.push({
          userId,
          propertyId: property.id,
          type: signal.type,
          title: signal.title,
          message: signal.message,
        });
      }
    }

    return {
      matched: matches.length > 0,
      matches,
    };
  }
}

function buildMatchMessage(
  property: PropertyDTO,
  savedSearch: SavedSearchDTO,
): string {
  const parts = [property.title];

  if (property.town) {
    parts.push(property.town);
  }

  if (property.auction_price != null && property.auction_price > 0) {
    parts.push(
      `R${property.auction_price.toLocaleString("en-ZA")}`,
    );
  }

  parts.push(`saved search "${savedSearch.name}"`);

  return parts.join(" · ");
}
