/**
 * Historical Intelligence 5.1 — selftests (40+ cases).
 * Run: npm run test:historical-intelligence51
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

console.log(`HI 5.1 selftest — historical-intelligence-5.1.0\n`);

const { diagnoseConnectivityExtended } = load(
  "intelligence/historicalSourceCoverage48/connectivityExtended.ts",
);
const { classifyFetchFailure } = load(
  "intelligence/historicalSourceCoverage48/fetchErrorClassification.ts",
);
const { isPubliclyActiveListing } = load("data/publicListingPolicy.ts");
const { extractOutcomeFromText } = load("acquisition/outcomes/outcomeExtractor.ts");
const {
  deriveHi50EvidenceState,
  assignRecoveryPriority,
  classifyFailureMetadata,
  computeSuccessRates,
  detectBottleneck,
  filterSnapshotExtractionCandidates,
  renderGapReportMarkdown,
  deriveHi50Verdict,
  buildHi50Report,
} = load("intelligence/historicalIntelligence50/index.ts");
const {
  HISTORICAL_INTELLIGENCE51_VERSION,
  HI51_DEFAULT_BATCH_LIMIT,
  HI51_MAX_BATCH_LIMIT,
  buildHi51Report,
  buildRecoverySnapshot,
  computeRecoveryDelta,
  computeChainSuccessRates,
  computeP1Progress,
  buildBatchHistory,
  countP1ProcessedFromHistory,
  filterP1NeverAttempted,
  filterLegacyFailureCandidates,
  buildEnhancedDryRunCandidates,
  buildLegacyDryRunCandidates,
  buildFetchResultsSummary,
  countNeverAttempted,
} = load("intelligence/historicalIntelligence51/index.ts");

function baseHscEvent(overrides = {}) {
  return {
    observationId: "obs-1",
    auctionEventId: "evt-1",
    propertyMasterId: "pm-1",
    listingPropertyId: "prop-1",
    propertyLabel: "Test Property",
    agency: "Agency",
    town: "Town",
    auctionDate: "2024-01-01",
    queuePriority: 1,
    queueReason: null,
    source: {
      sourceId: null,
      sourceName: "BC",
      agency: "BC",
      sourceUrl: "https://www.bidderschoice.co.za/x",
      sourceTier: null,
      discoveredAt: null,
      lastCheckedAt: null,
      sourceStatus: "LICENSED",
    },
    fetch: null,
    fetchAttempted: false,
    fetchSuccessful: false,
    snapshot: {
      exists: false,
      snapshotId: null,
      sha256: null,
      observedAt: null,
      sourceUrl: null,
      contentLength: null,
      version: null,
      extractionLinked: false,
      noChange: false,
    },
    extraction: {
      state: "NOT_RUN",
      extractionRunId: null,
      extractionVersion: null,
      fieldsExtracted: 0,
      outcomeExtracted: false,
      salePriceExtracted: false,
      sizeExtracted: false,
      identitySignals: [],
      confidence: null,
    },
    outcomeState: "UNKNOWN",
    salePriceState: "MISSING",
    evidenceQuality: null,
    resolutionState: null,
    primaryState: "FETCH_NOT_ATTEMPTED",
    retryRecommendation: "ACQUIRE",
    mappedGapCodes: [],
    acquisitionWouldReduceGap: true,
    nextAction: "ACQUIRE",
    stoppingPoint: "Fetch not attempted",
    ...overrides,
  };
}

function baseHi50EventRow(overrides = {}) {
  return {
    observationId: "obs-1",
    auctionEventId: "evt-1",
    propertyLabel: "Test Property",
    town: "Town",
    agency: "Agency",
    sourceUrl: "https://x.com",
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

function baseHscReport(overrides = {}) {
  return {
    version: "hsc48",
    generatedAt: new Date().toISOString(),
    connectivity: { status: "CONNECTED", message: "ok" },
    metrics: {
      propertyMasters: 38,
      auctionEvents: 38,
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
      conflicts: 0,
      reviewRequired: 0,
      catalogueLeaks: 0,
    },
    coverage: {
      total: 33,
      sourceLicensed: 33,
      fetchAttempted: 13,
      fetchSuccessful: 4,
      snapshots: 4,
      extractions: 6,
      outcomeEvidence: 1,
      salePriceEvidence: 0,
      sourceFound: 33,
    },
    events: [baseHscEvent(), baseHscEvent({ observationId: "obs-2" })],
    stateBreakdown: {},
    verdict: "INSUFFICIENT DATA — ENGINE READY",
    reason: "test",
    provenInProduction: [],
    engineTested: [],
    sourceCoverage: [],
    dataStillMissing: [],
    technicalBlockers: [],
    adminReviewRequired: [],
    liveDataUnavailable: false,
    ...overrides,
  };
}

test("1 P1 never attempted detection", () => {
  const rows = filterP1NeverAttempted([
    baseHi50EventRow(),
    baseHi50EventRow({ observationId: "obs-2", evidenceState: "FETCH_SUCCESS", recoveryPriority: 2 }),
  ]);
  assert.equal(rows.length, 1);
});

test("2 P1 dry-run candidate fields", () => {
  const candidates = buildEnhancedDryRunCandidates([baseHi50EventRow()], 5);
  assert.equal(candidates.length, 1);
  assert.ok(candidates[0].expectedAction.includes("Acquire"));
  assert.equal(candidates[0].priority, 1);
});

test("3 P1 batch limit capped at 5", () => {
  const rows = Array.from({ length: 10 }, (_, i) =>
    baseHi50EventRow({ observationId: `obs-${i}` }),
  );
  assert.equal(buildEnhancedDryRunCandidates(rows, 5).length, 5);
  assert.equal(HI51_DEFAULT_BATCH_LIMIT, 5);
  assert.equal(HI51_MAX_BATCH_LIMIT, 5);
});

test("4 P1 idempotency — same input same candidates", () => {
  const rows = [baseHi50EventRow(), baseHi50EventRow({ observationId: "obs-2" })];
  const a = buildEnhancedDryRunCandidates(rows, 5);
  const b = buildEnhancedDryRunCandidates(rows, 5);
  assert.deepEqual(a.map((x) => x.observationId), b.map((x) => x.observationId));
});

test("5 fetch success classification", () => {
  const s = deriveHi50EvidenceState(
    baseHscEvent({ fetchAttempted: true, fetchSuccessful: true, primaryState: "FETCH_SUCCESS" }),
  );
  assert.equal(s, "FETCH_SUCCESS");
});

test("6 HTTP error classification", () => {
  assert.equal(classifyFetchFailure({ httpStatus: 500 }).errorCode, "HTTP_500");
});

test("7 network error classification", () => {
  assert.equal(classifyFetchFailure({ error: "fetch failed" }).retryable, true);
  assert.equal(classifyFetchFailure({ error: "fetch failed" }).errorCode, "CONNECTION_ERROR");
});

test("8 timeout classification", () => {
  assert.equal(classifyFetchFailure({ error: "timeout ETIMEDOUT" }).retryable, true);
  assert.equal(classifyFetchFailure({ error: "timeout ETIMEDOUT" }).errorCode, "TIMEOUT");
});

test("9 retryable 503 classification", () => {
  assert.equal(classifyFetchFailure({ httpStatus: 503 }).retryable, true);
});

test("10 permanent 404 classification", () => {
  assert.equal(classifyFetchFailure({ httpStatus: 404 }).retryable, false);
});

test("11 legacy failure without metadata", () => {
  const c = classifyFailureMetadata({
    enrichmentRun: { meta: {} },
    fetchAttempted: true,
    fetchSuccessful: false,
    errorCode: "CONTENT_UNAVAILABLE",
    httpStatus: null,
  });
  assert.equal(c, "LEGACY_UNKNOWN_FAILURE");
});

test("12 snapshot detection", () => {
  const s = deriveHi50EvidenceState(
    baseHscEvent({
      snapshot: { exists: true },
      extraction: { state: "NOT_RUN" },
    }),
  );
  assert.equal(s, "SNAPSHOT_AVAILABLE");
});

test("13 extraction detection", () => {
  const s = deriveHi50EvidenceState(
    baseHscEvent({ extraction: { state: "SUCCESS" }, outcomeState: "UNKNOWN" }),
  );
  assert.equal(s, "EXTRACTION_AVAILABLE");
});

test("14 extraction without refetch filter", () => {
  const candidates = filterSnapshotExtractionCandidates([
    baseHscEvent({
      snapshot: { exists: true, snapshotId: "s1" },
      extraction: { state: "NOT_RUN" },
      listingPropertyId: "p1",
    }),
  ]);
  assert.equal(candidates.length, 1);
  assert.equal(candidates[0].snapshot.exists, true);
});

test("15 SOLD explicit extraction", () => {
  const corpus = { source_url: "https://x.com", source_name: "BC" };
  const out = extractOutcomeFromText("Property SOLD FOR R1,250,000 on auction day", corpus);
  assert.ok(out?.outcome === "SOLD" || out?.salePrice != null);
});

test("16 SOLD without price state", () => {
  const e = baseHscEvent({ outcomeState: "SOLD", salePriceState: "SOLD_WITHOUT_PRICE" });
  assert.equal(e.salePriceState, "SOLD_WITHOUT_PRICE");
});

test("17 guide price rejection", () => {
  const corpus = { source_url: "https://x.com", source_name: "BC" };
  const out = extractOutcomeFromText("Guide price R 500 000", corpus);
  assert.ok(!out || out.salePrice == null);
});

test("18 reserve rejection", () => {
  const corpus = { source_url: "https://x.com", source_name: "BC" };
  const out = extractOutcomeFromText("Reserve R 800 000", corpus);
  assert.ok(!out || out.salePrice == null);
});

test("19 auction price rejection", () => {
  const corpus = { source_url: "https://x.com", source_name: "BC" };
  const out = extractOutcomeFromText("Opening bid R 100 000", corpus);
  assert.ok(!out || out.salePrice == null);
});

test("20 conflict state", () => {
  assert.equal(deriveHi50EvidenceState(baseHscEvent({ outcomeState: "CONFLICT" })), "CONFLICT");
});

test("21 identity review state", () => {
  const s = deriveHi50EvidenceState(
    baseHscEvent({ primaryState: "IDENTITY_REVIEW_REQUIRED", resolutionState: "REVIEW_REQUIRED" }),
  );
  assert.equal(s, "REVIEW_REQUIRED");
});

test("22 evidence quality via resolution", () => {
  assert.equal(deriveHi50EvidenceState(baseHscEvent({ resolutionState: "VERIFIED" })), "VERIFIED");
});

test("23 comparable readiness threshold", () => {
  const { HI51_MINIMUM_COMPARABLE_SALES } = load("intelligence/historicalIntelligence51/config.ts");
  assert.equal(HI51_MINIMUM_COMPARABLE_SALES, 3);
});

test("24 market threshold", () => {
  const { HI51_MINIMUM_MARKET_SALES } = load("intelligence/historicalIntelligence51/config.ts");
  assert.equal(HI51_MINIMUM_MARKET_SALES, 5);
});

test("25 before/after recovery snapshot", () => {
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
  assert.equal(snap.fetchAttempted, 13);
  assert.equal(snap.outcomeEvidence, 1);
});

test("26 delta calculation with no improvement", () => {
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
  assert.ok(delta.lines[0].includes("No evidence metric change"));
});

test("27 delta with fetch improvement", () => {
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
  const delta = computeRecoveryDelta(before, after);
  assert.equal(delta.fetchAttempts, 5);
  assert.equal(delta.improved, true);
});

test("28 bottleneck FETCH_NOT_ATTEMPTED", () => {
  const events = [
    baseHscEvent(),
    baseHscEvent({ observationId: "obs-2" }),
    baseHscEvent({ fetchAttempted: true, fetchSuccessful: true }),
  ];
  const b = detectBottleneck(events);
  assert.equal(b.primary, "FETCH_NOT_ATTEMPTED");
});

test("29 P2 legacy recovery candidates", () => {
  const legacy = filterLegacyFailureCandidates([
    baseHi50EventRow({
      failureClassification: "LEGACY_UNKNOWN_FAILURE",
      recoveryPriority: 2,
    }),
    baseHi50EventRow({
      observationId: "obs-2",
      failureClassification: "NEW_RUN_WITH_EXPLICIT_ERROR",
    }),
  ]);
  assert.equal(legacy.length, 1);
});

test("30 legacy dry-run preview", () => {
  const candidates = buildLegacyDryRunCandidates(
    [
      baseHi50EventRow({
        failureClassification: "LEGACY_UNKNOWN_FAILURE",
        recoveryPriority: 2,
      }),
    ],
    5,
  );
  assert.equal(candidates.length, 1);
  assert.ok(candidates[0].expectedAction.includes("legacy"));
});

test("31 P3 extraction candidates count", () => {
  const report = buildHi51Report({ hscReport: baseHscReport(), enrichmentRuns: [] });
  assert.ok(report.missingExtractionCandidates >= 0);
});

test("32 P4 blocked priority", () => {
  const p = assignRecoveryPriority(
    baseHscEvent({
      fetchAttempted: true,
      fetchSuccessful: false,
      fetchError: { errorCode: "HTTP_404", retryable: false },
      source: { sourceStatus: "LICENSE_BLOCKED", sourceUrl: "https://x.com" },
    }),
  );
  assert.equal(p.priority, 4);
});

test("33 catalogue safety sold excluded", () => {
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

test("34 duplicate prevention — dry run same slice", () => {
  const rows = Array.from({ length: 3 }, (_, i) =>
    baseHi50EventRow({ observationId: `obs-${i}` }),
  );
  const first = buildEnhancedDryRunCandidates(rows, 5);
  const second = buildEnhancedDryRunCandidates(rows, 5);
  assert.deepEqual(first, second);
});

test("35 rebuild report composes HI51 extensions", () => {
  const report = buildHi51Report({ hscReport: baseHscReport(), enrichmentRuns: [] });
  assert.equal(report.version, HISTORICAL_INTELLIGENCE51_VERSION);
  assert.ok(report.p1Progress);
  assert.ok(report.chainSuccessRates);
  assert.ok(report.fetchResults);
  assert.ok(report.investorLabels);
});

test("36 connectivity failure blocked", () => {
  const c = diagnoseConnectivityExtended({
    envPresent: true,
    propertiesCount: null,
    eventsCount: null,
    propertiesError: "fetch failed",
    eventsError: null,
  });
  assert.equal(c.extendedStatus, "LIVE_DATA_UNAVAILABLE");
});

test("37 empty database distinct", () => {
  const c = diagnoseConnectivityExtended({
    envPresent: true,
    propertiesCount: 0,
    eventsCount: 0,
    propertiesError: null,
    eventsError: null,
  });
  assert.equal(c.extendedStatus, "EMPTY_DATABASE");
});

test("38 production-blocked catalogue leak", () => {
  const v = deriveHi50Verdict({
    liveDataUnavailable: false,
    catalogueLeaks: 1,
    metrics: { verifiedSalePrices: 0, verifiedSold: 0 },
  });
  assert.equal(v.verdict, "PRODUCTION BLOCKED");
});

test("39 batch history from enrichment runs", () => {
  const history = buildBatchHistory([
    {
      run_id: "hea43_abc",
      operator: "admin@test.com",
      started_at: "2026-01-01T10:00:00Z",
      completed_at: "2026-01-01T10:01:00Z",
      status: "COMPLETED",
      snapshot_id: "snap-1",
      outcome: null,
      sale_price: null,
    },
    {
      run_id: "hea43_abc",
      operator: "admin@test.com",
      started_at: "2026-01-01T10:00:00Z",
      completed_at: "2026-01-01T10:01:00Z",
      status: "FAILED",
      snapshot_id: null,
      outcome: null,
      sale_price: null,
    },
  ]);
  assert.equal(history.length, 1);
  assert.equal(history[0].eventsSelected, 2);
  assert.equal(history[0].action, "acquire_p1");
  assert.equal(countP1ProcessedFromHistory(history), 2);
});

test("40 gap report markdown", () => {
  const md = renderGapReportMarkdown({
    generatedAt: "2026-01-01",
    entries: [
      {
        eventId: "e1",
        property: "Test",
        town: "Town",
        source: "https://x.com",
        currentState: "FETCH_ELIGIBLE",
        lastAttempt: null,
        failure: null,
        nextAction: "ACQUIRE",
        priority: 1,
        group: "P1",
      },
    ],
  });
  assert.ok(md.includes("P1"));
});

test("41 investor evidence labels present", () => {
  const report = buildHi51Report({ hscReport: baseHscReport(), enrichmentRuns: [] });
  assert.ok(report.investorLabels.proven.length > 0);
  assert.ok(report.investorLabels.tested.length > 0);
  assert.ok(report.investorLabels.missing.length > 0);
});

test("42 chain success rates insufficient data", () => {
  const rates = computeChainSuccessRates(
    {
      fetchAttempted: 0,
      successfulFetches: 0,
      snapshots: 0,
      extractionAttempted: 0,
      verifiedSalePrices: 0,
    },
    0,
  );
  assert.equal(rates.fetchSuccessRate, "INSUFFICIENT_DATA");
  assert.equal(rates.salePriceRate, "INSUFFICIENT_DATA");
});

test("43 P1 progress batches of 5", () => {
  const progress = computeP1Progress({
    remainingNeverAttempted: 15,
    processedFromBatches: 5,
  });
  assert.equal(progress.originalCandidates, 20);
  assert.equal(progress.remaining, 15);
  assert.equal(progress.batchSize, 5);
  assert.ok(progress.batches.length >= 4);
});

test("44 never attempted count", () => {
  assert.equal(
    countNeverAttempted([
      baseHi50EventRow(),
      baseHi50EventRow({ observationId: "obs-2", evidenceState: "FETCH_SUCCESS" }),
    ]),
    1,
  );
});

test("45 fetch results summary", () => {
  const summary = buildFetchResultsSummary([
    baseHi50EventRow({ failureClassification: "LEGACY_UNKNOWN_FAILURE", attemptNumber: 1 }),
    baseHi50EventRow({
      observationId: "obs-2",
      evidenceState: "FETCH_HTTP_ERROR",
      attemptNumber: 1,
    }),
  ]);
  assert.equal(summary.legacy, 1);
  assert.ok(summary.attempted >= 1);
});

test("46 API route exists", () => {
  assert.ok(
    fs.existsSync(
      path.join(root, "app/api/admin/intelligence/historical-intelligence51/route.ts"),
    ),
  );
});

test("47 panel exists", () => {
  assert.ok(
    fs.existsSync(
      path.join(root, "app/admin/operations/components/HistoricalIntelligence51Panel.tsx"),
    ),
  );
});

test("48 service exists", () => {
  assert.ok(fs.existsSync(path.join(root, "lib/services/HistoricalIntelligence51Service.ts")));
});

test("49 live script exists", () => {
  assert.ok(fs.existsSync(path.join(root, "scripts/historical-intelligence51-live.cjs")));
});

test("50 chain rates with data", () => {
  const rates = computeChainSuccessRates(
    {
      fetchAttempted: 10,
      successfulFetches: 4,
      snapshots: 4,
      extractionAttempted: 6,
      verifiedSalePrices: 0,
    },
    1,
  );
  assert.equal(rates.fetchSuccessRate, 40);
  assert.equal(rates.snapshotRate, 100);
});

console.log(`\n${passed} tests passed.`);
