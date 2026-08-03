/**
 * Optional agricultural extension for Farm property types.
 * All fields remain optional; residential listings leave this null.
 */
export type AgriculturalDetails = {
  farmCategory?: string | null;
  totalHectares?: number | null;
  arableHectares?: number | null;
  grazingHectares?: number | null;
  irrigatedHectares?: number | null;
  waterRights?: string | null;
  dams?: number | null;
  boreholes?: number | null;
  livestockFacilities?: string | null;
  farmHouses?: number | null;
  outbuildings?: string | null;
  electricity?: string | null;
  fencing?: string | null;
  pivotIrrigation?: boolean | null;
  cropInformation?: string | null;
  gameFarm?: boolean | null;
  vatStatus?: string | null;
  additionalImprovements?: string | null;
};

export const AGRICULTURAL_FIELD_LABELS: Record<
  keyof AgriculturalDetails,
  string
> = {
  farmCategory: "Farm category",
  totalHectares: "Total hectares",
  arableHectares: "Arable hectares",
  grazingHectares: "Grazing hectares",
  irrigatedHectares: "Irrigated hectares",
  waterRights: "Water rights",
  dams: "Dams",
  boreholes: "Boreholes",
  livestockFacilities: "Livestock facilities",
  farmHouses: "Farm houses",
  outbuildings: "Outbuildings",
  electricity: "Electricity",
  fencing: "Fencing",
  pivotIrrigation: "Pivot irrigation",
  cropInformation: "Crop information",
  gameFarm: "Game farm",
  vatStatus: "VAT status",
  additionalImprovements: "Additional improvements",
};

export function isFarmPropertyType(
  propertyType: string | null | undefined,
): boolean {
  return /farm|smallholding|agricultural/i.test(propertyType?.trim() ?? "");
}

export function parseAgriculturalDetails(
  value: unknown,
): AgriculturalDetails | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as AgriculturalDetails;
}

export function hasAgriculturalContent(
  details: AgriculturalDetails | null | undefined,
): boolean {
  if (!details) return false;
  return Object.values(details).some((v) => {
    if (v == null) return false;
    if (typeof v === "string") return v.trim().length > 0;
    if (typeof v === "number") return Number.isFinite(v);
    if (typeof v === "boolean") return true;
    return false;
  });
}

export function formatAgriculturalValue(
  key: keyof AgriculturalDetails,
  value: AgriculturalDetails[keyof AgriculturalDetails],
): string | null {
  if (value == null) return null;
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return null;
    if (key.toLowerCase().includes("hectares")) {
      return `${value} ha`;
    }
    return String(value);
  }
  const trimmed = String(value).trim();
  return trimmed || null;
}
