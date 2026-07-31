/**
 * Apply Data Foundation seed classification using existing columns when possible,
 * and structured columns when the migration has been applied.
 *
 * Usage: node --env-file=.env.local scripts/data-foundation-backfill.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";

for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const m = line.match(/^\s*([^#=]+)=(.*)$/);
  if (m) process.env[m[1].trim()] = m[2].trim();
}

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

function parseAgency(source) {
  const raw = (source || "").replace(/^SEED DATA\s*·\s*/i, "");
  const parts = raw.split(/\s*[·|]\s*/).map((p) => p.trim()).filter(Boolean);
  const name = parts[0] || null;
  let website = null;
  for (const part of parts.slice(1)) {
    if (/^https?:\/\//i.test(part)) website = part;
  }
  return { name, website, raw };
}

const { data: rows, error } = await db.from("properties").select("*");
if (error) {
  console.error(error);
  process.exit(1);
}

let structuredOk = true;
for (const row of rows || []) {
  const agency = parseAgency(row.source);
  const sourceTagged = /SEED DATA/i.test(row.source || "")
    ? row.source
    : `SEED DATA · ${row.source || "Unspecified seed source"}`;

  const base = {
    source: sourceTagged,
    updated_at: new Date().toISOString(),
  };

  const structured = {
    ...base,
    data_classification: "seed",
    listing_status: (row.listing_status || row.status || "upcoming").toLowerCase(),
    imported_at: row.imported_at || row.created_at || new Date().toISOString(),
    last_verified_at: null,
    country: row.country || "South Africa",
    address_display_mode: row.address_display_mode || "full",
    street_address: row.street_address || row.address || null,
    auction_agency: row.auction_agency || agency.name,
    agency_website: row.agency_website || agency.website,
    source_name: row.source_name || agency.name || "Seed catalogue",
    source_url: row.source_url || agency.website,
    provenance_notes:
      row.provenance_notes ||
      "Launch catalogue seed — illustrative auction-style record. Not a verified live notice.",
    data_quality_score: null,
  };

  let payload = structuredOk ? structured : base;
  let { error: updateError } = await db
    .from("properties")
    .update(payload)
    .eq("id", row.id);

  if (updateError && /Could not find .* column/i.test(updateError.message)) {
    console.warn("Structured columns missing — tagging source only. Apply SQL migration.");
    structuredOk = false;
    payload = base;
    ({ error: updateError } = await db
      .from("properties")
      .update(payload)
      .eq("id", row.id));
  }

  if (updateError) {
    console.error("fail", row.title, updateError.message);
  } else {
    console.log("classified seed:", row.title);
  }
}

console.log("done. structuredColumns=", structuredOk);
