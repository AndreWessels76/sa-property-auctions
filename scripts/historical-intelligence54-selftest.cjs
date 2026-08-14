/**
 * Historical Intelligence 5.4 — selftests (60+ cases).
 * Run: npm run test:historical-intelligence54
 */
const fs = require("fs");
const path = require("path");
const ts = require("typescript");
const Module = require("module");
const assert = require("assert/strict");

const root = path.resolve(__dirname, "..");
const cache = new Map();
let passed = 0;

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

function test(name, fn) {
  fn();
  passed++;
  console.log(`  ✓ ${name}`);
}

console.log(`HI 5.4 selftest — historical-intelligence-5.4.0\n`);

const { isPubliclyActiveListing } = load("data/publicListingPolicy.ts");
const { extractOutcomeFromText } = load("acquisition/outcomes/outcomeExtractor.ts");
const { classifyFailureMetadata } = load("intelligence/historicalIntelligence50/index.ts");
const { diagnoseConnectivityExtended } = load(
  "intelligence/historicalSourceCoverage48/connectivityExtended.ts",
);
const {
  filterP1Eligible,
  filterMissingExtraction,
  clampBatchLimit: clamp52,
} = load("intelligence/historicalIntelligence52/index.ts");
const { buildHi53Report } = load("intelligence/historicalIntelligence53/index.ts");
const {
  HISTORICAL_INTELLIGENCE54_VERSION,
  HI54_DEFAULT_BATCH_LIMIT,
  HI54_MAX_BATCH_LIMIT,
  HI54_MINIMUM_MARKET_SALES,
  HI54_MINIMUM_COMPARABLE_SALES,
  HI54_P1_BASELINE_CANDIDATES,
  deriveHi54CampaignStatus,
  deriveHi54Verdict,
  buildP1Progress54,
  buildEvidenceFunnel54,
  rankBottlenecks54,
  primaryBottleneck54,
  computeCoverageRates,
  countEvidenceQuality,
  buildExplicitCampaignDelta54,
  withNeverAttempted54,
  formatAcquireBeforeAfter,
  buildHi54Report,
  clampHi54BatchLimit,
  catalogueLeakCheck,
  renderHi54GapReportMarkdown,
} = load("intelligence/historicalIntelligence54/index.ts");

function baseEvent(overrides = {}) {
  return {
    observationId: "obs-1",
    auctionEventId: "evt-1",
    propertyLabel: "Test Property",
    town: "Town",
    agency: "Agency",
    auctionDate: "2024-01-01",
    sourceUrl: "https://www.bidderschoice.co.za/x",
    sourceStatus: "LICENSED",
    recoveryPriority: 1,
    evidenceState: "FETCH_NOT_ATTEMPTED",
    httpStatus: null,
    errorCode: null,
    failureClassification: "NONE",
    retryable: false,
    attemptNumber: 0,
    snapshot: false,
    extraction: "NOT_RUN",
    outcome: "UNKNOWN",
    salePrice: "MISSING",
    resolution: null,
    evidenceQuality: null,
    lastAttempt: null,
    nextAction: "ACQUIRE",
    ...overrides,
  };
}

