import type { PropertySearchDTO } from "@/lib/dto/PropertySearchDTO";

function parseNumber(value: string | null): number | undefined {
  if (!value) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

const SORT_OPTIONS: PropertySearchDTO["sort"][] = [
  "auction",
  "price-low",
  "price-high",
  "value-high",
];

export function parsePropertySearchParams(
  searchParams: URLSearchParams,
): PropertySearchDTO {
  const filters: PropertySearchDTO = {};

  const search = searchParams.get("search")?.trim();
  if (search) {
    filters.search = search;
  }

  const province = searchParams.get("province")?.trim();
  if (province) {
    filters.province = province;
  }

  const town = searchParams.get("town")?.trim();
  if (town) {
    filters.town = town;
  }

  const suburb = searchParams.get("suburb")?.trim();
  if (suburb) {
    filters.suburb = suburb;
  }

  const propertyType = searchParams.get("propertyType")?.trim();
  if (propertyType) {
    filters.propertyType = propertyType;
  }

  const source = searchParams.get("source")?.trim();
  if (source) {
    filters.source = source;
  }

  const status = searchParams.get("status")?.trim();
  if (status) {
    filters.status = status;
  }

  const minPrice = parseNumber(searchParams.get("minPrice"));
  if (minPrice) {
    filters.minPrice = minPrice;
  }

  const maxPrice = parseNumber(searchParams.get("maxPrice"));
  if (maxPrice) {
    filters.maxPrice = maxPrice;
  }

  const minEstimatedValue = parseNumber(
    searchParams.get("minEstimatedValue"),
  );
  if (minEstimatedValue) {
    filters.minEstimatedValue = minEstimatedValue;
  }

  const maxEstimatedValue = parseNumber(
    searchParams.get("maxEstimatedValue"),
  );
  if (maxEstimatedValue) {
    filters.maxEstimatedValue = maxEstimatedValue;
  }

  const minBedrooms = parseNumber(searchParams.get("minBedrooms"));
  if (minBedrooms) {
    filters.minBedrooms = minBedrooms;
  }

  const maxBedrooms = parseNumber(searchParams.get("maxBedrooms"));
  if (maxBedrooms) {
    filters.maxBedrooms = maxBedrooms;
  }

  const minBathrooms = parseNumber(searchParams.get("minBathrooms"));
  if (minBathrooms) {
    filters.minBathrooms = minBathrooms;
  }

  const maxBathrooms = parseNumber(searchParams.get("maxBathrooms"));
  if (maxBathrooms) {
    filters.maxBathrooms = maxBathrooms;
  }

  const auctionFrom = searchParams.get("auctionFrom")?.trim();
  if (auctionFrom) {
    filters.auctionFrom = auctionFrom;
  }

  const auctionTo = searchParams.get("auctionTo")?.trim();
  if (auctionTo) {
    filters.auctionTo = auctionTo;
  }

  const minGarages = parseNumber(searchParams.get("minGarages"));
  if (minGarages) {
    filters.minGarages = minGarages;
  }

  const minErfSize = parseNumber(searchParams.get("minErfSize"));
  if (minErfSize) {
    filters.minErfSize = minErfSize;
  }

  const maxErfSize = parseNumber(searchParams.get("maxErfSize"));
  if (maxErfSize) {
    filters.maxErfSize = maxErfSize;
  }

  const minFloorSize = parseNumber(searchParams.get("minFloorSize"));
  if (minFloorSize) {
    filters.minFloorSize = minFloorSize;
  }

  const maxFloorSize = parseNumber(searchParams.get("maxFloorSize"));
  if (maxFloorSize) {
    filters.maxFloorSize = maxFloorSize;
  }

  const minHectares = parseNumber(searchParams.get("minHectares"));
  if (minHectares) {
    filters.minHectares = minHectares;
  }

  const maxHectares = parseNumber(searchParams.get("maxHectares"));
  if (maxHectares) {
    filters.maxHectares = maxHectares;
  }

  const agriculturalType = searchParams.get("agriculturalType")?.trim();
  if (agriculturalType) {
    filters.agriculturalType = agriculturalType;
  }

  const agency = searchParams.get("agency")?.trim();
  if (agency) {
    filters.agency = agency;
  }

  const sort = searchParams.get("sort");
  if (SORT_OPTIONS.includes(sort as PropertySearchDTO["sort"])) {
    filters.sort = sort as PropertySearchDTO["sort"];
  }

  const page = parseNumber(searchParams.get("page"));
  if (page) {
    filters.page = page;
  }

  const pageSize = parseNumber(searchParams.get("pageSize"));
  if (pageSize) {
    filters.pageSize = pageSize;
  }

  return filters;
}

export function hasPropertySearchFilters(
  filters: PropertySearchDTO,
): boolean {
  return Object.keys(filters).length > 0;
}
