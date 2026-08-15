/**
 * Historical Intelligence 5.6 — production live validation (read-only).
 * Reuses HI 5.5 live pipeline — no writes / no Acquire P1.
 * Run: npm run hi56:live
 */
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const ts = require("typescript");
const Module = require("module");

const root = path.resolve(__dirname, "..");
const cache = new Map();

function transpileFile(filePath) {
  const source = fs.readFileSync(filePath, "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
      skipLibCheck: true,
    },
    fileName: filePath,
  });
  return outputText;
}

function loadFromAbs(abs) {
  if (cache.has(abs)) return cache.get(abs);
  const code = transpileFile(abs);
  const mod = new Module(abs, module);
  mod.filename = abs;
  mod.paths = Module._nodeModulePaths(path.dirname(abs));
  const originalRequire = mod.require.bind(mod);
  mod.require = (id) => {
    if (id.startsWith("@/")) {
      const aliasAbs = path.join(root, id.slice(2));
      const tsPath = aliasAbs.endsWith(".ts") ? aliasAbs : `${aliasAbs}.ts`;
      const indexTs = path.join(aliasAbs, "index.ts");
      if (fs.existsSync(tsPath)) return loadFromAbs(tsPath);
      if (fs.existsSync(indexTs)) return loadFromAbs(indexTs);
    }
    if (id.startsWith("./") || id.startsWith("../")) {
      const resolved = path.resolve(path.dirname(abs), id);
      const tsPath = resolved.endsWith(".ts") ? resolved : `${resolved}.ts`;
      const indexTs = path.join(resolved, "index.ts");
      if (fs.existsSync(tsPath)) return loadFromAbs(tsPath);
      if (fs.existsSync(indexTs)) return loadFromAbs(indexTs);
    }
    return originalRequire(id);
  };
  mod._compile(code, abs);
  cache.set(abs, mod.exports);
  return mod.exports;
}

function load(rel) {
  return loadFromAbs(path.join(root, "lib", rel));
}

const {
  HISTORICAL_INTELLIGENCE56_VERSION,
  buildHi56Report,
  renderHi56GapReportMarkdown,
  buildP1Candidates56,
} = load("intelligence/historicalIntelligence56/index.ts");
const { filterP1Eligible } = load("intelligence/historicalIntelligence52/index.ts");
const { selectP1AcquireTargets } = load("intelligence/historicalIntelligence51/index.ts");
const { deriveHi55EventState } = load("intelligence/historicalIntelligence55/index.ts");

