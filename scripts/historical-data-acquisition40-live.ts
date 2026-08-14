/**
 * Historical Data Acquisition 4.0 — read-only live validation.
 */
import { readFileSync, writeFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";
import { buildHistoricalDataset, publicHistoricalRows } from "../lib/intelligence/historical";
import { classifyObservations } from "../lib/intelligence/outcomes";
import { buildHistoricalEnrichmentQueue, queueSummary } from "../lib/acquisition/historical/queue";
import { HISTORICAL_DATA_ACQUISITION_VERSION } from "../lib/acquisition/historical/config";
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

  const { data: properties } = await db.from("properties").select("*").limit(500);
  const { data: events } = await db.from("auction_events").select("*").limit(500);
  const { data: pricingObs } = await db.from("pricing_observations").select("*").limit(500);
  const { data: outcomeObs } = await db.from("auction_outcome_observations").select("*").limit(500);
  const { data: enrichmentRuns } = await db
    .from("historical_enrichment_runs")
    .select("status")
    .limit(500);
  const { data: conflicts } = await db
    .from("historical_outcome_conflicts")
    .select("*")
    .eq("status", "open")
    .limit(100);

  const historicalProps = (properties ?? []).filter(
    (p) =>
      ["expired", "sold", "withdrawn", "verified"].includes(p.verification_state ?? "") &&
      !isPubliclyActiveListing({
        verification_state: p.verification_state,
        data_classification: p.data_classification,
        listing_status: p.listing_status,
        status: p.status,
        auction_date: p.auction_date,
      }),
  );

  const publicLeaks = (properties ?? []).filter((p) =>
    ["expired", "sold", "withdrawn"].includes(p.verification_state ?? "") &&
    isPubliclyActiveListing({
      verification_state: p.verification_state,
      data_classification: p.data_classification,
      listing_status: p.listing_status,
      status: p.status,
      auction_date: p.auction_date,
    }),
  );

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
  const queue = buildHistoricalEnrichmentQueue({ events: publicHist });
  const qs = queueSummary(queue);

  const runs = enrichmentRuns ?? [];
  const source200 = runs.filter((r) => ["COMPLETED", "NO_CHANGE"].includes(r.status)).length;
  const sourceNoChange = runs.filter((r) => r.status === "NO_CHANGE").length;
  const sourceChanged = runs.filter((r) => r.status === "COMPLETED").length;

  const sold = classifications.filter((c) => c.outcome === "SOLD").length;
  const passedIn = classifications.filter((c) => c.outcome === "PASSED_IN").length;
  const withdrawn = classifications.filter((c) => c.outcome === "WITHDRAWN").length;
  const cancelled = classifications.filter((c) => c.outcome === "CANCELLED").length;
  const postponed = classifications.filter((c) => c.outcome === "POSTPONED").length;
  const unknown = classifications.filter(
    (c) => c.outcome === "UNKNOWN" || c.outcome === "COMPLETED_UNKNOWN",
  ).length;

  const salePricesFound = (outcomeObs ?? []).filter((o) => o.sale_price != null).length;
  const salePricesVerified = classifications.filter(
    (c) =>
      c.salePrice.salePrice != null &&
      c.salePrice.salePriceConfidence !== "low" &&
      c.salePrice.salePriceConfidence !== "none",
  ).length;

  const idKeys = new Set(
    (outcomeObs ?? []).map((o) =>
      [o.property_id, o.auction_event_id, o.source_hash, o.outcome].join("|"),
    ),
  );
  const duplicates =
    (outcomeObs ?? []).length > 0 && idKeys.size < (outcomeObs ?? []).length
      ? (outcomeObs ?? []).length - idKeys.size
      : 0;

  const report = {
    timestamp: new Date().toISOString(),
    version: HISTORICAL_DATA_ACQUISITION_VERSION,
    historical_events: publicHist.length,
    processed: runs.length,
    source_200: source200,
    source_no_change: sourceNoChange,
    source_changed: sourceChanged,
    outcomes_found: (outcomeObs ?? []).filter(
      (o) => !["UNKNOWN", "COMPLETED_UNKNOWN"].includes(o.outcome ?? ""),
    ).length,
    sold,
    passed_in: passedIn,
    withdrawn,
    cancelled,
    postponed,
    unknown,
    sale_prices_found: salePricesFound,
    sale_prices_verified: salePricesVerified,
    sale_prices_rejected: (outcomeObs ?? []).filter(
      (o) => o.review_category != null && o.sale_price == null,
    ).length,
    conflicts: conflicts?.length ?? 0,
    identity_review: (outcomeObs ?? []).filter((o) => o.review_category === "IDENTITY_REVIEW")
      .length,
    duplicates,
    public_catalogue_leaks: publicLeaks.length,
    queue: qs,
    tableCounts: {
      property_masters: await count("property_masters"),
      auction_events: await count("auction_events"),
      properties: await count("properties"),
      historical_listings: historicalProps.length,
      auction_outcome_observations: await count("auction_outcome_observations"),
      historical_enrichment_runs: await count("historical_enrichment_runs"),
      historical_outcome_conflicts: await count("historical_outcome_conflicts"),
    },
    verdict:
      publicLeaks.length > 0
        ? "HISTORICAL DATA ACQUISITION 4.0 — NOT READY"
        : salePricesVerified >= 5
          ? "HISTORICAL DATA ACQUISITION 4.0 — PRODUCTION READY"
          : "HISTORICAL DATA ACQUISITION 4.0 — READY WITH LIMITATIONS",
  };

  writeFileSync("HISTORICAL_DATA_ACQUISITION40_LIVE.json", JSON.stringify(report, null, 2), "utf8");
  console.log(JSON.stringify(report, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