function baseHi52(overrides = {}) {
  const events = overrides.events ?? [
    baseEvent(),
    baseEvent({ observationId: "obs-2" }),
    baseEvent({
      observationId: "obs-legacy",
      failureClassification: "LEGACY_UNKNOWN_FAILURE",
      attemptNumber: 1,
      evidenceState: "FETCH_HTTP_ERROR",
      recoveryPriority: 4,
    }),
  ];
  return {
    version: "historical-intelligence-5.2.0",
    generatedAt: new Date().toISOString(),
    connectivity: { status: "CONNECTED", message: "ok" },
    metrics: {
      historicalEvents: 33,
      fetchAttempted: 13,
      successfulFetches: 9,
      failedFetches: 4,
      snapshots: 4,
      extractionAttempted: 9,
      verifiedSold: 0,
      verifiedSalePrices: 0,
      soldWithoutPrice: 2,
      comparableReady: 0,
      marketReadyTowns: 0,
      catalogueLeaks: 0,
    },
    coverage: { total: 33, outcomeEvidence: 2 },
    coverageDashboard: {
      historicalEvents: 33,
      licensedSources: "33/33",
      fetchAttempted: "13/33",
      neverAttempted: 20,
      fetchSuccessful: 9,
      fetchFailed: 4,
      legacyFailuresRequiringRefetch: 4,
      snapshots: 4,
      extractions: 9,
      outcomeEvidence: 2,
      verifiedSold: 0,
      soldWithoutPrice: 2,
      verifiedSalePrices: 0,
      comparableReady: 0,
      marketReadyTowns: 0,
      catalogueLeaks: 0,
      reviewRequired: 0,
      conflicts: 0,
    },
    coverage52: {
      historicalEvents: 33,
      licensedSources: "33/33",
      fetchAttempted: "13/33",
      neverAttempted: 20,
      fetchSuccessful: 9,
      fetchFailed: 4,
      retryable: 0,
      permanent: 4,
      legacyFailures: 4,
      snapshots: "4/33",
      missingExtraction: 0,
      extractions: "9/33",
      outcomeEvidence: "2/33",
      verifiedSold: 0,
      soldWithoutPrice: 2,
      verifiedSalePrices: 0,
      comparableReady: 0,
      marketReadyTowns: 0,
      catalogueLeaks: 0,
    },
    events,
    recoverySnapshot: {
      historicalEvents: 33,
      fetchAttempted: 13,
      fetchSuccessful: 9,
      fetchFailed: 4,
      snapshots: 4,
      extractions: 9,
      outcomeEvidence: 2,
      verifiedSold: 0,
      verifiedSalePrices: 0,
      comparableReady: 0,
      marketReadyTowns: 0,
      soldWithoutPrice: 2,
    },
    bottleneck: {
      code: "FETCH_NOT_ATTEMPTED",
      count: 20,
      total: 33,
      recommendedAction: "Acquire P1 (5)",
    },
    stages: [],
    bottleneckRanked: [],
    stateMachineCounts: {},
    evidenceLabels: {
      provenInProduction: [],
      tested: [],
      engineReady: [],
      insufficientData: [],
      reviewRequired: [],
    },
    p1Progress: { originalCandidates: 20, processed: 0, remaining: 20, batchSize: 5, batches: [] },
    fetchResults: { attempted: 13, successful: 9, failed: 4, retryable: 0, permanent: 4, legacy: 4 },
    batchHistory: [],
    investorLabels: { proven: [], tested: [], missing: [], reviewRequired: [] },
    legacyRecoveryCandidates: 4,
    missingExtractionCandidates: 0,
    p4ReviewCount: 4,
    gapEntries: [],
    liveDataUnavailable: false,
    chainSuccessRates: {
      fetchSuccessRate: 69.2,
      snapshotRate: 44.4,
      extractionRate: 225,
      outcomeEvidenceRate: 22.2,
      salePriceRate: 0,
      denominators: {},
    },
    nextAdminAction: "Acquire P1 (5)",
    verdict: "INSUFFICIENT DATA — ENGINE READY",
    reason: "test",
    ...overrides,
    events,
  };
}

function manyP1(n) {
  return Array.from({ length: n }, (_, i) => baseEvent({ observationId: `p1-${i}` }));
}

// --- config ---
test("1 version", () => {
  assert.equal(HISTORICAL_INTELLIGENCE54_VERSION, "historical-intelligence-5.4.0");
});
test("2 default batch limit 5", () => assert.equal(HI54_DEFAULT_BATCH_LIMIT, 5));
test("3 max batch limit 5", () => assert.equal(HI54_MAX_BATCH_LIMIT, 5));
test("4 market threshold 5", () => assert.equal(HI54_MINIMUM_MARKET_SALES, 5));
test("5 comparable threshold 3", () => assert.equal(HI54_MINIMUM_COMPARABLE_SALES, 3));
test("6 P1 baseline 20", () => assert.equal(HI54_P1_BASELINE_CANDIDATES, 20));
test("7 clamp batch 99→5", () => assert.equal(clampHi54BatchLimit(99), 5));
test("8 clamp batch 0→1", () => assert.equal(clampHi54BatchLimit(0), 1));
test("9 clamp undefined→5", () => assert.equal(clampHi54BatchLimit(), 5));
test("10 hi52 clamp still 5", () => assert.equal(clamp52(50), 5));