function writeArtifacts(report) {
  const livePath = path.join(root, "HISTORICAL_INTELLIGENCE56_LIVE.json");
  const evidencePath = path.join(root, "HISTORICAL_INTELLIGENCE56_EVIDENCE.json");
  const reportPath = path.join(root, "HISTORICAL_INTELLIGENCE56_REPORT.md");
  const gapPath = path.join(root, "HISTORICAL_INTELLIGENCE56_GAP_REPORT.md");

  fs.writeFileSync(livePath, JSON.stringify(report, null, 2));
  fs.writeFileSync(
    evidencePath,
    JSON.stringify(
      {
        version: report.version,
        generatedAt: report.generatedAt,
        connectivity: report.connectivity,
        verdict: report.verdict,
        reason: report.reason,
        campaign56: report.campaign56,
        p1Progress56: report.p1Progress56,
        evidenceFunnel56: report.evidenceFunnel56,
        bottleneck56: report.bottleneck56,
        bottleneckRanked56: report.bottleneckRanked56,
        nextCandidates56: report.nextCandidates56,
        safety56: report.safety56,
        coverage52: report.coverage52,
        recoveryLanes55: report.recoveryLanes55,
        nextAdminAction: report.nextAdminAction,
        productionWritesExecuted: [],
        productionWritesNotExecuted: [
          "Acquire P1 (5)",
          "Retry Legacy",
          "Extract / Resolve / Quality / Rebuild",
        ],
        dryRunP1: report._dryRunP1 ?? null,
        p1DiagnosticCount: report._p1Diagnostic?.length ?? 0,
        message: "NO PRODUCTION WRITE",
      },
      null,
      2,
    ),
  );

  const cov = report.coverage52 ?? {};
  const md = `# Historical Intelligence 5.6 — Live Report

Generated: ${report.generatedAt}

## VERDICT

**${report.verdict}**

${report.reason ?? ""}

## CAMPAIGN

**${report.campaign56?.status ?? "—"}**

${
  report.p1Progress56
    ? `P1 Progress [${report.p1Progress56.progressBar}] ${report.p1Progress56.progressLabel} (${report.p1Progress56.progressPercent}%)
Remaining: ${report.p1Progress56.remaining} · Blocked: ${report.p1Progress56.blocked}`
    : ""
}

## BOTTLENECK

**${report.bottleneck56?.code ?? "—"} — ${report.bottleneck56?.count ?? "—"}/${report.bottleneck56?.total ?? "—"}**

Recommended: ${report.bottleneck56?.recommendedAction ?? "—"}

## PRODUCTION COUNTS

| Metric | Value |
|--------|-------|
| Historical Events | ${cov.historicalEvents ?? "—"} |
| Licensed Sources | ${cov.licensedSources ?? "—"} |
| Fetch Attempted | ${report.metrics?.fetchAttempted ?? "—"} |
| Never Attempted | ${cov.neverAttempted ?? "—"} |
| Fetch Successful | ${cov.fetchSuccessful ?? "—"} |
| Fetch Failed | ${cov.fetchFailed ?? "—"} |
| Snapshots | ${cov.snapshots ?? "—"} |
| Extractions | ${cov.extractions ?? "—"} |
| Outcome Evidence | ${cov.outcomeEvidence ?? "—"} |
| Verified SOLD | ${cov.verifiedSold ?? "—"} |
| SOLD Without Price | ${cov.soldWithoutPrice ?? "—"} |
| Verified Sale Prices | ${cov.verifiedSalePrices ?? "—"} |
| Comparable Ready | ${cov.comparableReady ?? "—"} |
| Market Ready Towns | ${cov.marketReadyTowns ?? "—"} |
| Catalogue Leaks | ${cov.catalogueLeaks ?? report.safety56?.catalogueLeaks ?? "—"} |
| Legacy Unknown | ${report.recoveryLanes55?.legacyUnknownFailures ?? "—"} |

## EVIDENCE FUNNEL

${(report.evidenceFunnel56 ?? []).map((s, i) => `${i === 0 ? "" : "↓ "}${s.value} ${s.label}`).join("\n")}

## NEXT CANDIDATES (≤5)

${(report.nextCandidates56 ?? [])
  .map(
    (c) =>
      `- [${c.lane}] **${c.propertyLabel}** (${c.town ?? "—"}) — ${c.currentState} → ${c.recommendedAction}`,
  )
  .join("\n") || "- (none)"}

## DRY RUN P1 (5) — NO PRODUCTION WRITE

${
  report._dryRunP1
    ? `**${report._dryRunP1.message}**

Selected (${report._dryRunP1.candidates.length}):
${report._dryRunP1.candidates
  .map(
    (c, i) =>
      `${i + 1}. **${c.propertyLabel}** · ${c.town ?? "—"} · ${c.source ?? c.sourceStatus ?? "—"} · ${c.sourceUrl ?? "—"} · ${c.whyEligible ?? "P1 eligible"}`,
  )
  .join("\n")}`
    : "_Run with dry-run section enabled_"
}

## P1 NEVER-ATTEMPTED DIAGNOSTIC (all remaining)

${
  (report._p1Diagnostic ?? [])
    .map(
      (d) =>
        `### ${d.propertyLabel}
- EVENT: ${d.eventId ?? "—"}
- PROPERTY: ${d.propertyMasterId ?? d.listingPropertyId ?? "—"}
- TOWN: ${d.town ?? "—"}
- LICENSED SOURCE: ${d.licensedSource ?? "—"}
- SOURCE URL: ${d.sourceUrl ?? "—"}
- SOURCE TYPE: ${d.sourceType ?? "—"}
- P1 ELIGIBLE: ${d.p1Eligible}
- FETCH STATE: ${d.fetchState ?? "—"}
- LAST ATTEMPT: ${d.lastAttempt ?? "—"}
- RETRYABLE: ${d.retryable}
- SNAPSHOT: ${d.snapshot}
- EXTRACTION: ${d.extraction}
- OUTCOME: ${d.outcome}
- SALE PRICE: ${d.salePrice}
- NEXT ACTION: ${d.nextAction}`,
    )
    .join("\n\n") || "- (none)"
}

## PUBLIC SAFETY

Catalogue leaks: **${report.safety56?.catalogueLeaks ?? cov.catalogueLeaks ?? "—"}**
Rebuild: **${report.safety56?.rebuildStatus ?? "—"}**

## NEXT ADMIN ACTION

${report.nextAdminAction ?? "Dry Run P1 (5) → Acquire P1 (5)"}

## PRODUCTION WRITES

Executed by this script: **none**
`;

  fs.writeFileSync(reportPath, md);
  fs.writeFileSync(
    gapPath,
    renderHi56GapReportMarkdown({
      generatedAt: report.generatedAt,
      entries: (report.gapEntries ?? []).map((e) => ({
        eventId: e.eventId ?? null,
        property: e.property ?? "—",
        town: e.town ?? null,
        currentState: e.currentState ?? "—",
        nextAction: e.nextAction ?? "—",
        group: e.group ?? "GAP",
      })),
    }),
  );

  console.log(`Wrote ${livePath}`);
  console.log(`Wrote ${evidencePath}`);
  console.log(`Wrote ${reportPath}`);
  console.log(`Wrote ${gapPath}`);
}

