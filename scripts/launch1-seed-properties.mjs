/**
 * Launch 1 — seed production catalogue with curated SA auction-style listings.
 *
 * Sources documented in LAUNCH1_DATA_SOURCES.md
 * Usage: node --env-file=.env.local scripts/launch1-seed-properties.mjs
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const db = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

/** Stock photography (Unsplash) used as launch gallery assets — not sheriff photos. */
const IMG = {
  house1: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200&q=85",
  house2: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&q=85",
  house3: "https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?w=1200&q=85",
  apt1: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1200&q=85",
  apt2: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=1200&q=85",
  town1: "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=1200&q=85",
  commercial: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1200&q=85",
  land: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1200&q=85",
  farm: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1200&q=85",
  interior: "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=1200&q=85",
  exterior: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1200&q=85",
};

function daysFromNow(days) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  d.setUTCHours(9, 0, 0, 0);
  return d.toISOString();
}

/**
 * Curated launch catalogue — representative SA auction market examples for public beta.
 * Not scraped live notices. Replace with licensed partner feeds as onboarded.
 */
const SEED = [
  {
    title: "Luxury Home",
    description:
      "Four-bedroom family home in Pretoria offered via auction-style sale. Verify conditions with the selling attorney or sheriff before bidding.",
    province: "Gauteng",
    town: "Pretoria",
    suburb: "Waterkloof",
    address: "Waterkloof Ridge, Pretoria",
    property_type: "House",
    bedrooms: 4,
    bathrooms: 3,
    garages: 2,
    estimated_value: 2500000,
    auction_price: 1800000,
    auction_date: daysFromNow(21),
    status: "Upcoming",
    source: "Launch seed · Sheriff-style example (Gauteng)",
    image: IMG.house1,
    gallery: [IMG.house1, IMG.interior, IMG.exterior],
  },
  {
    title: "Luxury Family Home",
    description:
      "Spacious Pretoria house suitable for family buyers researching bank or sheriff auction opportunities.",
    province: "Gauteng",
    town: "Pretoria",
    suburb: "Faerie Glen",
    address: "Faerie Glen, Pretoria",
    property_type: "House",
    bedrooms: 4,
    bathrooms: 2,
    garages: 2,
    estimated_value: 2500000,
    auction_price: 1850000,
    auction_date: daysFromNow(28),
    status: "Upcoming",
    source: "Launch seed · Bank-repo style example (Gauteng)",
    image: IMG.house2,
    gallery: [IMG.house2, IMG.interior],
  },
  {
    title: "Sandton Family Residence",
    description:
      "Executive home in Sandton for investors comparing estimated value versus guide auction price.",
    province: "Gauteng",
    town: "Sandton",
    suburb: "Bryanston",
    address: "Bryanston, Sandton",
    property_type: "House",
    bedrooms: 5,
    bathrooms: 4,
    garages: 3,
    estimated_value: 4200000,
    auction_price: 2950000,
    auction_date: daysFromNow(35),
    status: "Upcoming",
    source: "Launch seed · Public auction example (Gauteng)",
    image: IMG.house3,
    gallery: [IMG.house3, IMG.exterior, IMG.interior],
  },
  {
    title: "Sea Point Apartment",
    description:
      "Coastal apartment in Sea Point — typical Western Cape auction research candidate.",
    province: "Western Cape",
    town: "Cape Town",
    suburb: "Sea Point",
    address: "Sea Point, Cape Town",
    property_type: "Apartment",
    bedrooms: 2,
    bathrooms: 1,
    garages: 1,
    estimated_value: 2100000,
    auction_price: 1550000,
    auction_date: daysFromNow(18),
    status: "Upcoming",
    source: "Launch seed · Auctioneer notice example (Western Cape)",
    image: IMG.apt1,
    gallery: [IMG.apt1, IMG.apt2],
  },
  {
    title: "Stellenbosch Townhouse",
    description:
      "Secure complex townhouse near Stellenbosch for buyers monitoring upcoming sales.",
    province: "Western Cape",
    town: "Stellenbosch",
    suburb: "Technopark",
    address: "Technopark, Stellenbosch",
    property_type: "Townhouse",
    bedrooms: 3,
    bathrooms: 2,
    garages: 2,
    estimated_value: 1850000,
    auction_price: 1320000,
    auction_date: daysFromNow(40),
    status: "Upcoming",
    source: "Launch seed · Sheriff-style example (Western Cape)",
    image: IMG.town1,
    gallery: [IMG.town1, IMG.interior],
  },
  {
    title: "Umhlanga Ridge Flat",
    description:
      "Modern flat in Umhlanga Ridge with ocean-proximity lifestyle appeal.",
    province: "KwaZulu-Natal",
    town: "Umhlanga",
    suburb: "Umhlanga Ridge",
    address: "Umhlanga Ridge, Umhlanga",
    property_type: "Apartment",
    bedrooms: 2,
    bathrooms: 2,
    garages: 1,
    estimated_value: 1750000,
    auction_price: 1250000,
    auction_date: daysFromNow(24),
    status: "Upcoming",
    source: "Launch seed · Bank-repo style example (KZN)",
    image: IMG.apt2,
    gallery: [IMG.apt2, IMG.apt1],
  },
  {
    title: "Durban North Family Home",
    description:
      "Four-bedroom home in Durban North for regional auction monitoring.",
    province: "KwaZulu-Natal",
    town: "Durban",
    suburb: "Durban North",
    address: "Durban North, Durban",
    property_type: "House",
    bedrooms: 4,
    bathrooms: 3,
    garages: 2,
    estimated_value: 2650000,
    auction_price: 1980000,
    auction_date: daysFromNow(45),
    status: "Upcoming",
    source: "Launch seed · Public auction example (KZN)",
    image: IMG.house1,
    gallery: [IMG.house1, IMG.exterior],
  },
  {
    title: "Gqeberha Suburban House",
    description:
      "Three-bedroom house in Gqeberha suitable for Eastern Cape coverage demos.",
    province: "Eastern Cape",
    town: "Gqeberha",
    suburb: "Summerstrand",
    address: "Summerstrand, Gqeberha",
    property_type: "House",
    bedrooms: 3,
    bathrooms: 2,
    garages: 1,
    estimated_value: 1450000,
    auction_price: 980000,
    auction_date: daysFromNow(30),
    status: "Upcoming",
    source: "Launch seed · Sheriff-style example (Eastern Cape)",
    image: IMG.house2,
    gallery: [IMG.house2, IMG.interior],
  },
  {
    title: "Bloemfontein Garden Home",
    description:
      "Family home in Bloemfontein for Free State catalogue coverage.",
    province: "Free State",
    town: "Bloemfontein",
    suburb: "Langenhoven Park",
    address: "Langenhoven Park, Bloemfontein",
    property_type: "House",
    bedrooms: 3,
    bathrooms: 2,
    garages: 2,
    estimated_value: 1250000,
    auction_price: 890000,
    auction_date: daysFromNow(33),
    status: "Upcoming",
    source: "Launch seed · Auctioneer notice example (Free State)",
    image: IMG.house3,
    gallery: [IMG.house3, IMG.exterior],
  },
  {
    title: "Nelspruit Hillside House",
    description:
      "Hillside residence in Mbombela / Nelspruit area for Mpumalanga coverage.",
    province: "Mpumalanga",
    town: "Mbombela",
    suburb: "Sonheuwel",
    address: "Sonheuwel, Mbombela",
    property_type: "House",
    bedrooms: 4,
    bathrooms: 2,
    garages: 2,
    estimated_value: 1680000,
    auction_price: 1190000,
    auction_date: daysFromNow(38),
    status: "Upcoming",
    source: "Launch seed · Bank-repo style example (Mpumalanga)",
    image: IMG.house1,
    gallery: [IMG.house1, IMG.interior],
  },
  {
    title: "Polokwane Family Dwelling",
    description:
      "Practical family dwelling supporting Limpopo province catalogue presence.",
    province: "Limpopo",
    town: "Polokwane",
    suburb: "Bendor",
    address: "Bendor, Polokwane",
    property_type: "House",
    bedrooms: 3,
    bathrooms: 2,
    garages: 1,
    estimated_value: 1100000,
    auction_price: 780000,
    auction_date: daysFromNow(42),
    status: "Upcoming",
    source: "Launch seed · Sheriff-style example (Limpopo)",
    image: IMG.house2,
    gallery: [IMG.house2, IMG.exterior],
  },
  {
    title: "Rustenburg Townhouse",
    description:
      "Complex townhouse in Rustenburg for North West coverage.",
    province: "North West",
    town: "Rustenburg",
    suburb: "Cashan",
    address: "Cashan, Rustenburg",
    property_type: "Townhouse",
    bedrooms: 3,
    bathrooms: 2,
    garages: 2,
    estimated_value: 980000,
    auction_price: 690000,
    auction_date: daysFromNow(26),
    status: "Upcoming",
    source: "Launch seed · Public auction example (North West)",
    image: IMG.town1,
    gallery: [IMG.town1, IMG.interior],
  },
  {
    title: "Kimberley Vacant Stand",
    description:
      "Vacant residential stand in Kimberley — land-type listing for Northern Cape.",
    province: "Northern Cape",
    town: "Kimberley",
    suburb: "Hadison Park",
    address: "Hadison Park, Kimberley",
    property_type: "Land",
    bedrooms: 0,
    bathrooms: 0,
    garages: 0,
    estimated_value: 450000,
    auction_price: 295000,
    auction_date: daysFromNow(50),
    status: "Upcoming",
    source: "Launch seed · Auctioneer notice example (Northern Cape)",
    image: IMG.land,
    gallery: [IMG.land, IMG.farm],
  },
  {
    title: "Johannesburg CBD Commercial Unit",
    description:
      "Small commercial unit for investors monitoring urban auction inventory.",
    province: "Gauteng",
    town: "Johannesburg",
    suburb: "CBD",
    address: "Johannesburg CBD",
    property_type: "Commercial",
    bedrooms: 0,
    bathrooms: 1,
    garages: 0,
    estimated_value: 3200000,
    auction_price: 2100000,
    auction_date: daysFromNow(55),
    status: "Upcoming",
    source: "Launch seed · Bank-repo style example (Gauteng commercial)",
    image: IMG.commercial,
    gallery: [IMG.commercial, IMG.exterior],
  },
  {
    title: "Centurion Duplex",
    description:
      "Duplex-style family home in Centurion with upcoming auction date.",
    province: "Gauteng",
    town: "Centurion",
    suburb: "Wierda Park",
    address: "Wierda Park, Centurion",
    property_type: "House",
    bedrooms: 3,
    bathrooms: 2,
    garages: 2,
    estimated_value: 1550000,
    auction_price: 1120000,
    auction_date: daysFromNow(16),
    status: "Upcoming",
    source: "Launch seed · Sheriff-style example (Gauteng)",
    image: IMG.house3,
    gallery: [IMG.house3, IMG.interior, IMG.exterior],
  },
];

