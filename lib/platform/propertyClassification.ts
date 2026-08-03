/**
 * Property classification — Verified Data Platform 2.0
 * Never default to "Other" unless classification confidence is insufficient.
 */

export const PLATFORM_PROPERTY_TYPES = [
  "House",
  "Townhouse",
  "Apartment",
  "Duet",
  "Cluster",
  "Vacant Land",
  "Commercial",
  "Industrial",
  "Retail",
  "Office",
  "Warehouse",
  "Mixed Use",
  "Guest House",
  "Guest Farm",
  "Lifestyle Farm",
  "Game Farm",
  "Wine Farm",
  "Citrus Farm",
  "Macadamia Farm",
  "Dairy Farm",
  "Mixed Farming",
  "Smallholding",
  "Agricultural Land",
  "Development Land",
  "Farm",
  "Other",
] as const;

export type PlatformPropertyType = (typeof PLATFORM_PROPERTY_TYPES)[number];

/** Map fine-grained types onto catalogue search buckets. */
export function propertyTypeSearchBucket(type: string | null | undefined): string {
  const t = (type ?? "").trim();
  if (!t) return "Other";
  if (/apartment|flat/i.test(t)) return "Apartment";
  if (/townhouse|duet|cluster|simplex|duplex/i.test(t)) return "Townhouse";
  if (/house|guest\s*house|dwelling|home/i.test(t)) return "House";
  if (/vacant|stand|plot|erf|development\s*land/i.test(t) && !/farm/i.test(t)) {
    return "Vacant Land";
  }
  if (/retail|office|mixed\s*use|commercial/i.test(t)) return "Commercial";
  if (/warehouse|industrial/i.test(t)) return "Industrial";
  if (
    /farm|smallholding|agricultural|macadamia|citrus|dairy|wine|game|lifestyle|guest\s*farm/i.test(
      t,
    )
  ) {
    return "Farm";
  }
  return t;
}

/**
 * Classify from title + type + description signals. Deterministic — never invents.
 * Returns null when no signal exists.
 */
export function classifyPropertyType(input: {
  propertyType?: string | null;
  title?: string | null;
  description?: string | null;
}): PlatformPropertyType | null {
  const hay = [input.propertyType, input.title, input.description]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (!hay.trim()) return null;

  // Agricultural / farm specialties first (most specific)
  if (/macadamia/.test(hay)) return "Macadamia Farm";
  if (/citrus|orange\s*farm|lemon\s*farm/.test(hay)) return "Citrus Farm";
  if (/dairy\s*farm|dairy\s*farming/.test(hay)) return "Dairy Farm";
  if (/mixed\s*farm/.test(hay)) return "Mixed Farming";
  if (/wine\s*farm|vineyard|winery/.test(hay)) return "Wine Farm";
  if (/game\s*farm|game\s*lodge|hunting/.test(hay)) return "Game Farm";
  if (/guest\s*farm/.test(hay)) return "Guest Farm";
  if (/lifestyle\s*farm/.test(hay)) return "Lifestyle Farm";
  if (/smallholding|small\s*holding|plot\s*with\s*house/.test(hay)) {
    return "Smallholding";
  }
  if (/agricultural\s*land|grazing\s*land|veld/.test(hay) && /farm|land|hectare|ha\b/.test(hay)) {
    return "Agricultural Land";
  }
  if (/development\s*land|township|rezon/.test(hay)) return "Development Land";
  if (/\bfarm\b|plaas/.test(hay)) return "Farm";

  if (/guest\s*house|guesthouse|bnb|b&b/.test(hay)) return "Guest House";
  if (/\bduet\b/.test(hay)) return "Duet";
  if (/\bcluster\b/.test(hay)) return "Cluster";
  if (/townhouse|simplex|duplex/.test(hay)) return "Townhouse";
  if (/apartment|flat\b|sectional\s*title\s*unit/.test(hay)) return "Apartment";
  if (/\bwarehouse\b/.test(hay)) return "Warehouse";
  if (/\bretail\b|shopping\s*centre|shop\b/.test(hay)) return "Retail";
  if (/\boffice\b/.test(hay)) return "Office";
  if (/mixed[\s-]?use/.test(hay)) return "Mixed Use";
  if (/industrial|factory|workshop/.test(hay)) return "Industrial";
  if (/commercial|business\s*premises/.test(hay)) return "Commercial";
  if (
    (/vacant|stand|plot|erf\b|portion\b/.test(hay) || /vacant\s*land/.test(hay)) &&
    !/farm/.test(hay)
  ) {
    return "Vacant Land";
  }
  if (/house|dwelling|home|residence|freehold/.test(hay)) return "House";

  // Exact match against known types
  for (const t of PLATFORM_PROPERTY_TYPES) {
    if (t.toLowerCase() === (input.propertyType ?? "").trim().toLowerCase()) {
      return t;
    }
  }

  // Prefer existing non-Other type over inventing Other from noise
  const existing = (input.propertyType ?? "").trim();
  if (existing && !/^other$/i.test(existing)) {
    const bucket = propertyTypeSearchBucket(existing);
    if (bucket !== "Other") return bucket as PlatformPropertyType;
  }

  return "Other";
}
