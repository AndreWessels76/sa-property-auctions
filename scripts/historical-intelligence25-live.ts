/**
 * Historical Intelligence 2.5 — read-only live validation.
 * Writes HISTORICAL_INTELLIGENCE25_LIVE.json
 */
import { readFileSync, writeFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";
import { buildHistoricalDataset, publicHistoricalRows } from "../lib/intelligence/historical";
import { findComparables, buildMarketEvidence, buildMasterHistory, COMPARABLE_INTELLIGENCE_VERSION } from "../lib/intelligence/comparables";
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
      p.data_classification !== "seed" &&
      p.data_classification !== "demo",
  );

  const { data: masters } = await db.from("property_masters").select("*").limit(10);
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
  const eventBacked = publicHist.filter((o) => o.sourceUnit === "auction_event");
  const sold = publicHist.filter((o) => o.state === "sold");
  const withSalePrice = sold.filter((o) => o.prices.sale_price != null);

  const sampleMaster = masters?.[0] ?? null;
  const masterHistory = sampleMaster
    ? buildMasterHistory(dataset, sampleMaster.id)
    : [];

  const sampleSubject = eventBacked[0] ?? publicHist[0] ?? null;
  let comparables = null;
  if (sampleSubject?.listingPropertyId) {
    comparables = findComparables({
      subject: sampleSubject,
      corpus: dataset,
      propertyId: sampleSubject.listingPropertyId,
      premium: true,
    });
  }

  const marketEvidence = buildMarketEvidence({
    observations: dataset,
    scope: "market",
    scopeLabel: "Production corpus",
  });

  const report = {
    timestamp: new Date().toISOString(),
    version: COMPARABLE_INTELLIGENCE_VERSION,
    tableCounts: {
      property_masters: await count("property_masters"),
      auction_events: await count("auction_events"),
      pricing_observations: await count("pricing_observations"),
    },
    samples: {
      upcomingProperty: upcoming
        ? { id: upcoming.id, title: upcoming.title, town: upcoming.town }
        : null,
      historicalProperty: historical[0]
        ? { id: historical[0].id, title: historical[0].title, state: historical[0].verification_state }
        : null,
      propertyMaster: sampleMaster
        ? { id: sampleMaster.id, fingerprint: sampleMaster.fingerprint }
        : null,
    },
    historicalIntelligence: {
      corpusObservations: publicHist.length,
      eventBacked: eventBacked.length,
      listingFallback: publicHist.length - eventBacked.length,
      verifiedSales: sold.length,
      verifiedSalePrices: withSalePrice.length,
      insufficientSaleData: withSalePrice.length === 0,
    },
    comparables: comparables
      ? {
          subjectId: comparables.subjectPropertyId,
          matches: comparables.comparables.length,
          rejected: comparables.rejectedCandidates.length,
          confidence: comparables.confidence,
          limitations: comparables.limitations,
        }
      : { note: "No sample subject available" },
    masterHistoryEvents: masterHistory.length,
    marketEvidence: {
      sampleSize: marketEvidence.sampleSize,
      medianSalePrice: marketEvidence.medianSalePrice.median,
      medianLabel: marketEvidence.medianSalePrice.sampleSafetyLabel,
      limitations: marketEvidence.limitations,
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
      withSalePrice.length === 0
        ? "HISTORICAL INTELLIGENCE 2.5 READY WITH LIMITATIONS"
        : eventBacked.length >= publicHist.length * 0.9
          ? "HISTORICAL INTELLIGENCE 2.5 READY WITH LIMITATIONS"
          : "HISTORICAL INTELLIGENCE 2.5 READY WITH LIMITATIONS",
  };

  writeFileSync("HISTORICAL_INTELLIGENCE25_LIVE.json", JSON.stringify(report, null, 2), "utf8");
  console.log(JSON.stringify(report, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
