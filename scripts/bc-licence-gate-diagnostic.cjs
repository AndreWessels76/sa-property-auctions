/**
 * Read-only: diagnose Bidders Choice licence / public-fetch gate.
 */
const fs = require("fs");
const { createClient } = require("@supabase/supabase-js");

for (const line of fs.readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const m = line.match(/^\s*([^#=]+)=(.*)$/);
  if (m && !process.env[m[1].trim()]) {
    process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
  }
}

const envVal = process.env.BIDDERS_CHOICE_ALLOW_PUBLIC_FETCH;
const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

const IDS = [
  "6ea5fcfe-92cf-40e8-9992-fd966c596071",
  "08448def-23c9-49df-9f4a-f13898520f7f",
  "e7f52518-2ff1-45f9-8163-02909986a3e2",
  "5907bdb8-fc4b-4a8b-b054-174e8d3a8d87",
  "97442d62-e95c-4f5f-a562-17e5e809dd1c",
];

async function main() {
  const { data: partners, error: pErr } = await db
    .from("acquisition_partners")
    .select("*")
    .limit(50);
  const { data: licences, error: lErr } = await db
    .from("partner_licences")
    .select("*")
    .limit(50);
  const { data: props, error: propErr } = await db
    .from("properties")
    .select("id,title,town,source_url,source_name,agency,verification_state,listing_status,status")
    .in("id", IDS);

  const bcPartners = (partners ?? []).filter(
    (p) =>
      String(p.partner_code ?? "").toLowerCase().includes("bidder") ||
      String(p.partner_name ?? "").toLowerCase().includes("bidder"),
  );

  const gateState =
    (licences ?? []).some((l) => l.status === "active" && l.public_display_permission)
      ? "LICENSE_ACTIVE_CANDIDATE"
      : envVal === "true"
        ? "PUBLIC_FETCH_ALLOWED"
        : envVal === undefined
          ? "CONFIG_MISSING"
          : "LICENSE_BLOCKED";

  const out = {
    envAllowPublicFetch:
      envVal === undefined ? "UNSET" : envVal === "true" ? "true" : `SET_BUT_NOT_TRUE:${envVal}`,
    gateState,
    partnersError: pErr?.message ?? null,
    licencesError: lErr?.message ?? null,
    propertiesError: propErr?.message ?? null,
    partnerCount: (partners ?? []).length,
    licenceCount: (licences ?? []).length,
    bcPartners,
    licences: licences ?? [],
    batchProperties: props ?? [],
  };
  fs.writeFileSync("BC_LICENCE_GATE_DIAGNOSTIC.json", JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