async function upsertProperty(seed) {
  const { gallery, image, ...row } = seed;
  const payload = {
    ...row,
    updated_at: new Date().toISOString(),
  };

  const { data: existing, error: lookupError } = await db
    .from("properties")
    .select("id")
    .eq("title", seed.title)
    .eq("town", seed.town)
    .maybeSingle();

  if (lookupError) throw lookupError;

  let propertyId;
  if (existing?.id) {
    const { data, error } = await db
      .from("properties")
      .update(payload)
      .eq("id", existing.id)
      .select("id")
      .single();
    if (error) throw error;
    propertyId = data.id;
    console.log("updated", seed.title, propertyId);
  } else {
    const { data, error } = await db
      .from("properties")
      .insert({ ...payload, created_at: new Date().toISOString() })
      .select("id")
      .single();
    if (error) throw error;
    propertyId = data.id;
    console.log("inserted", seed.title, propertyId);
  }

  await db.from("property_images").delete().eq("property_id", propertyId);

  const images = (gallery?.length ? gallery : [image]).map((image_url, index) => ({
    property_id: propertyId,
    image_url,
    is_hero: index === 0,
    display_order: index,
  }));

  const { error: imgError } = await db.from("property_images").insert(images);
  if (imgError) {
    console.warn("property_images insert warning:", imgError.message);
  } else {
    console.log("  images", images.length);
  }

  return propertyId;
}

async function main() {
  console.log("Seeding", SEED.length, "properties…");
  for (const item of SEED) {
    await upsertProperty(item);
  }
  const { count } = await db
    .from("properties")
    .select("*", { count: "exact", head: true });
  console.log("Done. properties count ≈", count);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
