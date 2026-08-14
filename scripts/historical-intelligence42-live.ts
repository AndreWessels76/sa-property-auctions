/**
 * Historical Intelligence 4.2 — read-only live validation.
 */
import { readFileSync, writeFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";
import { buildHistoricalDataset, publicHistoricalRows } from "../lib/intelligence/historical";
import { buildResolutionDashboard } from "../lib/intelligence/historicalResolution/dashboard";
import { resolveHistoricalEvent } from "../lib/intelligence/historicalResolution/resolver";
import { HISTORICAL_INTELLIGENCE42_VERSION } from "../lib/intelligence/historicalResolution/config";
import { classifyObservations } from "../lib/intelligence/outcomes";
import { scoreHistoricalEvidence } from "../lib/intelligence/historicalEvidence/scoring";
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
    .limit(100);
  const { data: reviews } = await db
    .from("historical_enrichment_reviews")
    .select("*")
    .eq("status", "open")
    .limit(100);

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

  const historical = publicHistoricalRows(dataset);
  const classifications = classifyObservations(historical, pricingObs ?? []);
  const byId = new Map(classifications.map((c) => [c.observationId, c]));

  const resolutions = historical.map((obs) => {
    const classification = byId.get(obs.observationId)!;
    const score = scoreHistoricalEvidence(obs, classification, pricingObs ?? []);
    const obsRow =
      (outcomeObs ?? []).find(
        (o) =>
          (obs.auctionEventId && o.auction_event_id === obs.auctionEventId) ||
          (obs.listingPropertyId && o.listing_property_id === obs.listingPropertyId),
      ) ?? null;
    return resolveHistoricalEvent({
      observation: obs,
      classification,
      score,
      outcomeObs: obsRow,
      openConflict: obs.conflict,
      openReview: false,
    });
  });

  const dashboard = buildResolutionDashboard(resolutions);

  const report = {
    timestamp: new Date().toISOString(),
    version: HISTORICAL_INTELLIGENCE42_VERSION,
    total_historical_events: dashboard.totalHistoricalEvents,
    unresolved_events: dashboard.unresolved,
    source_found_events: dashboard.sourceFound,
    verified_outcomes: dashboard.verified,
    verified_sold: dashboard.verifiedSold,
    sold_without_price: dashboard.soldWithoutPrice,
    verified_sale_prices: dashboard.verifiedSalePrices,
    conflicts: dashboard.conflicts,
    identity_reviews: dashboard.identityReviews,
    comparable_ready_events: dashboard.comparableReady,
    market_statistics_available: dashboard.marketStatisticsAvailable,
    evidence_confidence: dashboard.evidenceConfidence,
    public_catalogue_leaks: publicLeaks.length,
    tableCounts: {
      property_masters: await count("property_masters"),
      auction_events: await count("auction_events"),
      auction_outcome_observations: await count("auction_outcome_observations"),
      historical_outcome_conflicts: conflicts?.length ?? 0,
      historical_enrichment_reviews: reviews?.length ?? 0,
      historical_resolution_audit: await count("historical_resolution_audit"),
    },
    verdict:
      publicLeaks.length > 0
        ? "BLOCKED"
        : dashboard.verifiedSalePrices >= 5
          ? "PRODUCTION READY"
          : dashboard.verifiedSalePrices >= 1
            ? "READY WITH LIMITATIONS"
            : "INSUFFICIENT DATA — ENGINE READY",
  };

  writeFileSync("HISTORICAL_INTELLIGENCE42_LIVE.json", JSON.stringify(report, null, 2), "utf8");

  const md = `# Historical Intelligence 4.2 — Live Validation Report

**Generated:** ${report.timestamp}  
**Version:** ${report.version}  
**Verdict:** ${report.verdict}

## Resolution summary

| Metric | Value |
|--------|------:|
| Historical events | ${dashboard.totalHistoricalEvents} |
| Unresolved | ${dashboard.unresolved} |
| Source found | ${dashboard.sourceFound} |
| Verified SOLD | ${dashboard.verifiedSold} |
| SOLD without price | ${dashboard.soldWithoutPrice} |
| Verified sale prices | ${dashboard.verifiedSalePrices} |
| Comparable ready | ${dashboard.comparableReady} |
| Market statistics | ${dashboard.marketStatisticsAvailable ? "Available" : "Insufficient data"} |

## Public safety

Catalogue leaks: **${publicLeaks.length}** (must be 0)

## Note

Read-only validation — no fabricated test records. Zero verified sales reflects current production evidence, not engine failure.
`;

  writeFileSync("HISTORICAL_INTELLIGENCE42_REPORT.md", md, "utf8");
  console.log(JSON.stringify(report, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
