/**
 * Live Property History Backfill validation.
 * Writes PROPERTY_HISTORY_BACKFILL_LIVE.json
 *
 * Usage:
 *   npx --yes tsx --env-file=.env.local scripts/property-history-backfill-live.ts
 */
import { readFileSync, writeFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";
import { isPubliclyActiveListing } from "../lib/data/publicListingPolicy";
import {
  buildHistoricalDataset,
  publicHistoricalRows,
} from "../lib/intelligence/historical";
import type { HistoricalListingInput } from "../lib/intelligence/historical/historicalAggregation";
import type { AuctionEventRow } from "../lib/identity";
import type { Property } from "../lib/types/property";

function loadEnv() {
  for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([^#=]+)=(.*)$/);
    if (m && !process.env[m[1]!.trim()]) {
      process.env[m[1]!.trim()] = m[2]!.trim().replace(/^["']|["']$/g, "");
    }
  }
}

function supabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env");
  return createClient(url, key, { auth: { persistSession: false } });
}

function toListing(p: Property): HistoricalListingInput {
  return {
    id: p.id,
    title: p.title,
    property_type: p.property_type,
    listing_status: p.listing_status,
    status: p.status,
    verification_state: p.verification_state,
    data_classification: p.data_classification,
    auction_date: p.auction_date,
    auction_price: p.auction_price,
    reserve_price: p.reserve_price,
    estimated_value: p.estimated_value,
    floor_size: p.floor_size,
    erf_size: p.erf_size,
    bedrooms: p.bedrooms,
    bathrooms: p.bathrooms,
    province: p.province,
    town: p.town,
    suburb: p.suburb,
    municipality: p.municipality ?? null,
    auction_agency: p.auction_agency,
    source_name: p.source_name,
    source_url: p.source_url,
    property_master_id: p.property_master_id ?? null,
    farm_name: p.farm_name ?? null,
  };
}

async function main() {
  loadEnv();
  const db = supabase();
  const runId = `live-${Date.now()}`;

  const { PropertyHistoryBackfillService } = await import(
    "../lib/services/PropertyHistoryBackfillService"
  );

  const preview = await PropertyHistoryBackfillService.preview({ limit: 500 });
  let backfillExecuted = false;
  let backfillSummary = null;

  if (preview.schemaAvailable && process.env.BACKFILL_EXECUTE === "1") {
    backfillSummary = await PropertyHistoryBackfillService.backfill({
      limit: 500,
      dryRun: false,
    });
    backfillExecuted = true;
  }

  const { data: masters } = await db.from("property_masters").select("id").limit(5000);
  const { data: events } = await db.from("auction_events").select("*").limit(5000);
  const { data: properties } = await db.from("properties").select("*").limit(500);
  const { data: observations } = await db
    .from("pricing_observations")
    .select("*")
    .limit(500);

  const listings = (properties ?? []) as Property[];
  const dataset = buildHistoricalDataset({
    events: ((events ?? []) as AuctionEventRow[]) ?? [],
    listings: listings.map(toListing),
    observations: observations ?? [],
    masters: (masters ?? []) as never,
  });
  const publicHist = publicHistoricalRows(dataset);
  const eventBacked = dataset.filter((o) => o.sourceUnit === "auction_event");
  const listingFallback = dataset.filter((o) => o.sourceUnit === "listing_fallback");

  const publicCatalogue = listings.filter((p) =>
    isPubliclyActiveListing({
      verification_state: p.verification_state,
      data_classification: p.data_classification,
      listing_status: p.listing_status,
      status: p.status,
      auction_date: p.auction_date,
    }),
  );

  const historicalLeaks = listings.filter(
    (p) =>
      ["expired", "sold", "withdrawn"].includes(p.verification_state ?? "") &&
      isPubliclyActiveListing({
        verification_state: p.verification_state,
        data_classification: p.data_classification,
        listing_status: p.listing_status,
        status: p.status,
        auction_date: p.auction_date,
      }),
  );

  const sourceBreakdown: Record<string, number> = {};
  for (const p of listings) {
    const key = p.source_name?.trim() || "unknown";
    sourceBreakdown[key] = (sourceBreakdown[key] ?? 0) + 1;
  }

  const audit = await PropertyHistoryBackfillService.audit(preview.runId);
  const publicSafety = await PropertyHistoryBackfillService.publicCatalogueSafetyCheck();

  const evidence = {
    runId,
    timestamp: new Date().toISOString(),
    migrationApplied: preview.schemaAvailable,
    preview,
    backfillExecuted,
    backfillSummary,
    recordsScanned: backfillSummary?.recordsScanned ?? preview.recordsScanned,
    mastersCreated: backfillSummary?.mastersCreated ?? preview.mastersCreated,
    mastersMatched: backfillSummary?.mastersMatched ?? preview.mastersMatched,
    reviewRequired: backfillSummary?.masterReview ?? preview.masterReview,
    eventsCreated: backfillSummary?.eventsCreated ?? preview.eventsCreated,
    eventsMatched: backfillSummary?.eventsMatched ?? preview.eventsMatched,
    duplicatesSkipped: backfillSummary?.duplicatesSkipped ?? preview.duplicatesSkipped,
    conflicts: backfillSummary?.identityConflicts ?? preview.identityConflicts,
    unresolvedRecords: backfillSummary?.insufficientEvidence ?? preview.insufficientEvidence,
    pricingLinked: backfillSummary?.pricingLinked ?? preview.pricingLinked,
    sourceBreakdown,
    database: {
      property_masters: masters?.length ?? 0,
      auction_events: events?.length ?? 0,
      pricing_observations: observations?.length ?? 0,
    },
    historicalIntelligence: {
      eventBacked: eventBacked.length,
      listingFallback: listingFallback.length,
      publicHistoricalRows: publicHist.length,
    },
    verification: {
      publicCatalogueCount: publicCatalogue.length,
      historicalLeaks: historicalLeaks.length,
      publicSafety,
    },
    pendingReviews: audit.pendingReviewCount,
  };

  writeFileSync(
    "PROPERTY_HISTORY_BACKFILL_LIVE.json",
    JSON.stringify(evidence, null, 2),
    "utf8",
  );

  console.log(JSON.stringify(evidence, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
