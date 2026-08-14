import type { PropertyDTO } from "@/lib/dto/PropertyDTO";

/**
 * Agricultural search tokens — matched against verified type/title/farm category only.
 * Never infers crop, water rights, or yield from missing fields.
 */
export const AGRICULTURAL_SEARCH_TYPES = [
  { id: "hectares", label: "Hectares (size filter)", needles: [] as string[] },
  { id: "farm", label: "Farm", needles: ["farm"] },
  { id: "smallholding", label: "Smallholding", needles: ["smallholding"] },
  {
    id: "agricultural_land",
    label: "Agricultural land",
    needles: ["agricultural land", "agricultural"],
  },
  { id: "guest_farm", label: "Guest farm", needles: ["guest farm"] },
  { id: "lifestyle_farm", label: "Lifestyle farm", needles: ["lifestyle farm"] },
  { id: "game_farm", label: "Game farm", needles: ["game farm", "game"] },
  { id: "macadamia", label: "Macadamia", needles: ["macadamia"] },
  { id: "citrus", label: "Citrus", needles: ["citrus"] },
  { id: "dairy", label: "Dairy", needles: ["dairy"] },
  { id: "wine", label: "Wine", needles: ["wine farm", "vineyard", "winery"] },
  { id: "mixed", label: "Mixed agricultural", needles: ["mixed farm", "mixed farming"] },
] as const;

export type AgriculturalSearchId =
  (typeof AGRICULTURAL_SEARCH_TYPES)[number]["id"];

export function agriculturalSearchNeedle(
  id: string | null | undefined,
): string | null {
  const row = AGRICULTURAL_SEARCH_TYPES.find((t) => t.id === id);
  if (!row || row.needles.length === 0) return null;
  return row.needles[0];
}

export function matchesAgriculturalType(
  property: {
    property_type?: string | null;
    title?: string | null;
    agricultural_details?: PropertyDTO["agricultural_details"];
  },
  agriculturalType: string | null | undefined,
): boolean {
  if (!agriculturalType?.trim()) return true;
  const row = AGRICULTURAL_SEARCH_TYPES.find(
    (t) => t.id === agriculturalType.trim(),
  );
  if (!row || row.needles.length === 0) return true;

  const hay = [
    property.property_type,
    property.title,
    property.agricultural_details?.farmCategory,
    property.agricultural_details?.cropInformation,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return row.needles.some((n) => hay.includes(n));
}

/** Hectares only from verified agricultural_details — never convert erf_size. */
export function suppliedHectares(
  property: Pick<PropertyDTO, "agricultural_details">,
): number | null {
  const ha = property.agricultural_details?.totalHectares;
  if (ha == null || !Number.isFinite(ha) || ha <= 0) return null;
  return ha;
}
