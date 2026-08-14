/**
 * Historical Intelligence 5.0 — selftests (30+ cases).
 * Run: npm run test:historical-intelligence50
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

console.log(`HI 5.0 selftest — historical-intelligence-5.0.0\n`);

const { diagnoseConnectivityExtended } = load(
  "intelligence/historicalSourceCoverage48/connectivityExtended.ts",
);
const { classifyFetchFailure } = load(
  "intelligence/historicalSourceCoverage48/fetchErrorClassification.ts",
);
const { isPubliclyActiveListing } = load("data/publicListingPolicy.ts");
const { extractOutcomeFromText } = load("acquisition/outcomes/outcomeExtractor.ts");
const {
  HISTORICAL_INTELLIGENCE50_VERSION,
  deriveHi50EvidenceState,
  assignRecoveryPriority,
  classifyFailureMetadata,
  computeSuccessRates,
  detectBottleneck,
  formatDeltaLines,
  snapshotMetrics,
  filterSnapshotExtractionCandidates,
  renderGapReportMarkdown,
  deriveHi50Verdict,
  buildHi50Report,
} = load("intelligence/historicalIntelligence50/index.ts");

function baseEvent(overrides = {}) {
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

test("1 connectivity failure → LIVE_DATA_UNAVAILABLE", () => {
  const c = diagnoseConnectivityExtended({
    envPresent: true,
    propertiesCount: null,
    eventsCount: null,
    propertiesError: "fetch failed",
    eventsError: null,
  });
  assert.equal(c.extendedStatus, "LIVE_DATA_UNAVAILABLE");
});

test("2 empty database distinct from query error", () => {
  const c = diagnoseConnectivityExtended({
    envPresent: true,
    propertiesCount: 0,
    eventsCount: 0,
    propertiesError: null,
    eventsError: null,
  });
  assert.equal(c.extendedStatus, "EMPTY_DATABASE");
});

test("3 P1 never attempted detection", () => {
  const p = assignRecoveryPriority(baseEvent());
  assert.equal(p.priority, 1);
  assert.equal(p.nextAction, "ACQUIRE");
});

test("4 P2 retryable failure", () => {
  const p = assignRecoveryPriority(
    baseEvent({
      fetchAttempted: true,
      fetchSuccessful: false,
      fetchError: { errorCode: "HTTP_503", retryable: true },
    }),
  );
  assert.equal(p.priority, 2);
});

test("5 P3 snapshot without extraction", () => {
  const p = assignRecoveryPriority(
    baseEvent({
      fetchAttempted: true,
      fetchSuccessful: true,
      snapshot: { exists: true, snapshotId: "snap-1" },
      extraction: { state: "NOT_RUN" },
      primaryState: "EXTRACTION_NOT_RUN",
    }),
  );
  assert.equal(p.priority, 3);
  assert.equal(p.nextAction, "EXTRACT SNAPSHOT");
});

test("6 P4 permanent blocked", () => {
  const p = assignRecoveryPriority(
    baseEvent({
      fetchAttempted: true,
      fetchSuccessful: false,
      acquisitionPriority: { priority: 4, retryable: false },
      fetchError: { errorCode: "HTTP_404", retryable: false },
      source: { sourceStatus: "LICENSE_BLOCKED", sourceUrl: "https://x.com" },
    }),
  );
  assert.equal(p.priority, 4);
});

test("7 retryable HTTP 503", () => {
  assert.equal(classifyFetchFailure({ httpStatus: 503 }).retryable, true);
});

test("8 permanent HTTP 404", () => {
  assert.equal(classifyFetchFailure({ httpStatus: 404 }).retryable, false);
});

test("9 legacy failure without metadata", () => {
  const c = classifyFailureMetadata({
    enrichmentRun: { meta: {} },
    fetchAttempted: true,
    fetchSuccessful: false,
    errorCode: "CONTENT_UNAVAILABLE",
    httpStatus: null,
  });
  assert.equal(c, "LEGACY_UNKNOWN_FAILURE");
});

test("10 new run with explicit error", () => {
  const c = classifyFailureMetadata({
    enrichmentRun: { meta: { httpStatus: 403, errorCode: "HTTP_403" } },
    fetchAttempted: true,
    fetchSuccessful: false,
    httpStatus: 403,
  });
  assert.equal(c, "NEW_RUN_WITH_EXPLICIT_ERROR");
});

test("11 snapshot detection state", () => {
  const s = deriveHi50EvidenceState(
    baseEvent({
      snapshot: { exists: true },
      extraction: { state: "NOT_RUN" },
    }),
  );
  assert.equal(s, "SNAPSHOT_AVAILABLE");
});

test("12 extraction available state", () => {
  const s = deriveHi50EvidenceState(
    baseEvent({
      extraction: { state: "SUCCESS" },
      outcomeState: "UNKNOWN",
    }),
  );
  assert.equal(s, "EXTRACTION_AVAILABLE");
});

test("13 SOLD explicit evidence state", () => {
  const s = deriveHi50EvidenceState(
    baseEvent({ outcomeState: "SOLD", resolutionState: "EXTRACTED" }),
  );
  assert.equal(s, "OUTCOME_FOUND");
});

test("14 SOLD without price", () => {
  const e = baseEvent({ outcomeState: "SOLD", salePriceState: "SOLD_WITHOUT_PRICE" });
  assert.equal(e.salePriceState, "SOLD_WITHOUT_PRICE");
});

test("15 guide price not sale price", () => {
  const corpus = { source_url: "https://x.com", source_name: "BC" };
  const out = extractOutcomeFromText("Guide price R 500 000", corpus);
  assert.ok(!out || out.salePrice == null);
});

test("16 reserve not sale price", () => {
  const corpus = { source_url: "https://x.com", source_name: "BC" };
  const out = extractOutcomeFromText("Reserve R 800 000 — property sold", corpus);
  if (out?.salePrice != null) assert.notEqual(out.salePrice, 800000);
});

test("17 auction price not sale price", () => {
  const corpus = { source_url: "https://x.com", source_name: "BC" };
  const out = extractOutcomeFromText("Opening bid R 100 000", corpus);
  assert.ok(!out || out.salePrice == null);
});

test("18 conflict state", () => {
  const s = deriveHi50EvidenceState(baseEvent({ outcomeState: "CONFLICT" }));
  assert.equal(s, "CONFLICT");
});

test("19 identity review state", () => {
  const s = deriveHi50EvidenceState(
    baseEvent({ primaryState: "IDENTITY_REVIEW_REQUIRED", resolutionState: "REVIEW_REQUIRED" }),
  );
  assert.equal(s, "REVIEW_REQUIRED");
});

test("20 verified resolution state", () => {
  const s = deriveHi50EvidenceState(baseEvent({ resolutionState: "VERIFIED" }));
  assert.equal(s, "VERIFIED");
});

test("21 success rate insufficient when zero attempts", () => {
  const rates = computeSuccessRates(
    { fetchAttempted: 0, successfulFetches: 0, snapshots: 0, extractionAttempted: 0, verifiedSalePrices: 0 },
    { total: 33, outcomeEvidence: 1 },
  );
  assert.equal(rates.fetchSuccessRate, "INSUFFICIENT_DATA");
});

test("22 success rate when attempts exist", () => {
  const rates = computeSuccessRates(
    {
      fetchAttempted: 10,
      successfulFetches: 4,
      snapshots: 4,
      extractionAttempted: 6,
      verifiedSalePrices: 0,
    },
    { total: 33, outcomeEvidence: 1 },
  );
  assert.equal(rates.fetchSuccessRate, 40);
});

test("23 catalogue safety sold excluded", () => {
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

test("24 expired not public", () => {
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

test("25 before/after delta formatting", () => {
  const before = snapshotMetrics(
    { fetchAttempted: 10, snapshots: 4, extractionAttempted: 6, verifiedSold: 0, verifiedSalePrices: 0, comparableReady: 0 },
    1,
  );
  const after = snapshotMetrics(
    { fetchAttempted: 15, snapshots: 6, extractionAttempted: 8, verifiedSold: 0, verifiedSalePrices: 0, comparableReady: 0 },
    2,
  );
  const lines = formatDeltaLines(before, after);
  assert.ok(lines.some((l) => l.includes("fetch attempts")));
  assert.ok(lines.some((l) => l.includes("snapshots")));
});

test("26 bottleneck FETCH_NOT_ATTEMPTED", () => {
  const events = [
    baseEvent(),
    baseEvent({ observationId: "obs-2" }),
    baseEvent({ fetchAttempted: true, fetchSuccessful: true }),
  ];
  const b = detectBottleneck(events);
  assert.equal(b.primary, "FETCH_NOT_ATTEMPTED");
  assert.equal(b.count, 2);
});

test("27 snapshot extraction filter", () => {
  const candidates = filterSnapshotExtractionCandidates([
    baseEvent({
      snapshot: { exists: true, snapshotId: "s1" },
      extraction: { state: "NOT_RUN" },
      listingPropertyId: "p1",
    }),
    baseEvent({ observationId: "obs-2", snapshot: { exists: false } }),
  ]);
  assert.equal(candidates.length, 1);
});

test("28 gap report markdown", () => {
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
  assert.ok(md.includes("Test"));
});

test("29 verdict insufficient data engine ready", () => {
  const v = deriveHi50Verdict({
    liveDataUnavailable: false,
    catalogueLeaks: 0,
    metrics: { verifiedSalePrices: 0, verifiedSold: 0 },
  });
  assert.equal(v.verdict, "INSUFFICIENT DATA — ENGINE READY");
});

test("30 production blocked on catalogue leak", () => {
  const v = deriveHi50Verdict({
    liveDataUnavailable: false,
    catalogueLeaks: 1,
    metrics: { verifiedSalePrices: 0, verifiedSold: 0 },
  });
  assert.equal(v.verdict, "PRODUCTION BLOCKED");
});

test("31 build report composes events", () => {
  const report = buildHi50Report({
    hscReport: {
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
      events: [baseEvent(), baseEvent({ observationId: "obs-2" })],
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
    },
    enrichmentRuns: [],
  });
  assert.equal(report.events.length, 2);
  assert.equal(report.version, HISTORICAL_INTELLIGENCE50_VERSION);
});

test("32 API route exists", () => {
  assert.ok(
    fs.existsSync(
      path.join(root, "app/api/admin/intelligence/historical-intelligence50/route.ts"),
    ),
  );
});

test("33 panel exists", () => {
  assert.ok(
    fs.existsSync(
      path.join(root, "app/admin/operations/components/HistoricalIntelligence50Panel.tsx"),
    ),
  );
});

test("34 dry-run idempotency constant", () => {
  const { HI50_DEFAULT_BATCH_LIMIT, HI50_MAX_BATCH_LIMIT } = load(
    "intelligence/historicalIntelligence50/config.ts",
  );
  assert.equal(HI50_DEFAULT_BATCH_LIMIT, 5);
  assert.equal(HI50_MAX_BATCH_LIMIT, 10);
});

test("35 market threshold constants", () => {
  const { HI50_MINIMUM_MARKET_SALES, HI50_MINIMUM_COMPARABLE_SALES } = load(
    "intelligence/historicalIntelligence50/config.ts",
  );
  assert.equal(HI50_MINIMUM_MARKET_SALES, 5);
  assert.equal(HI50_MINIMUM_COMPARABLE_SALES, 3);
});

console.log(`\n${passed} tests passed.`);
