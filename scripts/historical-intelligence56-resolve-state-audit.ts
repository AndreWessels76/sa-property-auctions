/**
 * Read-only audit: HI56 OUTCOME_MISSING vs HI42 resolution states.
 */
import { readFileSync, writeFileSync } from "fs";

function loadEnv() {
  for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([^#=]+)=(.*)$/);
    if (m && !process.env[m[1]!.trim()]) {
      process.env[m[1]!.trim()] = m[2]!.trim().replace(/^["']|["']$/g, "");
    }
  }
}

async function main() {
  loadEnv();
  const { HistoricalIntelligence42Service } = await import(
    "../lib/services/HistoricalIntelligence42Service"
  );
  const { HistoricalIntelligence56Service } = await import(
    "../lib/services/HistoricalIntelligence56Service"
  );

  const resolved = await HistoricalIntelligence42Service.loadResolvedEvents();
  const byState: Record<string, number> = {};
  const byOutcome: Record<string, number> = {};
  const byLabel: Record<string, number> = {};
  for (const e of resolved) {
    const s = String(e.resolution.state);
    const o = String(e.resolution.outcome);
    const l = String(e.resolution.label);
    byState[s] = (byState[s] ?? 0) + 1;
    byOutcome[o] = (byOutcome[o] ?? 0) + 1;
    byLabel[l] = (byLabel[l] ?? 0) + 1;
  }

  const hi56 = await HistoricalIntelligence56Service.buildReport();
  const missing = ((hi56.events ?? []) as Array<Record<string, unknown>>).filter(
    (e) => {
      const extraction = String(e.extraction ?? "");
      const outcome = String(e.outcome ?? "");
      return (
        (extraction === "SUCCESS" || extraction === "COMPLETE") &&
        (outcome === "UNKNOWN" || outcome === "MISSING")
      );
    },
  );

  const joined = missing.map((m) => {
    const r = resolved.find(
      (x) =>
        x.observation.auctionEventId === m.auctionEventId ||
        x.observation.observationId === m.observationId ||
        x.observation.listingPropertyId === m.auctionEventId,
    );
    return {
      propertyLabel: m.propertyLabel,
      town: m.town,
      auctionEventId: m.auctionEventId,
      snapshot: m.snapshot,
      extraction: m.extraction,
      outcomeHi56: m.outcome,
      salePrice: m.salePrice,
      resolutionHi56: m.resolution,
      evidenceState: m.evidenceState,
      hi42State: r?.resolution?.state ?? null,
      hi42Outcome: r?.resolution?.outcome ?? null,
      hi42Label: r?.resolution?.label ?? null,
      hi42Sale: r?.resolution?.salePrice ?? null,
      hi42Quality: r?.resolution?.evidenceQuality ?? null,
      hi42Action: r?.resolution?.recommendedAction ?? null,
      sourceUrl: m.sourceUrl,
    };
  });

  const payload = {
    generatedAt: new Date().toISOString(),
    byState,
    byOutcome,
    byLabel,
    totalResolved: resolved.length,
    missingCount: missing.length,
    missingJoined: joined,
  };
  writeFileSync(
    "HISTORICAL_INTELLIGENCE56_RESOLVE_STATE_AUDIT.json",
    JSON.stringify(payload, null, 2),
  );
  console.log(
    JSON.stringify(
      {
        byState,
        byOutcome,
        byLabel,
        totalResolved: resolved.length,
        missing: missing.length,
        sample: joined.slice(0, 10),
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