// --- campaign states ---
test("11 CAMPAIGN_NOT_STARTED when no fetch", () => {
  assert.equal(
    deriveHi54CampaignStatus({
      catalogueLeaks: 0,
      historicalEvents: 33,
      neverAttempted: 33,
      fetchAttempted: 0,
      verifiedSalePrices: 0,
      verifiedSold: 0,
      reviewRequired: 0,
      p4Blocked: 0,
      remainingActionable: 33,
    }),
    "CAMPAIGN_NOT_STARTED",
  );
});
test("12 CAMPAIGN_IN_PROGRESS with unattempted", () => {
  assert.equal(
    deriveHi54CampaignStatus({
      catalogueLeaks: 0,
      historicalEvents: 33,
      neverAttempted: 20,
      fetchAttempted: 13,
      verifiedSalePrices: 0,
      verifiedSold: 0,
      reviewRequired: 0,
      p4Blocked: 4,
      remainingActionable: 20,
    }),
    "CAMPAIGN_IN_PROGRESS",
  );
});
test("13 CAMPAIGN_AWAITING_REVIEW", () => {
  assert.equal(
    deriveHi54CampaignStatus({
      catalogueLeaks: 0,
      historicalEvents: 33,
      neverAttempted: 0,
      fetchAttempted: 33,
      verifiedSalePrices: 0,
      verifiedSold: 0,
      reviewRequired: 3,
      p4Blocked: 0,
      remainingActionable: 0,
    }),
    "CAMPAIGN_AWAITING_REVIEW",
  );
});
test("14 CAMPAIGN_DATA_COVERED", () => {
  assert.equal(
    deriveHi54CampaignStatus({
      catalogueLeaks: 0,
      historicalEvents: 33,
      neverAttempted: 0,
      fetchAttempted: 33,
      verifiedSalePrices: 5,
      verifiedSold: 5,
      reviewRequired: 0,
      p4Blocked: 0,
      remainingActionable: 0,
    }),
    "CAMPAIGN_DATA_COVERED",
  );
});
test("15 CAMPAIGN_COMPLETE", () => {
  assert.equal(
    deriveHi54CampaignStatus({
      catalogueLeaks: 0,
      historicalEvents: 10,
      neverAttempted: 0,
      fetchAttempted: 10,
      verifiedSalePrices: 2,
      verifiedSold: 2,
      reviewRequired: 0,
      p4Blocked: 0,
      remainingActionable: 0,
    }),
    "CAMPAIGN_COMPLETE",
  );
});
test("16 CAMPAIGN_BLOCKED on leaks", () => {
  assert.equal(
    deriveHi54CampaignStatus({
      catalogueLeaks: 2,
      historicalEvents: 33,
      neverAttempted: 20,
      fetchAttempted: 13,
      verifiedSalePrices: 0,
      verifiedSold: 0,
      reviewRequired: 0,
      p4Blocked: 0,
      remainingActionable: 20,
    }),
    "CAMPAIGN_BLOCKED",
  );
});
test("17 CAMPAIGN_BLOCKED when only permanent remain", () => {
  assert.equal(
    deriveHi54CampaignStatus({
      catalogueLeaks: 0,
      historicalEvents: 10,
      neverAttempted: 0,
      fetchAttempted: 10,
      verifiedSalePrices: 0,
      verifiedSold: 0,
      reviewRequired: 0,
      p4Blocked: 4,
      remainingActionable: 0,
    }),
    "CAMPAIGN_BLOCKED",
  );
});

