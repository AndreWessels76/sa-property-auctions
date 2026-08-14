/**
 * Seed post-execution shared-master identity reviews (queue only — no master/event writes).
 */
import { readFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";
import { POST_EXECUTION_SHARED_MASTER_CASES } from "../lib/backfill/sharedMasterReviewCases";
import { fingerprintInputFromProperty, computePropertyFingerprint } from "../lib/identity";
import { enrichVerifiedListing } from "../lib/platform/dataEnrichment";

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
  const seeded: string[] = [];

  for (const reviewCase of POST_EXECUTION_SHARED_MASTER_CASES) {
    const { data: listing } = await db
      .from("properties")
      .select("*")
      .eq("id", reviewCase.reviewListingId)
      .maybeSingle();
    if (!listing) {
      console.warn(`Listing not found: ${reviewCase.reviewListingId}`);
      continue;
    }

    const { data: anchor } = await db
      .from("properties")
      .select("title")
      .eq("id", reviewCase.anchorListingId)
      .maybeSingle();

    const enriched = enrichVerifiedListing(listing);
    const fpInput = fingerprintInputFromProperty({
      ...listing,
      farm_name: enriched.address.farmName,
      erf_number: enriched.address.erfNumber,
      town: enriched.address.town ?? listing.town,
    });
    const fp = computePropertyFingerprint(fpInput);

    const row = {
      run_id: null,
      listing_property_id: reviewCase.reviewListingId,
      review_kind: "identity",
      status: "pending",
      proposed_master_id: reviewCase.masterId,
      identity_decision: "IDENTITY_REVIEW_REQUIRED",
      confidence: 35,
      matching_signals: ["town", "province", "source_agency"],
      conflict_reason: reviewCase.summary,
      evidence: {
        source: "post_execution_shared_master_review_1.0",
        caseId: reviewCase.caseId,
        masterId: reviewCase.masterId,
        anchorListingId: reviewCase.anchorListingId,
        anchorTitle: anchor?.title ?? null,
        listingFingerprint: fp.fingerprint,
        listingFingerprintComponents: fp.components,
        recommendedAction:
          "Admin must confirm same property or split into separate Property Masters",
      },
    };

    const { data: existing } = await db
      .from("property_history_backfill_reviews")
      .select("id")
      .eq("listing_property_id", reviewCase.reviewListingId)
      .eq("review_kind", "identity")
      .eq("status", "pending")
      .maybeSingle();

    if (existing) {
      await db
        .from("property_history_backfill_reviews")
        .update({ ...row, updated_at: new Date().toISOString() })
        .eq("id", existing.id);
      seeded.push(existing.id);
    } else {
      const { data, error } = await db
        .from("property_history_backfill_reviews")
        .insert(row)
        .select("id")
        .maybeSingle();
      if (error) throw error;
      if (data?.id) seeded.push(data.id);
    }
  }

  console.log(
    JSON.stringify(
      { ok: true, seeded: seeded.length, reviewIds: seeded, cases: POST_EXECUTION_SHARED_MASTER_CASES.length },
      null,
      2,
    ),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
