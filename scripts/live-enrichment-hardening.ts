/**
 * Controlled live refresh of one upcoming/live verified Bidders Choice listing.
 * Writes LIVE_ENRICHMENT_HARDENING_LIVE.json
 *
 * Usage:
 *   $env:NODE_OPTIONS='--use-system-ca'
 *   $env:BIDDERS_CHOICE_ALLOW_PUBLIC_FETCH='true'
 *   npx --yes tsx --env-file=.env.local scripts/live-enrichment-hardening.ts
 */
import { readFileSync, writeFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";
import { PropertyMapper } from "../lib/mappers/PropertyMapper";
import type { Property } from "../lib/types/property";
import { refetchPropertySource } from "../lib/acquisition/refetch/sourceRefetchService";
import { isPubliclyActiveListing } from "../lib/data/publicListingPolicy";

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

async function evidenceFor(propertyId: string) {
  const db = supabase();
  const { data: prop } = await db
    .from("properties")
    .select(
      "id,title,source_url,verification_state,listing_status,status,auction_date,property_master_id,last_verified_at",
    )
    .eq("id", propertyId)
    .maybeSingle();
  const { data: runs } = await db
    .from("source_refetch_runs")
    .select(
      "id,run_code,status,http_status,content_hash,previous_hash,changed,conflicts,extraction_run_id,started_at,meta",
    )
    .eq("property_id", propertyId)
    .order("started_at", { ascending: false })
    .limit(5);
  const { data: snaps } = await db
    .from("source_snapshots")
    .select("id,content_hash,fetched_at,change_class")
    .eq("property_id", propertyId)
    .order("fetched_at", { ascending: false })
    .limit(10);
  const { data: dd } = await db
    .from("due_diligence_extraction_runs")
    .select("id,fields_found,conflicts,updated_at")
    .eq("property_id", propertyId)
    .order("updated_at", { ascending: false })
    .limit(3);
  const { data: events } = await db
    .from("auction_events")
    .select("id")
    .eq("listing_property_id", propertyId);
  const { count: masterCount } = await db
    .from("property_masters")
    .select("id", { count: "exact", head: true })
    .eq("id", prop?.property_master_id ?? "00000000-0000-0000-0000-000000000000");

  const hashCounts: Record<string, number> = {};
  for (const s of snaps ?? []) {
    hashCounts[s.content_hash] = (hashCounts[s.content_hash] ?? 0) + 1;
  }

  return {
    prop,
    public_catalogue: isPubliclyActiveListing({
      verification_state: prop?.verification_state,
      listing_status: prop?.listing_status,
      status: prop?.status,
      auction_date: prop?.auction_date,
    }),
    latest_run: runs?.[0] ?? null,
    snapshot_count: snaps?.length ?? 0,
    duplicate_hash_snapshots: Object.entries(hashCounts)
      .filter(([, n]) => n > 1)
      .map(([hash, n]) => ({ hash, n })),
    dd: dd ?? [],
    auction_event_count: events?.length ?? 0,
    property_master_id: prop?.property_master_id ?? null,
    master_row_present: (masterCount ?? 0) > 0,
  };
}

async function main() {
  loadEnv();
  const db = supabase();
  const { data: candidates } = await db
    .from("properties")
    .select("*")
    .eq("verification_state", "verified")
    .not("source_url", "is", null)
    .ilike("source_url", "%bidderschoice%")
    .order("auction_date", { ascending: true })
    .limit(40);

  const upcoming = (candidates ?? []).find((row) =>
    isPubliclyActiveListing({
      verification_state: row.verification_state,
      listing_status: row.listing_status,
      status: row.status,
      auction_date: row.auction_date,
    }),
  );

  if (!upcoming) {
    const out = {
      generated_at: new Date().toISOString(),
      error: "No verified upcoming/live Bidders Choice listing found",
    };
    writeFileSync("LIVE_ENRICHMENT_HARDENING_LIVE.json", JSON.stringify(out, null, 2));
    console.log(JSON.stringify(out, null, 2));
    return;
  }

  const property = PropertyMapper.toDTO(upcoming as Property);
  const first = await refetchPropertySource({
    property,
    partnerCode: "bidders_choice",
    connectorId: "bidders_choice",
    force: true,
    operator: "hardening_live",
  });

  const second = await refetchPropertySource({
    property,
    partnerCode: "bidders_choice",
    connectorId: "bidders_choice",
    force: true,
    operator: "hardening_live",
  });

  const after = await evidenceFor(property.id);

  const expiredIds = [
    "3e7ea1ff-f237-4a6c-8b36-23bb34c4136c", // Haenertsburg
    "97ae53e8-ecc0-4ad0-bb8f-b52cfa9a03bd", // Benoni
  ];
  const expiredHistorical = [];
  for (const id of expiredIds) {
    expiredHistorical.push(await evidenceFor(id));
  }

  const out = {
    generated_at: new Date().toISOString(),
    property: {
      id: property.id,
      title: property.title,
      source_url: property.source_url,
      auction_date: property.auction_date,
      verification_state: property.verification_state,
      listing_status: property.listing_status,
    },
    expired_historical: expiredHistorical.map((row) => ({
      id: row.prop?.id ?? null,
      title: row.prop?.title ?? null,
      verification_state: row.prop?.verification_state ?? null,
      listing_status: row.prop?.listing_status ?? null,
      auction_date: row.prop?.auction_date ?? null,
      public_catalogue: row.public_catalogue,
      property_master_id: row.property_master_id,
      auction_event_count: row.auction_event_count,
    })),
    force_first: {
      runCode: first.runCode,
      status: first.status,
      httpStatus: first.httpStatus,
      forced: first.forced,
      changed: first.changed,
      contentHash: first.contentHash,
      previousHash: first.previousHash,
      snapshotId: first.snapshotId,
      extractionRunId: first.extractionRunId,
      conflicts: first.conflicts,
      message: first.message,
    },
    force_second: {
      runCode: second.runCode,
      status: second.status,
      httpStatus: second.httpStatus,
      forced: second.forced,
      changed: second.changed,
      contentHash: second.contentHash,
      previousHash: second.previousHash,
      snapshotId: second.snapshotId,
      extractionRunId: second.extractionRunId,
      conflicts: second.conflicts,
      message: second.message,
    },
    after,
  };

  writeFileSync("LIVE_ENRICHMENT_HARDENING_LIVE.json", JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
