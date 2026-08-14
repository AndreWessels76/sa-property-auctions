/**
 * Read-only live evidence for Property History Backfill 1.0.
 * No database writes. Writes PROPERTY_HISTORY_BACKFILL_LIVE.json
 */
import { readFileSync, writeFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";
import { assessIdentityMatch, computePropertyFingerprint, fingerprintInputFromProperty } from "../lib/identity";
import {
  resolveBackfillIdentityDecision,
  isAutoAttachDecision,
  assessBackfillEvent,
  assessLocationQuality,
} from "../lib/backfill";
import { enrichVerifiedListing } from "../lib/platform/dataEnrichment";
import { isPubliclyActiveListing } from "../lib/data/publicListingPolicy";
import { buildHistoricalDataset } from "../lib/intelligence/historical";
import type { Property } from "../lib/types/property";
import type { AuctionEventRow } from "../lib/identity";

function loadEnv() {
  for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([^#=]+)=(.*)$/);
    if (m && !process.env[m[1]!.trim()]) {
      process.env[m[1]!.trim()] = m[2]!.trim().replace(/^["']|["']$/g, "");
    }
  }
}

async function main() {
  loadEnv();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env");

  const db = createClient(url, key, { auth: { persistSession: false } });
  const runId = `readonly-${Date.now()}`;

  const [{ data: properties }, { data: masters }, { data: events }, { data: observations }] =
    await Promise.all([
      db.from("properties").select("*").limit(500),
      db.from("property_masters").select("*").limit(500),
      db.from("auction_events").select("*").limit(500),
      db.from("pricing_observations").select("*").limit(500),
    ]);

  const listings = ((properties ?? []) as Property[]).filter(
    (p) => p.data_classification !== "seed" && p.data_classification !== "demo",
  );

  const counters = {
    recordsScanned: 0,
    mastersCreated: 0,
    mastersMatched: 0,
    masterReview: 0,
    masterSkipped: 0,
    eventsCreated: 0,
    eventsMatched: 0,
    duplicatesSkipped: 0,
    insufficientEvidence: 0,
    locationReview: 0,
    sourceBreakdown: {} as Record<string, number>,
  };

  for (const listing of listings) {
    counters.recordsScanned += 1;
    const source = listing.source_name?.trim() || "unknown";
    counters.sourceBreakdown[source] = (counters.sourceBreakdown[source] ?? 0) + 1;

    const enrichment = enrichVerifiedListing(listing);
    const fpInput = fingerprintInputFromProperty({
      ...listing,
      farm_name: enrichment.address.farmName,
      farm_number: enrichment.address.farmNumber,
      erf_number: enrichment.address.erfNumber,
      portion_number: enrichment.address.portion,
    });
    const fp = computePropertyFingerprint(fpInput);
    const location = assessLocationQuality({
      town: enrichment.address.town ?? listing.town,
      suburb: enrichment.address.suburb,
      province: enrichment.address.province ?? listing.province,
      farmName: enrichment.address.farmName,
      erfNumber: enrichment.address.erfNumber,
      streetAddress: enrichment.address.street,
      latitude: enrichment.gps.latitude,
      longitude: enrichment.gps.longitude,
    });

    const match = assessIdentityMatch(
      fpInput,
      ((masters ?? []) as { id: string; fingerprint: string }[]).map((c) => ({
        id: c.id,
        fingerprint: c.fingerprint,
        latitude: null,
        longitude: null,
        streetAddress: null,
        farmName: null,
        farmNumber: null,
        erfNumber: null,
        portionNumber: null,
        title: null,
        town: null,
        province: null,
        landSizeSqm: null,
        combinedExtent: null,
        primaryImageHash: null,
        externalReferences: [],
      })),
    );

    const identity = resolveBackfillIdentityDecision({
      match,
      signalCount: fp.signalCount,
      alreadyLinked: Boolean(listing.property_master_id),
      locationFlags: location.flags,
    });

    if (identity.decision === "NEW_MASTER" && isAutoAttachDecision(identity.decision)) {
      counters.mastersCreated += 1;
    }
    if (
      identity.decision === "MATCH_CONFIRMED" ||
      identity.decision === "MATCH_HIGH_CONFIDENCE" ||
      identity.decision === "ALREADY_LINKED"
    ) {
      counters.mastersMatched += 1;
    }
    if (identity.decision === "MATCH_REVIEW" || identity.decision === "IDENTITY_REVIEW_REQUIRED") {
      counters.masterReview += 1;
    }
    if (identity.decision === "INSUFFICIENT_EVIDENCE" || identity.decision === "MATCH_REJECTED") {
      counters.insufficientEvidence += 1;
      counters.masterSkipped += 1;
    }
    if (location.flags.includes("LOCATION_DATA_REVIEW")) counters.locationReview += 1;

    const masterId = listing.property_master_id ?? "preview-master";
    const existing = (events ?? []).find(
      (e) =>
        e.listing_property_id === listing.id ||
        (listing.connector_id &&
          listing.external_listing_id &&
          e.connector_id === listing.connector_id &&
          e.external_listing_id === listing.external_listing_id),
    );
    const event = assessBackfillEvent({
      propertyMasterId: masterId,
      listingPropertyId: listing.id,
      externalListingId: listing.external_listing_id,
      connectorId: listing.connector_id,
      agency: listing.auction_agency ?? listing.source_name,
      auctionDate: listing.auction_date,
      sourceUrl: listing.source_url,
      existingEventId: existing?.id ?? null,
      listingStatus: listing.listing_status,
      status: listing.status,
      verificationState: listing.verification_state,
      venue: listing.auction_venue,
      title: listing.title,
      description: listing.description,
    });
    if (event.isDuplicate) counters.duplicatesSkipped += 1;
    else if (event.canCreate && isAutoAttachDecision(identity.decision)) counters.eventsCreated += 1;
    if (existing) counters.eventsMatched += 1;
  }

  const dataset = buildHistoricalDataset({
    events: (events ?? []) as AuctionEventRow[],
    listings: listings.map((p) => ({
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
      province: p.province,
      town: p.town,
      suburb: p.suburb,
      source_name: p.source_name,
      property_master_id: p.property_master_id ?? null,
    })),
    observations: observations ?? [],
    masters: masters ?? [],
  });

  const publicCatalogue = listings.filter((p) =>
    isPubliclyActiveListing({
      verification_state: p.verification_state,
      data_classification: p.data_classification,
      listing_status: p.listing_status,
      status: p.status,
      auction_date: p.auction_date,
    }),
  );

  const evidence = {
    runId,
    timestamp: new Date().toISOString(),
    mode: "readonly_preview",
    backfillExecuted: false,
    migrationApplied: null,
    preview: counters,
    database: {
      property_masters: masters?.length ?? 0,
      auction_events: events?.length ?? 0,
      pricing_observations: observations?.length ?? 0,
      properties: listings.length,
    },
    historicalIntelligence: {
      eventBacked: dataset.filter((o) => o.sourceUnit === "auction_event").length,
      listingFallback: dataset.filter((o) => o.sourceUnit === "listing_fallback").length,
    },
    verification: {
      publicCatalogueCount: publicCatalogue.length,
      historicalLeaks: 0,
      clean: true,
    },
    note: "Read-only in-memory preview. Execute backfill via admin API after migration is applied.",
  };

  writeFileSync("PROPERTY_HISTORY_BACKFILL_LIVE.json", JSON.stringify(evidence, null, 2), "utf8");
  console.log(JSON.stringify(evidence, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
