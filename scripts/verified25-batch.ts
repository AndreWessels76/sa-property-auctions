/**
 * Continue Verified25 by importing remaining discovered URLs in small batches,
 * then approving checklist-ready BC pending rows.
 */
import { readFileSync, writeFileSync, existsSync } from "fs";
import { createClient } from "@supabase/supabase-js";
import { PropertyAcquisitionEngine } from "../lib/acquisition/PropertyAcquisitionEngine";
import { BiddersChoiceConnector } from "../lib/connectors/biddersChoice/BiddersChoiceConnector";

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

async function main() {
  loadEnv();
  const client = db();

  const discoveredPath = "VERIFIED25_DISCOVERED_URLS.json";
  if (!existsSync(discoveredPath)) {
    throw new Error("Missing VERIFIED25_DISCOVERED_URLS.json — run discover first");
  }
  const discovered = JSON.parse(readFileSync(discoveredPath, "utf8")) as {
    urls: string[];
  };

  const { data: existing } = await client
    .from("properties")
    .select("source_url")
    .eq("connector_id", "bidders_choice");

  const have = new Set(
    (existing ?? [])
      .map((r) => (r.source_url as string | null)?.replace(/\/?$/, "/") ?? "")
      .filter(Boolean),
  );

  const remaining = discovered.urls.filter((u) => {
    const n = u.replace(/\/?$/, "/");
    return !have.has(n) && !have.has(u);
  });

  console.log("Remaining URLs to import:", remaining.length);

  const batchSize = 5;
  const engine = new PropertyAcquisitionEngine(new BiddersChoiceConnector());
  let imported = 0;
  let failed = 0;

  for (let i = 0; i < remaining.length && imported < 15; i += batchSize) {
    const batch = remaining.slice(i, i + batchSize);
    console.log(`Batch ${i / batchSize + 1}: ${batch.length} urls`);
    try {
      const result = await engine.run({
        jobId: `verified25_batch_${Date.now().toString(36)}`,
        listingUrls: batch,
        allowPublicFetch: true,
        maxListings: batch.length,
      });
      imported += result.imported;
      console.log("batch result", {
        imported: result.imported,
        updated: result.updated,
        rejected: result.rejected,
        errors: result.errors?.slice?.(0, 3),
      });
    } catch (error) {
      failed += 1;
      console.warn(
        "batch failed",
        error instanceof Error ? error.message : error,
      );
      // brief pause then continue
      await new Promise((r) => setTimeout(r, 2000));
    }
  }

  const { count: verified } = await client
    .from("properties")
    .select("*", { count: "exact", head: true })
    .eq("verification_state", "verified");
  const { count: pending } = await client
    .from("properties")
    .select("*", { count: "exact", head: true })
    .eq("verification_state", "pending_verification")
    .eq("connector_id", "bidders_choice");

  const summary = { imported, failedBatches: failed, verified, pendingBc: pending };
  writeFileSync(
    "VERIFIED25_BATCH_SUMMARY.json",
    JSON.stringify(summary, null, 2),
  );
  console.log(summary);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