// --- verdicts ---
test("18 verdict CAMPAIGN IN PROGRESS", () => {
  assert.equal(
    deriveHi54Verdict({ catalogueLeaks: 0, status: "CAMPAIGN_IN_PROGRESS" }).verdict,
    "CAMPAIGN IN PROGRESS",
  );
});
test("19 verdict DATA COVERED", () => {
  assert.equal(
    deriveHi54Verdict({ catalogueLeaks: 0, status: "CAMPAIGN_DATA_COVERED" }).verdict,
    "DATA COVERED — MARKET INTELLIGENCE AVAILABLE",
  );
});
test("20 verdict AWAITING REVIEW", () => {
  assert.equal(
    deriveHi54Verdict({ catalogueLeaks: 0, status: "CAMPAIGN_AWAITING_REVIEW" }).verdict,
    "CAMPAIGN AWAITING REVIEW",
  );
});
test("21 verdict COMPLETE", () => {
  assert.equal(
    deriveHi54Verdict({ catalogueLeaks: 0, status: "CAMPAIGN_COMPLETE" }).verdict,
    "CAMPAIGN COMPLETE",
  );
});
test("22 verdict blocked leaks", () => {
  assert.equal(
    deriveHi54Verdict({ catalogueLeaks: 1, status: "CAMPAIGN_IN_PROGRESS" }).verdict,
    "PRODUCTION BLOCKED — LIVE DATA UNAVAILABLE",
  );
});
test("23 verdict live unavailable", () => {
  assert.equal(
    deriveHi54Verdict({
      liveDataUnavailable: true,
      catalogueLeaks: 0,
      status: "CAMPAIGN_IN_PROGRESS",
    }).verdict,
    "PRODUCTION BLOCKED — LIVE DATA UNAVAILABLE",
  );
});
test("24 verdict NOT_STARTED → ENGINE READY", () => {
  assert.equal(
    deriveHi54Verdict({ catalogueLeaks: 0, status: "CAMPAIGN_NOT_STARTED" }).verdict,
    "INSUFFICIENT DATA — ENGINE READY",
  );
});

// --- P1 progress ---
test("25 P1 progress remaining 20", () => {
  const p = buildP1Progress54({
    neverAttempted: 20,
    fetchSuccessful: 9,
    fetchFailed: 4,
    retryable: 0,
    permanent: 4,
    reviewRequired: 0,
  });
  assert.equal(p.remaining, 20);
  assert.equal(p.originalP1, 20);
  assert.equal(p.processed, 0);
  assert.ok(p.progressBar.includes("░"));
});
test("26 P1 progress after partial", () => {
  const p = buildP1Progress54({
    neverAttempted: 16,
    fetchSuccessful: 12,
    fetchFailed: 5,
    retryable: 1,
    permanent: 4,
    reviewRequired: 0,
  });
  assert.equal(p.remaining, 16);
  assert.equal(p.processed, 4);
  assert.equal(p.progressLabel, "4 / 20");
});
test("27 P1 progress bar width 16", () => {
  const p = buildP1Progress54({
    neverAttempted: 10,
    fetchSuccessful: 0,
    fetchFailed: 0,
    retryable: 0,
    permanent: 0,
    reviewRequired: 0,
  });
  assert.equal(p.progressBar.length, 16);
});

// --- funnel ---
test("28 funnel 10 steps", () => {
  const f = buildEvidenceFunnel54({
    licensedSources: 33,
    fetchAttempted: 13,
    fetchSuccessful: 9,
    snapshots: 4,
    extractions: 9,
    outcomeEvidence: 2,
    verifiedSold: 0,
    verifiedSalePrices: 0,
    comparableReady: 0,
    marketReadyTowns: 0,
  });
  assert.equal(f.length, 10);
  assert.equal(f[0].key, "licensedSources");
  assert.equal(f[f.length - 1].key, "marketReadyTowns");
});
test("29 funnel zeros valid", () => {
  const f = buildEvidenceFunnel54({
    licensedSources: 0,
    fetchAttempted: 0,
    fetchSuccessful: 0,
    snapshots: 0,
    extractions: 0,
    outcomeEvidence: 0,
    verifiedSold: 0,
    verifiedSalePrices: 0,
    comparableReady: 0,
    marketReadyTowns: 0,
  });
  assert.ok(f.every((s) => s.value === 0));
});

// --- bottleneck ---
test("30 primary FETCH_NOT_ATTEMPTED", () => {
  assert.equal(primaryBottleneck54(manyP1(20)).code, "FETCH_NOT_ATTEMPTED");
});
test("31 bottleneck recommends Acquire P1", () => {
  assert.match(primaryBottleneck54(manyP1(20)).recommendedAction, /Acquire P1/);
});
test("32 bottleneck percentage", () => {
  const b = primaryBottleneck54(manyP1(20));
  assert.equal(b.count, 20);
  assert.equal(b.percentage, 100);
});
test("33 MISSING_EXTRACTION bottleneck", () => {
  const events = [
    baseEvent({
      observationId: "s1",
      attemptNumber: 1,
      snapshot: true,
      extraction: "NOT_RUN",
      evidenceState: "SNAPSHOT_AVAILABLE",
    }),
  ];
  const ranked = rankBottlenecks54(events);
  assert.ok(ranked.some((r) => r.code === "MISSING_EXTRACTION"));
});
test("34 IDENTITY_REVIEW_REQUIRED", () => {
  const events = [baseEvent({ observationId: "r1", resolution: "REVIEW_REQUIRED", attemptNumber: 1 })];
  assert.ok(rankBottlenecks54(events).some((r) => r.code === "IDENTITY_REVIEW_REQUIRED"));
});
test("35 empty events NO_DATA", () => {
  assert.equal(primaryBottleneck54([]).code, "NO_DATA");
});

