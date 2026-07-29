import {
  normalizePropertyType,
  normalizeProvince,
  normalizeTitle,
} from "@/lib/ai/normalizers";
import type { AISearchDTO } from "@/lib/dto/AISearchDTO";
import type { PropertySearchDTO } from "@/lib/dto/PropertySearchDTO";

interface RawAIPropertySearchResponse {
  search?: string | null;
  province?: string | null;
  town?: string | null;
  suburb?: string | null;
  propertyType?: string | null;
  minPrice?: number | string | null;
  maxPrice?: number | string | null;
  minBedrooms?: number | string | null;
  maxBedrooms?: number | string | null;
  minBathrooms?: number | string | null;
  auctionFrom?: string | null;
  auctionTo?: string | null;
  status?: string | null;
  source?: string | null;
  confidence?: number | string | null;
  suggestions?: string[] | null;
}

function pickString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed || undefined;
}

function pickNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value.replace(/,/g, ""));

    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return undefined;
}

export function mapPropertySearchResponse(
  originalQuery: string,
  raw: unknown,
): AISearchDTO {
  const data = (
    raw && typeof raw === "object" ? raw : {}
  ) as RawAIPropertySearchResponse;

  const filters: PropertySearchDTO = {};

  const search = pickString(data.search);
  if (search) {
    filters.search = search;
  }

  const province = pickString(data.province);
  if (province) {
    filters.province = normalizeProvince(province);
  }

  const town = pickString(data.town);
  if (town) {
    filters.town = normalizeTitle(town);
  }

  const suburb = pickString(data.suburb);
  if (suburb) {
    filters.suburb = normalizeTitle(suburb);
  }

  const propertyType = pickString(data.propertyType);
  if (propertyType) {
    filters.propertyType = normalizePropertyType(propertyType);
  }

  const minPrice = pickNumber(data.minPrice);
  if (minPrice != null) {
    filters.minPrice = minPrice;
  }

  const maxPrice = pickNumber(data.maxPrice);
  if (maxPrice != null) {
    filters.maxPrice = maxPrice;
  }

  const minBedrooms = pickNumber(data.minBedrooms);
  if (minBedrooms != null) {
    filters.minBedrooms = minBedrooms;
  }

  const maxBedrooms = pickNumber(data.maxBedrooms);
  if (maxBedrooms != null) {
    filters.maxBedrooms = maxBedrooms;
  }

  const minBathrooms = pickNumber(data.minBathrooms);
  if (minBathrooms != null) {
    filters.minBathrooms = minBathrooms;
  }

  const auctionFrom = pickString(data.auctionFrom);
  if (auctionFrom) {
    filters.auctionFrom = auctionFrom;
  }

  const auctionTo = pickString(data.auctionTo);
  if (auctionTo) {
    filters.auctionTo = auctionTo;
  }

  const status = pickString(data.status);
  if (status) {
    filters.status = status;
  }

  const source = pickString(data.source);
  if (source) {
    filters.source = source;
  }

  if (!filters.search && Object.keys(filters).length === 0) {
    filters.search = originalQuery;
  }

  const confidence = pickNumber(data.confidence);
  const suggestions = Array.isArray(data.suggestions)
    ? data.suggestions.filter(
        (item): item is string =>
          typeof item === "string" && item.trim().length > 0,
      )
    : [];

  return {
    originalQuery,
    filters,
    confidence:
      confidence != null
        ? Math.min(1, Math.max(0, confidence))
        : 0.5,
    suggestions,
  };
}
