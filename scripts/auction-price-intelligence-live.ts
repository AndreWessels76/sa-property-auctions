/**
 * Read-only live validation for Auction Price Intelligence 2A.
 * Writes AUCTION_PRICE_INTELLIGENCE_LIVE.json
 *
 * Usage:
 *   npx --yes tsx --env-file=.env.local scripts/auction-price-intelligence-live.ts
 */
import { readFileSync, writeFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";
import { PropertyMapper } from "../lib/mappers/PropertyMapper";
import type { Property } from "../lib/types/property";
import { buildAuctionPriceIntelligence } from "../lib/intelligence/pricing";
import { isPubliclyActiveListing } from "../lib/data/publicListingPolicy";
import { AuctionEventRepository } from "../lib/repositories/PropertyIdentityRepository";

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

async function main() {
  loadEnv();
  const db = supabase();

  const { data: upcomingRows } = await db
    .from("properties")
    .select("*")
    .eq("verification_state", "verified")
    .not("source_url", "is", null)
    .order("auction_date", { ascending: true })
    .limit(40);

  const upcoming = (upcomingRows ?? []).find((row) =>
    isPubliclyActiveListing({
      verification_state: row.verification_state,
      listing_status: row.listing_status,
      status: row.status,
      auction_date: row.auction_date,
    }),
  );

  const { data: farmRows } = await db
    .from("properties")
    .select("*")
    .or(
      "title.ilike.%Haenertsburg%,property_type.ilike.%Farm%,town.ilike.%Haenertsburg%",
    )
    .limit(10);

  const farm =
    (farmRows ?? []).find((r) =>
      /haenertsburg/i.test(`${r.title} ${r.town}`),
    ) ?? (farmRows ?? [])[0];

  const { data: residentialRows } = await db
    .from("properties")
    .select("*")
    .eq("verification_state", "verified")
    .or("property_type.eq.House,property_type.eq.Apartment,property_type.eq.Townhouse")
    .not("auction_price", "is", null)
    .order("auction_date", { ascending: true })
    .limit(20);

  const residential = (residentialRows ?? []).find((row) =>
    isPubliclyActiveListing({
      verification_state: row.verification_state,
      listing_status: row.listing_status,
      status: row.status,
      auction_date: row.auction_date,
    }),
  );

  async function sample(label: string, row: Record<string, unknown> | undefined, premium: boolean) {
    if (!row) return { label, error: "No matching listing" };
    const property = PropertyMapper.toDTO(row as Property);
    const masterId = (row.property_master_id as string | null) ?? null;
    let events: unknown[] = [];
    if (masterId) {
      events = await AuctionEventRepository.listByMaster(masterId);
    }
    const intelligence = buildAuctionPriceIntelligence({
      property,
      propertyMasterId: masterId,
      auctionEvents: events as never,
      premium,
    });
    return {
      label,
      id: property.id,
      title: property.title,
      verification_state: property.verification_state,
      listing_status: property.listing_status,
      public_catalogue: isPubliclyActiveListing({
        verification_state: property.verification_state,
        listing_status: property.listing_status,
        status: property.status,
        auction_date: property.auction_date,
      }),
      auction_price: property.auction_price,
      estimated_value: property.estimated_value,
      reserve_price: property.reserve_price,
      floor_size: property.floor_size,
      hectares: property.agricultural_details?.totalHectares ?? null,
      property_master_id: masterId,
      event_count: events.length,
      intelligence: {
        auctionDisplay: intelligence.current.auctionPrice.display,
        guideDisplay: intelligence.current.guidePrice.display,
        reserveDisplay: intelligence.current.reservePrice.display,
        estimatedDisplay: intelligence.current.estimatedValue.display,
        difference: intelligence.difference?.narrative ?? null,
        perM2: intelligence.unitAnalysis.perBuildingM2.display,
        perHa: intelligence.unitAnalysis.perHectare.display,
        historicalPoints: intelligence.historical.timeline.length,
        limitations: intelligence.limitations,
      },
    };
  }

  const out = {
    generated_at: new Date().toISOString(),
    samples: [
      await sample("upcoming_verified", upcoming, true),
      await sample("residential_upcoming", residential, true),
      await sample("agricultural_historical_haenertsburg", farm, true),
    ],
  };

  writeFileSync(
    "AUCTION_PRICE_INTELLIGENCE_LIVE.json",
    JSON.stringify(out, null, 2),
  );
  console.log(JSON.stringify(out, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
