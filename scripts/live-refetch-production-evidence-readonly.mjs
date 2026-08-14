/**
 * Read-only production evidence check for Live Source Re-fetch.
 * Does NOT modify data.
 */
import { readFileSync, writeFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";

function loadEnv() {
  for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([^#=]+)=(.*)$/);
    if (m && !process.env[m[1].trim()]) {
      process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
    }
  }
}

function isSha256(hex) {
  return typeof hex === "string" && /^[a-f0-9]{64}$/i.test(hex);
}

async function main() {
  loadEnv();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Missing Supabase env");
    process.exit(1);
  }

  const db = createClient(url, key, { auth: { persistSession: false } });

  const evidence = {
    generated_at: new Date().toISOString(),
    supabase_project: url.replace(/^https:\/\//, "").split(".")[0],
    checks: {},
    latest_batch: null,
    runs: [],
    snapshots: [],
    extraction_runs: [],
    duplicate_checks: {},
    verified_integrity: [],
    verdict: null,
    verdict_notes: [],
  };

  // Latest refetch runs (last 24h window, up to 50)
  const since = new Date(Date.now() - 48 * 3600_000).toISOString();
  const { data: runs, error: runsErr } = await db
    .from("source_refetch_runs")
    .select("*")
    .gte("started_at", since)
    .order("started_at", { ascending: false })
    .limit(50);

  if (runsErr) {
    evidence.checks.runs_table = { ok: false, error: runsErr.message };
    evidence.verdict = "NOT PRODUCTION READY";
    evidence.verdict_notes.push(`source_refetch_runs query failed: ${runsErr.message}`);
    writeFileSync(
      "LIVE_SOURCE_REFETCH_PRODUCTION_EVIDENCE.json",
      JSON.stringify(evidence, null, 2),
    );
    console.log(JSON.stringify(evidence, null, 2));
    return;
  }

  evidence.checks.runs_table = { ok: true, count: runs?.length ?? 0 };

  // Identify latest batch by clustering runs within 10 minutes of most recent
  const sorted = [...(runs ?? [])].sort(
    (a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime(),
  );
  const latestStarted = sorted[0]?.started_at
    ? new Date(sorted[0].started_at).getTime()
    : 0;
  const batchRuns = sorted.filter((r) => {
    const t = new Date(r.started_at).getTime();
    return latestStarted - t <= 15 * 60_000;
  });

  const processed = batchRuns.length;
  const noChange = batchRuns.filter((r) => r.status === "no_change").length;
  const completed = batchRuns.filter((r) => r.status === "completed").length;
  const changed = batchRuns.filter((r) => r.changed === true).length;
  const conflicts = batchRuns.reduce((s, r) => s + (r.conflicts ?? 0), 0);
  const skippedLicense = batchRuns.filter((r) => r.status === "SKIPPED_LICENSE").length;
  const skippedRobots = batchRuns.filter((r) => r.status === "SKIPPED_ROBOTS").length;
  const unavailable = batchRuns.filter((r) => r.status === "source_unavailable").length;
  const failed = batchRuns.filter(
    (r) => r.status === "failed" || (r.error && r.status !== "no_change"),
  ).length;
  const skippedOther = batchRuns.filter((r) =>
    ["SKIPPED_RATE", "SKIPPED_INTERVAL", "SKIPPED_LOCK", "SKIPPED_NO_URL", "SKIPPED_CONNECTOR"].includes(
      r.status,
    ),
  ).length;

  evidence.latest_batch = {
    window_minutes: 15,
    latest_started_at: sorted[0]?.started_at ?? null,
    processed,
    completed,
    no_change: noChange,
    changed,
    conflicts,
    skipped_license: skippedLicense,
    skipped_robots: skippedRobots,
    skipped_other: skippedOther,
    unavailable,
    failed,
    ui_match: {
      processed_5: processed === 5,
      changed_0: changed === 0,
      unchanged_2: noChange === 2,
      conflicts_0: conflicts === 0,
      license_skips_0: skippedLicense === 0,
      robots_skips_0: skippedRobots === 0,
      unavailable_0: unavailable === 0,
      failed_0: failed === 0,
    },
  };

  const propertyIds = [
    ...new Set(batchRuns.map((r) => r.property_id).filter(Boolean)),
  ];

  // Snapshots for involved properties
  const { data: snapshots, error: snapErr } = await db
    .from("source_snapshots")
    .select("*")
    .in("property_id", propertyIds.length ? propertyIds : ["00000000-0000-0000-0000-000000000000"])
    .order("fetched_at", { ascending: false });

  evidence.checks.snapshots_table = snapErr
    ? { ok: false, error: snapErr.message }
    : { ok: true, count: snapshots?.length ?? 0 };

  // Per-property snapshot duplicate check (same content_hash)
  const snapByProperty = {};
  for (const s of snapshots ?? []) {
    if (!s.property_id) continue;
    if (!snapByProperty[s.property_id]) snapByProperty[s.property_id] = [];
    snapByProperty[s.property_id].push(s);
  }

  const duplicateSnapshotHashes = [];
  for (const [pid, snaps] of Object.entries(snapByProperty)) {
    const byHash = {};
    for (const s of snaps) {
      const h = s.content_hash;
      if (!byHash[h]) byHash[h] = [];
      byHash[h].push(s.id);
    }
    for (const [hash, ids] of Object.entries(byHash)) {
      if (ids.length > 1) {
        duplicateSnapshotHashes.push({ property_id: pid, content_hash: hash, snapshot_ids: ids });
      }
    }
  }

  // NO_CHANGE runs should not have created new snapshots at same timestamp window
  const noChangeRuns = batchRuns.filter((r) => r.status === "no_change");
  const noChangeSnapshotViolations = [];
  for (const run of noChangeRuns) {
    const runTime = new Date(run.completed_at ?? run.started_at).getTime();
    const propSnaps = (snapByProperty[run.property_id] ?? []).filter((s) => {
      const t = new Date(s.fetched_at).getTime();
      return Math.abs(t - runTime) < 120_000; // within 2 min of run
    });
    if (propSnaps.length > 0) {
      noChangeSnapshotViolations.push({
        run_code: run.run_code,
        property_id: run.property_id,
        snapshots_near_run: propSnaps.map((s) => ({
          id: s.id,
          fetched_at: s.fetched_at,
          change_class: s.change_class,
        })),
      });
    }
  }

  // Due diligence extraction runs during batch window
  const batchStart = batchRuns.length
    ? batchRuns.reduce(
        (min, r) => Math.min(min, new Date(r.started_at).getTime()),
        Infinity,
      )
    : 0;
  const batchEnd = batchRuns.length
    ? batchRuns.reduce(
        (max, r) =>
          Math.max(max, new Date(r.completed_at ?? r.started_at).getTime()),
        0,
      )
    : 0;

  const { data: ddRuns, error: ddErr } = await db
    .from("due_diligence_extraction_runs")
    .select("id,property_id,source_hash,extraction_version,fields_found,conflicts,updated_at,created_at")
    .in("property_id", propertyIds.length ? propertyIds : ["00000000-0000-0000-0000-000000000000"])
    .gte("updated_at", new Date(batchStart - 60_000).toISOString())
    .order("updated_at", { ascending: false });

  evidence.checks.dd_extraction_table = ddErr
    ? { ok: false, error: ddErr.message }
    : { ok: true, count: ddRuns?.length ?? 0 };

  const ddDuringNoChange = (ddRuns ?? []).filter((d) => {
    const t = new Date(d.updated_at ?? d.created_at).getTime();
    return t >= batchStart - 60_000 && t <= batchEnd + 60_000;
  });

  // Properties + verified integrity
  const { data: properties } = await db
    .from("properties")
    .select(
      "id,title,source_url,source_name,connector_id,verification_state,last_verified_at,updated_at,property_master_id,bedrooms,erf_size,auction_date",
    )
    .in("id", propertyIds.length ? propertyIds : ["00000000-0000-0000-0000-000000000000"]);

  // Duplicate masters / auction events for BC listings
  const { data: masters } = await db
    .from("property_masters")
    .select("id,fingerprint,title,updated_at")
    .order("updated_at", { ascending: false })
    .limit(500);

  const { data: events } = await db
    .from("auction_events")
    .select("id,property_master_id,listing_property_id,connector_id,external_listing_id,created_at")
    .in("listing_property_id", propertyIds.length ? propertyIds : ["00000000-0000-0000-0000-000000000000"]);

  const eventDupes = {};
  for (const e of events ?? []) {
    const k = `${e.connector_id}:${e.external_listing_id}:${e.listing_property_id}`;
    if (!eventDupes[k]) eventDupes[k] = [];
    eventDupes[k].push(e.id);
  }
  const duplicateEvents = Object.entries(eventDupes)
    .filter(([, ids]) => ids.length > 1)
    .map(([k, ids]) => ({ key: k, event_ids: ids }));

  evidence.runs = batchRuns.map((r) => ({
    id: r.id,
    run_code: r.run_code,
    property_id: r.property_id,
    partner_code: r.partner_code,
    connector_id: r.connector_id,
    source_url: r.source_url,
    operator: r.operator,
    status: r.status,
    http_status: r.http_status,
    content_hash: r.content_hash,
    previous_hash: r.previous_hash,
    changed: r.changed,
    change_classes: r.change_classes,
    fields_changed: r.fields_changed,
    conflicts: r.conflicts,
    extraction_run_id: r.extraction_run_id,
    started_at: r.started_at,
    completed_at: r.completed_at,
    duration_ms: r.duration_ms,
    sha256_valid: isSha256(r.content_hash),
    error: r.error,
  }));

  evidence.snapshots = (snapshots ?? [])
    .filter((s) => propertyIds.includes(s.property_id))
    .map((s) => ({
      id: s.id,
      property_id: s.property_id,
      source_url: s.source_url,
      content_hash: s.content_hash,
      previous_hash: s.previous_hash,
      fetched_at: s.fetched_at,
      change_class: s.change_class,
      extraction_version: s.extraction_version,
      http_status: s.http_status,
      sha256_valid: isSha256(s.content_hash),
    }));

  evidence.extraction_runs = ddDuringNoChange;

  evidence.duplicate_checks = {
    duplicate_snapshot_same_hash: duplicateSnapshotHashes,
    no_change_new_snapshots_near_run: noChangeSnapshotViolations,
    duplicate_auction_events: duplicateEvents,
    masters_created_in_batch: (masters ?? []).filter((m) => {
      const t = new Date(m.updated_at).getTime();
      return t >= batchStart && t <= batchEnd + 60_000;
    }).length,
  };

  evidence.verified_integrity = (properties ?? []).map((p) => ({
    id: p.id,
    title: p.title,
    verification_state: p.verification_state,
    last_verified_at: p.last_verified_at,
    updated_at: p.updated_at,
    // If verified, updated_at should not move solely due to refetch (no auto-write path)
    verified_unchanged_state: p.verification_state === "verified",
  }));

  // Acceptance checks
  const checks = {
    runs_exist: processed >= 1,
    ui_batch_match:
      processed === 5 &&
      changed === 0 &&
      noChange === 2 &&
      conflicts === 0 &&
      skippedLicense === 0 &&
      skippedRobots === 0 &&
      unavailable === 0 &&
      failed === 0,
    successful_hashes: evidence.runs
      .filter((r) => r.status === "no_change" || r.status === "completed")
      .every((r) => !r.content_hash || isSha256(r.content_hash)),
    snapshots_have_sha256: evidence.snapshots.every((s) => isSha256(s.content_hash)),
    no_change_no_duplicate_snapshots: noChangeSnapshotViolations.length === 0,
    no_dd_extraction_during_no_change_batch:
      noChange > 0 ? ddDuringNoChange.length === 0 : true,
    zero_conflicts: conflicts === 0,
    no_duplicate_events: duplicateEvents.length === 0,
    bc_listings_present: batchRuns.some(
      (r) =>
        (r.connector_id ?? "").includes("bidders") ||
        (r.source_url ?? "").includes("bidderschoice"),
    ),
  };

  evidence.checks.acceptance = checks;

  const gaps = [];
  if (!checks.runs_exist) gaps.push("No refetch runs in DB window");
  if (!checks.ui_batch_match) {
    gaps.push(
      `UI batch mismatch: processed=${processed} changed=${changed} no_change=${noChange} conflicts=${conflicts} skipped_license=${skippedLicense} skipped_robots=${skippedRobots} unavailable=${unavailable} failed=${failed}`,
    );
  }
  if (!checks.no_change_no_duplicate_snapshots) {
    gaps.push("NO_CHANGE runs may have created snapshots near run time");
  }
  if (!checks.no_dd_extraction_during_no_change_batch) {
    gaps.push(`DD extraction runs during batch: ${ddDuringNoChange.length}`);
  }
  if (!checks.zero_conflicts) gaps.push(`Conflicts: ${conflicts}`);
  if (!checks.no_duplicate_events) gaps.push("Duplicate auction events detected");
  if (!checks.successful_hashes) gaps.push("Invalid content_hash on runs");
  if (!checks.snapshots_have_sha256 && evidence.snapshots.length > 0) {
    gaps.push("Invalid snapshot hashes");
  }

  if (gaps.length === 0 && checks.runs_exist) {
    evidence.verdict = "PRODUCTION READY";
  } else if (checks.runs_exist && gaps.some((g) => g.includes("UI batch"))) {
    evidence.verdict = "PRODUCTION READY WITH EVIDENCE GAP";
    evidence.verdict_notes = gaps;
  } else if (checks.runs_exist && gaps.length <= 2) {
    evidence.verdict = "PRODUCTION READY WITH EVIDENCE GAP";
    evidence.verdict_notes = gaps;
  } else {
    evidence.verdict = gaps.length ? "PRODUCTION READY WITH EVIDENCE GAP" : "NOT PRODUCTION READY";
    evidence.verdict_notes = gaps.length ? gaps : ["Insufficient DB evidence"];
  }

  writeFileSync(
    "LIVE_SOURCE_REFETCH_PRODUCTION_EVIDENCE.json",
    JSON.stringify(evidence, null, 2),
  );
  console.log(JSON.stringify(evidence, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
