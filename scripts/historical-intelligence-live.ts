/**
 * Read-only live validation for Historical Intelligence 2B.
 * Writes HISTORICAL_INTELLIGENCE_LIVE.json
 *
 * Usage:
 *   npx --yes tsx --env-file=.env.local scripts/historical-intelligence-live.ts
 */
import { readFileSync, writeFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";
import type { AuctionEventRow } from "../lib/identity";
import type { Property } from "../lib/types/property";
import { isPubliclyActiveListing } from "../lib/data/publicListingPolicy";
import {
  buildHistoricalDataset,
  buildHistoricalIntelligenceReport,
  publicHistoricalRows,
} from "../lib/intelligence/historical";
import { exclusionRecords } from "../lib/intelligence/historical/historicalCoverage";
import type { HistoricalListingInput } from "../lib/intelligence/historical/historicalAggregation";

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
    agricultural_details: p.agricultural_details
      ? {
          totalHectares: p.agricultural_details.totalHectares ?? null,
          farmCategory: p.agricultural_details.farmCategory ?? null,
        }
      : null,
  };
}

async function main() {
  loadEnv();
  const db = supabase();

  const { data: eventRows, error: eventError } = await db
    .from("auction_events")
    .select("*")
    .limit(500);

  const { data: propertyRows } = await db
    .from("properties")
    .select("*")
    .limit(500);

  const { data: obsRows } = await db
    .from("pricing_observations")
    .select("*")
    .limit(500);

  const { data: masterRows } = await db
    .from("property_masters")
    .select("*")
    .limit(200);

  const events = ((eventError ? [] : eventRows) ?? []) as AuctionEventRow[];
  const listings = (propertyRows ?? []) as Property[];
  const observations = obsRows ?? [];
  const masters = masterRows ?? [];

  const dataset = buildHistoricalDataset({
    events,
    listings: listings.map(toListing),
    masters: masters as never,
    observations: observations as never,
  });
  const report = buildHistoricalIntelligenceReport({
    observations: dataset,
    window: "all",
  });
  const publicHist = publicHistoricalRows(dataset);
  const exclusions = exclusionRecords(dataset);

  const upcoming = listings.find((row) =>
    isPubliclyActiveListing({
      verification_state: row.verification_state,
      listing_status: row.listing_status,
      status: row.status,
      auction_date: row.auction_date,
    }),
  );
  const expired = listings.find(
    (row) =>
      (row.listing_status ?? row.status ?? "").toLowerCase() === "expired" ||
      row.verification_state === "expired",
  );
  const sold = listings.find(
    (row) =>
      (row.listing_status ?? row.status ?? "").toLowerCase() === "sold" ||
      row.verification_state === "sold",
  );

  const evidence = {
    sprint: "Historical Intelligence 2B",
    generated_at: new Date().toISOString(),
    version: report.version,
    production_counts: {
      auction_events_loaded: events.length,
      auction_events_error: eventError?.message ?? null,
      properties_loaded: listings.length,
      property_masters_loaded: masters.length,
      pricing_observations_loaded: observations.length,
      dataset_observations: dataset.length,
      public_historical: publicHist.length,
      source_units: {
        auction_event: dataset.filter((d) => d.sourceUnit === "auction_event").length,
        listing_fallback: dataset.filter((d) => d.sourceUnit === "listing_fallback")
          .length,
      },
    },
    samples: {
      upcoming: upcoming
        ? {
            id: upcoming.id,
            title: upcoming.title,
            listing_status: upcoming.listing_status,
            public_catalogue: true,
            in_sale_stats: publicHist.some(
              (h) => h.listingPropertyId === upcoming.id && h.state === "sold",
            ),
          }
        : { error: "No upcoming public listing" },
      expired: expired
        ? {
            id: expired.id,
            title: expired.title,
            listing_status: expired.listing_status,
            public_catalogue: isPubliclyActiveListing({
              verification_state: expired.verification_state,
              listing_status: expired.listing_status,
              status: expired.status,
              auction_date: expired.auction_date,
            }),
            in_historical: publicHist.some((h) => h.listingPropertyId === expired.id),
          }
        : { error: "No expired listing in sample" },
      sold: sold
        ? {
            id: sold.id,
            title: sold.title,
            in_sale_stats: publicHist.some(
              (h) => h.listingPropertyId === sold.id && h.state === "sold",
            ),
          }
        : { error: "No sold listing in sample" },
    },
    metrics: {
      historicalEvents: report.activity.historicalEvents,
      sold: report.activity.sold,
      withdrawn: report.activity.withdrawn,
      cancelled: report.activity.cancelled,
      expired: report.activity.expired,
      unknownOutcome: report.activity.unknownOutcome,
      salePrice: {
        median: report.salePrice.median,
        average: report.salePrice.average,
        count: report.salePrice.count,
        coverage: report.salePrice.coverageLabel,
        sampleSafety: report.salePrice.sampleSafetyLabel,
      },
      auctionPrice: {
        median: report.auctionPrice.median,
        count: report.auctionPrice.count,
        coverage: report.auctionPrice.coverageLabel,
        sampleSafety: report.auctionPrice.sampleSafetyLabel,
      },
      salePricePerM2: {
        median: report.salePricePerM2.median,
        count: report.salePricePerM2.count,
        sampleSafety: report.salePricePerM2.sampleSafetyLabel,
      },
      salePricePerHa: {
        median: report.salePricePerHa.median,
        count: report.salePricePerHa.count,
        approximate: report.salePricePerHa.isApproximate,
        sampleSafety: report.salePricePerHa.sampleSafetyLabel,
      },
      insufficient: report.insufficient,
      insufficientMessage: report.insufficientMessage,
    },
    coverage: report.coverage,
    byArea: report.byArea.slice(0, 8),
    byAgency: report.byAgency.slice(0, 8),
    exclusions: exclusions.slice(0, 40),
    observation_preview: publicHist.slice(0, 12).map((h) => ({
      observationId: h.observationId,
      sourceUnit: h.sourceUnit,
      auctionEventId: h.auctionEventId,
      propertyMasterId: h.propertyMasterId,
      listingPropertyId: h.listingPropertyId,
      state: h.state,
      auctionDate: h.auctionDate,
      sale_price: h.prices.sale_price,
      auction_price: h.prices.auction_price,
      town: h.town,
      propertyType: h.propertyType,
      verified: h.verified,
    })),
  };

  writeFileSync(
    "HISTORICAL_INTELLIGENCE_LIVE.json",
    JSON.stringify(evidence, null, 2),
  );
  console.log(
    JSON.stringify(
      {
        ok: true,
        file: "HISTORICAL_INTELLIGENCE_LIVE.json",
        historicalEvents: report.activity.historicalEvents,
        sold: report.activity.sold,
        salePriceCount: report.salePrice.count,
        auctionEventsLoaded: events.length,
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
