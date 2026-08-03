/**
 * Revert seed catalogue rows that were wrongly marked verified,
 * then discover BC listing URLs from the public listings index.
 */
import { readFileSync, writeFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";
import { checkRobotsAllowed } from "../lib/connectors/biddersChoice/robots";

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

async function revertSeeds(client: ReturnType<typeof db>) {
  const { data: bad } = await client
    .from("properties")
    .select("id,title,source_name,auction_agency,source")
    .eq("verification_state", "verified");

  const seedRows = (bad ?? []).filter((row) => {
    const blob = `${row.source_name ?? ""} ${row.auction_agency ?? ""} ${row.source ?? ""}`.toUpperCase();
    return blob.includes("SEED");
  });

  console.log("Seed rows currently verified:", seedRows.length);
  if (seedRows.length === 0) return 0;

  const ids = seedRows.map((r) => r.id);
  const { error } = await client
    .from("properties")
    .update({
      verification_state: "pending_verification",
      data_classification: "seed",
      last_verified_at: null,
      status_change_reason:
        "Reverted: seed catalogue must not be production-verified",
      status_source_event: "verified25_seed_revert",
      provenance_notes:
        "Seed/illustrative catalogue — pending real source verification",
      updated_at: new Date().toISOString(),
    })
    .in("id", ids);

  if (error) throw error;
  console.log("Reverted seed IDs:", ids.length);
  return ids.length;
}

async function discoverListingUrls(max = 60): Promise<string[]> {
  const robots = await checkRobotsAllowed("https://www.bidderschoice.co.za", "/");
  console.log("robots", robots);
  if (!robots.allowed) throw new Error(`Robots blocked: ${robots.reason}`);

  const indexUrls = [
    "https://www.bidderschoice.co.za/property-listings/",
    "https://bidderschoice.co.za/property-listings/",
    "https://www.bidderschoice.co.za/",
    "https://bidderschoice.co.za/",
  ];

  const found = new Set<string>();
  const ua =
    "SAPropertyAuctionsBot/1.0 (+https://sa-property-auctions.vercel.app; verified-listings)";

  for (const indexUrl of indexUrls) {
    try {
      const res = await fetch(indexUrl, {
        headers: { "User-Agent": ua, Accept: "text/html" },
      });
      if (!res.ok) {
        console.log("index fail", indexUrl, res.status);
        continue;
      }
      const html = await res.text();
      const hrefs = [
        ...html.matchAll(/href=["']([^"']+)["']/gi),
      ].map((m) => m[1]);

      for (const href of hrefs) {
        try {
          const abs = new URL(href, indexUrl).toString();
          const u = new URL(abs);
          if (!u.hostname.includes("bidderschoice.co.za")) continue;
          const path = u.pathname.toLowerCase();
          if (!path.includes("property-listings")) continue;
          if (path.endsWith("/property-listings/") || path.endsWith("/property-listings")) {
            continue;
          }
          // Individual listing pages typically have a slug after property-listings/
          const parts = path.split("/").filter(Boolean);
          if (parts.length >= 2 && parts[0] === "property-listings") {
            found.add(u.origin + u.pathname.replace(/\/?$/, "/"));
          }
        } catch {
          /* ignore bad urls */
        }
      }
      console.log("Scanned", indexUrl, "→ cumulative", found.size);
      if (found.size >= max) break;
    } catch (error) {
      console.log(
        "index error",
        indexUrl,
        error instanceof Error ? error.message : error,
      );
    }
  }

  return [...found].slice(0, max);
}

async function main() {
  loadEnv();
  const client = db();
  await revertSeeds(client);

  const { count: verified } = await client
    .from("properties")
    .select("*", { count: "exact", head: true })
    .eq("verification_state", "verified");
  console.log("Verified after revert:", verified);

  const urls = await discoverListingUrls(60);
  writeFileSync(
    "VERIFIED25_DISCOVERED_URLS.json",
    JSON.stringify({ count: urls.length, urls, at: new Date().toISOString() }, null, 2),
  );
  console.log("Discovered listing URLs:", urls.length);
  console.log(urls.slice(0, 10));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
