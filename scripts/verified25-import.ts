/**
 * VERIFIED LISTINGS 25 — discover BC listing URLs across paginated index,
 * import via acquisition engine, approve only checklist-ready non-seed rows.
 *
 * Usage:
 *   $env:NODE_OPTIONS='--use-system-ca'
 *   npx --yes tsx --import ./scripts/shims/register-server-only.mjs --env-file=.env.local scripts/verified25-import.ts
 */
import { readFileSync, writeFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";
import { PropertyAcquisitionEngine } from "../lib/acquisition/PropertyAcquisitionEngine";
import { buildVerificationChecklist } from "../lib/acquisition/verificationChecklist";
import { BiddersChoiceConnector } from "../lib/connectors/biddersChoice/BiddersChoiceConnector";
import { checkRobotsAllowed } from "../lib/connectors/biddersChoice/robots";
import { scoreMultiDimensionalQuality } from "../lib/data/multiQualityScore";
import { resolveAuctionAgency } from "../lib/auction/agencyDisplay";
import { isSeedOrDemo } from "../lib/data/propertyFoundation";
import type { Property } from "../lib/types/property";

const TARGET_VERIFIED = 25;
const MAX_PAGES = Number(process.env.VERIFIED25_MAX_PAGES ?? "5");
const MAX_IMPORT = Number(process.env.VERIFIED25_MAX_LISTINGS ?? "35");
const REPORT_PATH = "VERIFIED25_IMPORT_EVIDENCE.json";
const UA =
  "SAPropertyAuctionsBot/1.0 (+https://sa-property-auctions.vercel.app; verified-listings)";

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
  if (!url || !key) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

async function countByState(
  client: ReturnType<typeof db>,
  state: string,
): Promise<number> {
  const { count, error } = await client
    .from("properties")
    .select("*", { count: "exact", head: true })
    .eq("verification_state", state);
  if (error) throw error;
  return count ?? 0;
}

async function hasImages(
  client: ReturnType<typeof db>,
  propertyId: string,
): Promise<boolean> {
  const { count } = await client
    .from("property_images")
    .select("*", { count: "exact", head: true })
    .eq("property_id", propertyId);
  return (count ?? 0) > 0;
}

function isListingUrl(url: string): boolean {
  try {
    const u = new URL(url);
    if (!u.hostname.includes("bidderschoice.co.za")) return false;
    const path = u.pathname.toLowerCase().replace(/\/+$/, "");
    if (!path.includes("/property-listings/")) return false;
    if (/\/property-listings\/(page|feed|category|tag)(\/|$)/i.test(path)) {
      return false;
    }
    if (path === "/property-listings") return false;
    const slug = path.split("/").filter(Boolean).pop() ?? "";
    return slug.length > 8;
  } catch {
    return false;
  }
}

async function discoverFromIndex(maxPages: number): Promise<string[]> {
  const robots = await checkRobotsAllowed("https://www.bidderschoice.co.za", "/");
  if (!robots.allowed) throw new Error(`Robots blocked: ${robots.reason}`);

  const found = new Set<string>();
  const bases = [
    "https://www.bidderschoice.co.za",
    "https://bidderschoice.co.za",
  ];

  for (const base of bases) {
    for (let page = 1; page <= maxPages; page += 1) {
      const indexUrl =
        page === 1
          ? `${base}/property-listings/`
          : `${base}/property-listings/page/${page}/`;
      try {
        const res = await fetch(indexUrl, {
          headers: { "User-Agent": UA, Accept: "text/html" },
        });
        if (!res.ok) {
          console.log("page miss", indexUrl, res.status);
          break;
        }
        const html = await res.text();
        let added = 0;
        for (const m of html.matchAll(/href=["']([^"']+)["']/gi)) {
          try {
            const abs = new URL(m[1], indexUrl).toString();
            if (isListingUrl(abs)) {
              const normalized =
                new URL(abs).origin +
                new URL(abs).pathname.replace(/\/?$/, "/");
              if (!found.has(normalized)) {
                found.add(normalized);
                added += 1;
              }
            }
          } catch {
            /* skip */
          }
        }
        console.log(`Index ${indexUrl} → +${added} (total ${found.size})`);
        if (added === 0 && page > 1) break;
      } catch (error) {
        console.log(
          "index error",
          indexUrl,
          error instanceof Error ? error.message : error,
        );
        break;
      }
    }
  }

  // Always include the known live verified listing source for re-sync.
  found.add(
    "https://bidderschoice.co.za/property-listings/online-auction-guest-farm-haenertsburg-magoebaskloof-limpopo/",
  );

  return [...found];
}

async function main() {
  loadEnv();
  const client = db();

  const before = {
    verified: await countByState(client, "verified"),
    pending: await countByState(client, "pending_verification"),
  };
  console.log("Before:", before);

  console.log("Discovering listing URLs...");
  const listingUrls = await discoverFromIndex(MAX_PAGES);
  writeFileSync(
    "VERIFIED25_DISCOVERED_URLS.json",
    JSON.stringify(
      { count: listingUrls.length, urls: listingUrls, at: new Date().toISOString() },
      null,
      2,
    ),
  );
  console.log(`Discovered ${listingUrls.length} listing URLs`);

  if (listingUrls.length === 0) {
    throw new Error("No listing URLs discovered — cannot import");
  }

  const jobId = `verified25_${Date.now().toString(36)}`;
  const engine = new PropertyAcquisitionEngine(new BiddersChoiceConnector());

  console.log(`Importing up to ${Math.min(listingUrls.length, MAX_IMPORT)} URLs...`);
  const run = await engine.run({
    jobId,
    listingUrls: listingUrls.slice(0, MAX_IMPORT),
    allowPublicFetch: true,
    maxListings: MAX_IMPORT,
  });
  console.log("Acquisition result:", {
    imported: run.imported,
    updated: run.updated,
    rejected: run.rejected,
    duplicates: run.duplicates,
    errors: run.errors,
    durationMs: run.durationMs,
  });

  const { data: pendingRows, error: pendingError } = await client
    .from("properties")
    .select("*")
    .in("verification_state", ["pending_verification", "verified"])
    .order("updated_at", { ascending: false })
    .limit(300);
  if (pendingError) throw pendingError;

  const approved: string[] = [];
  const rejected: Array<{ id: string; title: string; missing: string[]; reason: string }> =
    [];

  let verifiedNow = await countByState(client, "verified");
  let need = Math.max(0, TARGET_VERIFIED - verifiedNow);

  for (const row of (pendingRows as Property[]) ?? []) {
    if (need <= 0) break;
    if (row.verification_state === "verified") continue;

    // Never promote seed/demo catalogue into production verified.
    if (isSeedOrDemo(row.data_classification, row.source) ||
      isSeedOrDemo(row.data_classification, row.source_name) ||
      /seed/i.test(row.auction_agency ?? "")) {
      rejected.push({
        id: row.id,
        title: row.title,
        missing: ["seed_data"],
        reason: "Seed/illustrative catalogue excluded from production verify",
      });
      await client.from("import_rejections").insert({
        connector_id: row.connector_id || "manual",
        external_listing_id: row.external_listing_id,
        source_url: row.source_url,
        reason: "Seed data cannot be production-verified",
        payload: { propertyId: row.id },
        job_id: jobId,
      });
      continue;
    }

    const images = await hasImages(client, row.id);
    const agencyResolved = resolveAuctionAgency(row.source);
    const scores = scoreMultiDimensionalQuality({
      ...row,
      hasImages: images,
      auction_agency: row.auction_agency ?? agencyResolved.name,
      agency_website: row.agency_website ?? agencyResolved.website,
      agency_contact: row.agency_contact ?? agencyResolved.contact,
    });
    const checklist = buildVerificationChecklist(
      row,
      images,
      scores.overallQualityScore,
    );

    if (!checklist.readyToApprove) {
      rejected.push({
        id: row.id,
        title: row.title,
        missing: checklist.missing,
        reason: "Checklist incomplete",
      });
      await client.from("import_rejections").insert({
        connector_id: row.connector_id || "bidders_choice",
        external_listing_id: row.external_listing_id,
        source_url: row.source_url,
        reason: `Checklist incomplete: ${checklist.missing.join(", ") || "quality"}`,
        payload: { propertyId: row.id, quality: scores.overallQualityScore },
        job_id: jobId,
      });
      continue;
    }

    const now = new Date().toISOString();
    const { error: approveError } = await client
      .from("properties")
      .update({
        verification_state: "verified",
        data_classification: "production",
        last_verified_at: now,
        status_changed_at: now,
        status_change_reason:
          "Verified Listings 25 — checklist passed against Bidders Choice source",
        status_source_event: "verified25_bulk_approve",
        provenance_notes: `Approved via Verified25 checklist (quality ${scores.overallQualityScore}). Source: ${row.source_name || "Bidders Choice"}`,
        updated_at: now,
      })
      .eq("id", row.id)
      .eq("verification_state", "pending_verification");

    if (approveError) {
      rejected.push({
        id: row.id,
        title: row.title,
        missing: [`approve_failed: ${approveError.message}`],
        reason: "Approve failed",
      });
      continue;
    }

    approved.push(row.id);
    need -= 1;
    verifiedNow += 1;
    console.log(`Approved (${approved.length}): ${row.title}`);
  }

  const after = {
    verified: await countByState(client, "verified"),
    pending: await countByState(client, "pending_verification"),
  };

  const { data: verifiedRows } = await client
    .from("properties")
    .select(
      "id,title,property_type,province,town,auction_date,auction_agency,source_name,source_url,external_listing_id,verification_state,imported_at,last_verified_at,connector_id,data_classification",
    )
    .eq("verification_state", "verified")
    .order("last_verified_at", { ascending: false })
    .limit(100);

  const evidence = {
    jobId,
    target: TARGET_VERIFIED,
    before,
    discoveredUrls: listingUrls.length,
    acquisition: {
      imported: run.imported,
      updated: run.updated,
      rejected: run.rejected,
      duplicates: run.duplicates,
      archived: run.archived,
      durationMs: run.durationMs,
      errors: run.errors,
    },
    approval: {
      approvedCount: approved.length,
      approvedIds: approved,
      checklistRejected: rejected.length,
      rejectedSample: rejected.slice(0, 50),
    },
    after,
    verifiedCatalogue: verifiedRows ?? [],
    targetMet: after.verified >= TARGET_VERIFIED,
    generatedAt: new Date().toISOString(),
  };

  writeFileSync(REPORT_PATH, JSON.stringify(evidence, null, 2));
  console.log("\n=== VERIFIED 25 SUMMARY ===");
  console.log(
    JSON.stringify(
      {
        before,
        after,
        approved: approved.length,
        checklistRejected: rejected.length,
        discoveredUrls: listingUrls.length,
        targetMet: evidence.targetMet,
      },
      null,
      2,
    ),
  );

  if (!evidence.targetMet) {
    console.warn(
      `Target not met: ${after.verified}/${TARGET_VERIFIED} verified.`,
    );
    process.exitCode = 2;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
