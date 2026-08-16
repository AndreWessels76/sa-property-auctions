/**
 * HI 5.6 — ONE controlled production Acquire P1 (5) batch.
 *
 * Uses HistoricalIntelligence56Service → HI51 never-attempted selection → HEA43.acquireOne.
 * Max 5. No legacy retry. No second batch.
 *
 * Usage:
 *   $env:NODE_OPTIONS='--use-system-ca'
 *   npx --yes tsx --import ./scripts/shims/register-server-only.mjs scripts/historical-intelligence56-acquire-p1.ts
 */
import { readFileSync, writeFileSync } from "fs";

const OPERATOR = "hi56-acquire-p1-batch1";
const LIMIT = 5;
const OUT = "HISTORICAL_INTELLIGENCE56_ACQUIRE_P1_BATCH1.json";

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

  const { HistoricalIntelligence56Service } = await import(
    "../lib/services/HistoricalIntelligence56Service"
  );

  console.log("PHASE A — PRE-FLIGHT");

  const beforeReport = await HistoricalIntelligence56Service.buildReport();
  const connectivity = beforeReport.connectivity;
  const leaks =
    beforeReport.safety56?.catalogueLeaks ?? beforeReport.coverage52?.catalogueLeaks ?? -1;

  const blockedVerdict =
    beforeReport.liveDataUnavailable === true ||
    connectivity?.status === "LIVE_DATA_UNAVAILABLE" ||
    String(beforeReport.verdict).includes("BLOCKED") ||
    String(beforeReport.verdict).includes("LIVE DATA UNAVAILABLE");

  if (blockedVerdict) {
    const blocked = {
      verdict: "PRODUCTION BLOCKED",
      reason: beforeReport.reason ?? "LIVE_DATA_UNAVAILABLE",
      connectivity,
      productionWritesExecuted: [],
    };
    writeFileSync(OUT, JSON.stringify(blocked, null, 2));
    console.error("PRODUCTION BLOCKED — stopping before writes");
    process.exit(1);
  }

  if (typeof leaks === "number" && leaks > 0) {
    const blocked = {
      verdict: "PRODUCTION BLOCKED",
      reason: `catalogueLeaks=${leaks}`,
      catalogueLeaks: leaks,
      productionWritesExecuted: [],
    };
    writeFileSync(OUT, JSON.stringify(blocked, null, 2));
    console.error("PRODUCTION BLOCKED — catalogue leaks > 0");
    process.exit(1);
  }

  const dry = await HistoricalIntelligence56Service.dryRunP1({
    operator: OPERATOR,
    limit: LIMIT,
  });

  const candidates = (dry.candidates56 ?? dry.candidates ?? []) as Array<
    Record<string, unknown>
  >;
  console.log("NO PRODUCTION WRITE — Dry Run P1");
  console.log(`candidates: ${candidates.length}`);
  for (const c of candidates) {
    console.log(
      `- ${c.propertyLabel ?? c.property} | ${c.town ?? "—"} | ${c.sourceUrl ?? "—"} | ${c.whyEligible ?? c.expectedAction ?? ""}`,
    );
  }

  if (candidates.length !== LIMIT) {
    const stopped = {
      verdict: "PRODUCTION BLOCKED",
      reason: `Expected exactly ${LIMIT} P1 candidates, got ${candidates.length}`,
      candidates,
      productionWritesExecuted: [],
    };
    writeFileSync(OUT, JSON.stringify(stopped, null, 2));
    console.error("STOP — fewer/more than 5 valid candidates; no substitution");
    process.exit(1);
  }

  console.log("\nPHASE B — PRODUCTION ACQUISITION (max 5)");
  const result = await HistoricalIntelligence56Service.acquireP1Batch({
    operator: OPERATOR,
    limit: LIMIT,
    dryRun: false,
  });

  const afterReport = await HistoricalIntelligence56Service.buildReport();

  const payload = {
    generatedAt: new Date().toISOString(),
    operator: OPERATOR,
    limit: LIMIT,
    message: "ONE bounded P1 batch — max 5 — no second batch — no legacy retry",
    dryRun: {
      message: dry.message,
      candidates,
    },
    acquisition: {
      ok: result.ok,
      message: result.message,
      processed: (result as { processed?: number }).processed ?? null,
      runId: (result as { runId?: string }).runId ?? null,
      results: (result as { results?: unknown }).results ?? null,
      evidenceDelta: (result as { evidenceDelta?: unknown }).evidenceDelta ?? null,
      explicitDelta: (result as { explicitDelta?: unknown }).explicitDelta ?? null,
      beforeAfter: (result as { beforeAfter?: unknown }).beforeAfter ?? null,
    },
    before: {
      coverage52: beforeReport.coverage52,
      metrics: beforeReport.metrics,
      safety56: beforeReport.safety56,
      bottleneck56: beforeReport.bottleneck56,
      p1Progress56: beforeReport.p1Progress56,
    },
    after: {
      coverage52: afterReport.coverage52,
      metrics: afterReport.metrics,
      safety56: afterReport.safety56,
      bottleneck56: afterReport.bottleneck56,
      p1Progress56: afterReport.p1Progress56,
      nextCandidates56: afterReport.nextCandidates56,
      verdict: afterReport.verdict,
      reason: afterReport.reason,
    },
    productionWritesExecuted: ["Acquire P1 (5) — single bounded batch"],
    productionWritesNotExecuted: [
      "Batch 2",
      "Retry Legacy Failures",
      "Unlimited acquisition",
    ],
  };

  writeFileSync(OUT, JSON.stringify(payload, null, 2));
  console.log(`\nWrote ${OUT}`);
  console.log(
    JSON.stringify(
      {
        message: result.message,
        evidenceDelta: (result as { evidenceDelta?: unknown }).evidenceDelta,
        bottleneckAfter: afterReport.bottleneck56,
        neverAttemptedAfter: afterReport.coverage52?.neverAttempted,
        catalogueLeaks: afterReport.safety56?.catalogueLeaks,
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
