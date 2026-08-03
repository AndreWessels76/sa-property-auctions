/**
 * Probe remaining discovered URLs for extractable auction dates,
 * import only those that validate, then approve to reach 25.
 */
import { readFileSync, writeFileSync, existsSync } from "fs";
import { createClient } from "@supabase/supabase-js";
import { PropertyAcquisitionEngine } from "../lib/acquisition/PropertyAcquisitionEngine";
import { BiddersChoiceConnector } from "../lib/connectors/biddersChoice/BiddersChoiceConnector";
import { extractBiddersChoiceListing } from "../lib/connectors/biddersChoice/extractListing";
import { validateExtractedListing } from "../lib/acquisition/validateListing";
import { checkRobotsAllowed } from "../lib/connectors/biddersChoice/robots";

const UA =
  "SAPropertyAuctionsBot/1.0 (+https://sa-property-auctions.vercel.app; verified-listings)";

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

async function discoverMore(maxPages = 12): Promise<string[]> {
  const found = new Set<string>();
  for (let page = 1; page <= maxPages; page += 1) {
    const indexUrl =
      page === 1
        ? "https://www.bidderschoice.co.za/property-listings/"
        : `https://www.bidderschoice.co.za/property-listings/page/${page}/`;
    try {
      const res = await fetch(indexUrl, {
        headers: { "User-Agent": UA, Accept: "text/html" },
      });
      if (!res.ok) break;
      const html = await res.text();
      for (const m of html.matchAll(/href=["']([^"']+)["']/gi)) {
        try {
          const abs = new URL(m[1], indexUrl).toString();
          const path = new URL(abs).pathname.toLowerCase();
          if (!path.includes("/property-listings/")) continue;
          if (/\/(page|feed)\//.test(path)) continue;
          const parts = path.split("/").filter(Boolean);
          if (parts.length >= 2) {
            found.add(new URL(abs).origin + path.replace(/\/?$/, "/"));
          }
        } catch {
          /* skip */
        }
      }
    } catch {
      break;
    }
  }
  return [...found];
}

async function main() {
  loadEnv();
  await checkRobotsAllowed("https://www.bidderschoice.co.za", "/");
  const client = db();

  const { data: existing } = await client
    .from("properties")
    .select("source_url")
    .eq("connector_id", "bidders_choice");
  const have = new Set(
    (existing ?? []).map((r) =>
      (r.source_url ?? "").replace(/\/?$/, "/").toLowerCase(),
    ),
  );

  console.log("Discovering more listing pages...");
  const allUrls = await discoverMore(12);
  writeFileSync(
    "VERIFIED25_DISCOVERED_URLS.json",
    JSON.stringify(
      { count: allUrls.length, urls: allUrls, at: new Date().toISOString() },
      null,
      2,
    ),
  );

  const candidates = allUrls.filter(
    (u) => !have.has(u.replace(/\/?$/, "/").toLowerCase()),
  );
  console.log("Candidates not yet in DB:", candidates.length);

  const eligible: string[] = [];
  for (const url of candidates) {
    if (eligible.length >= 20) break;
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": UA, Accept: "text/html" },
      });
      if (!res.ok) continue;
      const html = await res.text();
      const extracted = extractBiddersChoiceListing(html, url);
      const validation = validateExtractedListing(extracted);
      if (validation.ok) {
        eligible.push(url);
        console.log("ELIGIBLE", extracted.title, extracted.auctionDate);
      } else {
        console.log("skip", url.split("/").slice(-2)[0], validation.reason);
      }
    } catch (error) {
      console.log(
        "probe fail",
        url,
        error instanceof Error ? error.message : error,
      );
    }
  }

  console.log("Eligible with auction date:", eligible.length);
  writeFileSync(
    "VERIFIED25_ELIGIBLE_URLS.json",
    JSON.stringify({ count: eligible.length, urls: eligible }, null, 2),
  );

  if (eligible.length === 0) {
    console.warn("No additional date-bearing listings found");
    process.exitCode = 2;
    return;
  }

  const engine = new PropertyAcquisitionEngine(new BiddersChoiceConnector());
  // Import one-by-one to survive robots blips
  let imported = 0;
  for (const url of eligible) {
    try {
      const result = await engine.run({
        jobId: `verified25_one_${Date.now().toString(36)}`,
        listingUrls: [url],
        allowPublicFetch: true,
        maxListings: 1,
      });
      imported += result.imported;
      console.log("imported", result.imported, url);
    } catch (error) {
      console.warn(
        "import fail",
        url,
        error instanceof Error ? error.message : error,
      );
      await new Promise((r) => setTimeout(r, 1500));
    }
  }

  console.log("Newly imported:", imported);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
