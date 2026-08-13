/**
 * Live Enrichment Closure 1.0 — targeted production refresh + backfill.
 * Writes LIVE_ENRICHMENT_CLOSURE_EVIDENCE.json (read-only DB queries + controlled runs).
 *
 * Usage:
 *   $env:NODE_OPTIONS='--use-system-ca'
 *   npx --yes tsx --env-file=.env.local scripts/live-enrichment-closure.ts
 */
import { readFileSync, writeFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";
import { PropertyMapper } from "../lib/mappers/PropertyMapper";
import type { Property } from "../lib/types/property";
import { refetchPropertySource } from "../lib/acquisition/refetch/sourceRefetchService";
import { persistRefetchExtraction } from "../lib/acquisition/refetch/refetchExtractionLinkage";
import { RefetchAudit } from "../lib/acquisition/refetch/refetchAudit";
import { SourceSnapshotService } from "../lib/acquisition/refetch/sourceSnapshotService";

const LOUIS_TRICHARDT_ID = "f3f47cca-73c8-420c-9144-146b0f4c9aba";
const LOUIS_SNAPSHOT_ID = "bcd9d752-c762-4be8-895f-70a7292aeef6";
const LOUIS_REFETCH_RUN = "rf_c751e80d-0";

function loadEnv() {
  for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([^#=]+)=(.*)$/);
    if (m && !process.env[m[1].trim()]) {
      process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
    }
  }
}

function supabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env");
  return createClient(url, key, { auth: { persistSession: false } });
}

async function loadProperty(id: string) {
  const { data } = await supabase()
    .from("properties")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;
  return PropertyMapper.toDTO(data as Property);
}

async function findProperty(pattern: string) {
  const { data } = await supabase()
    .from("properties")
    .select("*")
    .ilike("title", pattern)
    .limit(3);
  const row = data?.[0];
  return row ? PropertyMapper.toDTO(row as Property) : null;
}

async function propertyEvidence(propertyId: string) {
  const { data: prop } = await supabase()
    .from("properties")
    .select("id,title,source_url,verification_state,last_verified_at,bedrooms,town,suburb,property_master_id")
    .eq("id", propertyId)
    .maybeSingle();

  const { data: runs } = await supabase()
    .from("source_refetch_runs")
    .select("*")
    .eq("property_id", propertyId)
    .order("started_at", { ascending: false })
    .limit(5);

  const { data: snaps } = await supabase()
    .from("source_snapshots")
    .select("id,property_id,source_url,content_hash,previous_hash,fetched_at,change_class,extraction_version,http_status")
    .eq("property_id", propertyId)
    .order("fetched_at", { ascending: false })
    .limit(5);

  const { data: dd } = await supabase()
    .from("due_diligence_extraction_runs")
    .select("id,property_id,source_hash,fields_found,conflicts,extraction_version,updated_at")
    .eq("property_id", propertyId)
    .order("updated_at", { ascending: false })
    .limit(5);

  const { data: events } = await supabase()
    .from("auction_events")
    .select("id,property_master_id,listing_property_id,connector_id,external_listing_id")
    .eq("listing_property_id", propertyId);

  const eventDupes = (events ?? []).length > 1 ? (events ?? []) : [];

  return {
    prop,
    runs: runs ?? [],
    snaps: snaps ?? [],
    dd: dd ?? [],
    events: events ?? [],
    duplicate_event_count: eventDupes.length,
  };
}

async function enrichFromSnapshot(input: {
  propertyId: string;
  snapshotId: string;
  refetchRunCode: string;
}) {
  const property = await loadProperty(input.propertyId);
  if (!property) return { ok: false, error: "Property not found" };

  const snaps = await SourceSnapshotService.listForProperty(input.propertyId, 50);
  const snapshot = snaps.find((s) => s.id === input.snapshotId);
  if (!snapshot?.source_text?.trim()) {
    return { ok: false, error: "Snapshot missing or has no text" };
  }

  const persisted = await persistRefetchExtraction({
    property,
    sourcePageText: snapshot.source_text,
    operator: "enrichment_closure",
    snapshotId: snapshot.id ?? input.snapshotId,
    contentHash: snapshot.content_hash,
    refetchRunCode: input.refetchRunCode,
  });

  if (persisted.extractionRunId) {
    await RefetchAudit.linkExtractionRun({
      runCode: input.refetchRunCode,
      extractionRunId: persisted.extractionRunId,
      snapshotId: snapshot.id ?? input.snapshotId,
    });
  }

  return {
    ok: true,
    extractionRunId: persisted.extractionRunId,
    fieldsFound: persisted.fieldsFound,
    conflicts: persisted.conflicts,
    contentHash: snapshot.content_hash,
  };
}

async function refreshProperty(propertyId: string) {
  const property = await loadProperty(propertyId);
  if (!property) return { ok: false, error: "Property not found" };

  const result = await refetchPropertySource({
    property,
    partnerCode: "bidders_choice",
    connectorId: "bidders_choice",
    force: true,
    operator: "enrichment_closure",
  });

  return { ok: true, result };
}

async function main() {
  loadEnv();

  const evidence: Record<string, unknown> = {
    generated_at: new Date().toISOString(),
    steps: [] as unknown[],
  };

  console.log("Step 1: Louis Trichardt backfill...");
  const louisBackfill = await enrichFromSnapshot({
    propertyId: LOUIS_TRICHARDT_ID,
    snapshotId: LOUIS_SNAPSHOT_ID,
    refetchRunCode: LOUIS_REFETCH_RUN,
  });
  (evidence.steps as unknown[]).push({ step: "louis_backfill", ...louisBackfill });

  console.log("Step 2: Haenertsburg refresh...");
  const haenertsburg = await findProperty("%Guest Farm%Haenertsburg%");
  let haenertsburgResult = null;
  if (haenertsburg) {
    haenertsburgResult = await refreshProperty(haenertsburg.id);
    (evidence.steps as unknown[]).push({
      step: "haenertsburg_refresh",
      propertyId: haenertsburg.id,
      title: haenertsburg.title,
      ...haenertsburgResult,
    });
  } else {
    (evidence.steps as unknown[]).push({
      step: "haenertsburg_refresh",
      error: "Property not found",
    });
  }

  console.log("Step 3: Benoni refresh...");
  const benoni =
    (await findProperty("%Crystal Park%Benoni%")) ??
    (await findProperty("%Orchards%Benoni%"));
  let benoniResult = null;
  if (benoni) {
    benoniResult = await refreshProperty(benoni.id);
    (evidence.steps as unknown[]).push({
      step: "benoni_refresh",
      propertyId: benoni.id,
      title: benoni.title,
      ...benoniResult,
    });
  } else {
    (evidence.steps as unknown[]).push({
      step: "benoni_refresh",
      error: "Property not found",
    });
  }

  evidence.louis_trichardt = await propertyEvidence(LOUIS_TRICHARDT_ID);
  if (haenertsburg) evidence.haenertsburg = await propertyEvidence(haenertsburg.id);
  if (benoni) evidence.benoni = await propertyEvidence(benoni.id);

  writeFileSync(
    "LIVE_ENRICHMENT_CLOSURE_EVIDENCE.json",
    JSON.stringify(evidence, null, 2),
  );
  console.log("Wrote LIVE_ENRICHMENT_CLOSURE_EVIDENCE.json");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
