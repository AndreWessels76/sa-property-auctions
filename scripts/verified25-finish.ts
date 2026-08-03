/**
 * Finish Verified25: repair images via hotlink fallback, then approve
 * checklist-ready non-seed Bidders Choice listings up to target 25.
 */
import { readFileSync, writeFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";
import { buildVerificationChecklist } from "../lib/acquisition/verificationChecklist";
import { extractBiddersChoiceListing } from "../lib/connectors/biddersChoice/extractListing";
import { checkRobotsAllowed } from "../lib/connectors/biddersChoice/robots";
import { scoreMultiDimensionalQuality } from "../lib/data/multiQualityScore";
import { resolveAuctionAgency } from "../lib/auction/agencyDisplay";
import { isSeedOrDemo } from "../lib/data/propertyFoundation";
import type { Property } from "../lib/types/property";

const TARGET = 25;
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
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}

async function imageCount(client: ReturnType<typeof db>, id: string) {
  const { count } = await client
    .from("property_images")
    .select("*", { count: "exact", head: true })
    .eq("property_id", id);
  return count ?? 0;
}

async function attachHotlinkImages(
  client: ReturnType<typeof db>,
  property: Property,
): Promise<{ inserted: number; patch: Partial<Property> }> {
  if (!property.source_url) return { inserted: 0, patch: {} };
  const res = await fetch(property.source_url, {
    headers: { "User-Agent": UA, Accept: "text/html" },
  });
  if (!res.ok) return { inserted: 0, patch: {} };
  const html = await res.text();
  const extracted = extractBiddersChoiceListing(html, property.source_url);
  const urls = (extracted.imageUrls ?? [])
    .filter((u) => /^https?:\/\//i.test(u))
    .filter((u) => !/logo|icon|112|BIDDERS-CHOICE-112/i.test(u))
    .slice(0, 8);

  let inserted = 0;
  for (let i = 0; i < urls.length; i += 1) {
    const attempts: Array<Record<string, unknown>> = [
      {
        property_id: property.id,
        image_url: urls[i],
        is_primary: i === 0,
        is_hero: i === 0,
      },
      {
        property_id: property.id,
        image_url: urls[i],
        is_hero: i === 0,
      },
      {
        property_id: property.id,
        image_url: urls[i],
      },
    ];
    let ok = false;
    for (const row of attempts) {
      const { error } = await client.from("property_images").insert(row);
      if (!error) {
        ok = true;
        break;
      }
    }
    if (ok) inserted += 1;
  }

  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (inserted > 0 && urls[0]) {
    patch.hero_image = urls[0];
    patch.image = urls[0];
  }
  if (!property.town && extracted.town && extracted.town.length > 2) {
    patch.town = extracted.town;
  }
  if (!property.province && extracted.province) patch.province = extracted.province;
  if (!property.suburb && extracted.suburb) patch.suburb = extracted.suburb;
  if (!property.address && extracted.streetAddress) {
    patch.address = extracted.streetAddress;
  }
  if (!property.street_address && extracted.streetAddress) {
    patch.street_address = extracted.streetAddress;
  }
  if (!property.auction_agency && extracted.auctionAgency) {
    patch.auction_agency = extracted.auctionAgency;
  }
  if (!property.description && extracted.description) {
    patch.description = extracted.description;
  }

  await client.from("properties").update(patch).eq("id", property.id);
  return { inserted, patch: patch as Partial<Property> };
}

async function main() {
  loadEnv();
  const client = db();
  const robots = await checkRobotsAllowed("https://www.bidderschoice.co.za", "/");
  if (!robots.allowed) throw new Error(robots.reason);

  const { count: verifiedBefore } = await client
    .from("properties")
    .select("*", { count: "exact", head: true })
    .eq("verification_state", "verified");

  const { data: pending } = await client
    .from("properties")
    .select("*")
    .eq("verification_state", "pending_verification")
    .eq("connector_id", "bidders_choice")
    .order("updated_at", { ascending: false })
    .limit(80);

  console.log("Pending BC:", pending?.length ?? 0, "Verified before:", verifiedBefore);

  const approved: string[] = [];
  const rejected: Array<{ id: string; title: string; reason: string }> = [];
  let need = Math.max(0, TARGET - (verifiedBefore ?? 0));

  for (const row of (pending as Property[]) ?? []) {
    if (need <= 0) break;

    if (
      isSeedOrDemo(row.data_classification, row.source) ||
      isSeedOrDemo(row.data_classification, row.source_name)
    ) {
      rejected.push({ id: row.id, title: row.title, reason: "seed" });
      continue;
    }

    let images = (await imageCount(client, row.id)) > 0;
    let working = { ...row };
    if (!images) {
      const result = await attachHotlinkImages(client, row);
      console.log(`Images hotlinked for ${row.title}: ${result.inserted}`);
      images = result.inserted > 0;
      working = { ...row, ...result.patch };
    }

    const agencyResolved = resolveAuctionAgency(working.source);
    const scores = scoreMultiDimensionalQuality({
      ...working,
      hasImages: images,
      auction_agency: working.auction_agency ?? agencyResolved.name,
      agency_website: working.agency_website ?? agencyResolved.website,
      agency_contact: working.agency_contact ?? agencyResolved.contact,
    });
    const checklist = buildVerificationChecklist(
      working,
      images,
      scores.overallQualityScore,
    );

    if (!checklist.readyToApprove) {
      rejected.push({
        id: row.id,
        title: row.title,
        reason: `missing ${checklist.missing.join(",")}`,
      });
      await client.from("import_rejections").insert({
        connector_id: "bidders_choice",
        external_listing_id: row.external_listing_id,
        source_url: row.source_url,
        reason: `Checklist incomplete: ${checklist.missing.join(", ")}`,
        payload: { propertyId: row.id },
        job_id: "verified25_finish",
      });
      continue;
    }

    const now = new Date().toISOString();
    const { error } = await client
      .from("properties")
      .update({
        verification_state: "verified",
        data_classification: "production",
        last_verified_at: now,
        status_changed_at: now,
        status_change_reason:
          "Verified Listings 25 — checklist passed against Bidders Choice source",
        status_source_event: "verified25_finish_approve",
        provenance_notes: `Approved via Verified25 finish (quality ${scores.overallQualityScore})`,
        updated_at: now,
      })
      .eq("id", row.id)
      .eq("verification_state", "pending_verification");

    if (error) {
      rejected.push({ id: row.id, title: row.title, reason: error.message });
      continue;
    }

    approved.push(row.id);
    need -= 1;
    console.log(`Approved (${approved.length}): ${row.title}`);
  }

  const { count: verifiedAfter } = await client
    .from("properties")
    .select("*", { count: "exact", head: true })
    .eq("verification_state", "verified");

  const { data: catalogue } = await client
    .from("properties")
    .select(
      "id,title,property_type,province,town,auction_date,auction_agency,source_name,source_url,external_listing_id,imported_at,last_verified_at,connector_id",
    )
    .eq("verification_state", "verified")
    .order("last_verified_at", { ascending: false });

  const evidence = {
    verifiedBefore,
    verifiedAfter,
    approvedCount: approved.length,
    approvedIds: approved,
    rejectedCount: rejected.length,
    rejectedSample: rejected.slice(0, 40),
    targetMet: (verifiedAfter ?? 0) >= TARGET,
    catalogue,
    at: new Date().toISOString(),
  };
  writeFileSync("VERIFIED25_IMPORT_EVIDENCE.json", JSON.stringify(evidence, null, 2));
  console.log(JSON.stringify({
    verifiedBefore,
    verifiedAfter,
    approved: approved.length,
    rejected: rejected.length,
    targetMet: evidence.targetMet,
  }, null, 2));

  if (!evidence.targetMet) process.exitCode = 2;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
