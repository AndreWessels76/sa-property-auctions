/**
 * Partner results feed diagnostic — read-only.
 * Usage: npm run partner-results:diagnostic
 */
import { readFileSync, writeFileSync } from "fs";

function loadEnv() {
  try {
    for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
      const m = line.match(/^\s*([^#=]+)=(.*)$/);
      if (m && !process.env[m[1]!.trim()]) {
        process.env[m[1]!.trim()] = m[2]!.trim().replace(/^["']|["']$/g, "");
      }
    }
  } catch {
    /* optional */
  }
}

async function main() {
  loadEnv();
  const { AuctionPartnerResultsIngestionService } = await import(
    "../lib/services/AuctionPartnerResultsIngestionService"
  );
  const { AUCTION_PARTNER_RESULTS_FEED_CONTRACT } = await import(
    "../lib/partnerships/auctionPartnerResultsFeedContract"
  );

  const status = await AuctionPartnerResultsIngestionService.buildStatus(
    "bidders_choice",
  );

  const out = {
    generatedAt: new Date().toISOString(),
    productionWrites: status.productionWrite === "ALLOWED" ? "ALLOWED" : "BLOCKED",
    partnerContract: status.contract,
    partner: "BIDDERS_CHOICE",
    partnerRegistryStatus: status.partner,
    resultsFeed: status.resultsFeed,
    authorisation: status.authorisation,
    ingestion: status.ingestion,
    productionWrite: status.productionWrite,
    verifiedObservations: status.verifiedResultsReceived,
    verifiedSalePrices: status.verifiedSalePrices,
    lastSuccessfulIngestion: status.lastSuccessfulIngestion,
    nextAction: status.nextAction,
    contractVersion: AUCTION_PARTNER_RESULTS_FEED_CONTRACT.version,
    connection: status.connection,
    liveCoverage: status.liveCoverage ?? null,
    envFlagsPresent: {
      BIDDERS_CHOICE_RESULTS_FEED_URL: Boolean(
        process.env.BIDDERS_CHOICE_RESULTS_FEED_URL?.trim(),
      ),
      BIDDERS_CHOICE_RESULTS_FEED_TOKEN: Boolean(
        process.env.BIDDERS_CHOICE_RESULTS_FEED_TOKEN?.trim(),
      ),
      BIDDERS_CHOICE_RESULTS_FEED_API_KEY: Boolean(
        process.env.BIDDERS_CHOICE_RESULTS_FEED_API_KEY?.trim(),
      ),
      BIDDERS_CHOICE_RESULTS_FEED_VALIDATED:
        process.env.BIDDERS_CHOICE_RESULTS_FEED_VALIDATED === "true",
      // Legacy flag alone never implies CONNECTED
      BIDDERS_CHOICE_RESULTS_FEED_CONNECTED:
        process.env.BIDDERS_CHOICE_RESULTS_FEED_CONNECTED === "true",
    },
  };

  writeFileSync(
    "PARTNER_RESULTS_FEED_DIAGNOSTIC.json",
    JSON.stringify(out, null, 2),
  );

  console.log("PARTNER CONTRACT =", out.partnerContract);
  console.log("PARTNER =", out.partner);
  console.log("RESULTS FEED =", out.resultsFeed);
  console.log("AUTHORISATION =", out.authorisation);
  console.log("PRODUCTION WRITE =", out.productionWrite);
  console.log("Verified observations:", out.verifiedObservations);
  console.log("Verified sale prices:", out.verifiedSalePrices);
  console.log("Connection configured:", out.connection?.configured ?? false);
  console.log("Connection validated:", out.connection?.validated ?? false);
  console.log("Next action:", out.nextAction);
  console.log("Wrote PARTNER_RESULTS_FEED_DIAGNOSTIC.json");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
