/**
 * Historical Intelligence 4.0 — read-only live validation.
 */
import { readFileSync, writeFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";
import { buildHistoricalDataset, publicHistoricalRows } from "../lib/intelligence/historical";
import { classifyObservations } from "../lib/intelligence/outcomes";
import { buildCoverageDashboard } from "../lib/intelligence/historicalEvidence/coverage";
import { scoreHistoricalEvidence } from "../lib/intelligence/historicalEvidence/scoring";
import { HISTORICAL_INTELLIGENCE40_VERSION } from "../lib/intelligence/historicalEvidence/config";
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
  const { data: conflicts } = await db
    .from("historical_outcome_conflicts")
    .select("*")
    .eq("status", "open")
    .limit(50);

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
  const scored = publicHist.map((obs, i) => ({
    observation: obs,
    classification: classifications[i]!,
    score: scoreHistoricalEvidence(obs, classifications[i]!, pricingObs ?? []),
  }));
  const coverage = buildCoverageDashboard(scored);

  const verifiedSold = classifications.filter((c) => c.outcome === "SOLD");
  const verifiedPrices = classifications.filter(
    (c) =>
      c.outcome === "SOLD" &&
      c.salePrice.salePrice != null &&
      c.salePrice.salePriceConfidence !== "low" &&
      !c.salePrice.conflict,
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

  const report = {
    timestamp: new Date().toISOString(),
    version: HISTORICAL_INTELLIGENCE40_VERSION,
    productionCounts: {
      property_masters: await count("property_masters"),
      auction_events: await count("auction_events"),
      historical_events: publicHist.length,
      outcome_observations: outcomeObs?.length ?? 0,
    },
    verifiedOutcomes: coverage.confirmedOutcomes,
    verifiedSalePrices: verifiedPrices.length,
    comparableReadyEvents: coverage.comparableReadyEvents,
    marketStatisticsReadyEvents: coverage.marketStatisticsReadyEvents,
    insufficientDataCases: coverage.insufficientDataCases,
    areaStatistics: {
      townsRepresented: new Set(publicHist.map((r) => r.town).filter(Boolean)).size,
      medianCalculable: verifiedPrices.length >= 5,
      note:
        verifiedPrices.length >= 5
          ? "Sufficient verified sales for median statistics"
          : "Insufficient data — median statistics withheld",
    },
    agencyStatistics: {
      agenciesRepresented: new Set(
        publicHist.map((r) => r.agency ?? r.sourceName).filter(Boolean),
      ).size,
    },
    conflicts: conflicts?.length ?? 0,
    publicCatalogueSafety: { leaks: publicLeaks.length },
    soldBreakdown: {
      sold: verifiedSold.length,
      unknown: coverage.unknownOutcomes,
    },
    coverage,
    verdict:
      publicLeaks.length > 0
        ? "BLOCKED"
        : verifiedPrices.length >= 5
          ? "PRODUCTION READY"
          : "INSUFFICIENT DATA — ENGINE READY",
  };

  writeFileSync("HISTORICAL_INTELLIGENCE40_LIVE.json", JSON.stringify(report, null, 2), "utf8");
  console.log(JSON.stringify(report, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
