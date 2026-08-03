/**
 * Property History Engine — append-only timeline.
 * Never overwrites prior history rows.
 */

export type HistoryCategory =
  | "auction"
  | "agency"
  | "image"
  | "description"
  | "price"
  | "verification"
  | "document"
  | "status"
  | "identity"
  | "lifecycle";

export type PropertyHistoryEventInput = {
  property_master_id: string;
  auction_event_id?: string | null;
  listing_property_id?: string | null;
  category: HistoryCategory;
  field_name?: string | null;
  old_value?: string | null;
  new_value?: string | null;
  source_name?: string | null;
  confidence?: number | null;
  meta?: Record<string, unknown> | null;
};

export function buildHistoryEvent(
  input: PropertyHistoryEventInput,
): PropertyHistoryEventInput {
  return {
    property_master_id: input.property_master_id,
    auction_event_id: input.auction_event_id ?? null,
    listing_property_id: input.listing_property_id ?? null,
    category: input.category,
    field_name: input.field_name ?? null,
    old_value: input.old_value ?? null,
    new_value: input.new_value ?? null,
    source_name: input.source_name ?? null,
    confidence: input.confidence ?? null,
    meta: input.meta ?? null,
  };
}

export function historyEventsFromFieldChanges(input: {
  propertyMasterId: string;
  listingPropertyId?: string | null;
  auctionEventId?: string | null;
  sourceName?: string | null;
  changes: Array<{
    field: string;
    oldValue?: string | null;
    newValue?: string | null;
  }>;
}): PropertyHistoryEventInput[] {
  const categoryFor = (field: string): HistoryCategory => {
    const f = field.toLowerCase();
    if (f.includes("auction") || f.includes("venue") || f.includes("reserve")) {
      return "auction";
    }
    if (f.includes("agency")) return "agency";
    if (f.includes("image")) return "image";
    if (f.includes("description") || f.includes("title")) return "description";
    if (f.includes("price") || f.includes("value") || f.includes("bid")) return "price";
    if (f.includes("verif")) return "verification";
    if (f.includes("link") || f.includes("document") || f.includes("brochure")) {
      return "document";
    }
    if (f.includes("status") || f.includes("lifecycle")) return "status";
    if (f.includes("fingerprint") || f.includes("identity") || f.includes("master")) {
      return "identity";
    }
    return "status";
  };

  return input.changes.map((c) =>
    buildHistoryEvent({
      property_master_id: input.propertyMasterId,
      listing_property_id: input.listingPropertyId,
      auction_event_id: input.auctionEventId,
      category: categoryFor(c.field),
      field_name: c.field,
      old_value: c.oldValue ?? null,
      new_value: c.newValue ?? null,
      source_name: input.sourceName ?? null,
    }),
  );
}
