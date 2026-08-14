/**
 * Historical Intelligence 3.0 — read-only live validation.
 * Writes HISTORICAL_INTELLIGENCE30_LIVE.json
 */
import { readFileSync, writeFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";
import { buildHistoricalDataset, publicHistoricalRows } from "../lib/intelligence/historical";
import {
  classifyObservations,
  buildMarketPerformanceReport,
  buildPropertyHistoryChain,
  detectOutcomeConflicts,
  OUTCOME_INTELLIGENCE_VERSION,
} from "../lib/intelligence/outcomes";
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
    .in("verification_state", ["verified", "expired", "sold", "withdrawn"])
    .limit(200);

  const { data: masters } = await db.from("property_masters").select("*").limit(50);
  const { data: events } = await db.from("auction_events").select("*").limit(500);
  const { data: pricingObs } = await db.from("pricing_observations").select("*").limit(500);

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
    masters: masters ?? [],
    observations: pricingObs ?? [],
  });

  const publicHist = publicHistoricalRows(dataset);
  const classifications = classifyObservations(publicHist, pricingObs ?? []);
  const marketReport = buildMarketPerformanceReport({
    observations: publicHist,
    scope: "production",
    pricingObservations: pricingObs ?? [],
  });
  const conflicts = detectOutcomeConflicts(classifications);

  const sampleMaster = masters?.[0] ?? null;
  const masterChain = sampleMaster
    ? buildPropertyHistoryChain(sampleMaster.id, dataset, pricingObs ?? [])
    : null;

  const sold = classifications.filter((c) => c.outcome === "SOLD");
  const withSalePrice = sold.filter((c) => c.salePrice.salePrice != null);

  const report = {
    timestamp: new Date().toISOString(),
    version: OUTCOME_INTELLIGENCE_VERSION,
    tableCounts: {
      property_masters: await count("property_masters"),
      auction_events: await count("auction_events"),
      pricing_observations: await count("pricing_observations"),
      auction_outcome_observations: await count("auction_outcome_observations"),
      historical_outcome_conflicts: await count("historical_outcome_conflicts"),
    },
    historicalIntelligence: {
      corpusObservations: publicHist.length,
      eventBacked: publicHist.filter((o) => o.sourceUnit === "auction_event").length,
      outcomeBreakdown: {
        sold: classifications.filter((c) => c.outcome === "SOLD").length,
        withdrawn: classifications.filter((c) => c.outcome === "WITHDRAWN").length,
        cancelled: classifications.filter((c) => c.outcome === "CANCELLED").length,
        expired: classifications.filter((c) => c.outcome === "EXPIRED").length,
        passedIn: classifications.filter((c) => c.outcome === "PASSED_IN").length,
        unknown: classifications.filter((c) => c.outcome === "UNKNOWN").length,
      },
      verifiedSalePrices: withSalePrice.length,
      outcomeCoverage: marketReport.performance.outcomeCoverage,
      saleRate: marketReport.performance.saleRate,
      medianSalePrice: marketReport.medianSalePrice.median,
      medianSalePriceLabel: marketReport.medianSalePrice.notCalculableReason ?? "Calculable",
      insufficientSaleData: withSalePrice.length < 5,
    },
    conflicts: {
      detected: conflicts.length,
      sample: conflicts.slice(0, 3),
    },
    masterHistory: masterChain
      ? {
          propertyMasterId: masterChain.propertyMasterId,
          events: masterChain.events.length,
          sample: masterChain.events.slice(0, 3),
        }
      : null,
    publicSafety: {
      historicalLeaks: (properties ?? []).filter((p) =>
        ["expired", "sold", "withdrawn", "cancelled"].includes(p.verification_state ?? "") &&
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
      withSalePrice.length >= 5 && publicHist.length >= 10
        ? "HISTORICAL INTELLIGENCE 3.0 PRODUCTION READY"
        : "HISTORICAL INTELLIGENCE 3.0 READY WITH LIMITATIONS",
  };

  writeFileSync("HISTORICAL_INTELLIGENCE30_LIVE.json", JSON.stringify(report, null, 2), "utf8");
  console.log(JSON.stringify(report, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
