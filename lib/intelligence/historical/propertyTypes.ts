/**
 * Property-type and market-category mapping for historical grouping.
 * Uncertain types are Needs verification — never dumped into Other.
 */

import { classifyPropertyType } from "@/lib/platform/propertyClassification";
import { matchesAgriculturalType } from "@/lib/intelligence/agriculturalSearch";
import type { HistoricalMarketCategory } from "./types";

const AGRICULTURAL_SUBTYPES = [
  "Guest Farm",
  "Lifestyle Farm",
  "Game Farm",
  "Wine Farm",
  "Citrus Farm",
  "Macadamia Farm",
  "Dairy Farm",
  "Smallholding",
  "Agricultural Land",
] as const;

export function resolveHistoricalPropertyType(input: {
  propertyType?: string | null;
  title?: string | null;
}): {
  propertyType: string | null;
  status: "known" | "needs_verification";
  marketCategory: HistoricalMarketCategory;
  agriculturalSubtype: string | null;
} {
  const classified = classifyPropertyType({
    propertyType: input.propertyType,
    title: input.title,
    description: null,
  });

  if (!classified || classified === "Other") {
    const raw = input.propertyType?.trim() || null;
    return {
      propertyType: raw,
      status: "needs_verification",
      marketCategory: "Needs verification",
      agriculturalSubtype: null,
    };
  }

  return {
    propertyType: classified,
    status: "known",
    marketCategory: marketCategoryForType(classified),
    agriculturalSubtype: agriculturalSubtypeFor(classified, input),
  };
}

export function marketCategoryForType(type: string): HistoricalMarketCategory {
  if (
    /house|townhouse|apartment|duet|cluster|guest\s*house/i.test(type) &&
    !/farm/i.test(type)
  ) {
    return "Residential";
  }
  if (/retail|office|mixed\s*use|^commercial$/i.test(type)) return "Commercial";
  if (/warehouse|^industrial$/i.test(type)) return "Industrial";
  if (
    /farm|smallholding|agricultural/i.test(type)
  ) {
    return "Agricultural";
  }
  if (/vacant|development\s*land/i.test(type)) return "Vacant Land";
  return "Needs verification";
}

function agriculturalSubtypeFor(
  classified: string,
  input: { propertyType?: string | null; title?: string | null },
): string | null {
  for (const sub of AGRICULTURAL_SUBTYPES) {
    if (classified.toLowerCase() === sub.toLowerCase()) return sub;
  }
  const map: Array<[string, string]> = [
    ["guest_farm", "Guest Farm"],
    ["lifestyle_farm", "Lifestyle Farm"],
    ["game_farm", "Game Farm"],
    ["wine", "Wine Farm"],
    ["citrus", "Citrus Farm"],
    ["macadamia", "Macadamia Farm"],
    ["dairy", "Dairy Farm"],
    ["smallholding", "Smallholding"],
    ["agricultural_land", "Agricultural Land"],
  ];
  for (const [id, label] of map) {
    if (
      matchesAgriculturalType(
        { property_type: classified, title: input.title },
        id,
      ) &&
      id !== "farm"
    ) {
      return label;
    }
  }
  if (/^farm$/i.test(classified)) return null;
  return null;
}
