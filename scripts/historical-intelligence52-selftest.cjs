/**
 * Historical Intelligence 5.2 — selftests (50+ cases).
 * Run: npm run test:historical-intelligence52
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

console.log(`HI 5.2 selftest — historical-intelligence-5.2.0\n`);

const { diagnoseConnectivityExtended } = load(
  "intelligence/historicalSourceCoverage48/connectivityExtended.ts",
);
const { classifyFetchFailure } = load(
  "intelligence/historicalSourceCoverage48/fetchErrorClassification.ts",
);
const { isPubliclyActiveListing } = load("data/publicListingPolicy.ts");
const { extractOutcomeFromText } = load("acquisition/outcomes/outcomeExtractor.ts");
const { classifyFailureMetadata } = load("intelligence/historicalIntelligence50/index.ts");
const { computeRecoveryDelta, buildRecoverySnapshot } = load(
  "intelligence/historicalIntelligence51/index.ts",
);
const {
  HISTORICAL_INTELLIGENCE52_VERSION,
  HI52_DEFAULT_BATCH_LIMIT,
  HI52_MAX_BATCH_LIMIT,
  HI52_MINIMUM_MARKET_SALES,
  HI52_MINIMUM_COMPARABLE_SALES,
  deriveHi52ExecutionState,
  countExecutionStates,
  filterP1Eligible,
  filterLegacyEligible,
  filterMissingExtraction,
  buildStageSummaries,
  rankBottlenecks,
  primaryBottleneck,
  clampBatchLimit,
  buildP1DryRunCandidates,
  buildLegacyDryRunCandidates52,
  buildExtractionDryRunCandidates,
  buildBatchDeltaReport,
  deriveHi52Verdict,
  buildEvidenceLabels,
  buildHi52Report,
  renderHi52GapReportMarkdown,
} = load("intelligence/historicalIntelligence52/index.ts");

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

function baseHi51Report(overrides = {}) {
  const events = overrides.events ?? [
    baseEvent(),
    baseEvent({ observationId: "obs-2" }),
    baseEvent({
      observationId: "obs-legacy",
      recoveryPriority: 4,
      evidenceState: "FETCH_HTTP_ERROR",
      failureClassification: "LEGACY_UNKNOWN_FAILURE",
      attemptNumber: 1,
      lastAttempt: "2026-01-01",
    }),
    baseEvent({
      observationId: "obs-snap",
      recoveryPriority: 3,
      evidenceState: "SNAPSHOT_AVAILABLE",
      snapshot: true,
      extraction: "NOT_RUN",
      attemptNumber: 1,
    }),
  ];
  return {
    version: "historical-intelligence-5.1.0",
    generatedAt: new Date().toISOString(),
    connectivity: { status: "CONNECTED", message: "ok" },
    metrics: {
      historicalEvents: 33,
      fetchAttempted: 13,
      successfulFetches: 4,
      failedFetches: 9,
      snapshots: 4,
      extractionAttempted: 6,
      verifiedSold: 0,
      verifiedSalePrices: 0,
      soldWithoutPrice: 1,
      comparableReady: 0,
      marketReadyTowns: 0,
      catalogueLeaks: 0,
      conflicts: 0,
      reviewRequired: 0,
    },
    coverage: { total: 33, outcomeEvidence: 1 },
    coverageDashboard: {
      historicalEvents: 33,
      licensedSources: "33/33",
      fetchAttempted: "13/33",
      neverAttempted: 20,
      fetchSuccessful: 4,
      fetchFailed: 9,
      legacyFailuresRequiringRefetch: 9,
      snapshots: 4,
      extractions: 6,
      outcomeEvidence: 1,
      verifiedSold: 0,
      soldWithoutPrice: 1,
      verifiedSalePrices: 0,
      comparableReady: 0,
      marketReadyTowns: 0,
      conflicts: 0,
      reviewRequired: 0,
      catalogueLeaks: 0,
    },
    events,
    bottleneck: {
      primary: "FETCH_NOT_ATTEMPTED",
      count: 20,
      total: 33,
      recommendedAction: "Acquire P1",
    },
    recoverySnapshot: {
      historicalEvents: 33,
      fetchAttempted: 13,
      fetchSuccessful: 4,
      fetchFailed: 9,
      snapshots: 4,
      extractions: 6,
      outcomeEvidence: 1,
      verifiedSold: 0,
      verifiedSalePrices: 0,
      comparableReady: 0,
      marketReadyTowns: 0,
      soldWithoutPrice: 1,
    },
    chainSuccessRates: {
      fetchSuccessRate: 30.8,
      snapshotRate: 100,
      extractionRate: 150,
      outcomeEvidenceRate: 16.7,
      salePriceRate: 0,
      denominators: {},
    },
    p1Progress: {
      originalCandidates: 20,
      processed: 0,
      remaining: 20,
      batchSize: 5,
      batches: [],
    },
    fetchResults: {
      attempted: 13,
      successful: 4,
      failed: 9,
      retryable: 0,
      permanent: 9,
      legacy: 9,
    },
    batchHistory: [],
    investorLabels: { proven: [], tested: [], missing: [], reviewRequired: [] },
    legacyRecoveryCandidates: 9,
    missingExtractionCandidates: 1,
    p4ReviewCount: 9,
    gapEntries: [],
    liveDataUnavailable: false,
    ...overrides,
    events,
  };
}

test("1 version constant", () => {
  assert.equal(HISTORICAL_INTELLIGENCE52_VERSION, "historical-intelligence-5.2.0");
});

test("2 P1 batch limit is 5", () => {
  assert.equal(HI52_DEFAULT_BATCH_LIMIT, 5);
  assert.equal(HI52_MAX_BATCH_LIMIT, 5);
});

test("3 clamp never exceeds 5", () => {
  assert.equal(clampBatchLimit(99), 5);
  assert.equal(clampBatchLimit(0), 1);
});

test("4 P1 eligible detection", () => {
  const rows = filterP1Eligible([baseEvent(), baseEvent({ observationId: "x", attemptNumber: 1, evidenceState: "FETCH_SUCCESS" })]);
  assert.equal(rows.length, 1);
});

test("5 P1 dry-run candidates capped", () => {
  const events = Array.from({ length: 12 }, (_, i) => baseEvent({ observationId: `obs-${i}` }));
  assert.equal(buildP1DryRunCandidates(events, 5).length, 5);
});

test("6 P1 dry-run has FETCH_ELIGIBLE_P1 state", () => {
  const c = buildP1DryRunCandidates([baseEvent()], 5)[0];
  assert.equal(c.executionState, "FETCH_ELIGIBLE_P1");
  assert.equal(c.stage, "A_P1");
});

test("7 dry-run idempotent", () => {
  const events = [baseEvent(), baseEvent({ observationId: "obs-2" })];
  assert.deepEqual(
    buildP1DryRunCandidates(events, 5).map((c) => c.observationId),
    buildP1DryRunCandidates(events, 5).map((c) => c.observationId),
  );
});

test("8 legacy classification state", () => {
  const { state } = deriveHi52ExecutionState(
    baseEvent({
      failureClassification: "LEGACY_UNKNOWN_FAILURE",
      attemptNumber: 1,
      evidenceState: "FETCH_HTTP_ERROR",
    }),
  );
  assert.equal(state, "LEGACY_UNKNOWN_FAILURE");
});

test("9 legacy filter", () => {
  assert.equal(
    filterLegacyEligible([
      baseEvent({ failureClassification: "LEGACY_UNKNOWN_FAILURE", attemptNumber: 1 }),
      baseEvent({ observationId: "x" }),
    ]).length,
    1,
  );
});

test("10 legacy dry-run stage B", () => {
  const c = buildLegacyDryRunCandidates52(
    [baseEvent({ failureClassification: "LEGACY_UNKNOWN_FAILURE", attemptNumber: 1 })],
    5,
  )[0];
  assert.equal(c.stage, "B_LEGACY");
});

test("11 missing extraction detection", () => {
  const rows = filterMissingExtraction([
    baseEvent({ snapshot: true, extraction: "NOT_RUN", evidenceState: "SNAPSHOT_AVAILABLE" }),
  ]);
  assert.equal(rows.length, 1);
});

test("12 extraction dry-run no refetch action", () => {
  const c = buildExtractionDryRunCandidates(
    [baseEvent({ snapshot: true, extraction: "NOT_RUN", evidenceState: "SNAPSHOT_AVAILABLE" })],
    5,
  )[0];
  assert.ok(c.expectedAction.includes("no refetch"));
  assert.equal(c.stage, "C_EXTRACTION");
});

test("13 retryable HTTP 503", () => {
  assert.equal(classifyFetchFailure({ httpStatus: 503 }).retryable, true);
});

test("14 permanent HTTP 404", () => {
  assert.equal(classifyFetchFailure({ httpStatus: 404 }).retryable, false);
});

test("15 timeout retryable", () => {
  assert.equal(classifyFetchFailure({ error: "timeout ETIMEDOUT" }).retryable, true);
});

test("16 network retryable", () => {
  assert.equal(classifyFetchFailure({ error: "fetch failed" }).retryable, true);
});

test("17 legacy metadata classifier", () => {
  assert.equal(
    classifyFailureMetadata({
      enrichmentRun: { meta: {} },
      fetchAttempted: true,
      fetchSuccessful: false,
      errorCode: "CONTENT_UNAVAILABLE",
      httpStatus: null,
    }),
    "LEGACY_UNKNOWN_FAILURE",
  );
});

test("18 FETCH_RETRYABLE state", () => {
  const { state } = deriveHi52ExecutionState(
    baseEvent({
      retryable: true,
      attemptNumber: 2,
      evidenceState: "FETCH_NETWORK_ERROR",
      recoveryPriority: 2,
    }),
  );
  assert.equal(state, "FETCH_RETRYABLE");
});

test("19 FETCH_PERMANENT state", () => {
  const { state } = deriveHi52ExecutionState(
    baseEvent({
      recoveryPriority: 4,
      attemptNumber: 1,
      evidenceState: "FETCH_BLOCKED",
    }),
  );
  assert.equal(state, "FETCH_PERMANENT");
});

test("20 VERIFIED state", () => {
  assert.equal(
    deriveHi52ExecutionState(baseEvent({ resolution: "VERIFIED" })).state,
    "VERIFIED",
  );
});

test("21 CONFLICT state", () => {
  assert.equal(
    deriveHi52ExecutionState(baseEvent({ evidenceState: "CONFLICT" })).state,
    "CONFLICT",
  );
});

test("22 REVIEW_REQUIRED state", () => {
  assert.equal(
    deriveHi52ExecutionState(baseEvent({ resolution: "REVIEW_REQUIRED" })).state,
    "REVIEW_REQUIRED",
  );
});

test("23 OUTCOME_FOUND without inferring from expired", () => {
  assert.equal(
    deriveHi52ExecutionState(baseEvent({ outcome: "SOLD", evidenceState: "OUTCOME_FOUND" }))
      .state,
    "OUTCOME_FOUND",
  );
});

test("24 guide price rejected", () => {
  const out = extractOutcomeFromText("Guide price R 500 000", {
    source_url: "https://x.com",
    source_name: "BC",
  });
  assert.ok(!out || out.salePrice == null);
});

test("25 reserve rejected", () => {
  const out = extractOutcomeFromText("Reserve R 800 000", {
    source_url: "https://x.com",
    source_name: "BC",
  });
  assert.ok(!out || out.salePrice == null);
});

test("26 auction/opening bid rejected", () => {
  const out = extractOutcomeFromText("Opening bid R 100 000", {
    source_url: "https://x.com",
    source_name: "BC",
  });
  assert.ok(!out || out.salePrice == null);
});

test("27 market threshold 5", () => {
  assert.equal(HI52_MINIMUM_MARKET_SALES, 5);
});

test("28 comparable threshold 3", () => {
  assert.equal(HI52_MINIMUM_COMPARABLE_SALES, 3);
});

test("29 bottleneck ranks FETCH_NOT_ATTEMPTED first", () => {
  const events = Array.from({ length: 10 }, (_, i) => baseEvent({ observationId: `p1-${i}` }));
  events.push(
    baseEvent({
      observationId: "legacy",
      failureClassification: "LEGACY_UNKNOWN_FAILURE",
      attemptNumber: 1,
    }),
  );
  const primary = primaryBottleneck(events);
  assert.equal(primary.code, "FETCH_NOT_ATTEMPTED");
});

test("30 bottleneck includes LEGACY after P1 cleared", () => {
  const events = [
    baseEvent({
      observationId: "legacy",
      failureClassification: "LEGACY_UNKNOWN_FAILURE",
      attemptNumber: 1,
      evidenceState: "FETCH_HTTP_ERROR",
      recoveryPriority: 4,
    }),
  ];
  const ranked = rankBottlenecks(events);
  assert.ok(ranked.some((r) => r.code === "LEGACY_UNKNOWN_FAILURE"));
});

test("31 stages A-D present", () => {
  const stages = buildStageSummaries({ events: [baseEvent()] });
  assert.deepEqual(
    stages.map((s) => s.id),
    ["A_P1", "B_LEGACY", "C_EXTRACTION", "D_RESOLUTION"],
  );
});

test("32 before/after delta no improvement", () => {
  const snap = buildRecoverySnapshot(
    {
      historicalEvents: 33,
      fetchAttempted: 13,
      successfulFetches: 4,
      failedFetches: 9,
      snapshots: 4,
      extractionAttempted: 6,
      verifiedSold: 0,
      verifiedSalePrices: 0,
      comparableReady: 0,
      marketReadyTowns: 0,
      soldWithoutPrice: 1,
    },
    1,
  );
  const delta = computeRecoveryDelta(snap, snap);
  assert.equal(delta.improved, false);
});

test("33 batch delta report fields", () => {
  const before = buildRecoverySnapshot(
    {
      historicalEvents: 33,
      fetchAttempted: 13,
      successfulFetches: 4,
      failedFetches: 9,
      snapshots: 4,
      extractionAttempted: 6,
      verifiedSold: 0,
      verifiedSalePrices: 0,
      comparableReady: 0,
      marketReadyTowns: 0,
      soldWithoutPrice: 1,
    },
    1,
  );
  const after = buildRecoverySnapshot(
    {
      historicalEvents: 33,
      fetchAttempted: 18,
      successfulFetches: 6,
      failedFetches: 12,
      snapshots: 5,
      extractionAttempted: 7,
      verifiedSold: 0,
      verifiedSalePrices: 0,
      comparableReady: 0,
      marketReadyTowns: 0,
      soldWithoutPrice: 1,
    },
    1,
  );
  const report = buildBatchDeltaReport({
    before,
    after,
    candidates: 5,
    attempted: 5,
    lines: ["+5 fetch attempts"],
    improved: true,
  });
  assert.equal(report.candidates, 5);
  assert.equal(report.successful, 2);
});

test("34 catalogue sold excluded", () => {
  assert.equal(
    isPubliclyActiveListing({
      verification_state: "sold",
      listing_status: "expired",
      status: "expired",
      auction_date: "2020-01-01",
    }),
    false,
  );
});

test("35 catalogue expired excluded", () => {
  assert.equal(
    isPubliclyActiveListing({
      verification_state: "expired",
      listing_status: "expired",
      status: "expired",
      auction_date: "2020-01-01",
    }),
    false,
  );
});

test("36 catalogue withdrawn excluded", () => {
  assert.equal(
    isPubliclyActiveListing({
      verification_state: "withdrawn",
      listing_status: "withdrawn",
      status: "withdrawn",
      auction_date: "2020-01-01",
    }),
    false,
  );
});

test("37 connectivity LIVE_DATA_UNAVAILABLE", () => {
  const c = diagnoseConnectivityExtended({
    envPresent: true,
    propertiesCount: null,
    eventsCount: null,
    propertiesError: "fetch failed",
    eventsError: null,
  });
  assert.equal(c.extendedStatus, "LIVE_DATA_UNAVAILABLE");
});

test("38 empty database distinct", () => {
  const c = diagnoseConnectivityExtended({
    envPresent: true,
    propertiesCount: 0,
    eventsCount: 0,
    propertiesError: null,
    eventsError: null,
  });
  assert.equal(c.extendedStatus, "EMPTY_DATABASE");
});

test("39 verdict engine ready when no verified sales", () => {
  const v = deriveHi52Verdict({
    catalogueLeaks: 0,
    historicalEvents: 33,
    verifiedSalePrices: 0,
    verifiedSold: 0,
    neverAttempted: 20,
    fetchAttempted: 13,
  });
  assert.equal(v.verdict, "INSUFFICIENT DATA — ENGINE READY");
});

test("40 verdict blocked on live unavailable", () => {
  const v = deriveHi52Verdict({
    liveDataUnavailable: true,
    catalogueLeaks: 0,
    historicalEvents: 33,
    verifiedSalePrices: 0,
    verifiedSold: 0,
    neverAttempted: 20,
    fetchAttempted: 13,
  });
  assert.equal(v.verdict, "PRODUCTION BLOCKED — LIVE DATA UNAVAILABLE");
});

test("41 verdict empty database", () => {
  const v = deriveHi52Verdict({
    emptyDatabase: true,
    catalogueLeaks: 0,
    historicalEvents: 0,
    verifiedSalePrices: 0,
    verifiedSold: 0,
    neverAttempted: 0,
    fetchAttempted: 0,
  });
  assert.equal(v.verdict, "EMPTY DATABASE");
});

test("42 buildHi52Report composes stages", () => {
  const report = buildHi52Report(baseHi51Report());
  assert.equal(report.version, HISTORICAL_INTELLIGENCE52_VERSION);
  assert.equal(report.stages.length, 4);
  assert.ok(report.coverage52);
  assert.ok(report.bottleneckRanked.length >= 1);
});

test("43 evidence labels separate proven/insufficient", () => {
  const labels = buildEvidenceLabels(baseHi51Report());
  assert.ok(labels.provenInProduction.length > 0);
  assert.ok(labels.insufficientData.some((l) => l.includes("verified sale")));
});

test("44 state machine counts", () => {
  const counts = countExecutionStates([
    baseEvent(),
    baseEvent({
      observationId: "l",
      failureClassification: "LEGACY_UNKNOWN_FAILURE",
      attemptNumber: 1,
    }),
  ]);
  assert.ok(counts.FETCH_ELIGIBLE_P1 >= 1);
  assert.ok(counts.LEGACY_UNKNOWN_FAILURE >= 1);
});

test("45 gap report markdown", () => {
  const md = renderHi52GapReportMarkdown({
    generatedAt: "2026-01-01",
    entries: [
      {
        eventId: "e1",
        property: "Test",
        town: "Town",
        source: "https://x.com",
        currentState: "FETCH_ELIGIBLE_P1",
        lastAttempt: null,
        failure: null,
        nextAction: "ACQUIRE",
        priority: 1,
        group: "P1",
      },
    ],
  });
  assert.ok(md.includes("P1"));
  assert.ok(md.includes("Test"));
});

test("46 API route exists", () => {
  assert.ok(
    fs.existsSync(
      path.join(root, "app/api/admin/intelligence/historical-intelligence52/route.ts"),
    ),
  );
});

test("47 panel exists", () => {
  assert.ok(
    fs.existsSync(
      path.join(root, "app/admin/operations/components/HistoricalIntelligence52Panel.tsx"),
    ),
  );
});

test("48 service exists", () => {
  assert.ok(fs.existsSync(path.join(root, "lib/services/HistoricalIntelligence52Service.ts")));
});

test("49 live script exists", () => {
  assert.ok(fs.existsSync(path.join(root, "scripts/historical-intelligence52-live.cjs")));
});

test("50 SALE_PRICE_FOUND only with explicit price state", () => {
  assert.equal(
    deriveHi52ExecutionState(baseEvent({ salePrice: "VERIFIED" })).state,
    "SALE_PRICE_FOUND",
  );
});

test("51 identity review does not auto-merge", () => {
  const { state, reason } = deriveHi52ExecutionState(
    baseEvent({ resolution: "REVIEW_REQUIRED", evidenceState: "REVIEW_REQUIRED" }),
  );
  assert.equal(state, "REVIEW_REQUIRED");
  assert.ok(reason.toLowerCase().includes("review"));
});

test("52 MISSING_EXTRACTION preferred over snapshot-only", () => {
  assert.equal(
    deriveHi52ExecutionState(
      baseEvent({ snapshot: true, extraction: "NOT_RUN", evidenceState: "SNAPSHOT_AVAILABLE" }),
    ).state,
    "MISSING_EXTRACTION",
  );
});

console.log(`\n${passed} tests passed.`);
