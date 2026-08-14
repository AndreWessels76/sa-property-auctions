/**
 * Historical Data Enrichment 4.1 — read-only live validation + 5-event dry-run preview.
 */
import { readFileSync, writeFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";
import { buildHistoricalDataset, publicHistoricalRows } from "../lib/intelligence/historical";
import { classifyObservations } from "../lib/intelligence/outcomes";
import {
  buildHistoricalEnrichmentQueue,
  queueSummary,
  buildEnrichmentFunnel,
} from "../lib/acquisition/historical";
import {
  HISTORICAL_DATA_ENRICHMENT41_VERSION,
  HDE41_DEFAULT_DRY_RUN_LIMIT,
} from "../lib/acquisition/historical/config";
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
    .select("*")
    .limit(500);
  const { data: conflicts } = await db
    .from("historical_outcome_conflicts")
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

  const publicHist = publicHistoricalRows(dataset);
  const classifications = classifyObservations(publicHist, pricingObs ?? []);
  const queue = buildHistoricalEnrichmentQueue({ events: publicHist, recentRuns: enrichmentRuns ?? [] });
  const qs = queueSummary(queue);
  const dryRunCandidates = queue.slice(0, HDE41_DEFAULT_DRY_RUN_LIMIT);
  const funnel = buildEnrichmentFunnel({
    events: publicHist,
    observations: outcomeObs ?? [],
    runs: enrichmentRuns ?? [],
  });

  const sold = classifications.filter((c) => c.outcome === "SOLD").length;
  const salePricesVerified = funnel.salePriceVerified;

  const report = {
    timestamp: new Date().toISOString(),
    version: HISTORICAL_DATA_ENRICHMENT41_VERSION,
    events_scanned: publicHist.length,
    eligible_sources: funnel.sourceEligible,
    fetches: funnel.fetchAttempted,
    unchanged: funnel.unchanged,
    changed: funnel.changed,
    outcome_discoveries: funnel.outcomeExtracted,
    sold_discoveries: funnel.soldConfirmed,
    sale_prices_discovered: funnel.salePriceFound,
    verified_sale_prices: salePricesVerified,
    conflicts: funnel.conflicts,
    failed_sources: funnel.failed,
    license_blocks: funnel.skippedLicense,
    source_unavailable: funnel.sourceUnavailable,
    comparable_ready: funnel.comparableReady,
    public_safety: { catalogue_leaks: publicLeaks.length },
    milestones: funnel.milestones,
    dry_run_preview: {
      limit: HDE41_DEFAULT_DRY_RUN_LIMIT,
      would_process: dryRunCandidates.length,
      candidates: dryRunCandidates.map((c) => ({
        propertyId: c.propertyId,
        priority: c.priority,
        reason: c.reason,
        sourceStatus: c.sourceResolution.status,
        sourceUrl: c.sourceResolution.sourceUrl,
      })),
    },
    queue: qs,
    tableCounts: {
      property_masters: await count("property_masters"),
      auction_events: await count("auction_events"),
      properties: await count("properties"),
      historical_events: publicHist.length,
      auction_outcome_observations: await count("auction_outcome_observations"),
      historical_enrichment_runs: await count("historical_enrichment_runs"),
      historical_outcome_conflicts: await count("historical_outcome_conflicts"),
    },
    sold_classified: sold,
    verdict:
      publicLeaks.length > 0
        ? "BLOCKED"
        : salePricesVerified >= 5
          ? "PRODUCTION READY"
          : salePricesVerified >= 1
            ? "READY WITH LIMITATIONS"
            : "INSUFFICIENT DATA — ENGINE READY",
  };

  writeFileSync("HISTORICAL_DATA_ENRICHMENT41_LIVE.json", JSON.stringify(report, null, 2), "utf8");

  const md = `# Historical Data Enrichment 4.1 — Live Validation Report

**Generated:** ${report.timestamp}  
**Version:** ${report.version}  
**Verdict:** ${report.verdict}

## Funnel

| Stage | Count |
|-------|------:|
| Historical events | ${funnel.historicalEvents} |
| Source eligible | ${funnel.sourceEligible} |
| Fetch attempted | ${funnel.fetchAttempted} |
| Outcome extracted | ${funnel.outcomeExtracted} |
| SOLD confirmed | ${funnel.soldConfirmed} |
| Sale price verified | ${funnel.salePriceVerified} |
| Comparable ready | ${funnel.comparableReady} |

## Dry run preview (${HDE41_DEFAULT_DRY_RUN_LIMIT} events)

${dryRunCandidates.length === 0 ? "_No queue candidates._" : dryRunCandidates.map((c) => `- P${c.priority} \`${c.propertyId}\` — ${c.reason} (${c.sourceResolution.status})`).join("\n")}

## Public safety

Catalogue leaks: **${publicLeaks.length}** (must be 0)

## Notes

This run is **read-only**. No enrichment writes were performed.
`;

  writeFileSync("HISTORICAL_DATA_ENRICHMENT41_REPORT.md", md, "utf8");
  console.log(JSON.stringify(report, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
