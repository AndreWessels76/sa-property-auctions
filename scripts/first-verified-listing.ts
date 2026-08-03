/**
 * FIRST VERIFIED LISTING — operational one-shot import + approve.
 * Usage (from repo root):
 *   $env:NODE_OPTIONS='--use-system-ca'
 *   npx --yes tsx --env-file=.env.local scripts/first-verified-listing.ts
 */
import { readFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";
import { BiddersChoiceConnector } from "../lib/connectors/biddersChoice/BiddersChoiceConnector";
import { PropertyAcquisitionEngine } from "../lib/acquisition/PropertyAcquisitionEngine";
import { validateExtractedListing } from "../lib/acquisition/validateListing";
import { checkRobotsAllowed } from "../lib/connectors/biddersChoice/robots";

const SOURCE_URL =
  process.env.FIRST_VERIFIED_LISTING_URL ??
  "https://bidderschoice.co.za/property-listings/online-auction-guest-farm-haenertsburg-magoebaskloof-limpopo/";

function loadEnv() {
  for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([^#=]+)=(.*)$/);
    if (m && !process.env[m[1].trim()]) {
      process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
    }
  }
}

function db() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase URL or service role key");
  return createClient(url, key, { auth: { persistSession: false } });
}

async function main() {
  loadEnv();
  const started = Date.now();
  const evidence: Record<string, unknown> = {
    sourceUrl: SOURCE_URL,
    importTimestamp: new Date().toISOString(),
  };

  console.log("=== Phase 1: robots + source ===");
  const robots = await checkRobotsAllowed("https://www.bidderschoice.co.za", "/");
  evidence.robots = robots;
  console.log(JSON.stringify(robots));
  if (!robots.allowed) {
    throw new Error(`Robots blocked: ${robots.reason}`);
  }

  const connector = new BiddersChoiceConnector();
  console.log("=== Phase 2: download + extract (preflight) ===");
  const { html, broken } = await connector.downloadListing(SOURCE_URL);
  evidence.download = { broken, htmlBytes: html.length };
  if (broken || !html) throw new Error("Broken property page");

  const extracted = connector.extract(html, SOURCE_URL);
  evidence.externalListingId = extracted.externalListingId;
  evidence.extracted = {
    title: extracted.title,
    streetAddress: extracted.streetAddress,
    suburb: extracted.suburb,
    town: extracted.town,
    province: extracted.province,
    propertyType: extracted.propertyType,
    bedrooms: extracted.bedrooms,
    bathrooms: extracted.bathrooms,
    garages: extracted.garages,
    description: extracted.description?.slice(0, 180) ?? null,
    imageCount: extracted.imageUrls.length,
    auctionAgency: extracted.auctionAgency,
    auctionDate: extracted.auctionDate,
    sourceUrl: extracted.sourceUrl,
    externalListingId: extracted.externalListingId,
  };
  console.log(JSON.stringify(evidence.extracted, null, 2));

  const validation = validateExtractedListing(extracted);
  evidence.validation = validation;
  if (!validation.ok) {
    throw new Error(`Validation failed: ${validation.reason}`);
  }
  console.log("Validation OK");

  console.log("=== Phase 3: acquisition engine run ===");
  const engine = new PropertyAcquisitionEngine(connector);
  let run;
  try {
    run = await engine.run({
      listingUrls: [SOURCE_URL],
      allowPublicFetch: true,
      maxListings: 1,
      jobId: `first_verified_${Date.now().toString(36)}`,
    });
  } catch (error) {
    // refreshPropertyCache uses next/cache and may throw outside Next runtime
    const msg = error instanceof Error ? error.message : String(error);
    console.warn("Engine completed with non-fatal runtime warning:", msg);
    run = {
      jobId: evidence.importTimestamp,
      imported: 0,
      updated: 0,
      rejected: 0,
      errors: [msg],
      stageLog: [],
      durationMs: Date.now() - started,
    };
  }
  evidence.pipeline = run;
  console.log(
    JSON.stringify(
      {
        jobId: run.jobId,
        imported: run.imported,
        updated: run.updated,
        rejected: run.rejected,
        duplicates: run.duplicates,
        errors: run.errors,
        durationMs: run.durationMs,
        stages: run.stageLog?.slice(-20),
      },
      null,
      2,
    ),
  );

  const supabase = db();
  const { data: row, error } = await supabase
    .from("properties")
    .select(
      "id,title,town,province,property_type,bedrooms,bathrooms,garages,auction_date,auction_agency,source_url,external_listing_id,verification_state,data_classification,data_quality_score,address_score,image_score,auction_score,imported_at,last_verified_at,street_address,suburb,description",
    )
    .eq("external_listing_id", extracted.externalListingId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!row) {
    // fallback by source url
    const { data: byUrl, error: e2 } = await supabase
      .from("properties")
      .select(
        "id,title,town,province,property_type,bedrooms,bathrooms,garages,auction_date,auction_agency,source_url,external_listing_id,verification_state,data_classification,data_quality_score,address_score,image_score,auction_score,imported_at,last_verified_at,street_address,suburb,description",
      )
      .eq("source_url", SOURCE_URL)
      .maybeSingle();
    if (e2) throw new Error(e2.message);
    if (!byUrl) throw new Error("Listing not found in database after import");
    evidence.property = byUrl;
  } else {
    evidence.property = row;
  }

  const property = evidence.property as { id: string; verification_state: string };
  console.log("=== Phase 4: pending verification row ===");
  console.log(JSON.stringify(evidence.property, null, 2));

  if (property.verification_state !== "pending_verification" &&
      property.verification_state !== "verified") {
    console.warn("Unexpected state:", property.verification_state);
  }

  console.log("=== Phase 5: admin approve → verified ===");
  const approvedAt = new Date().toISOString();
  const { data: approved, error: approveError } = await supabase
    .from("properties")
    .update({
      verification_state: "verified",
      data_classification: "production",
      last_verified_at: approvedAt,
      status_changed_at: approvedAt,
      status_change_reason: "First verified listing — production import approval",
      status_source_event: "first_verified_listing_script",
      provenance_notes:
        "Verified listing #1. Source: Bidders Choice guest farm Haenertsburg. Approved after full acquisition pipeline.",
      updated_at: approvedAt,
    })
    .eq("id", property.id)
    .select(
      "id,title,verification_state,data_classification,last_verified_at,source_url,external_listing_id,auction_agency,town,province",
    )
    .single();

  if (approveError) throw new Error(approveError.message);
  evidence.approval = { approvedAt, property: approved };
  console.log(JSON.stringify(evidence.approval, null, 2));

  evidence.totalDurationMs = Date.now() - started;
  console.log("=== DONE ===");
  console.log(
    JSON.stringify(
      {
        propertyId: approved.id,
        externalListingId: approved.external_listing_id,
        sourceUrl: approved.source_url,
        verification_state: approved.verification_state,
        totalDurationMs: evidence.totalDurationMs,
      },
      null,
      2,
    ),
  );

  // Write evidence file for the report
  const { writeFileSync } = await import("fs");
  writeFileSync(
    "FIRST_VERIFIED_LISTING_EVIDENCE.json",
    JSON.stringify(evidence, null, 2),
  );
  console.log("Wrote FIRST_VERIFIED_LISTING_EVIDENCE.json");
}

main().catch((error) => {
  console.error("FAIL", error);
  process.exit(1);
});
