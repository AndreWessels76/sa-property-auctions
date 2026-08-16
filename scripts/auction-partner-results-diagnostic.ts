/**
 * Partner results feed diagnostic — read-only.
 * Usage: npm run partner-results:diagnostic
 *
 * Never prints secret values. Never invents credentials.
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

function presence(value: string | undefined): "PRESENT" | "MISSING" {
  return value?.trim() ? "PRESENT" : "MISSING";
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
  const validation =
    await AuctionPartnerResultsIngestionService.validateConnectionReadOnly(
      "bidders_choice",
    );

  const dryRunBlocked =
    status.resultsFeed !== "CONNECTED" || status.authorisation !== "AUTHORISED";

  const out = {
    generatedAt: new Date().toISOString(),
    productionWrites: "BLOCKED" as const,
    partnerContract: status.contract,
    partner: "BIDDERS_CHOICE",
    partnerRegistryStatus: status.partner,
    resultsFeed: status.resultsFeed,
    authorisation: status.authorisation,
    ingestion: status.ingestion,
    productionWrite: status.productionWrite,
    connectionState: status.connectionState,
    connectionValidation: validation,
    dryRun: dryRunBlocked
      ? { status: "BLOCKED", records: 0, reason: validation.message }
      : { status: "READY", records: 0, reason: "Awaiting explicit dry-run invocation ≤5" },
    verifiedObservations: status.verifiedResultsReceived,
    verifiedSalePrices: status.verifiedSalePrices,
    lastSuccessfulIngestion: status.lastSuccessfulIngestion,
    nextAction: status.nextAction,
    contractVersion: AUCTION_PARTNER_RESULTS_FEED_CONTRACT.version,
    connection: status.connection,
    publicFetchAllowed: status.publicFetchAllowed,
    publicFetchIsNotResultsAuthorisation: true,
    liveCoverage: status.liveCoverage ?? null,
    secretsPresence: {
      RESULTS_FEED_URL: presence(process.env.BIDDERS_CHOICE_RESULTS_FEED_URL),
      RESULTS_FEED_TOKEN: presence(process.env.BIDDERS_CHOICE_RESULTS_FEED_TOKEN),
      RESULTS_FEED_API_KEY: presence(
        process.env.BIDDERS_CHOICE_RESULTS_FEED_API_KEY,
      ),
      RESULTS_FEED_USERNAME: presence(
        process.env.BIDDERS_CHOICE_RESULTS_FEED_USERNAME,
      ),
      RESULTS_FEED_PASSWORD: presence(
        process.env.BIDDERS_CHOICE_RESULTS_FEED_PASSWORD,
      ),
      RESULTS_FEED_VALIDATED_FLAG:
        process.env.BIDDERS_CHOICE_RESULTS_FEED_VALIDATED === "true"
          ? "PRESENT"
          : "MISSING",
      // Listing public-fetch — NOT results authorisation
      ALLOW_PUBLIC_FETCH:
        process.env.BIDDERS_CHOICE_ALLOW_PUBLIC_FETCH === "true"
          ? "PRESENT"
          : "MISSING",
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
  console.log("CONNECTION STATE =", out.connectionState);
  console.log("CONNECTION VALIDATION =", validation.state);
  console.log(
    "DRY RUN =",
    dryRunBlocked ? "BLOCKED — 0 records" : "READY — await ≤5 invocation",
  );
  console.log("PRODUCTION WRITES =", 0);
  console.log("RESULTS FEED URL =", out.secretsPresence.RESULTS_FEED_URL);
  console.log("CREDENTIALS TOKEN =", out.secretsPresence.RESULTS_FEED_TOKEN);
  console.log("API KEY =", out.secretsPresence.RESULTS_FEED_API_KEY);
  console.log(
    "PUBLIC FETCH (not results auth) =",
    out.secretsPresence.ALLOW_PUBLIC_FETCH,
  );
  console.log("Verified observations:", out.verifiedObservations);
  console.log("Verified sale prices:", out.verifiedSalePrices);
  console.log("Next action:", out.nextAction);
  console.log("Wrote PARTNER_RESULTS_FEED_DIAGNOSTIC.json");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