// --- coverage ---
test("36 coverage rates", () => {
  const r = computeCoverageRates({
    historicalEvents: 33,
    licensedSources: 33,
    fetchAttempted: 13,
    snapshots: 4,
    extractions: 9,
    outcomeEvidence: 2,
    verifiedSalePrices: 0,
  });
  assert.equal(r.sourceCoverage, 100);
  assert.equal(r.salePriceCoverage, 0);
});
test("37 coverage empty → INSUFFICIENT_DATA", () => {
  const r = computeCoverageRates({
    historicalEvents: 0,
    licensedSources: 0,
    fetchAttempted: 0,
    snapshots: 0,
    extractions: 0,
    outcomeEvidence: 0,
    verifiedSalePrices: 0,
  });
  assert.equal(r.sourceCoverage, "INSUFFICIENT_DATA");
});
test("38 evidence quality counts", () => {
  const c = countEvidenceQuality([
    baseEvent({ evidenceQuality: "HIGH" }),
    baseEvent({ observationId: "2", evidenceQuality: "LOW" }),
    baseEvent({ observationId: "3", resolution: "REVIEW_REQUIRED" }),
    baseEvent({ observationId: "4", evidenceState: "CONFLICT" }),
  ]);
  assert.equal(c.HIGH, 1);
  assert.equal(c.LOW, 1);
  assert.equal(c.REVIEW_REQUIRED, 1);
  assert.equal(c.CONFLICT, 1);
});

// --- deltas ---
test("39 delta never hides zeros", () => {
  const before = withNeverAttempted54(
    {
      historicalEvents: 33,
      fetchAttempted: 13,
      fetchSuccessful: 9,
      fetchFailed: 4,
      snapshots: 4,
      extractions: 9,
      outcomeEvidence: 2,
      verifiedSold: 0,
      verifiedSalePrices: 0,
      comparableReady: 0,
      marketReadyTowns: 0,
      soldWithoutPrice: 2,
    },
    20,
  );
  const delta = buildExplicitCampaignDelta54({ before, after: before });
  assert.equal(delta.changes.length, 10);
  assert.equal(delta.improved, false);
  assert.ok(delta.lines.every((l) => l.includes("(0)")));
});
test("40 delta shows improvement", () => {
  const before = withNeverAttempted54(
    {
      historicalEvents: 33,
      fetchAttempted: 13,
      fetchSuccessful: 9,
      fetchFailed: 4,
      snapshots: 4,
      extractions: 9,
      outcomeEvidence: 2,
      verifiedSold: 0,
      verifiedSalePrices: 0,
      comparableReady: 0,
      marketReadyTowns: 0,
      soldWithoutPrice: 2,
    },
    20,
  );
  const after = withNeverAttempted54(
    { ...before, fetchAttempted: 18, fetchSuccessful: 12, snapshots: 7, verifiedSold: 1 },
    15,
  );
  const delta = buildExplicitCampaignDelta54({ before, after });
  assert.equal(delta.improved, true);
  assert.ok(delta.lines.some((l) => l.includes("Verified SOLD")));
});
test("41 acquire before/after display +0 sold", () => {
  const snap = withNeverAttempted54(
    {
      historicalEvents: 33,
      fetchAttempted: 13,
      fetchSuccessful: 9,
      fetchFailed: 4,
      snapshots: 4,
      extractions: 9,
      outcomeEvidence: 2,
      verifiedSold: 0,
      verifiedSalePrices: 0,
      comparableReady: 0,
      marketReadyTowns: 0,
      soldWithoutPrice: 2,
    },
    20,
  );
  const d = formatAcquireBeforeAfter({ candidates: 5, before: snap, after: snap });
  assert.ok(d.afterLines.some((l) => l.includes("Verified SOLD: +0")));
  assert.ok(d.afterLines.some((l) => l.includes("Verified sale prices: +0")));
});

