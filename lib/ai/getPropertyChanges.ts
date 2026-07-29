import type { Property } from "@/lib/types/property";

export type FieldChange = {
  old: string | number | null;
  new: string | number | null;
};

export type PropertyChanges = Record<string, FieldChange>;

const TRACKED_FIELDS: (keyof Property)[] = [
  "title",
  "description",
  "address",
  "suburb",
  "town",
  "province",
  "property_type",
  "bedrooms",
  "bathrooms",
  "garages",
  "estimated_value",
  "auction_price",
  "auction_date",
  "status",
  "source",
];

export function getPropertyChanges(
  existing: Property,
  merged: Property,
): PropertyChanges {
  const changes: PropertyChanges = {};

  for (const field of TRACKED_FIELDS) {
    const oldValue = existing[field] ?? null;
    const newValue = merged[field] ?? null;

    if (oldValue !== newValue) {
      changes[field] = {
        old: oldValue as string | number | null,
        new: newValue as string | number | null,
      };
    }
  }

  return changes;
}
