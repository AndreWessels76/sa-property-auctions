/**
 * Progressive identifier search for historical sources (HEA 4.3).
 */

import type { Hea43SearchContext, Hea43SourceCandidate } from "./types";
import { scoreSourceCandidate } from "./sourceCandidateScoring";

export function buildSearchIdentifiers(ctx: Hea43SearchContext): string[] {
  const { event } = ctx;
  const ids: string[] = [];

  if (event.auctionEventId) ids.push(`auction_event:${event.auctionEventId}`);
  if (ctx.externalListingId) ids.push(`listing_id:${ctx.externalListingId}`);
  if (ctx.partnerReference) ids.push(`partner_ref:${ctx.partnerReference}`);
  if (event.sourceUrl) ids.push(`source_url:${event.sourceUrl}`);
  if (event.propertyMasterId) ids.push(`property_master:${event.propertyMasterId}`);
  if (event.suburb && event.town) ids.push(`address:${event.suburb}, ${event.town}`);
  if (event.farmName) ids.push(`farm:${event.farmName}`);
  if (event.auctionDate && event.agency) {
    ids.push(`date_agency:${event.auctionDate}|${event.agency}`);
  }

  return ids;
}

export function searchHistoricalSources(ctx: Hea43SearchContext): Hea43SourceCandidate[] {
  const { event } = ctx;
  const candidates: Hea43SourceCandidate[] = [];

  if (event.sourceUrl?.trim()) {
    candidates.push(
      scoreSourceCandidate({
        sourceUrl: event.sourceUrl,
        event,
        exactUrlMatch: true,
        sourceType: event.sourceUrl.includes("bidderschoice")
          ? "OFFICIAL_AUCTION_RESULT_PAGE"
          : "LICENSED_AGENCY_ARCHIVE",
      }),
    );
  }

  // Only licensed exact URLs — no fabricated alternate URLs
  return candidates.sort((a, b) => b.score - a.score);
}
