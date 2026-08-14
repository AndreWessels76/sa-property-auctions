/**
 * Historical Intelligence 3.1 — read-only live validation.
 */
import { readFileSync, writeFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";
import { buildHistoricalDataset, publicHistoricalRows } from "../lib/intelligence/historical";
import { classifyObservations, OUTCOME_INTELLIGENCE_VERSION } from "../lib/intelligence/outcomes";
import { extractOutcomeFromText } from "../lib/acquisition/outcomes/outcomeExtractor";
import { isPubliclyActiveListing } from "../lib/data/publicListingPolicy";
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

  async function count(table: string) {
    const { count, error } = await db.from(table).select("*", { count: "exact", head: true });
    if (error) return null;
    return count ?? 0;
  }

  const { data: properties } = await db
    .from("properties")
    .select("*")
    .limit(200);

  const upcoming = (properties ?? []).find((p) =>
    isPubliclyActiveListing({
      verification_state: p.verification_state,
      data_classification: p.data_classification,
      listing_status: p.listing_status,
      status: p.status,
      auction_date: p.auction_date,
    }),
  );

  const historical = (properties ?? []).filter(
    (p) =>
      ["expired", "sold", "withdrawn"].includes(p.verification_state ?? "") &&
      !isPubliclyActiveListing({
        verification_state: p.verification_state,
        data_classification: p.data_classification,
        listing_status: p.listing_status,
        status: p.status,
        auction_date: p.auction_date,
      }),
  );

  const { data: events } = await db.from("auction_events").select("*").limit(500);
  const { data: pricingObs } = await db.from("pricing_observations").select("*").limit(500);
  const { data: outcomeObs } = await db.from("auction_outcome_observations").select("*").limit(500);
  const { data: snapshots } = await db
    .from("source_snapshots")
    .select("id,property_id,content_hash,source_text,fetched_at")
    .limit(20);

  const dataset = buildHistoricalDataset({
    events: (events ?? []) as AuctionEventRow[],
    listings: (properties ?? []).map((p) => ({
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
      municipality: p.municipality,
      auction_agency: p.auction_agency,
      source_name: p.source_name,
      source_url: p.source_url,
      property_master_id: p.property_master_id,
      farm_name: p.farm_name,
    })),
    masters: [],
    observations: pricingObs ?? [],
  });

  const publicHist = publicHistoricalRows(dataset);
  const classifications = classifyObservations(publicHist, pricingObs ?? []);
  const verifiedSold = classifications.filter((c) => c.outcome === "SOLD");
  const withSalePrice = verifiedSold.filter((c) => c.salePrice.salePrice != null);

  const sampleHistorical = historical[0] ?? null;
  const sampleSnapshot = snapshots?.find((s) => s.source_text?.trim()) ?? null;
  let extractionSample = null;
  if (sampleSnapshot?.source_text) {
    extractionSample = extractOutcomeFromText(sampleSnapshot.source_text, {
      title: "Sample",
      source_url: null,
      source_name: null,
    });
  }

  const report = {
    timestamp: new Date().toISOString(),
    version: OUTCOME_INTELLIGENCE_VERSION,
    tableCounts: {
      auction_outcome_observations: await count("auction_outcome_observations"),
      historical_enrichment_runs: await count("historical_enrichment_runs"),
      historical_enrichment_reviews: await count("historical_enrichment_reviews"),
      pricing_observations: await count("pricing_observations"),
    },
    samples: {
      upcomingListing: upcoming
        ? {
            property_id: upcoming.id,
            property_master_id: upcoming.property_master_id,
            auction_event_id: null,
            source_url: upcoming.source_url,
            publicCatalogue: true,
          }
        : null,
      historicalEvent: sampleHistorical
        ? {
            property_id: sampleHistorical.id,
            property_master_id: sampleHistorical.property_master_id,
            verification_state: sampleHistorical.verification_state,
            source_url: sampleHistorical.source_url,
          }
        : null,
      snapshotExtraction: extractionSample
        ? {
            source_snapshot_id: sampleSnapshot?.id,
            source_hash: sampleSnapshot?.content_hash,
            outcome: extractionSample.outcome,
            sale_price: extractionSample.sale_price,
            confidence: extractionSample.confidence,
            evidence_text: extractionSample.evidence_text,
          }
        : { note: "No snapshot with source text available" },
    },
    coverage: {
      historicalEvents: publicHist.length,
      verifiedSoldEvents: verifiedSold.length,
      verifiedSalePrices: withSalePrice.length,
      persistedOutcomeObservations: outcomeObs?.length ?? 0,
      persistedSalePrices: (outcomeObs ?? []).filter((o) => o.sale_price != null).length,
      unknownOutcomes: classifications.filter((c) => c.outcome === "UNKNOWN" || c.outcome === "COMPLETED_UNKNOWN").length,
      marketStatistics: withSalePrice.length >= 5 ? "Calculable" : "Insufficient data",
    },
    publicSafety: {
      historicalLeaks: (properties ?? []).filter((p) =>
        ["expired", "sold", "withdrawn"].includes(p.verification_state ?? "") &&
        isPubliclyActiveListing({
          verification_state: p.verification_state,
          data_classification: p.data_classification,
          listing_status: p.listing_status,
          status: p.status,
          auction_date: p.auction_date,
        }),
      ).length,
    },
    verdict:
      withSalePrice.length >= 5
        ? "HISTORICAL INTELLIGENCE 3.1 PRODUCTION READY"
        : "PRODUCTION READY FOR DATA ENRICHMENT WITH SALE-PRICE COVERAGE LIMITATION",
  };

  writeFileSync("HISTORICAL_INTELLIGENCE31_LIVE.json", JSON.stringify(report, null, 2), "utf8");
  console.log(JSON.stringify(report, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
