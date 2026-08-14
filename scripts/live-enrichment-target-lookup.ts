/**
 * Read-only lookup of Haenertsburg / Benoni listings.
 */
import { readFileSync, writeFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";

function loadEnv() {
  for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([^#=]+)=(.*)$/);
    if (m && !process.env[m[1].trim()]) {
      process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
    }
  }
}

async function main() {
  loadEnv();
  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );

  const { data: a, error: e1 } = await db
    .from("properties")
    .select("id,title,source_url,verification_state,listing_status,status,town,suburb,bedrooms")
    .or("title.ilike.%Haenertsburg%,title.ilike.%Guest Farm%,town.ilike.%Haenertsburg%");

  const { data: b, error: e2 } = await db
    .from("properties")
    .select("id,title,source_url,verification_state,listing_status,status,town,suburb,bedrooms")
    .or("title.ilike.%Benoni%,title.ilike.%Crystal Park%,title.ilike.%Orchards%,town.ilike.%Benoni%,suburb.ilike.%Crystal%");

  const out = { haenertsburg_matches: a ?? [], benoni_matches: b ?? [], e1: e1?.message ?? null, e2: e2?.message ?? null };
  writeFileSync("LIVE_ENRICHMENT_TARGET_LOOKUP.json", JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
