import { readFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";
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

loadEnv();
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false },
});
const ids = [
  "78e0ab0e-0b33-4a2a-a9e3-eda3677c6209",
  "ec3e90f0-5d86-4b32-9b20-4dee592654c3",
  "f3f47cca-73c8-420c-9144-146b0f4c9aba",
  "b8eb4cb5-d9c1-46de-a338-266357d3d8f9",
];
async function main() {
const { data } = await db.from("properties").select("*").in("id", ids);
for (const p of data ?? []) {
  const e = enrichVerifiedListing(p);
  const fp = fingerprintInputFromProperty({
    ...p,
    farm_name: e.address.farmName,
    erf_number: e.address.erfNumber,
    town: e.address.town ?? p.town,
  });
  const r = computePropertyFingerprint(fp);
  console.log(
    JSON.stringify({
      id: p.id,
      title: p.title,
      town: p.town,
      suburb: p.suburb,
      street: e.address.street,
      external: p.external_listing_id,
      fingerprint: r.fingerprint,
      components: r.components,
    }),
  );
}
}
main();