function main() {
  console.log("Running HI 5.5 live pipeline (read-only)…");
  try {
    execSync("npm run hi55:live", { cwd: root, stdio: "inherit", env: process.env });
  } catch {
    /* hi55 writes blocked artifact on failure */
  }

  const hi55Path = path.join(root, "HISTORICAL_INTELLIGENCE55_LIVE.json");
  if (!fs.existsSync(hi55Path)) {
    const blocked = {
      version: HISTORICAL_INTELLIGENCE56_VERSION,
      generatedAt: new Date().toISOString(),
      verdict: "PRODUCTION SAFETY BLOCKED",
      reason: "LIVE_DATA_UNAVAILABLE — HI 5.5 live artifact missing",
      liveDataUnavailable: true,
    };
    fs.writeFileSync(
      path.join(root, "HISTORICAL_INTELLIGENCE56_LIVE.json"),
      JSON.stringify(blocked, null, 2),
    );
    console.log("LIVE VALIDATION: BLOCKED (LIVE_DATA_UNAVAILABLE)");
    return;
  }

  const hi55 = JSON.parse(fs.readFileSync(hi55Path, "utf8"));
  if (
    hi55.verdict === "PRODUCTION SAFETY BLOCKED" ||
    hi55.liveDataUnavailable ||
    hi55.verdict === "PRODUCTION BLOCKED — LIVE DATA UNAVAILABLE"
  ) {
    writeArtifacts({
      version: HISTORICAL_INTELLIGENCE56_VERSION,
      generatedAt: new Date().toISOString(),
      verdict: "PRODUCTION SAFETY BLOCKED",
      reason: hi55.reason ?? "LIVE_DATA_UNAVAILABLE",
      liveDataUnavailable: true,
      connectivity: hi55.connectivity,
    });
    console.log("LIVE VALIDATION: BLOCKED");
    return;
  }

  const report = buildHi56Report(hi55);

  // Phase A diagnostic + Phase B dry run (read-only) — NO PRODUCTION WRITE
  const p1Eligible = filterP1Eligible(report.events ?? []);
  const dryCandidates = buildP1Candidates56(report.events ?? [], 5);
  const { selected } = selectP1AcquireTargets({
    events: report.events ?? [],
    limit: 5,
  });
  report._dryRunP1 = {
    message: "NO PRODUCTION WRITE — DRY RUN — NOTHING WRITTEN",
    candidates: dryCandidates.map((c) => ({
      ...c,
      source: c.sourceStatus,
    })),
    selectedObservationIds: selected.map((e) => e.observationId),
  };
  report._p1Diagnostic = p1Eligible.map((e) => ({
    eventId: e.auctionEventId,
    observationId: e.observationId,
    propertyLabel: e.propertyLabel,
    propertyMasterId: null,
    listingPropertyId: null,
    town: e.town,
    licensedSource: e.agency ?? e.sourceStatus,
    sourceUrl: e.sourceUrl,
    sourceType: e.sourceStatus,
    p1Eligible: true,
    fetchState: e.fetchState ?? e.evidenceState,
    lastAttempt: e.lastAttempt,
    retryable: e.retryable,
    snapshot: e.snapshot,
    extraction: e.extraction,
    outcome: e.outcome,
    salePrice: e.salePrice,
    nextAction: e.nextAction || "Acquire P1 (first licensed fetch)",
    hi55State: deriveHi55EventState(e),
  }));

  writeArtifacts(report);
  console.log("\n=== DRY RUN P1 (5) — NO PRODUCTION WRITE ===");
  for (const c of dryCandidates) {
    console.log(
      `- ${c.propertyLabel} | ${c.town ?? "—"} | ${c.sourceUrl ?? "—"} | ${c.whyEligible}`,
    );
  }
  console.log(`P1 never-attempted diagnostic rows: ${report._p1Diagnostic.length}`);
  console.log(
    JSON.stringify(
      {
        verdict: report.verdict,
        neverAttempted: report.coverage52?.neverAttempted,
        bottleneck: report.bottleneck56,
        nextCandidates: report.nextCandidates56?.length,
        dryRunP1Count: dryCandidates.length,
        nextAdminAction: "Acquire P1 (5) — explicit admin action only",
        productionWrites: "none",
      },
      null,
      2,
    ),
  );
}

main();
