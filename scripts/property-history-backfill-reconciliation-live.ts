/**
 * Read-only production reconciliation for Property History Backfill.
 * No writes. No backfill execution.
 */
import { readFileSync, writeFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";

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
    const { count, error } = await db
      .from(table)
      .select("*", { count: "exact", head: true });
    if (error) return null;
    return count ?? 0;
  }

  const counts = {
    property_masters: await count("property_masters"),
    auction_events: await count("auction_events"),
    property_history_backfill_runs: await count("property_history_backfill_runs"),
    property_history_backfill_items: await count("property_history_backfill_items"),
    property_history_backfill_reviews: await count("property_history_backfill_reviews"),
  };

  const { data: latestRun } = await db
    .from("property_history_backfill_runs")
    .select("*")
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: sampleMasters } = await db
    .from("property_masters")
    .select("id,fingerprint,identity_match_class,created_at")
    .order("created_at", { ascending: false })
    .limit(5);

  const { data: sampleEvents } = await db
    .from("auction_events")
    .select("id,property_master_id,auction_date,status,created_at")
    .order("created_at", { ascending: false })
    .limit(5);

  const { data: historicalProps } = await db
    .from("properties")
    .select("id,property_master_id,verification_state,data_classification")
    .in("verification_state", ["verified", "expired", "sold", "withdrawn"])
    .neq("data_classification", "seed")
    .neq("data_classification", "demo");

  const historical = (historicalProps ?? []).filter(
    (p) => p.data_classification !== "seed" && p.data_classification !== "demo",
  );
  const linked = historical.filter((p) => p.property_master_id != null);

  const { data: allEvents } = await db
    .from("auction_events")
    .select("id,property_master_id,listing_property_id");

  const masterIds = new Set(
    ((await db.from("property_masters").select("id")).data ?? []).map((m) => m.id),
  );
  const events = allEvents ?? [];
  const linkedEvents = events.filter((e) => masterIds.has(e.property_master_id));
  const orphanEvents = events.filter((e) => !masterIds.has(e.property_master_id));

  // Simulate dashboard query: listCandidates with is_master=true limit 5000
  const { data: dashboardMasters, error: dmErr } = await db
    .from("property_masters")
    .select("id")
    .eq("is_master", true)
    .limit(5000);

  const { data: dashboardEvents, error: deErr } = await db
    .from("auction_events")
    .select("id")
    .limit(5000);

  const report = {
    timestamp: new Date().toISOString(),
    counts,
    latestRun: latestRun ?? null,
    sampleMasters: sampleMasters ?? [],
    sampleEvents: sampleEvents ?? [],
    relationships: {
      historicalProperties: historical.length,
      propertyMasterIdPopulated: linked.length,
      auctionEventsLinkedToValidMasters: linkedEvents.length,
      orphanEvents: orphanEvents.length,
      totalEvents: events.length,
    },
    dashboardQuerySimulation: {
      property_masters_via_listCandidates: dashboardMasters?.length ?? 0,
      property_masters_query_error: dmErr?.message ?? null,
      auction_events_via_listAll: dashboardEvents?.length ?? 0,
      auction_events_query_error: deErr?.message ?? null,
    },
  };

  writeFileSync(
    "PROPERTY_HISTORY_BACKFILL_RECONCILIATION_LIVE.json",
    JSON.stringify(report, null, 2),
    "utf8",
  );
  console.log(JSON.stringify(report, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
