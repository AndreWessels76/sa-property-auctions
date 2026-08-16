/**
 * HI 5.6 — Evidence Resolution (HI 4.2) diagnostic + bounded batch.
 *
 * Usage:
 *   $env:NODE_OPTIONS='--use-system-ca'
 *   npx --yes tsx --import ./scripts/shims/register-server-only.mjs scripts/historical-intelligence56-resolve-evidence.ts
 *
 * Modes:
 *   HI56_RESOLVE_EXECUTE=1  — after diagnostic, run Resolve Evidence (max 5)
 *   default                 — diagnostic only (no production resolution writes)
 *
 * Does NOT run Legacy retry or P1 acquisition.
 */
import { readFileSync, writeFileSync } from "fs";

const OPERATOR = "hi56-resolve-evidence-batch1";
const LIMIT = 5;
const OUT_DIAG = "HISTORICAL_INTELLIGENCE56_RESOLVE_DIAGNOSTIC.json";
const OUT_RESOLVE = "HISTORICAL_INTELLIGENCE56_RESOLVE_BATCH1.json";

function loadEnv() {
  for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([^#=]+)=(.*)$/);
    if (m && !process.env[m[1]!.trim()]) {
      process.env[m[1]!.trim()] = m[2]!.trim().replace(/^["']|["']$/g, "");
    }
  }
}

function snap(report: {
  coverage52?: Record<string, unknown>;
  metrics?: Record<string, unknown>;
  bottleneck56?: unknown;
  safety56?: { catalogueLeaks?: number };
}) {
  const c = report.coverage52 ?? {};
  const m = report.metrics ?? {};
  return {
    historicalEvents: c.historicalEvents ?? m.historicalEvents ?? null,
    fetchAttempted: c.fetchAttempted ?? m.fetchAttempted ?? null,
    fetchSuccessful: c.fetchSuccessful ?? m.successfulFetches ?? null,
    fetchFailed: c.fetchFailed ?? m.failedFetches ?? null,
    snapshots: c.snapshots ?? m.snapshots ?? null,
    extractions: c.extractions ?? m.extractionSuccessful ?? null,
    outcomeEvidence: c.outcomeEvidence ?? m.outcomeObservations ?? null,
    outcomeMissing:
      typeof report.bottleneck56 === "object" &&
      report.bottleneck56 &&
      (report.bottleneck56 as { code?: string; count?: number }).code ===
        "OUTCOME_MISSING"
        ? (report.bottleneck56 as { count: number }).count
        : m.unknownOutcomes ?? null,
    verifiedSold: c.verifiedSold ?? m.verifiedSold ?? null,
    soldWithoutPrice: c.soldWithoutPrice ?? m.soldWithoutPrice ?? null,
    verifiedSalePrices: c.verifiedSalePrices ?? m.verifiedSalePrices ?? null,
    comparableReady: c.comparableReady ?? m.comparableReady ?? null,
    marketReadyTowns: c.marketReadyTowns ?? m.marketReadyTowns ?? null,
    catalogueLeaks:
      report.safety56?.catalogueLeaks ?? c.catalogueLeaks ?? m.catalogueLeaks ?? null,
    legacyUnknownFailures: c.legacyFailures ?? m.retryExhausted ?? null,
    bottleneck56: report.bottleneck56 ?? null,
  };
}

async function main() {
  loadEnv();
  const execute = process.env.HI56_RESOLVE_EXECUTE === "1";

  const { HistoricalIntelligence56Service } = await import(
    "../lib/services/HistoricalIntelligence56Service"
  );
  const { HistoricalIntelligence42Service } = await import(
    "../lib/services/HistoricalIntelligence42Service"
  );

  console.log("PHASE 1 — Diagnostic (read-only)");
  const beforeReport = await HistoricalIntelligence56Service.buildReport();
  const before = snap(beforeReport);
  const leaks =
    beforeReport.safety56?.catalogueLeaks ??
    beforeReport.coverage52?.catalogueLeaks ??
    -1;

  if (typeof leaks === "number" && leaks > 0) {
    writeFileSync(
      OUT_DIAG,
      JSON.stringify(
        { verdict: "PRODUCTION BLOCKED", catalogueLeaks: leaks, before },
        null,
        2,
      ),
    );
    console.error("PRODUCTION BLOCKED — catalogueLeaks > 0");
    process.exit(1);
  }

  const events = (beforeReport.events ?? []) as Array<Record<string, unknown>>;
  const missing = events.filter((e) => {
    const extraction = String(e.extraction ?? "");
    const outcome = String(e.outcome ?? "");
    return (
      (extraction === "SUCCESS" || extraction === "COMPLETE") &&
      (outcome === "UNKNOWN" || outcome === "MISSING")
    );
  });

  const resolved = await HistoricalIntelligence42Service.loadResolvedEvents();
  const queue = resolved.filter(
    (e) =>
      e.resolution.state === "EXTRACTED" || e.resolution.state === "REVIEW_REQUIRED",
  );
  const insufficient = resolved.filter(
    (e) =>
      Boolean(e.observation.listingPropertyId) &&
      (e.resolution.state === "INSUFFICIENT_DATA" ||
        e.resolution.state === "UNRESOLVED"),
  );
  const hi42Candidates = [...queue, ...insufficient];

  const diagnostic = missing.map((e) => ({
    observationId: e.observationId,
    auctionEventId: e.auctionEventId,
    propertyLabel: e.propertyLabel,
    town: e.town,
    agency: e.agency,
    sourceUrl: e.sourceUrl,
    sourceStatus: e.sourceStatus,
    snapshot: e.snapshot,
    extraction: e.extraction,
    outcome: e.outcome,
    salePrice: e.salePrice,
    resolution: e.resolution,
    evidenceState: e.evidenceState,
    evidenceQuality: e.evidenceQuality ?? null,
    nextAction: e.nextAction ?? e.recommendedAction ?? "Resolve Evidence",
  }));

  const resolveCandidateList = hi42Candidates.slice(0, LIMIT).map((c) => ({
    id:
      c.observation.auctionEventId ??
      c.observation.listingPropertyId ??
      c.observation.observationId,
    listingPropertyId: c.observation.listingPropertyId,
    town: c.observation.town,
    title: null as string | null,
    sourceUrl: c.observation.sourceUrl,
    resolutionState: c.resolution.state,
    outcome: c.resolution.outcome,
    label: c.resolution.label,
    salePrice: c.resolution.salePrice,
    evidenceQuality: c.resolution.evidenceQuality,
    recommendedAction: c.resolution.recommendedAction,
  }));

  const diagPayload = {
    generatedAt: new Date().toISOString(),
    message: "HI 5.6 Resolve Evidence diagnostic — no resolution writes yet",
    productionWritesExecuted: [] as string[],
    before,
    outcomeMissingCount: missing.length,
    hi42ResolveCandidateCount: hi42Candidates.length,
    batchLimit: LIMIT,
    candidatesForThisBatch: resolveCandidateList,
    diagnostic,
  };
  writeFileSync(OUT_DIAG, JSON.stringify(diagPayload, null, 2));
  console.log(
    JSON.stringify(
      {
        outcomeMissing: missing.length,
        hi42Candidates: hi42Candidates.length,
        batchPreview: resolveCandidateList.length,
        before,
      },
      null,
      2,
    ),
  );

  if (!execute) {
    console.log("Dry diagnostic complete — set HI56_RESOLVE_EXECUTE=1 to resolve");
    return;
  }

  if (hi42Candidates.length === 0) {
    writeFileSync(
      OUT_RESOLVE,
      JSON.stringify(
        {
          generatedAt: new Date().toISOString(),
          verdict: "NO EVIDENCE GAIN",
          reason: "No HI 4.2 EXTRACTED/REVIEW_REQUIRED candidates",
          before,
          after: before,
          productionWritesExecuted: [],
        },
        null,
        2,
      ),
    );
    console.log("No resolve candidates — stop");
    return;
  }

  console.log(`PHASE 3 — Resolve Evidence (limit ${LIMIT})`);
  const result = await HistoricalIntelligence56Service.resolveEvidence({
    operator: OPERATOR,
    limit: LIMIT,
  });

  const afterReport = await HistoricalIntelligence56Service.buildReport();
  const after = snap(afterReport);

  const eventReports = (result.resolution?.results ?? []).map(
    (r: Record<string, unknown>, i: number) => {
      const cand = resolveCandidateList[i];
      const enrichment = (r.enrichment ?? null) as Record<string, unknown> | null;
      return {
        propertyEvent: cand?.id ?? null,
        listingPropertyId: cand?.listingPropertyId ?? null,
        town: cand?.town ?? null,
        title: cand?.title ?? null,
        source: cand?.sourceUrl ?? null,
        snapshot: "existing snapshot path (mode=snapshot, no live fetch)",
        extraction: enrichment?.status ?? null,
        previousOutcome: cand?.outcome ?? null,
        resolvedOutcome: enrichment?.outcome ?? cand?.outcome ?? null,
        salePrice: enrichment?.salePrice ?? cand?.salePrice ?? null,
        evidence: enrichment?.message ?? null,
        resolution: {
          ok: r.ok,
          oldState: r.oldState,
          newState: r.newState,
          resolutionLabel: r.resolutionLabel,
        },
        evidenceQuality: cand?.evidenceQuality ?? null,
        nextAction:
          enrichment?.outcome &&
          !["UNKNOWN", "COMPLETED_UNKNOWN", null, undefined].includes(
            enrichment.outcome as string,
          )
            ? "Quality Audit / dossier review"
            : "Remain INSUFFICIENT_DATA unless explicit source SOLD language appears",
      };
    },
  );

  const payload = {
    generatedAt: new Date().toISOString(),
    operator: OPERATOR,
    limit: LIMIT,
    productionWritesExecuted: ["Resolve Evidence — single bounded HI 4.2 batch"],
    productionWritesNotExecuted: ["Legacy retry", "P1 acquisition"],
    before,
    after,
    delta: {
      outcomeEvidence: Number(after.outcomeEvidence) - Number(before.outcomeEvidence),
      outcomeMissing: Number(after.outcomeMissing) - Number(before.outcomeMissing),
      verifiedSold: Number(after.verifiedSold) - Number(before.verifiedSold),
      soldWithoutPrice:
        Number(after.soldWithoutPrice) - Number(before.soldWithoutPrice),
      verifiedSalePrices:
        Number(after.verifiedSalePrices) - Number(before.verifiedSalePrices),
      conflicts: null,
    },
    candidates: resolveCandidateList,
    eventReports,
    resolution: result.resolution ?? null,
    rebuild: result.rebuild ?? null,
    bottleneck56: afterReport.bottleneck56,
    coverage52: afterReport.coverage52,
    catalogueLeaks: after.catalogueLeaks,
  };

  writeFileSync(OUT_RESOLVE, JSON.stringify(payload, null, 2));
  console.log(
    JSON.stringify(
      {
        processed: result.resolution?.processed ?? eventReports.length,
        before,
        after,
        bottleneck: afterReport.bottleneck56,
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
