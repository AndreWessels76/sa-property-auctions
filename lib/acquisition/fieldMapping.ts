/**
 * Field Mapping Engine — partner schema → SA Property Auctions schema.
 */

export type FieldMappingRule = {
  sourceField: string;
  targetField: string;
  required?: boolean;
  optional?: boolean;
  transform?: "trim" | "lowercase" | "uppercase" | "number" | "date_iso" | "passthrough";
  validation?: "url" | "email" | "province_sa" | "nonempty" | "none";
  defaultValue?: string | number | null;
};

export type FieldMappingVersion = {
  version: string;
  mappings: FieldMappingRule[];
  notes?: string;
};

export const PLATFORM_TARGET_FIELDS = [
  "title",
  "description",
  "streetAddress",
  "suburb",
  "town",
  "province",
  "postalCode",
  "latitude",
  "longitude",
  "propertyType",
  "bedrooms",
  "bathrooms",
  "garages",
  "landSize",
  "buildingSize",
  "auctionDate",
  "auctionTime",
  "auctionVenue",
  "auctionAgency",
  "auctionPrice",
  "estimatedValue",
  "sourceUrl",
  "externalListingId",
  "imageUrls",
  "brochureLink",
  "termsLink",
] as const;

export function applyFieldMappings(
  source: Record<string, unknown>,
  rules: FieldMappingRule[],
): { mapped: Record<string, unknown>; missingRequired: string[]; warnings: string[] } {
  const mapped: Record<string, unknown> = {};
  const missingRequired: string[] = [];
  const warnings: string[] = [];

  for (const rule of rules) {
    let raw = source[rule.sourceField];
    if (raw === undefined || raw === null || raw === "") {
      if (rule.defaultValue !== undefined) raw = rule.defaultValue;
    }
    if (raw === undefined || raw === null || raw === "") {
      if (rule.required) missingRequired.push(rule.sourceField);
      continue;
    }

    let value: unknown = raw;
    switch (rule.transform) {
      case "trim":
        value = String(raw).trim();
        break;
      case "lowercase":
        value = String(raw).trim().toLowerCase();
        break;
      case "uppercase":
        value = String(raw).trim().toUpperCase();
        break;
      case "number": {
        const n = Number(raw);
        if (!Number.isFinite(n)) {
          warnings.push(`Invalid number for ${rule.sourceField}`);
          continue;
        }
        value = n;
        break;
      }
      case "date_iso": {
        const d = new Date(String(raw));
        if (Number.isNaN(d.getTime())) {
          warnings.push(`Invalid date for ${rule.sourceField}`);
          continue;
        }
        value = d.toISOString();
        break;
      }
      default:
        value = raw;
    }

    if (rule.validation === "url" && typeof value === "string") {
      if (!/^https?:\/\//i.test(value)) {
        warnings.push(`Invalid URL for ${rule.sourceField}`);
        continue;
      }
    }
    if (rule.validation === "nonempty" && String(value).trim() === "") {
      if (rule.required) missingRequired.push(rule.sourceField);
      continue;
    }

    mapped[rule.targetField] = value;
  }

  return { mapped, missingRequired, warnings };
}

export function defaultBiddersChoiceMapping(): FieldMappingVersion {
  return {
    version: "1.0.0",
    notes: "Default mapping for Bidders Choice licensed envelopes",
    mappings: [
      { sourceField: "title", targetField: "title", required: true, transform: "trim" },
      { sourceField: "auctionDate", targetField: "auctionDate", required: true, transform: "date_iso" },
      { sourceField: "province", targetField: "province", required: true, transform: "trim" },
      { sourceField: "town", targetField: "town", required: true, transform: "trim" },
      { sourceField: "suburb", targetField: "suburb", optional: true, transform: "trim" },
      { sourceField: "streetAddress", targetField: "streetAddress", optional: true, transform: "trim" },
      { sourceField: "propertyType", targetField: "propertyType", optional: true, transform: "trim" },
      { sourceField: "sourceUrl", targetField: "sourceUrl", required: true, validation: "url" },
      { sourceField: "externalListingId", targetField: "externalListingId", required: true, transform: "trim" },
      { sourceField: "imageUrls", targetField: "imageUrls", optional: true },
    ],
  };
}
