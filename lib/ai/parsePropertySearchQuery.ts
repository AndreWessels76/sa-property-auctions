import { normalizePropertyType, normalizeProvince } from "@/lib/ai/normalizers";
import { validateProvince } from "@/lib/ai/provinceValidator";
import { findTownInQuery } from "@/lib/ai/towns";
import type { AISearchDTO } from "@/lib/dto/AISearchDTO";
import type { PropertySearchDTO } from "@/lib/dto/PropertySearchDTO";

const PROVINCE_PATTERNS: Record<string, string> = {
  gauteng: "Gauteng",
  "western cape": "Western Cape",
  "eastern cape": "Eastern Cape",
  "kwazulu-natal": "KwaZulu-Natal",
  "kwa zulu natal": "KwaZulu-Natal",
  limpopo: "Limpopo",
  "free state": "Free State",
  mpumalanga: "Mpumalanga",
  "north west": "North West",
  "northern cape": "Northern Cape",
};

const PROPERTY_TYPE_PATTERNS: Array<{ pattern: RegExp; type: string }> = [
  { pattern: /\b(houses?|homes?)\b/i, type: "House" },
  { pattern: /\b(apartments?|flats?)\b/i, type: "Apartment" },
  { pattern: /\b(townhouses?)\b/i, type: "Townhouse" },
  { pattern: /\b(farms?)\b/i, type: "Farm" },
  { pattern: /\b(commercial)\b/i, type: "Commercial" },
  { pattern: /\b(vacant land|plots?)\b/i, type: "Vacant Land" },
];

function parsePriceAmount(value: string, unit?: string): number {
  const amount = Number(value.replace(/,/g, ""));

  if (!Number.isFinite(amount)) {
    return 0;
  }

  const normalizedUnit = unit?.toLowerCase() ?? "";

  if (
    normalizedUnit.startsWith("m") ||
    normalizedUnit.includes("million") ||
    normalizedUnit.includes("mil")
  ) {
    return Math.round(amount * 1_000_000);
  }

  if (normalizedUnit === "k") {
    return Math.round(amount * 1_000);
  }

  return Math.round(amount);
}

function extractMaxPrice(query: string): number | undefined {
  const patterns = [
    /(?:under|below|less than|max|up to)\s*(?:r\s*)?([\d.,]+)\s*(million|mil|m|k)?/i,
    /\b(?:r\s*)?([\d.,]+)\s*(million|mil|m)\b/i,
  ];

  for (const pattern of patterns) {
    const match = query.match(pattern);
    if (match) {
      const price = parsePriceAmount(match[1], match[2]);
      if (price > 0) {
        return price;
      }
    }
  }

  return undefined;
}

function extractMinPrice(query: string): number | undefined {
  const match = query.match(
    /(?:over|above|from|min|at least)\s*(?:r\s*)?([\d.,]+)\s*(million|mil|m|k)?/i,
  );

  if (!match) {
    return undefined;
  }

  const price = parsePriceAmount(match[1], match[2]);
  return price > 0 ? price : undefined;
}

function extractBedrooms(query: string): number | undefined {
  const match = query.match(/(\d+)\s*(?:bed|bedroom|bedrooms|br)\b/i);
  return match ? Number(match[1]) : undefined;
}

function extractBathrooms(query: string): number | undefined {
  const match = query.match(/(\d+)\s*(?:bath|bathroom|bathrooms)\b/i);
  return match ? Number(match[1]) : undefined;
}

function extractProvince(query: string): string | undefined {
  const lower = query.toLowerCase();
  const keys = Object.keys(PROVINCE_PATTERNS).sort((a, b) => b.length - a.length);

  for (const key of keys) {
    if (lower.includes(key)) {
      return PROVINCE_PATTERNS[key];
    }
  }

  return undefined;
}

function extractPropertyType(query: string): string | undefined {
  for (const { pattern, type } of PROPERTY_TYPE_PATTERNS) {
    if (pattern.test(query)) {
      return normalizePropertyType(type);
    }
  }

  return undefined;
}

function extractSort(query: string): PropertySearchDTO["sort"] | undefined {
  const lower = query.toLowerCase();

  if (/(cheapest|lowest price|price low)/i.test(lower)) {
    return "price-low";
  }

  if (/(most expensive|highest price|price high)/i.test(lower)) {
    return "price-high";
  }

  if (/(highest value|market value|value high)/i.test(lower)) {
    return "value-high";
  }

  if (/(auction|soonest|upcoming)/i.test(lower)) {
    return "auction";
  }

  return undefined;
}

function buildSuggestions(filters: PropertySearchDTO): string[] {
  const suggestions: string[] = [];

  if (!filters.town && !filters.province) {
    suggestions.push("Add a town or province, e.g. Pretoria or Gauteng.");
  }

  if (!filters.propertyType) {
    suggestions.push("Specify a property type, e.g. house or apartment.");
  }

  if (!filters.minPrice && !filters.maxPrice) {
    suggestions.push("Add a price range, e.g. under R1.5 million.");
  }

  if (!filters.minBedrooms) {
    suggestions.push("Mention bedrooms, e.g. 3 bedroom.");
  }

  return suggestions.slice(0, 3);
}

function calculateConfidence(filters: PropertySearchDTO): number {
  const fields = [
    filters.search,
    filters.province,
    filters.town,
    filters.suburb,
    filters.propertyType,
    filters.minPrice,
    filters.maxPrice,
    filters.minBedrooms,
    filters.maxBedrooms,
    filters.minBathrooms,
    filters.sort,
  ].filter((value) => value != null && value !== "");

  return Math.min(1, fields.length / 5);
}

export function parsePropertySearchQuery(query: string): AISearchDTO {
  const trimmed = query.trim();
  const filters: PropertySearchDTO = {};

  const town = findTownInQuery(trimmed);
  if (town) {
    filters.town = town;
  }

  const province = extractProvince(trimmed);
  if (province) {
    filters.province = normalizeProvince(province);
  } else if (filters.town) {
    filters.province = validateProvince(filters.town, "");
  }

  if (filters.town && filters.province) {
    filters.province = validateProvince(filters.town, filters.province);
  }

  const propertyType = extractPropertyType(trimmed);
  if (propertyType) {
    filters.propertyType = propertyType;
  }

  const minBedrooms = extractBedrooms(trimmed);
  if (minBedrooms) {
    filters.minBedrooms = minBedrooms;
  }

  const minBathrooms = extractBathrooms(trimmed);
  if (minBathrooms) {
    filters.minBathrooms = minBathrooms;
  }

  const maxPrice = extractMaxPrice(trimmed);
  if (maxPrice) {
    filters.maxPrice = maxPrice;
  }

  const minPrice = extractMinPrice(trimmed);
  if (minPrice) {
    filters.minPrice = minPrice;
  }

  const sort = extractSort(trimmed);
  if (sort) {
    filters.sort = sort;
  }

  if (
    !filters.town &&
    !filters.province &&
    !filters.propertyType &&
    !filters.maxPrice &&
    !filters.minPrice &&
    !filters.minBedrooms
  ) {
    filters.search = trimmed;
  }

  return {
    originalQuery: trimmed,
    filters,
    confidence: calculateConfidence(filters),
    suggestions: buildSuggestions(filters),
  };
}