// --- catalogue / rebuild ---
test("42 catalogue leak check blocks", () => {
  assert.equal(catalogueLeakCheck(1).rebuildStatus, "REBUILD_BLOCKED");
  assert.equal(catalogueLeakCheck(1).ok, false);
});
test("43 catalogue leak check allows", () => {
  assert.equal(catalogueLeakCheck(0).rebuildStatus, "ALLOWED");
});
test("44 public listing policy blocks sold", () => {
  assert.equal(
    isPubliclyActiveListing({
      verification_state: "sold",
      data_classification: "live",
      listing_status: "active",
      status: "active",
      auction_date: "2020-01-01",
    }),
    false,
  );
});

// --- sale price / outcome safety ---
test("45 does not infer SOLD from expired language", () => {
  const r = extractOutcomeFromText(
    "This auction has expired and the listing was closed.",
    { source_url: "https://example.com", source_name: "test" },
  );
  assert.notEqual((r?.outcome ?? "").toUpperCase(), "SOLD");
});
test("46 guide price is not sale price language alone", () => {
  const r = extractOutcomeFromText("Guide price R1 200 000. Beautiful home.", {
    source_url: "https://example.com",
    source_name: "test",
  });
  const outcome = (r?.outcome ?? "").toUpperCase();
  assert.notEqual(outcome, "SOLD");
});
test("47 explicit sold with price accepted structure", () => {
  const r = extractOutcomeFromText("Property SOLD for R850000 at auction.", {
    source_url: "https://example.com",
    source_name: "test",
  });
  assert.ok(r);
});
test("48 legacy unknown failure classification preserved", () => {
  const c = classifyFailureMetadata({
    enrichmentRun: { meta: {} },
    fetchAttempted: true,
    fetchSuccessful: false,
    httpStatus: null,
    errorCode: null,
  });
  assert.equal(c, "LEGACY_UNKNOWN_FAILURE");
});

// --- P1 filters / dry-run ---
test("49 P1 eligible filter", () => {
  assert.equal(filterP1Eligible(manyP1(5)).length, 5);
});
test("50 missing extraction filter", () => {
  const events = [
    baseEvent({
      observationId: "m1",
      attemptNumber: 1,
      snapshot: true,
      extraction: "NOT_RUN",
      evidenceState: "SNAPSHOT_AVAILABLE",
    }),
  ];
  assert.ok(filterMissingExtraction(events).length >= 1);
});

// --- build report ---
test("51 buildHi54Report campaign in progress", () => {
  const hi53 = buildHi53Report(baseHi52({ events: manyP1(20) }));
  const hi54 = buildHi54Report(hi53);
  assert.equal(hi54.version, HISTORICAL_INTELLIGENCE54_VERSION);
  assert.equal(hi54.campaign54.status, "CAMPAIGN_IN_PROGRESS");
  assert.equal(hi54.verdict, "CAMPAIGN IN PROGRESS");
  assert.equal(hi54.bottleneck54.code, "FETCH_NOT_ATTEMPTED");
});
test("52 buildHi54Report funnel from DB numbers", () => {
  const hi54 = buildHi54Report(buildHi53Report(baseHi52({ events: manyP1(20) })));
  assert.equal(hi54.evidenceFunnel54[0].value, 33);
  assert.equal(hi54.p1Progress54.remaining, 20);
});
test("53 rebuild blocked when leaks", () => {
  const hi52 = baseHi52({
    events: manyP1(5),
    coverage52: {
      ...baseHi52().coverage52,
      catalogueLeaks: 3,
      neverAttempted: 5,
    },
    metrics: { ...baseHi52().metrics, catalogueLeaks: 3 },
  });
  const hi54 = buildHi54Report(buildHi53Report(hi52));
  assert.equal(hi54.safety.rebuildStatus, "REBUILD_BLOCKED");
  assert.equal(hi54.verdict, "PRODUCTION BLOCKED — LIVE DATA UNAVAILABLE");
});
test("54 zero sale-price state", () => {
  const hi54 = buildHi54Report(buildHi53Report(baseHi52({ events: manyP1(20) })));
  assert.equal(hi54.coverage52.verifiedSalePrices, 0);
  assert.equal(hi54.coverageRates.salePriceCoverage, 0);
});
test("55 market threshold not lowered", () => {
  assert.ok(HI54_MINIMUM_MARKET_SALES >= 5);
  const status = deriveHi54CampaignStatus({
    catalogueLeaks: 0,
    historicalEvents: 33,
    neverAttempted: 0,
    fetchAttempted: 33,
    verifiedSalePrices: 4,
    verifiedSold: 4,
    reviewRequired: 0,
    p4Blocked: 0,
    remainingActionable: 0,
  });
  assert.notEqual(status, "CAMPAIGN_DATA_COVERED");
});
test("56 comparable threshold not lowered", () => {
  assert.ok(HI54_MINIMUM_COMPARABLE_SALES >= 3);
});

