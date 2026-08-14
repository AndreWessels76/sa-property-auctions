import type { PropertySearchDTO } from "@/lib/dto/PropertySearchDTO";

/** Premium-only catalogue filters. Free search still gets province/type/price/date/beds. */
export const ADVANCED_SEARCH_KEYS = [
  "minErfSize",
  "maxErfSize",
  "minFloorSize",
  "maxFloorSize",
  "minHectares",
  "maxHectares",
  "agriculturalType",
  "agency",
  "minGarages",
] as const;

export function hasAdvancedSearchFilters(filters: PropertySearchDTO): boolean {
  return ADVANCED_SEARCH_KEYS.some((key) => {
    const value = filters[key];
    if (value == null) return false;
    if (typeof value === "string") return value.trim().length > 0;
    return true;
  });
}

export function applySearchFilterAccess(
  filters: PropertySearchDTO,
  premium: boolean,
): PropertySearchDTO {
  if (premium) return filters;
  const next: PropertySearchDTO = { ...filters };
  delete next.minErfSize;
  delete next.maxErfSize;
  delete next.minFloorSize;
  delete next.maxFloorSize;
  delete next.minHectares;
  delete next.maxHectares;
  delete next.agriculturalType;
  delete next.agency;
  delete next.minGarages;
  return next;
}
