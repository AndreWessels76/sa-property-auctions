/**
 * Live Pricing Data Acquisition validation against licensed catalogue data.
 * Does NOT fabricate values. Does NOT write fake prices to production.
 *
 * Usage:
 *   npx --yes tsx --env-file=.env.local scripts/pricing-data-acquisition-live.ts
 */
import { readFileSync, writeFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";
import { extractPricingObservations } from "../lib/acquisition/pricing/pricingExtractor";
import { validatePricingDrafts, isPricingNotSupplied } from "../lib/acquisition/pricing/pricingValidator";
import { PRICING_PARSER_VERSION } from "../lib/acquisition/pricing/pricingParser";
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

async function analyzeListing(
  db: ReturnType<typeof supabase>,
  row: Record<string, unknown>,
  label: string,
) {
  const id = String(row.id);
  const sourceUrl = (row.source_url as string | null) ?? null;

  // Prefer latest snapshot text when available (licensed refetch path)
  let sourcePageText: string | null = null;
  let snapshotId: string | null = null;
  let contentHash: string | null = null;
  if (sourceUrl) {
    const { data: snaps } = await db
      .from("source_snapshots")
      .select("id,content_hash,source_text,fetched_at")
      .eq("property_id", id)
      .order("fetched_at", { ascending: false })
      .limit(1);
    const snap = snaps?.[0];
    if (snap) {
      snapshotId = snap.id;
      contentHash = snap.content_hash;
      sourcePageText = snap.source_text ?? null;
    }
  }

  const corpus = {
    title: row.title as string | null,
    description: row.description as string | null,
    features: row.features as string | null,
    source_name: (row.source_name as string | null) ?? null,
    source_url: sourceUrl,
    verification_state: row.verification_state as string | null,
    floor_size: row.floor_size as number | null,
    auction_price: row.auction_price as number | null,
    reserve_price: row.reserve_price as number | null,
    estimated_value: row.estimated_value as number | null,
    agricultural_details: row.agricultural_details as Record<string, unknown> | null,
    source_page_text: sourcePageText,
  };

  const text = [
    corpus.title,
    corpus.description,
    corpus.features,
    sourcePageText,
    corpus.agricultural_details
      ? JSON.stringify(corpus.agricultural_details)
      : null,
  ]
    .filter(Boolean)
    .join("\n");

  const drafts = validatePricingDrafts(
    extractPricingObservations(corpus, text),
  ).drafts;

  const { data: masters } = await db
    .from("properties")
    .select("property_master_id")
    .eq("id", id)
    .maybeSingle();

  const masterId = masters?.property_master_id ?? null;
  let auctionEventId: string | null = null;
  if (masterId) {
    const { data: events } = await db
      .from("auction_events")
      .select("id,auction_date,guide_price,reserve_price,status")
      .eq("listing_property_id", id)
      .limit(1);
    auctionEventId = events?.[0]?.id ?? null;
  }

  const { data: existingObs } = await db
    .from("pricing_observations")
    .select("id,field_name,normalized_value,status,evidence_text")
    .eq("property_id", id)
    .limit(20);

  const publicCatalogue = isPubliclyActiveListing({
    verification_state: row.verification_state as string,
    listing_status: row.listing_status as string,
    status: row.status as string,
    auction_date: row.auction_date as string,
  });

  return {
    label,
    property_id: id,
    title: row.title,
    source: row.source_name ?? row.auction_agency ?? row.source,
    url: sourceUrl,
    public_catalogue: publicCatalogue,
    listing_status: row.listing_status ?? row.status,
    property_master_id: masterId,
    auction_event_id: auctionEventId,
    snapshot_id: snapshotId,
    content_hash: contentHash,
    parser_version: PRICING_PARSER_VERSION,
    listing_fields: {
      auction_price: row.auction_price,
      reserve_price: row.reserve_price,
      estimated_value: row.estimated_value,
      floor_size: row.floor_size,
      hectares:
        (row.agricultural_details as { totalHectares?: number } | null)
          ?.totalHectares ?? null,
    },
    extraction_status: isPricingNotSupplied(drafts)
      ? "not_supplied"
      : "extracted",
    extracted_fields: drafts.map((d) => ({
      field: d.field_name,
      raw: d.raw_value,
      normalized: d.normalized_value,
      currency: d.currency,
      is_approximate: d.is_approximate,
      is_range: d.is_range,
      min: d.min_value,
      max: d.max_value,
      status: d.status,
      evidence: d.evidence_text,
      notes: d.notes,
    })),
    existing_observations: existingObs ?? [],
    conflicts: [],
    note: isPricingNotSupplied(drafts)
      ? "Pricing not supplied by source"
      : null,
    extracted_at: new Date().toISOString(),
  };
}

async function main() {
  loadEnv();
  const db = supabase();

  const { data: upcomingRows } = await db
    .from("properties")
    .select("*")
    .eq("verification_state", "verified")
    .not("source_url", "is", null)
    .order("auction_date", { ascending: true })
    .limit(50);

  const residential = (upcomingRows ?? []).find(
    (row) =>
      isPubliclyActiveListing({
        verification_state: row.verification_state,
        listing_status: row.listing_status,
        status: row.status,
        auction_date: row.auction_date,
      }) &&
      /house|apartment|townhouse|unit|sectional/i.test(
        String(row.property_type ?? row.title ?? ""),
      ),
  );

  const withPrice = (upcomingRows ?? []).find(
    (row) =>
      isPubliclyActiveListing({
        verification_state: row.verification_state,
        listing_status: row.listing_status,
        status: row.status,
        auction_date: row.auction_date,
      }) &&
      typeof row.auction_price === "number" &&
      row.auction_price > 0,
  );

  const withoutPrice = (upcomingRows ?? []).find(
    (row) =>
      isPubliclyActiveListing({
        verification_state: row.verification_state,
        listing_status: row.listing_status,
        status: row.status,
        auction_date: row.auction_date,
      }) &&
      (!(typeof row.auction_price === "number") || row.auction_price <= 0),
  );

  const { data: farmRows } = await db
    .from("properties")
    .select("*")
    .or(
      "title.ilike.%Haenertsburg%,property_type.ilike.%Farm%,property_type.ilike.%Agricultural%",
    )
    .limit(15);

  const agricultural =
    (farmRows ?? []).find((r) =>
      /haenertsburg|farm|agricultural|smallholding/i.test(
        `${r.title} ${r.town} ${r.property_type}`,
      ),
    ) ?? (farmRows ?? [])[0];

  const samples = [];
  if (residential) {
    samples.push(await analyzeListing(db, residential, "residential_upcoming"));
  }
  if (agricultural) {
    samples.push(await analyzeListing(db, agricultural, "agricultural"));
  }
  if (withPrice) {
    samples.push(await analyzeListing(db, withPrice, "listing_with_price"));
  }
  if (withoutPrice) {
    samples.push(await analyzeListing(db, withoutPrice, "listing_without_price"));
  }

  const evidence = {
    sprint: "Pricing Data Acquisition & Normalisation 1.0",
    generated_at: new Date().toISOString(),
    parser_version: PRICING_PARSER_VERSION,
    principles: [
      "no_fabrication",
      "no_cross_mapping",
      "no_silent_verified_overwrite",
      "public_catalogue_upcoming_live_only",
    ],
    samples,
  };

  writeFileSync(
    "PRICING_DATA_ACQUISITION_LIVE.json",
    JSON.stringify(evidence, null, 2),
    "utf8",
  );
  console.log(
    JSON.stringify(
      {
        ok: true,
        file: "PRICING_DATA_ACQUISITION_LIVE.json",
        sampleCount: samples.length,
        statuses: samples.map((s) => ({
          label: s.label,
          status: s.extraction_status,
          fields: s.extracted_fields.length,
        })),
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
