/**
 * Historical Evidence Acquisition 4.3 — read-only live validation + dry-run preview.
 */
import { readFileSync, writeFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";
import { buildHistoricalDataset, publicHistoricalRows } from "../lib/intelligence/historical";
import { classifyObservations } from "../lib/intelligence/outcomes";
import {
  buildHea43Queue,
  hea43QueueSummary,
  buildHea43Funnel,
  HISTORICAL_EVIDENCE_ACQUISITION43_VERSION,
  HEA43_DEFAULT_BATCH_LIMIT,
} from "../lib/acquisition/historicalEvidence43";
import { isPubliclyActiveListing } from "../lib/data/publicListingPolicy";
import { resolveHistoricalEvent } from "../lib/intelligence/historicalResolution";
import { classifyObservation } from "../lib/intelligence/outcomes/evidence";
import { scoreHistoricalEvidence } from "../lib/intelligence/historicalEvidence/scoring";
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
  const queue = buildHea43Queue({
    events: publicHist,
    observations: outcomeObs ?? [],
    recentRuns: enrichmentRuns ?? [],
  });
  const qs = hea43QueueSummary(queue);
  const dryRunCandidates = queue.slice(0, HEA43_DEFAULT_BATCH_LIMIT);

  let verifiedSold = 0;
  let verifiedSalePrices = 0;
  let conflicts = 0;
  let reviewRequired = 0;

  for (const event of publicHist) {
    const c = classifications.find((x) => x.observationId === event.observationId) ?? classifyObservation(event);
    const score = scoreHistoricalEvidence(event, c);
    const obs = (outcomeObs ?? []).find(
      (o) =>
        (event.auctionEventId && o.auction_event_id === event.auctionEventId) ||
        (event.listingPropertyId && o.listing_property_id === event.listingPropertyId),
    );
    const resolution = resolveHistoricalEvent({
      observation: event,
      classification: c,
      score,
      outcomeObs: obs ?? null,
    });
    if (resolution.state === "VERIFIED" && resolution.outcome === "SOLD") verifiedSold += 1;
    if (resolution.state === "VERIFIED" && resolution.salePrice != null) verifiedSalePrices += 1;
    if (resolution.state === "CONFLICT") conflicts += 1;
    if (resolution.state === "REVIEW_REQUIRED") reviewRequired += 1;
  }

  const funnel = buildHea43Funnel({
    queue: dryRunCandidates,
    results: dryRunCandidates.map(() => ({ state: "UNRESOLVED" })),
  });

  const report = {
    timestamp: new Date().toISOString(),
    version: HISTORICAL_EVIDENCE_ACQUISITION43_VERSION,
    property_masters: await count("property_masters"),
    auction_events: await count("auction_events"),
    historical_events: publicHist.length,
    eligible_queue: queue.length,
    sources_found: queue.filter((q) => q.candidates.length > 0).length,
    sources_fetched: funnel.sourcesFetched,
    outcomes_extracted: funnel.outcomesExtracted,
    verified_outcomes: verifiedSold,
    verified_sale_prices: verifiedSalePrices,
    conflicts,
    reviews: reviewRequired,
    insufficient_data: publicHist.length - verifiedSold - conflicts - reviewRequired,
    public_catalogue_leaks: publicLeaks.length,
    dry_run_preview: {
      limit: HEA43_DEFAULT_BATCH_LIMIT,
      would_process: dryRunCandidates.length,
      message: "DRY RUN — NOTHING WRITTEN",
      candidates: dryRunCandidates.map((c) => ({
        propertyId: c.propertyId,
        priority: c.priority,
        reason: c.reason,
        candidateCount: c.candidates.length,
        sourceUrl: c.sourceUrl,
      })),
    },
    queue: qs,
    verdict:
      publicLeaks.length > 0
        ? "BLOCKED — PUBLIC CATALOGUE LEAK"
        : verifiedSalePrices >= 5
          ? "PRODUCTION READY"
          : verifiedSalePrices >= 1
            ? "READY WITH LIMITATIONS"
            : "INSUFFICIENT DATA — EVIDENCE ENGINE HEALTHY",
  };

  writeFileSync("HISTORICAL_EVIDENCE43_LIVE.json", JSON.stringify(report, null, 2), "utf8");

  const md = `# Historical Evidence Acquisition 4.3 — Live Validation Report

**Generated:** ${report.timestamp}  
**Version:** ${report.version}  
**Verdict:** ${report.verdict}

## Counts

| Metric | Value |
|--------|------:|
| Property masters | ${report.property_masters ?? "—"} |
| Auction events | ${report.auction_events ?? "—"} |
| Historical events | ${report.historical_events} |
| Eligible queue | ${report.eligible_queue} |
| Sources found | ${report.sources_found} |
| Verified SOLD | ${report.verified_outcomes} |
| Verified sale prices | ${report.verified_sale_prices} |
| Conflicts | ${report.conflicts} |
| Reviews | ${report.reviews} |

## Dry run preview (${HEA43_DEFAULT_BATCH_LIMIT} events)

${dryRunCandidates.length === 0 ? "_No queue candidates._" : dryRunCandidates.map((c) => `- P${c.priority} \`${c.propertyId}\` — ${c.reason} (${c.candidates.length} candidates)`).join("\n")}

## Public safety

Catalogue leaks: **${publicLeaks.length}** (must be 0)

## Notes

This run is **read-only**. No acquisition writes were performed.
`;

  writeFileSync("HISTORICAL_EVIDENCE43_REPORT.md", md, "utf8");
  console.log(JSON.stringify(report, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
