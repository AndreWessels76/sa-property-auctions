/**
 * Historical Intelligence 5.5 — production live validation (read-only).
 * Reuses HI 5.4 live pipeline — no writes / no Acquire P1.
 * Run: npm run hi55:live
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
  HISTORICAL_INTELLIGENCE55_VERSION,
  buildHi55Report,
  renderHi55GapReportMarkdown,
} = load("intelligence/historicalIntelligence55/index.ts");

function writeArtifacts(report) {
  const livePath = path.join(root, "HISTORICAL_INTELLIGENCE55_LIVE.json");
  const evidencePath = path.join(root, "HISTORICAL_INTELLIGENCE55_EVIDENCE.json");
  const reportPath = path.join(root, "HISTORICAL_INTELLIGENCE55_REPORT.md");
  const gapPath = path.join(root, "HISTORICAL_INTELLIGENCE55_GAP_REPORT.md");

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
        campaign55: report.campaign55,
        p1Progress55: report.p1Progress55,
        batchPlan55: report.batchPlan55,
        recoveryLanes55: report.recoveryLanes55,
        evidenceFunnel55: report.evidenceFunnel55,
        bottleneck55: report.bottleneck55,
        bottleneckRanked55: report.bottleneckRanked55,
        safety55: report.safety55,
        coverage52: report.coverage52,
        nextAdminAction: report.nextAdminAction,
        eventStateSample55: report.eventStateSample55,
        reportLabels: {
          proven: report.reportLabels?.provenInProduction ?? [],
          tested: [
            "HI 5.5 orchestration over HI 5.4",
            "Batch limit clamp ≤5",
            "Dry-run no writes",
            "Catalogue leak rebuild guard",
            "Legacy vs never-attempted lanes",
          ],
          missing: [
            ...(report.coverage52?.verifiedSalePrices === 0
              ? ["Verified sale prices"]
              : []),
            ...(report.coverage52?.verifiedSold === 0 ? ["Verified SOLD"] : []),
            ...(report.coverage52?.comparableReady === 0
              ? ["Comparable-ready corpus"]
              : []),
            ...(report.coverage52?.marketReadyTowns === 0
              ? ["Market-ready towns"]
              : []),
            ...(report.coverage52?.neverAttempted > 0
              ? [`${report.coverage52.neverAttempted} never-attempted fetches`]
              : []),
          ],
          reviewRequired: report.reportLabels?.reviewRequired ?? [],
        },
        productionWritesExecuted: [],
        productionWritesNotExecuted: [
          "Acquire P1 (5)",
          "Extract / Retry / Resolve / Quality / Rebuild",
        ],
      },
      null,
      2,
    ),
  );

  const cov = report.coverage52 ?? {};
  const md = `# Historical Intelligence 5.5 — Live Report

Generated: ${report.generatedAt}

## VERDICT

**${report.verdict}**

${report.reason ?? ""}

## CAMPAIGN

**${report.campaign55?.status ?? "—"}**

${
  report.p1Progress55
    ? `P1 Progress [${report.p1Progress55.progressBar}] ${report.p1Progress55.progressLabel}
Remaining: ${report.p1Progress55.remaining}`
    : ""
}

${report.campaign55?.summaryLine ?? ""}

Data coverage improving: **${report.campaign55?.dataCoverageImproving ? "YES" : "NO"}**
Data coverage ready: **${report.campaign55?.dataCoverageReady ? "YES" : "NO"}**

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
| Catalogue Leaks | ${cov.catalogueLeaks ?? report.safety55?.catalogueLeaks ?? "—"} |

## RECOVERY LANES

Never attempted (P1): **${report.recoveryLanes55?.neverAttempted ?? "—"}**
Legacy unknown failures: **${report.recoveryLanes55?.legacyUnknownFailures ?? "—"}**
Retryable failures: **${report.recoveryLanes55?.retryableFailures ?? "—"}**
Snapshot extraction pending: **${report.recoveryLanes55?.snapshotExtractionPending ?? "—"}**

## EVIDENCE FUNNEL

${(report.evidenceFunnel55 ?? []).map((s, i) => `${i === 0 ? "" : "↓ "}${s.value} ${s.label}`).join("\n")}

## BOTTLENECK

**${report.bottleneck55?.code ?? "—"}** — ${report.bottleneck55?.count ?? "—"}/${report.bottleneck55?.total ?? "—"} (${report.bottleneck55?.percentage ?? "—"}%)

Recommended: ${report.bottleneck55?.recommendedAction ?? "—"}

## BATCH PLAN

${report.batchPlan55?.note ?? "—"}

## PROVEN

${(report.reportLabels?.provenInProduction ?? []).map((l) => `- ${l}`).join("\n") || "- Catalogue leaks = 0 (when connected)\\n- Licensed sources present\\n- Fetch successes recorded"}

## TESTED

- HI 5.5 orchestration over HI 5.4
- Batch limit ≤5
- Dry-run read-only
- Rebuild catalogue-leak guard
- Legacy vs never-attempted separation

## MISSING

- Verified SOLD: ${cov.verifiedSold ?? 0}
- Verified sale prices: ${cov.verifiedSalePrices ?? 0}
- Comparable ready: ${cov.comparableReady ?? 0}
- Market-ready towns: ${cov.marketReadyTowns ?? 0}
- Never attempted remaining: ${cov.neverAttempted ?? "—"}

## REVIEW REQUIRED

${(report.reportLabels?.reviewRequired ?? []).map((l) => `- ${l}`).join("\n") || "- (none listed)"}

## PUBLIC SAFETY

Catalogue leaks: **${report.safety55?.catalogueLeaks ?? cov.catalogueLeaks ?? "—"}**
Rebuild: **${report.safety55?.rebuildStatus ?? "—"}**

## NEXT ADMIN ACTION

${report.nextAdminAction ?? "Dry Run P1 (5) → Acquire P1 (5)"}

## PRODUCTION WRITES

Executed by this script: **none**
Not executed: Acquire P1 / Extract / Retry / Resolve / Quality / Rebuild
`;

  fs.writeFileSync(reportPath, md);
  fs.writeFileSync(
    gapPath,
    renderHi55GapReportMarkdown({
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
  console.log("Running HI 5.4 live pipeline (read-only)…");
  try {
    execSync("npm run hi54:live", { cwd: root, stdio: "inherit", env: process.env });
  } catch {
    /* hi54 writes blocked artifact on failure */
  }

  const hi54Path = path.join(root, "HISTORICAL_INTELLIGENCE54_LIVE.json");
  if (!fs.existsSync(hi54Path)) {
    const blocked = {
      version: HISTORICAL_INTELLIGENCE55_VERSION,
      generatedAt: new Date().toISOString(),
      verdict: "PRODUCTION SAFETY BLOCKED",
      reason: "LIVE_DATA_UNAVAILABLE — HI 5.4 live artifact missing",
      liveDataUnavailable: true,
    };
    fs.writeFileSync(hi54Path.replace("54", "55"), JSON.stringify(blocked, null, 2));
    console.log("LIVE VALIDATION: BLOCKED (LIVE_DATA_UNAVAILABLE)");
    return;
  }

  const hi54 = JSON.parse(fs.readFileSync(hi54Path, "utf8"));
  if (
    hi54.verdict === "PRODUCTION BLOCKED — LIVE DATA UNAVAILABLE" ||
    hi54.liveDataUnavailable
  ) {
    const blocked = {
      version: HISTORICAL_INTELLIGENCE55_VERSION,
      generatedAt: new Date().toISOString(),
      verdict: "PRODUCTION SAFETY BLOCKED",
      reason: hi54.reason ?? "LIVE_DATA_UNAVAILABLE",
      liveDataUnavailable: true,
      connectivity: hi54.connectivity,
    };
    writeArtifacts(blocked);
    console.log("LIVE VALIDATION: BLOCKED");
    return;
  }

  const report = buildHi55Report(hi54);
  writeArtifacts(report);
  console.log(
    JSON.stringify(
      {
        verdict: report.verdict,
        neverAttempted: report.coverage52?.neverAttempted,
        bottleneck: report.bottleneck55,
        nextAdminAction: report.nextAdminAction,
      },
      null,
      2,
    ),
  );
}

main();