// --- empty / connectivity ---
test("57 empty database connectivity", () => {
  const c = diagnoseConnectivityExtended({
    envPresent: true,
    propertiesCount: 0,
    eventsCount: 0,
    propertiesError: null,
    eventsError: null,
  });
  assert.equal(c.extendedStatus, "EMPTY_DATABASE");
});
test("58 connectivity failure not zero-filled", () => {
  const c = diagnoseConnectivityExtended({
    envPresent: true,
    propertiesCount: null,
    eventsCount: null,
    propertiesError: "connection refused",
    eventsError: "connection refused",
  });
  assert.notEqual(c.extendedStatus, "CONNECTED");
  assert.notEqual(c.extendedStatus, "EMPTY_DATABASE");
});

// --- gap report / files ---
test("59 gap report markdown", () => {
  const md = renderHi54GapReportMarkdown({
    generatedAt: "2026-08-14",
    entries: [
      {
        eventId: "e1",
        property: "Home",
        town: "Pretoria",
        currentState: "FETCH_NOT_ATTEMPTED",
        nextAction: "Acquire P1",
        group: "P1",
      },
    ],
  });
  assert.match(md, /Historical Intelligence 5\.4/);
  assert.match(md, /Acquire P1/);
});
test("60 panel + API + service files exist", () => {
  assert.ok(
    fs.existsSync(
      path.join(root, "app/admin/operations/components/HistoricalIntelligence54Panel.tsx"),
    ),
  );
  assert.ok(
    fs.existsSync(path.join(root, "app/api/admin/intelligence/historical-intelligence54/route.ts")),
  );
  assert.ok(fs.existsSync(path.join(root, "lib/services/HistoricalIntelligence54Service.ts")));
});
test("61 package scripts present", () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
  assert.ok(pkg.scripts["test:historical-intelligence54"]);
  assert.ok(pkg.scripts["hi54:live"]);
});
test("62 LiveOperationsMetrics shows DATA UNAVAILABLE pattern", () => {
  const src = fs.readFileSync(
    path.join(root, "app/admin/operations/components/LiveOperationsMetrics.tsx"),
    "utf8",
  );
  assert.match(src, /DATA UNAVAILABLE/);
});
test("63 identity town alone insufficient — review path", () => {
  const events = [
    baseEvent({
      observationId: "id1",
      town: "Durban",
      resolution: "REVIEW_REQUIRED",
      attemptNumber: 1,
    }),
  ];
  assert.ok(rankBottlenecks54(events).some((b) => b.code === "IDENTITY_REVIEW_REQUIRED"));
});
test("64 MISSING_SALE_PRICE when SOLD without verified price", () => {
  const events = [
    baseEvent({
      observationId: "sp1",
      attemptNumber: 1,
      outcome: "SOLD",
      salePrice: "MISSING",
      evidenceState: "SOLD_WITHOUT_PRICE",
    }),
  ];
  assert.ok(rankBottlenecks54(events).some((b) => b.code === "MISSING_SALE_PRICE"));
});
test("65 QUALITY_REVIEW_REQUIRED on CONFLICT quality", () => {
  const events = [
    baseEvent({
      observationId: "q1",
      attemptNumber: 1,
      evidenceQuality: "CONFLICT",
    }),
  ];
  assert.ok(rankBottlenecks54(events).some((b) => b.code === "QUALITY_REVIEW_REQUIRED"));
});

console.log(`\nPassed ${passed} tests.`);
if (passed < 60) {
  console.error(`Expected at least 60 tests, got ${passed}`);
  process.exit(1);
}
console.log("HI 5.4 selftest PASS");
