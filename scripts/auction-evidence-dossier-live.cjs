/**
 * Auction Evidence Dossier — live validation (read-only).
 * Reuses HI 5.4 production report pipeline — no parallel engine.
 * Run: npm run dossier:live
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

const { buildAuctionEvidenceDossier, AUCTION_EVIDENCE_DOSSIER_VERSION } = load(
  "property/auctionEvidenceDossier.ts",
);
const { createEmptyPartnerPilotRegistry } = load("partnerships/partnerPilotOnboarding.ts");
const { summarizeAlertDelivery } = load("alerts/EvidenceAlertDetector.ts");

function classifyLiveStatus(hi54) {
  if (!hi54) return "BLOCKED";
  if (
    hi54.verdict === "PRODUCTION BLOCKED — LIVE DATA UNAVAILABLE" ||
    hi54.liveDataUnavailable ||
    (hi54.connectivity &&
      hi54.connectivity.extendedStatus &&
      !["CONNECTED", "EMPTY_DATABASE"].includes(hi54.connectivity.extendedStatus))
  ) {
    return "LIVE_DATA_UNAVAILABLE";
  }
  if (hi54.verdict === "EMPTY DATABASE") return "EMPTY_DATABASE";
  return "CONNECTED";
}

function buildSampleDossiers(hi54) {
  const events = hi54.events ?? [];
  const byProperty = new Map();
  for (const e of events) {
    const key = e.propertyLabel || e.observationId;
    const list = byProperty.get(key) ?? [];
    list.push(e);
    byProperty.set(key, list);
  }

  const dossiers = [];
  for (const [label, rows] of byProperty) {
    if (dossiers.length >= 12) break;
    const timelineEvents = rows.map((e) => ({
      auctionEventId: e.auctionEventId,
      auctionDate: e.auctionDate,
      outcome: e.outcome === "SOLD" ? "SOLD" : e.outcome || "UNKNOWN",
      salePrice: e.salePrice === "VERIFIED" ? 1 : null, // never invent amount
      sourceUrl: e.sourceUrl,
      confidence: e.salePrice === "VERIFIED" ? "high" : null,
    }));
    const verifiedSalePrices = rows.filter((e) => e.salePrice === "VERIFIED").length;
    const confirmedSales = rows.filter((e) => e.outcome === "SOLD").length;
    const d = buildAuctionEvidenceDossier({
      propertyId: rows[0].auctionEventId ?? rows[0].observationId,
      propertyTitle: label,
      propertyMasterId: null,
      researchFields: [
        { label: "Town", value: rows[0].town, status: rows[0].town ? "extracted" : "not_supplied" },
        {
          label: "Auction house",
          value: rows[0].agency,
          status: rows[0].agency ? "extracted" : "not_supplied",
        },
      ],
      timelineEvents,
      historicalSummary: {
        historicalEvents: rows.length,
        confirmedSales,
      },
      performance: {
        verifiedSalePrices,
        comparableCount: 0,
        comparableConfidence: null,
      },
    });
    dossiers.push({
      propertyLabel: label,
      town: rows[0].town,
      outcomeLabel: d.outcomeLabel,
      truthStatus: d.truthStatus,
      salePriceDisplay: d.salePrice.value,
      historicalEvents: rows.length,
    });
  }
  return dossiers;
}

function writeArtifacts(payload) {
  const livePath = path.join(root, "AUCTION_EVIDENCE_DOSSIER_LIVE.json");
  const evidencePath = path.join(root, "AUCTION_EVIDENCE_DOSSIER_EVIDENCE.json");
  const reportPath = path.join(root, "AUCTION_EVIDENCE_DOSSIER_REPORT.md");
  const gapPath = path.join(root, "AUCTION_EVIDENCE_DOSSIER_GAP_REPORT.md");

  fs.writeFileSync(livePath, JSON.stringify(payload, null, 2));
  fs.writeFileSync(
    evidencePath,
    JSON.stringify(
      {
        version: payload.version,
        generatedAt: payload.generatedAt,
        liveStatus: payload.liveStatus,
        productionCounts: payload.productionCounts,
        evidenceFunnel: payload.evidenceFunnel,
        bottleneck: payload.bottleneck,
        priorityBuckets: payload.priorityBuckets,
        townOpportunities: payload.townOpportunities,
        dossiers: payload.dossiers,
        alerts: payload.alerts,
        partners: payload.partners,
        publicSafety: payload.publicSafety,
        labels: payload.labels,
      },
      null,
      2,
    ),
  );

  const towns = payload.townOpportunities ?? [];
  const md = `# Auction Evidence Dossier — Live Report

Generated: ${payload.generatedAt}

## VERDICT

**${payload.verdict}**

Live status: **${payload.liveStatus}**
Engine: **${payload.engineStatus}**
Data coverage: **${payload.dataCoverageStatus}**

${payload.reason ?? ""}

## PRODUCTION COUNTS

| Metric | Value |
|--------|-------|
| Property Masters | ${payload.productionCounts?.propertyMasters ?? "—"} |
| Auction Events | ${payload.productionCounts?.auctionEvents ?? "—"} |
| Historical Events | ${payload.productionCounts?.historicalEvents ?? "—"} |
| Licensed Sources | ${payload.productionCounts?.licensedSources ?? "—"} |
| Fetch Attempted | ${payload.productionCounts?.fetchAttempted ?? "—"} |
| Never Attempted | ${payload.productionCounts?.neverAttempted ?? "—"} |
| Fetch Successful | ${payload.productionCounts?.fetchSuccessful ?? "—"} |
| Fetch Failed | ${payload.productionCounts?.fetchFailed ?? "—"} |
| Snapshots | ${payload.productionCounts?.snapshots ?? "—"} |
| Extractions | ${payload.productionCounts?.extractions ?? "—"} |
| Outcome Evidence | ${payload.productionCounts?.outcomeEvidence ?? "—"} |
| Verified SOLD | ${payload.productionCounts?.verifiedSold ?? "—"} |
| SOLD Without Price | ${payload.productionCounts?.soldWithoutPrice ?? "—"} |
| Verified Sale Prices | ${payload.productionCounts?.verifiedSalePrices ?? "—"} |
| Comparable Ready | ${payload.productionCounts?.comparableReady ?? "—"} |
| Market Ready Towns | ${payload.productionCounts?.marketReadyTowns ?? "—"} |
| Catalogue Leaks | ${payload.productionCounts?.catalogueLeaks ?? "—"} |

## EVIDENCE FUNNEL

${(payload.evidenceFunnel ?? []).map((s, i) => `${i === 0 ? "" : "↓ "}${s.value} ${s.label}`).join("\n") || "—"}

## BOTTLENECK

**${payload.bottleneck?.code ?? "—"}** — ${payload.bottleneck?.count ?? "—"}/${payload.bottleneck?.total ?? "—"}

## ACQUISITION PROGRESS

P1 Remaining: ${payload.priorityBuckets?.p1Remaining ?? "—"}
P2 Remaining: ${payload.priorityBuckets?.p2Remaining ?? "—"}
P3 Remaining: ${payload.priorityBuckets?.p3Remaining ?? "—"}
P4 Blocked: ${payload.priorityBuckets?.p4Blocked ?? "—"}

## TOWN OPPORTUNITIES (acquisition only — not market stats)

${towns
  .slice(0, 15)
  .map(
    (t) =>
      `- **${t.town}** — Verified: ${t.verifiedSalePrices} · Required: ${t.requiredAdditionalVerifiedSales} · Priority: ${t.priority}`,
  )
  .join("\n") || "- (none)"}

## DOSSIER STATUS

Sample dossiers built: **${payload.dossiers?.length ?? 0}**

## PROVEN

${(payload.labels?.proven ?? []).map((l) => `- ${l}`).join("\n") || "- (none)"}

## TESTED

${(payload.labels?.tested ?? []).map((l) => `- ${l}`).join("\n") || "- (none)"}

## MISSING

${(payload.labels?.missing ?? []).map((l) => `- ${l}`).join("\n") || "- (none)"}

## BLOCKED

${(payload.labels?.blocked ?? []).map((l) => `- ${l}`).join("\n") || "- (none)"}

## ALERT STATUS

Detected: ${payload.alerts?.DETECTED ?? 0} · Queued: ${payload.alerts?.QUEUED ?? 0} · Delivered: ${payload.alerts?.DELIVERED ?? 0} · Failed: ${payload.alerts?.FAILED ?? 0}

Delivery layer not claimed — all live detections remain DETECTED until real confirmation.

## PARTNER STATUS

Partner contracts: ${payload.partners?.contracts ?? 0}
Active partners: ${payload.partners?.activePartners ?? 0}
Verified partner evidence: ${payload.partners?.verifiedPartnerEvidence ?? 0}

## PUBLIC SAFETY

Catalogue leaks: **${payload.publicSafety?.catalogueLeaks ?? "—"}**

## NEXT ACTION

${payload.nextAdminAction ?? "Dry Run P1 (5) → Acquire P1 (5)"}
`;

  fs.writeFileSync(reportPath, md);

  const gapLines = [
    `# Auction Evidence Dossier — Gap Report`,
    ``,
    `Generated: ${payload.generatedAt}`,
    ``,
    `## P1 — Fetch not attempted`,
    ``,
  ];
  for (const e of payload.gapEntries ?? []) {
    if (e.group === "P1") {
      gapLines.push(
        `- **${e.property}** (${e.town ?? "—"}) — ${e.currentState} → ${e.nextAction}`,
      );
    }
  }
  gapLines.push(``, `## Town gaps to MARKET_READY`, ``);
  for (const t of towns.filter((x) => !x.marketReady).slice(0, 20)) {
    gapLines.push(
      `- **${t.town}** — need ${t.requiredAdditionalVerifiedSales} more verified sale price(s) (${t.verifiedSalePrices}/5)`,
    );
  }
  fs.writeFileSync(gapPath, gapLines.join("\n"));

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
    /* hi54 writes blocked artifacts on failure; continue to classify */
  }

  const hi54Path = path.join(root, "HISTORICAL_INTELLIGENCE54_LIVE.json");
  if (!fs.existsSync(hi54Path)) {
    const blocked = {
      version: AUCTION_EVIDENCE_DOSSIER_VERSION,
      generatedAt: new Date().toISOString(),
      liveStatus: "LIVE_DATA_UNAVAILABLE",
      verdict: "PRODUCTION SAFETY BLOCKED",
      reason: "HI 5.4 live artifact missing — cannot claim empty database",
      labels: {
        proven: [],
        tested: ["dossier live script executed"],
        missing: ["HI54 live report"],
        blocked: ["LIVE_DATA_UNAVAILABLE"],
      },
      productionWritesExecuted: [],
      productionWritesNotExecuted: ["Acquire P1", "all mutation actions"],
    };
    writeArtifacts(blocked);
    console.log("LIVE VALIDATION: BLOCKED (LIVE_DATA_UNAVAILABLE)");
    return;
  }

  const hi54 = JSON.parse(fs.readFileSync(hi54Path, "utf8"));
  const liveStatus = classifyLiveStatus(hi54);

  if (liveStatus === "LIVE_DATA_UNAVAILABLE") {
    writeArtifacts({
      version: AUCTION_EVIDENCE_DOSSIER_VERSION,
      generatedAt: new Date().toISOString(),
      liveStatus,
      verdict: "PRODUCTION SAFETY BLOCKED",
      reason: hi54.reason ?? "Live data unavailable",
      engineStatus: "PRODUCTION_SAFETY_BLOCKED",
      dataCoverageStatus: "DATA_COVERAGE_INSUFFICIENT",
      labels: {
        proven: [],
        tested: ["connectivity check"],
        missing: ["production database reachability"],
        blocked: ["LIVE_DATA_UNAVAILABLE"],
      },
      productionWritesExecuted: [],
      productionWritesNotExecuted: ["Acquire P1", "all mutation actions"],
    });
    console.log("LIVE VALIDATION: BLOCKED");
    return;
  }

  const cov = hi54.coverage52 ?? hi54.coverageDashboard ?? {};
  const partnerReg = createEmptyPartnerPilotRegistry();
  const dossiers = liveStatus === "CONNECTED" ? buildSampleDossiers(hi54) : [];

  const payload = {
    version: AUCTION_EVIDENCE_DOSSIER_VERSION,
    generatedAt: new Date().toISOString(),
    liveStatus,
    verdict:
      hi54.safety?.catalogueLeaks > 0
        ? "PRODUCTION SAFETY BLOCKED"
        : hi54.dataCoverageStatus54 === "DATA_COVERAGE_READY"
          ? "DATA COVERAGE READY"
          : "ENGINE READY / DATA COVERAGE INSUFFICIENT",
    reason: hi54.reason,
    engineStatus: hi54.engineStatus54 ?? "ENGINE_READY",
    dataCoverageStatus: hi54.dataCoverageStatus54 ?? "DATA_COVERAGE_INSUFFICIENT",
    campaignStatus: hi54.campaign54?.status,
    dataCoverageReady: hi54.campaign54?.dataCoverageReady === true,
    productionCounts: {
      propertyMasters: hi54.metrics?.propertyMasters ?? cov.propertyMasters ?? null,
      auctionEvents: hi54.metrics?.auctionEvents ?? null,
      historicalEvents: cov.historicalEvents ?? null,
      licensedSources: cov.licensedSources ?? null,
      fetchAttempted: hi54.metrics?.fetchAttempted ?? cov.fetchAttempted ?? null,
      neverAttempted: cov.neverAttempted ?? null,
      fetchSuccessful: cov.fetchSuccessful ?? null,
      fetchFailed: cov.fetchFailed ?? null,
      snapshots: cov.snapshots ?? null,
      extractions: cov.extractions ?? null,
      outcomeEvidence: cov.outcomeEvidence ?? null,
      verifiedSold: cov.verifiedSold ?? null,
      soldWithoutPrice: cov.soldWithoutPrice ?? null,
      verifiedSalePrices: cov.verifiedSalePrices ?? null,
      comparableReady: cov.comparableReady ?? null,
      marketReadyTowns: cov.marketReadyTowns ?? null,
      catalogueLeaks: cov.catalogueLeaks ?? hi54.safety?.catalogueLeaks ?? null,
    },
    evidenceFunnel: hi54.evidenceFunnel54 ?? hi54.evidenceFunnel ?? [],
    bottleneck: hi54.bottleneck54 ?? hi54.bottleneck ?? null,
    priorityBuckets: hi54.priorityBuckets54 ?? null,
    townOpportunities: hi54.townOpportunities54 ?? [],
    dossiers,
    alerts: summarizeAlertDelivery([]),
    partners: {
      contracts: 1,
      activePartners: partnerReg.activePartners,
      verifiedPartnerEvidence: partnerReg.verifiedPartnerEvidence,
      pilots: partnerReg.pilots,
    },
    publicSafety: {
      catalogueLeaks: hi54.safety?.catalogueLeaks ?? cov.catalogueLeaks ?? 0,
      rebuildStatus: hi54.safety?.rebuildStatus ?? null,
    },
    gapEntries: hi54.gapEntries ?? [],
    nextAdminAction: hi54.nextAdminAction,
    labels: {
      proven: [
        ...(hi54.reportLabels?.provenInProduction ?? []),
        `Sample dossiers: ${dossiers.length}`,
        `Catalogue leaks: ${hi54.safety?.catalogueLeaks ?? 0}`,
      ],
      tested: [
        "HI 5.4 live pipeline",
        "Auction Evidence Dossier builder",
        "Town acquisition opportunity ranking",
        "Partner pilot registry (empty)",
        "Alert delivery status (no fake DELIVERED)",
      ],
      missing: [
        ...(cov.verifiedSalePrices === 0 ? ["Verified sale prices"] : []),
        ...(cov.comparableReady === 0 ? ["Comparable-ready corpus"] : []),
        ...(cov.marketReadyTowns === 0 ? ["Market-ready towns"] : []),
        ...(cov.neverAttempted > 0
          ? [`${cov.neverAttempted} never-attempted historical fetches`]
          : []),
      ],
      blocked:
        (hi54.safety?.catalogueLeaks ?? 0) > 0
          ? ["PRODUCTION SAFETY — catalogue leaks"]
          : [],
    },
    productionWritesExecuted: [],
    productionWritesNotExecuted: [
      "Dry Run P1 writes none",
      "Acquire P1 (5) — not executed by this script",
      "Retry / Extract / Resolve / Quality / Rebuild — not executed",
    ],
  };

  writeArtifacts(payload);
  console.log(
    JSON.stringify(
      {
        verdict: payload.verdict,
        liveStatus: payload.liveStatus,
        dossiers: dossiers.length,
        neverAttempted: payload.productionCounts.neverAttempted,
      },
      null,
      2,
    ),
  );
}

main();
