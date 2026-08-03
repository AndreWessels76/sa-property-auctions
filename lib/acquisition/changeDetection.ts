import type { Property } from "@/lib/types/property";
import type { ExtractedListing } from "@/lib/acquisition/types";
import { createServiceClient } from "@/lib/supabase/admin";
import { LoggerService } from "@/lib/logger";

export type DetectedChange = {
  changeType: string;
  fieldName: string;
  oldValue: string | null;
  newValue: string | null;
};

const TRACKED: Array<{ field: keyof Property; label: string; changeType: string }> = [
  { field: "auction_price", label: "auction_price", changeType: "price_change" },
  { field: "auction_date", label: "auction_date", changeType: "auction_date_change" },
  { field: "status", label: "status", changeType: "status_change" },
  { field: "listing_status", label: "listing_status", changeType: "status_change" },
  { field: "description", label: "description", changeType: "description_change" },
  { field: "auction_agency", label: "auction_agency", changeType: "agency_change" },
  { field: "source_content_hash", label: "source_content_hash", changeType: "content_change" },
];

export function detectListingChanges(
  existing: Property,
  incoming: Partial<Property>,
): DetectedChange[] {
  const changes: DetectedChange[] = [];
  for (const track of TRACKED) {
    const oldVal = existing[track.field];
    const newVal = incoming[track.field];
    if (newVal === undefined || newVal === null) continue;
    const oldStr = oldVal == null ? null : String(oldVal);
    const newStr = String(newVal);
    if (oldStr !== newStr) {
      changes.push({
        changeType: track.changeType,
        fieldName: track.label,
        oldValue: oldStr,
        newValue: newStr,
      });
    }
  }
  return changes;
}

export async function persistListingChanges(input: {
  propertyId: string;
  connectorId: string;
  externalListingId?: string | null;
  jobId?: string | null;
  changes: DetectedChange[];
}): Promise<void> {
  if (!input.changes.length) return;
  try {
    const db = createServiceClient();
    const rows = input.changes.map((c) => ({
      property_id: input.propertyId,
      connector_id: input.connectorId,
      external_listing_id: input.externalListingId ?? null,
      change_type: c.changeType,
      field_name: c.fieldName,
      old_value: c.oldValue,
      new_value: c.newValue,
      job_id: input.jobId ?? null,
    }));
    const { error } = await db.from("listing_change_events").insert(rows);
    if (error) {
      LoggerService.warn("acquisition.change_persist_failed", {
        error: error.message,
      });
    }
  } catch (error) {
    LoggerService.warn("acquisition.change_persist_unavailable", {
      error: error instanceof Error ? error.message : "unknown",
    });
  }
}

export function listingContentHash(listing: ExtractedListing): string {
  const basis = [
    listing.title,
    listing.auctionDate,
    listing.auctionPrice,
    listing.description,
    listing.imageUrls.join("|"),
    listing.auctionAgency,
    listing.listingStatus,
  ].join("::");
  // Simple deterministic hash without crypto dependency issues in edge
  let h = 0;
  for (let i = 0; i < basis.length; i += 1) {
    h = (Math.imul(31, h) + basis.charCodeAt(i)) | 0;
  }
  return `bc_${Math.abs(h).toString(16)}_${basis.length}`;
}
