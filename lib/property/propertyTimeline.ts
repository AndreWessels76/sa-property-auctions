import type { PropertyHistoryEventInput } from "@/lib/identity/history";
import type { AuctionEventRow } from "@/lib/identity";
import type { PropertyDTO } from "@/lib/dto/PropertyDTO";

/**
 * Property Timeline — deterministic events from master history + listing fields.
 */

export type TimelineEvent = {
  id: string;
  at: string;
  category: string;
  title: string;
  detail: string | null;
};

export function buildPropertyTimeline(input: {
  property: PropertyDTO;
  history?: PropertyHistoryEventInput[];
  auctionEvents?: Array<Pick<AuctionEventRow, "id" | "auction_date" | "status" | "agency" | "imported_at">>;
}): TimelineEvent[] {
  const events: TimelineEvent[] = [];

  if (input.property.imported_at) {
    events.push({
      id: "imported",
      at: input.property.imported_at,
      category: "import",
      title: "Imported",
      detail: input.property.source_name
        ? `From ${input.property.source_name}`
        : null,
    });
  }

  if (input.property.last_verified_at) {
    events.push({
      id: "verified",
      at: input.property.last_verified_at,
      category: "verification",
      title: "Verified",
      detail: "Approved for production catalogue when active",
    });
  }

  for (const ae of input.auctionEvents ?? []) {
    events.push({
      id: `auction-${ae.id}`,
      at: ae.auction_date || ae.imported_at,
      category: "auction",
      title: `Auction event · ${ae.status}`,
      detail: ae.agency ? `Agency: ${ae.agency}` : null,
    });
  }

  for (const h of input.history ?? []) {
    events.push({
      id: `hist-${h.category}-${h.field_name ?? "x"}-${h.new_value ?? ""}`,
      at: new Date().toISOString(),
      category: h.category,
      title: h.field_name
        ? `${h.category}: ${h.field_name}`
        : h.category,
      detail: [h.old_value, h.new_value].filter(Boolean).join(" → ") || null,
    });
  }

  if (
    input.property.verification_state === "sold" ||
    input.property.listing_status === "sold"
  ) {
    events.push({
      id: "sold",
      at: input.property.last_verified_at || input.property.imported_at || new Date().toISOString(),
      category: "status",
      title: "Sold",
      detail: "Recorded sold status — historical only",
    });
  }

  return events.sort((a, b) => a.at.localeCompare(b.at));
}
