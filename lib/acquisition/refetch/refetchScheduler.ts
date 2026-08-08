import { refetchPriority } from "./fetchPolicy";
import type { PropertyDTO } from "@/lib/dto/PropertyDTO";

/**
 * Order properties for batch refresh — live/upcoming first.
 */
export function scheduleRefetchOrder(properties: PropertyDTO[]): PropertyDTO[] {
  return [...properties].sort((a, b) => {
    const pa = refetchPriority({
      listingStatus: a.listing_status ?? a.status,
      auctionDate: a.auction_date,
    });
    const pb = refetchPriority({
      listingStatus: b.listing_status ?? b.status,
      auctionDate: b.auction_date,
    });
    return pb - pa;
  });
}

export function selectUpcomingForRefetch(
  properties: PropertyDTO[],
  limit = 25,
): PropertyDTO[] {
  const ordered = scheduleRefetchOrder(
    properties.filter((p) => Boolean(p.source_url?.trim())),
  );
  return ordered.slice(0, limit);
}
