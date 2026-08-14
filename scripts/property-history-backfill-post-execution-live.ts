/**
 * Post-execution reconciliation 2.0 — read-only production analysis.
 * Writes PROPERTY_HISTORY_BACKFILL_POST_EXECUTION_LIVE.json
 */
import { readFileSync, writeFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";
import { buildHistoricalDataset, publicHistoricalRows } from "../lib/intelligence/historical";
import { isPubliclyActiveListing } from "../lib/data/publicListingPolicy";
import type { AuctionEventRow } from "../lib/identity";
import { computeEventFingerprint } from "../lib/backfill/eventFingerprint";

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

  async function count(table: string): Promise<number | null> {
    const { count, error } = await db.from(table).select("*", { count: "exact", head: true });
    if (error) return null;
    return count ?? 0;
  }

  const tableCounts = {
    property_masters: await count("property_masters"),
    auction_events: await count("auction_events"),
    property_history_backfill_runs: await count("property_history_backfill_runs"),
    property_history_backfill_items: await count("property_history_backfill_items"),
    property_history_backfill_reviews: await count("property_history_backfill_reviews"),
  };

  const { data: runs } = await db
    .from("property_history_backfill_runs")
    .select("*")
    .order("started_at", { ascending: false });

  const latestExecute =
    (runs ?? []).find((r) => r.run_kind === "backfill" && r.dry_run === false) ??
    (runs ?? []).find((r) => r.dry_run === false) ??
    runs?.[0] ??
    null;

  const { data: items } = latestExecute
    ? await db
        .from("property_history_backfill_items")
        .select("*")
        .eq("run_id", latestExecute.id)
        .order("created_at", { ascending: true })
    : { data: [] };

  const { data: properties } = await db
    .from("properties")
    .select(
      "id,title,property_master_id,verification_state,data_classification,connector_id,external_listing_id,listing_status,status,auction_date,source_name,town,suburb,province",
    )
    .in("verification_state", ["verified", "expired", "sold", "withdrawn"]);

  const historical = (properties ?? []).filter(
    (p) => p.data_classification !== "seed" && p.data_classification !== "demo",
  );

  const { data: masters } = await db.from("property_masters").select("*");
  const { data: events } = await db.from("auction_events").select("*");
  const { data: observations } = await db.from("pricing_observations").select("*");

  const masterById = new Map((masters ?? []).map((m) => [m.id, m]));
  const eventsByListing = new Map<string, typeof events>();
  for (const e of events ?? []) {
    if (e.listing_property_id) {
      const arr = eventsByListing.get(e.listing_property_id) ?? [];
      arr.push(e);
      eventsByListing.set(e.listing_property_id, arr);
    }
  }

  const masterUsage = new Map<string, string[]>();
  for (const p of historical) {
    if (!p.property_master_id) continue;
    const arr = masterUsage.get(p.property_master_id) ?? [];
    arr.push(p.id);
    masterUsage.set(p.property_master_id, arr);
  }

  const sharedMasters = [...masterUsage.entries()]
    .filter(([, ids]) => ids.length > 1)
    .map(([masterId, propertyIds]) => {
      const m = masterById.get(masterId);
      return {
        masterId,
        fingerprint: m?.fingerprint ?? null,
        propertyIds,
        titles: propertyIds.map(
          (id) => historical.find((p) => p.id === id)?.title ?? null,
        ),
        towns: propertyIds.map(
          (id) => historical.find((p) => p.id === id)?.town ?? null,
        ),
      };
    });

  const uniqueMasterIdsOnProperties = new Set(
    historical.map((p) => p.property_master_id).filter(Boolean),
  );

  const eventFingerprints = new Map<string, string[]>();
  for (const e of events ?? []) {
    const fp = computeEventFingerprint({
      propertyMasterId: e.property_master_id,
      auctionDate: e.auction_date,
      connectorId: e.connector_id,
      externalEventId: e.external_listing_id,
      agency: e.agency,
      sourceUrl: e.source_url,
    });
    const arr = eventFingerprints.get(fp) ?? [];
    arr.push(e.id);
    eventFingerprints.set(fp, arr);
  }
  const duplicateEventFingerprints = [...eventFingerprints.entries()].filter(
    ([, ids]) => ids.length > 1,
  );

  const orphanEvents = (events ?? []).filter((e) => !masterById.has(e.property_master_id));

  const propsWithoutMaster = historical.filter((p) => !p.property_master_id);
  const propsWithoutEvent = historical.filter(
    (p) => !(events ?? []).some((e) => e.listing_property_id === p.id),
  );

  const linkedObs = (observations ?? []).filter((o) => o.auction_event_id != null);

  const dataset = buildHistoricalDataset({
    events: (events ?? []) as AuctionEventRow[],
    listings: historical.map((p) => ({
      id: p.id,
      title: p.title,
      listing_status: p.listing_status,
      status: p.status,
      verification_state: p.verification_state,
      data_classification: p.data_classification,
      auction_date: p.auction_date,
      province: p.province,
      town: p.town,
      suburb: p.suburb,
      source_name: p.source_name,
      property_master_id: p.property_master_id,
    })),
    masters: masters ?? [],
    observations: observations ?? [],
  });

  const publicHist = publicHistoricalRows(dataset);
  const eventBacked = dataset.filter((o) => o.sourceUnit === "auction_event");
  const listingFallback = dataset.filter((o) => o.sourceUnit === "listing_fallback");
  const upcomingExcluded = dataset.filter((o) =>
    o.exclusionReasons.includes("NOT_HISTORICAL"),
  );

  const publicLeaks = historical.filter((p) =>
    ["expired", "sold", "withdrawn"].includes(p.verification_state ?? "") &&
    isPubliclyActiveListing({
      verification_state: p.verification_state,
      data_classification: p.data_classification,
      listing_status: p.listing_status,
      status: p.status,
      auction_date: p.auction_date,
    }),
  );

  // Summarize backfill items by audit_status
  const itemSummary: Record<string, number> = {};
  for (const item of items ?? []) {
    itemSummary[item.audit_status] = (itemSummary[item.audit_status] ?? 0) + 1;
  }

  const itemOutcomes = (items ?? []).reduce(
    (acc, item) => {
      const key = `${item.identity_decision ?? "?"}|${item.audit_status}`;
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  const report = {
    timestamp: new Date().toISOString(),
    tableCounts,
    latestExecuteRun: latestExecute,
    allRuns: (runs ?? []).map((r) => ({
      id: r.id,
      run_kind: r.run_kind,
      dry_run: r.dry_run,
      status: r.status,
      records_scanned: r.records_scanned,
      masters_created: r.masters_created,
      events_created: r.events_created,
      duplicates_skipped: r.duplicates_skipped,
      started_at: r.started_at,
    })),
    backfillItems: {
      total: items?.length ?? 0,
      byAuditStatus: itemSummary,
      byIdentityAndAudit: itemOutcomes,
    },
    masterReconciliation: {
      historicalProperties: historical.length,
      propertiesWithMasterId: historical.filter((p) => p.property_master_id).length,
      uniquePropertyMasterIdsOnListings: uniqueMasterIdsOnProperties.size,
      propertyMastersTableCount: masters?.length ?? 0,
      propertiesWithoutMaster: propsWithoutMaster.length,
      mastersLinkedToMultipleProperties: sharedMasters.length,
      sharedMasters,
      explanation:
        sharedMasters.length > 0
          ? `${historical.length} listings map to ${uniqueMasterIdsOnProperties.size} unique masters (${sharedMasters.length} master(s) shared across multiple listings)`
          : null,
    },
    eventReconciliation: {
      auctionEventsTableCount: events?.length ?? 0,
      uniqueListingEventLinks: new Set(
        (events ?? []).map((e) => e.listing_property_id).filter(Boolean),
      ).size,
      propertiesWithoutEvent: propsWithoutEvent.length,
      orphanEvents: orphanEvents.length,
      duplicateEventFingerprints: duplicateEventFingerprints.map(([fp, ids]) => ({
        fingerprint: fp,
        eventIds: ids,
      })),
    },
    historicalIntelligence: {
      corpus: historical.length,
      eventBacked: eventBacked.length,
      listingFallback: listingFallback.length,
      publicHistoricalRows: publicHist.length,
      upcomingExcluded: upcomingExcluded.length,
    },
    pricing: {
      totalObservations: observations?.length ?? 0,
      linkedToEvents: linkedObs.length,
    },
    publicSafety: {
      publicLeaks: publicLeaks.length,
      clean: publicLeaks.length === 0,
    },
  };

  writeFileSync(
    "PROPERTY_HISTORY_BACKFILL_POST_EXECUTION_LIVE.json",
    JSON.stringify(report, null, 2),
    "utf8",
  );
  console.log(JSON.stringify(report, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
