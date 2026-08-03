/**
 * Post-import corrections for first verified listing (source-accurate date + gallery URLs).
 * Usage: npx tsx --env-file=.env.local scripts/first-verified-listing-finalize.ts
 */
import { readFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";

async function main() {
  for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([^#=]+)=(.*)$/);
    if (m && !process.env[m[1].trim()]) {
      process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
    }
  }

  const id = "3e7ea1ff-f237-4a6c-8b36-23bb34c4136c";
  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );

  const { data: updated, error: e1 } = await db
    .from("properties")
    .update({
      auction_date: "2026-08-04",
      auction_time: "08:00",
      listing_status: "upcoming",
      status: "upcoming",
      updated_at: new Date().toISOString(),
      provenance_notes:
        "Verified listing #1. Source: Bidders Choice guest farm Haenertsburg. Auction Open 04 Aug 2026 (corrected from timezone-shifted parse). Approved after full acquisition pipeline.",
    })
    .eq("id", id)
    .select("id,auction_date,verification_state,source_url")
    .single();

  console.log("DATE_FIX", e1?.message || "ok", JSON.stringify(updated));

  const imageUrls = [
    "https://bidderschoice.co.za/wp-content/uploads/2026/06/Online-Auction-Guest-Farm-Haenertsburg-Magoebaskloof-Limpopo-25-1024x576.jpg",
    "https://bidderschoice.co.za/wp-content/uploads/2026/06/Online-Auction-Guest-Farm-Haenertsburg-Magoebaskloof-Limpopo-16-1024x576.jpg",
    "https://bidderschoice.co.za/wp-content/uploads/2026/06/Online-Auction-Guest-Farm-Haenertsburg-Magoebaskloof-Limpopo-30-1024x576.jpg",
  ];

  const { data: existing } = await db
    .from("property_images")
    .select("id")
    .eq("property_id", id);

  if ((existing?.length ?? 0) === 0) {
    const rows = imageUrls.map((url, i) => ({
      property_id: id,
      image_url: url,
      is_primary: i === 0,
      is_hero: i === 0,
      source: "Bidders Choice",
      quality_score: 70,
      quality_rating: "Good",
    }));
    const { data: imgs, error: e2 } = await db
      .from("property_images")
      .insert(rows)
      .select("id,image_url,is_hero");
    console.log("IMAGES", e2?.message || `ok ${imgs?.length}`);
  } else {
    console.log("IMAGES already present", existing?.length);
  }

  const { data: pub } = await db
    .from("properties")
    .select(
      "id,title,verification_state,town,province,auction_agency,source_url,auction_date",
    )
    .eq("verification_state", "verified");

  console.log("VERIFIED_COUNT", pub?.length);
  console.log(JSON.stringify(pub, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
