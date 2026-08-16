/**
 * HI 5.6 — Dry Run Legacy + Retry Legacy Failures (max 5, expected ≤4).
 *
 * Usage:
 *   $env:NODE_OPTIONS='--use-system-ca'
 *   $env:BIDDERS_CHOICE_ALLOW_PUBLIC_FETCH='true'
 *   npx --yes tsx --import ./scripts/shims/register-server-only.mjs scripts/historical-intelligence56-retry-legacy.ts
 *
 * Modes:
 *   HI56_LEGACY_MODE=dry   — dry run only (default if unset: dry then stop unless HI56_LEGACY_EXECUTE=1)
 *   HI56_LEGACY_EXECUTE=1  — after dry run, execute retry
 */
import { readFileSync, writeFileSync } from "fs";

const OPERATOR = "hi56-retry-legacy-batch1";
const LIMIT = 5;
const OUT_DRY = "HISTORICAL_INTELLIGENCE56_LEGACY_DRYRUN.json";
const OUT_RETRY = "HISTORICAL_INTELLIGENCE56_LEGACY_RETRY_BATCH1.json";

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
  const execute = process.env.HI56_LEGACY_EXECUTE === "1";

  const { HistoricalIntelligence56Service } = await import(
    "../lib/services/HistoricalIntelligence56Service"
  );
  const { classifyBcFetchEligibility } = await import(
    "../lib/acquisition/refetch/licenseGate"
  );
  const { PartnershipRepository, PartnerLicenceRepository } = await import(
    "../lib/repositories/PartnershipRepository"
  );

  const envAllow = process.env.BIDDERS_CHOICE_ALLOW_PUBLIC_FETCH === "true";
  const partner = await PartnershipRepository.getPartnerByCode("bidders_choice");
  const licences = partner?.id
    ? await PartnerLicenceRepository.listByPartner(partner.id)
    : [];
  const activeLicence = licences.find((l) => l.status === "active") ?? null;
  const livePermission = classifyBcFetchEligibility({
    connectorId: "bidders_choice",
    sourceUrl: "https://bidderschoice.co.za/",
    licence: activeLicence,
    envAllowPublicFetch: envAllow,
  });

  console.log("PHASE 1–2 — Dry Run Legacy (max 5, expect ≤4)");
  console.log(
    JSON.stringify(
      {
        envAllowPublicFetch: envAllow,
        livePermission,
        partnerLicences: licences.length,
      },
      null,
      2,
    ),
  );

  if (!livePermission.allowed) {
    writeFileSync(
      OUT_DRY,
      JSON.stringify(
        {
          verdict: "LEGACY RECOVERY BLOCKED",
          reason: livePermission,
          productionWritesExecuted: [],
        },
        null,
        2,
      ),
    );
    console.error("LEGACY RECOVERY BLOCKED — licence/config");
    process.exit(1);
  }

  const beforeReport = await HistoricalIntelligence56Service.buildReport();
  const leaks =
    beforeReport.safety56?.catalogueLeaks ??
    beforeReport.coverage52?.catalogueLeaks ??
    -1;
  if (typeof leaks === "number" && leaks > 0) {
    writeFileSync(
      OUT_DRY,
      JSON.stringify(
        { verdict: "PRODUCTION BLOCKED", catalogueLeaks: leaks },
        null,
        2,
      ),
    );
    process.exit(1);
  }

  const dry = await HistoricalIntelligence56Service.dryRunLegacy({
    operator: OPERATOR,
    limit: LIMIT,
  });

  const candidates = (dry.candidates56 ?? dry.candidates ?? []) as Array<
    Record<string, unknown>
  >;
  const events = beforeReport.events ?? [];
  const legacyEvents = events.filter(
    (e: { failureClassification?: string }) =>
      e.failureClassification === "LEGACY_UNKNOWN_FAILURE",
  );

  const diagnostic = legacyEvents.map(
    (e: {
      observationId: string;
      auctionEventId: string | null;
      propertyLabel: string;
      town: string | null;
      agency: string | null;
      sourceUrl: string | null;
      sourceStatus: string;
      evidenceState: string;
      fetchState: string | null;
      httpStatus: number | null;
      errorCode: string | null;
      failureClassification: string;
      retryable: boolean;
      snapshot: boolean;
      extraction: string;
      outcome: string;
      salePrice: string;
      resolution: string | null;
      evidenceQuality: string | null;
      lastAttempt: string | null;
      attemptNumber: number;
      nextAction: string;
    }) => ({
      observationId: e.observationId,
      auctionEventId: e.auctionEventId,
      propertyLabel: e.propertyLabel,
      town: e.town,
      source: e.agency ?? e.sourceStatus,
      sourceUrl: e.sourceUrl,
      evidenceState: e.evidenceState,
      fetchState: e.fetchState,
      httpStatus: e.httpStatus,
      errorCode: e.errorCode,
      failureClassification: e.failureClassification,
      retryable: e.retryable,
      snapshot: e.snapshot,
      extraction: e.extraction,
      outcome: e.outcome,
      salePrice: e.salePrice,
      resolution: e.resolution,
      evidenceQuality: e.evidenceQuality,
      lastAttempt: e.lastAttempt,
      attemptNumber: e.attemptNumber,
      nextAction: e.nextAction || "Retry Legacy",
    }),
  );

  const dryPayload = {
    generatedAt: new Date().toISOString(),
    message: "DRY RUN LEGACY — NO PRODUCTION WRITE",
    livePermission,
    envBIDDERS_CHOICE_ALLOW_PUBLIC_FETCH: envAllow
      ? "PRESENT_TRUE"
      : "ABSENT_OR_FALSE",
    legacyPopulation: diagnostic.length,
    dryRunCandidates: candidates.length,
    candidates,
    diagnostic,
    before: {
      coverage52: beforeReport.coverage52,
      metrics: beforeReport.metrics,
      bottleneck56: beforeReport.bottleneck56,
      recoveryLanes55: beforeReport.recoveryLanes55,
    },
    productionWritesExecuted: [],
  };
  writeFileSync(OUT_DRY, JSON.stringify(dryPayload, null, 2));
  console.log(`Wrote ${OUT_DRY}`);
  console.log(`Legacy population: ${diagnostic.length}`);
  console.log(`Dry-run candidates: ${candidates.length}`);
  for (const c of candidates) {
    console.log(
      `- ${c.propertyLabel ?? c.property} | ${c.town ?? "—"} | ${c.sourceUrl ?? "—"} | ${c.whyEligible ?? c.expectedAction ?? ""}`,
    );
  }

  if (candidates.length === 0) {
    console.log("No legacy candidates — stop");
    process.exit(0);
  }
  if (candidates.length > LIMIT) {
    console.error("STOP — dry run returned more than max 5");
    process.exit(1);
  }
  if (diagnostic.length > LIMIT) {
    console.error("STOP — legacy population exceeds max batch");
    process.exit(1);
  }

  if (!execute) {
    console.log(
      "\nSTOP after dry run. Set HI56_LEGACY_EXECUTE=1 to run Retry Legacy.",
    );
    return;
  }

  console.log("\nPHASE 3 — Retry Legacy Failures (bounded)");
  const result = await HistoricalIntelligence56Service.retryLegacyFailures({
    operator: OPERATOR,
    limit: Math.min(LIMIT, Math.max(candidates.length, 1)),
    dryRun: false,
  });

  const afterReport = await HistoricalIntelligence56Service.buildReport();
  const payload = {
    generatedAt: new Date().toISOString(),
    operator: OPERATOR,
    livePermission,
    dryRun: dryPayload,
    acquisition: {
      ok: result.ok,
      message: result.message,
      evidenceDelta: (result as { evidenceDelta?: unknown }).evidenceDelta,
      explicitDelta: (result as { explicitDelta?: unknown }).explicitDelta,
      beforeAfter: (result as { beforeAfter?: unknown }).beforeAfter,
      results: (result as { results?: unknown }).results,
      processed: (result as { processed?: number }).processed,
      runId: (result as { runId?: string }).runId,
    },
    before: dryPayload.before,
    after: {
      coverage52: afterReport.coverage52,
      metrics: afterReport.metrics,
      bottleneck56: afterReport.bottleneck56,
      recoveryLanes55: afterReport.recoveryLanes55,
      verdict: afterReport.verdict,
      safety56: afterReport.safety56,
    },
    productionWritesExecuted: [
      "Retry Legacy Failures — single bounded batch",
    ],
    productionWritesNotExecuted: [
      "P1 Acquire",
      "Batch 2",
      "Unlimited retry",
    ],
  };
  writeFileSync(OUT_RETRY, JSON.stringify(payload, null, 2));
  console.log(`Wrote ${OUT_RETRY}`);
  console.log(
    JSON.stringify(
      {
        message: result.message,
        evidenceDelta: (result as { evidenceDelta?: unknown }).evidenceDelta,
        bottleneck: afterReport.bottleneck56,
        legacyAfter: afterReport.recoveryLanes55?.legacyUnknownFailures,
        catalogueLeaks: afterReport.safety56?.catalogueLeaks,
      },
      null,
      2,
    ),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
