/**
 * Launch 1.1 — attach auction agency + coordinates to production seed listings.
 * Usage: node --env-file=.env.local scripts/launch11-polish-properties.mjs
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing Supabase env");
  process.exit(1);
}

const db = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const COORDS = {
  Pretoria: [-25.7479, 28.2293],
  Sandton: [-26.1076, 28.0567],
  "Cape Town": [-33.9249, 18.4241],
  Stellenbosch: [-33.9321, 18.8602],
  Umhlanga: [-29.7282, 31.0852],
  Durban: [-29.8587, 31.0218],
  Gqeberha: [-33.9608, 25.6022],
  Bloemfontein: [-29.0852, 26.1596],
  Mbombela: [-25.4753, 30.9694],
  Polokwane: [-23.9045, 29.4689],
  Rustenburg: [-25.6672, 27.2424],
  Kimberley: [-28.7282, 24.7499],
  Johannesburg: [-26.2041, 28.0473],
  Centurion: [-25.8603, 28.1894],
};

const AGENCIES = [
  "High Street Auctions · https://www.highstreetauctions.com",
  "Bidders Choice · https://www.bidderschoice.co.za",
  "Claremart · https://www.claremart.co.za",
  "In2Assets · https://www.in2assets.co.za",
  "Park Village Auctions · https://www.parkvillageauctions.co.za",
  "Standard Bank EasySell · https://www.standardbank.co.za",
  "Absa Property Sales · https://www.absa.co.za",
  "Sheriff of the Court · Gauteng",
];

const { data: rows, error } = await db
  .from("properties")
  .select("id,title,town")
  .order("title");

if (error) {
  console.error(error);
  process.exit(1);
}

let i = 0;
for (const row of rows ?? []) {
  const coords = COORDS[row.town] ?? null;
  const source = AGENCIES[i % AGENCIES.length];
  i += 1;

  // Slight jitter so nearby Pretoria listings are not identical pins
  const jitter = (i % 7) * 0.004;
  const payload = {
    source,
    updated_at: new Date().toISOString(),
  };
  if (coords) {
    payload.latitude = coords[0] + jitter * (i % 2 === 0 ? 1 : -1);
    payload.longitude = coords[1] + jitter * (i % 3 === 0 ? 1 : -0.5);
  }

  const { error: updateError } = await db
    .from("properties")
    .update(payload)
    .eq("id", row.id);

  if (updateError) {
    console.error("fail", row.title, updateError.message);
  } else {
    console.log("polished", row.title, "→", source.split(" · ")[0]);
  }
}

console.log("done", rows?.length ?? 0);
