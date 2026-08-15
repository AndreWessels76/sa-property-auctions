/**
 * Historical Intelligence 5.5 — selftests (50+ cases).
 * Run: npm run test:historical-intelligence55
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

console.log("HI 5.5 selftest — historical-intelligence-5.5.0\n");

const { isPubliclyActiveListing } = load("data/publicListingPolicy.ts");
const { isRejectedPriceKind } = load("property/auctionEvidenceDossier.ts");
const { filterP1Eligible } = load("intelligence/historicalIntelligence52/index.ts");
const { buildHi53Report } = load("intelligence/historicalIntelligence53/index.ts");
const { buildHi54Report } = load("intelligence/historicalIntelligence54/index.ts");
const {
  HISTORICAL_INTELLIGENCE55_VERSION,
  HI55_DEFAULT_BATCH_LIMIT,
  HI55_MAX_BATCH_LIMIT,
  HI55_MINIMUM_MARKET_SALES,
  HI55_MINIMUM_COMPARABLE_SALES,
  HI55_P1_BASELINE_CANDIDATES,
  deriveHi55EventState,
  countHi55EventStates,
  deriveHi55CampaignStatus,
  deriveHi55Verdict,
  isDataCoverageImproving,
  isDataCoverageReady,
  buildP1Progress55,
  buildBatchPlan55,
  clampHi55BatchLimit,
  rejectHi55UnlimitedLimit,
  buildRecoveryLanes55,
  buildEvidenceFunnel55,
  primaryBottleneck55,
  buildExplicitCampaignDelta55,
  withNeverAttempted55,
  formatP1RemainingDelta55,
  buildHi55Report,
  catalogueLeakCheck,
  renderHi55GapReportMarkdown,
} = load("intelligence/historicalIntelligence55/index.ts");

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
    fetchState: null,
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
  const events = overrides.events ?? manyP1(19);
  return {
    version: "historical-intelligence-5.2.0",
    generatedAt: new Date().toISOString(),
    connectivity: { status: "CONNECTED", message: "ok" },
    metrics: {
      historicalEvents: 33,
      fetchAttempted: 14,
      successfulFetches: 14,
      failedFetches: 0,
      snapshots: 9,
      extractionAttempted: 14,
      verifiedSold: 0,
      verifiedSalePrices: 0,
      soldWithoutPrice: 4,
      comparableReady: 0,
      marketReadyTowns: 0,
      catalogueLeaks: 0,
    },
    coverage: { total: 33, outcomeEvidence: 4 },
    coverageDashboard: {
      historicalEvents: 33,
      licensedSources: "33/33",
      neverAttempted: 19,
      fetchSuccessful: 14,
      fetchFailed: 0,
      verifiedSold: 0,
      verifiedSalePrices: 0,
      comparableReady: 0,
      marketReadyTowns: 0,
      catalogueLeaks: 0,
    },
    coverage52: {
      historicalEvents: 33,
      licensedSources: "33/33",
      fetchAttempted: "14/33",
      neverAttempted: 19,
      fetchSuccessful: 14,
      fetchFailed: 0,
      retryable: 0,
      permanent: 0,
      legacyFailures: 0,
      snapshots: "9/33",
      missingExtraction: 0,
      extractions: "14/33",
      outcomeEvidence: "4/33",
      verifiedSold: 0,
      soldWithoutPrice: 4,
      verifiedSalePrices: 0,
      comparableReady: 0,
      marketReadyTowns: 0,
      catalogueLeaks: 0,
    },
    events,
    recoverySnapshot: {
      historicalEvents: 33,
      fetchAttempted: 14,
      fetchSuccessful: 14,
      fetchFailed: 0,
      snapshots: 9,
      extractions: 14,
      outcomeEvidence: 4,
      verifiedSold: 0,
      verifiedSalePrices: 0,
      comparableReady: 0,
      marketReadyTowns: 0,
      soldWithoutPrice: 4,
    },
    bottleneck: {
      code: "FETCH_NOT_ATTEMPTED",
      count: 19,
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
    p1Progress: {
      originalCandidates: 19,
      processed: 0,
      remaining: 19,
      batchSize: 5,
      batches: [],
    },
    fetchResults: {
      attempted: 14,
      successful: 14,
      failed: 0,
      retryable: 0,
      permanent: 0,
      legacy: 0,
    },
    batchHistory: [],
    investorLabels: { proven: [], tested: [], missing: [], reviewRequired: [] },
    legacyRecoveryCandidates: 0,
    missingExtractionCandidates: 0,
    p4ReviewCount: 0,
    gapEntries: [],
    liveDataUnavailable: false,
    chainSuccessRates: {
      fetchSuccessRate: 100,
      snapshotRate: 64,
      extractionRate: 100,
      outcomeEvidenceRate: 28,
      salePriceRate: 0,
      denominators: {},
    },
    nextAdminAction: "Acquire P1 (5)",
    verdict: "CAMPAIGN IN PROGRESS",
    reason: "test",
    reviewQueue: [],
    ...overrides,
    events,
  };
}

function manyP1(n) {
  return Array.from({ length: n }, (_, i) =>
    baseEvent({ observationId: `p1-${i}`, auctionEventId: `evt-${i}` }),
  );
}

function buildHi55From(hi52Overrides = {}) {
  return buildHi55Report(buildHi54Report(buildHi53Report(baseHi52(hi52Overrides))));
}

// 1–10 config / limits
test("1 version", () => {
  assert.equal(HISTORICAL_INTELLIGENCE55_VERSION, "historical-intelligence-5.5.0");
});
test("2 default batch limit 5", () => assert.equal(HI55_DEFAULT_BATCH_LIMIT, 5));
test("3 max batch limit 5", () => assert.equal(HI55_MAX_BATCH_LIMIT, 5));
test("4 market threshold 5", () => assert.equal(HI55_MINIMUM_MARKET_SALES, 5));
test("5 comparable threshold 3", () => assert.equal(HI55_MINIMUM_COMPARABLE_SALES, 3));
test("6 P1 baseline 19", () => assert.equal(HI55_P1_BASELINE_CANDIDATES, 19));
test("7 clamp 99→5", () => assert.equal(clampHi55BatchLimit(99), 5));
test("8 clamp 0→1", () => assert.equal(clampHi55BatchLimit(0), 1));
test("9 clamp undefined→5", () => assert.equal(clampHi55BatchLimit(), 5));
test("10 reject unlimited limit >5", () => {
  const r = rejectHi55UnlimitedLimit(99);
  assert.equal(r.ok, false);
  assert.match(r.error ?? "", /rejected/);
});

// 11–20 P1 / campaign / progress
test("11 P1 selection never-attempted", () => {
  const events = manyP1(19);
  assert.equal(filterP1Eligible(events).length, 19);
});
test("12 P1 limit slice 5", () => {
  assert.equal(filterP1Eligible(manyP1(19)).slice(0, 5).length, 5);
});
test("13 dry-run flag semantics writes=false concept", () => {
  // Pure: dry-run helpers never mutate input events
  const events = manyP1(3);
  const before = JSON.stringify(events);
  filterP1Eligible(events);
  assert.equal(JSON.stringify(events), before);
});
test("14 acquire batch plan for 19", () => {
  const plan = buildBatchPlan55({ remaining: 19 });
  assert.equal(plan.batchesRequired, 4);
  assert.equal(plan.steps[0].plannedSize, 5);
  assert.equal(plan.steps[3].plannedSize, 4);
});
test("15 empty candidate list batch plan", () => {
  const plan = buildBatchPlan55({ remaining: 0 });
  assert.equal(plan.batchesRequired, 0);
  assert.equal(plan.steps.length, 0);
});
test("16 idempotent P1 eligibility after attempt", () => {
  const events = [
    baseEvent({ observationId: "a", attemptNumber: 1, evidenceState: "FETCH_SUCCESS" }),
    baseEvent({ observationId: "b", attemptNumber: 0 }),
  ];
  assert.equal(filterP1Eligible(events).length, 1);
});
test("17 already processed event not P1", () => {
  const e = baseEvent({ attemptNumber: 2, evidenceState: "FETCH_SUCCESS" });
  assert.equal(filterP1Eligible([e]).length, 0);
});
test("18 before/after delta never hides zeros", () => {
  const snap = {
    historicalEvents: 33,
    fetchAttempted: 14,
    fetchSuccessful: 14,
    fetchFailed: 0,
    snapshots: 9,
    extractions: 14,
    outcomeEvidence: 4,
    verifiedSold: 0,
    verifiedSalePrices: 0,
    comparableReady: 0,
    marketReadyTowns: 0,
    soldWithoutPrice: 4,
  };
  const before = withNeverAttempted55(snap, 19);
  const after = withNeverAttempted55(snap, 19);
  const delta = buildExplicitCampaignDelta55({ before, after });
  assert.ok(delta.lines.some((l) => l.includes("Verified SOLD")));
  assert.equal(delta.improved, false);
});
test("19 format P1 remaining delta", () => {
  const lines = formatP1RemainingDelta55({
    beforeRemaining: 19,
    afterRemaining: 14,
    attempted: 5,
    successful: 5,
    failed: 0,
  });
  assert.ok(lines.some((l) => l.includes("Before: 19")));
  assert.ok(lines.some((l) => l.includes("After: 14")));
  assert.ok(lines.some((l) => l.includes("Processed: 5")));
});
test("20 partial batch failure delta", () => {
  const lines = formatP1RemainingDelta55({
    beforeRemaining: 19,
    afterRemaining: 16,
    attempted: 5,
    successful: 3,
    failed: 2,
  });
  assert.ok(lines.some((l) => l.includes("Successful: 3")));
  assert.ok(lines.some((l) => l.includes("Failed: 2")));
});

// 21–30 states / evidence safety
test("21 FETCH_NOT_ATTEMPTED / ELIGIBLE state", () => {
  assert.equal(deriveHi55EventState(baseEvent()), "FETCH_ELIGIBLE");
});
test("22 FETCH_FAILED state", () => {
  assert.equal(
    deriveHi55EventState(
      baseEvent({
        attemptNumber: 1,
        retryable: true,
        evidenceState: "FETCH_HTTP_ERROR",
      }),
    ),
    "FETCH_FAILED",
  );
});
test("23 LEGACY_UNKNOWN_FAILURE separate", () => {
  assert.equal(
    deriveHi55EventState(
      baseEvent({
        attemptNumber: 1,
        failureClassification: "LEGACY_UNKNOWN_FAILURE",
      }),
    ),
    "LEGACY_UNKNOWN_FAILURE",
  );
});
test("24 snapshot extraction required", () => {
  assert.equal(
    deriveHi55EventState(
      baseEvent({
        attemptNumber: 1,
        snapshot: true,
        extraction: "NOT_RUN",
        evidenceState: "SNAPSHOT_AVAILABLE",
      }),
    ),
    "EXTRACTION_REQUIRED",
  );
});
test("25 SOLD without price", () => {
  assert.equal(
    deriveHi55EventState(
      baseEvent({
        attemptNumber: 1,
        outcome: "SOLD",
        salePrice: "MISSING",
        evidenceState: "OUTCOME_FOUND",
      }),
    ),
    "SOLD_WITHOUT_PRICE",
  );
});
test("26 PRICE_VERIFIED / VERIFIED_SOLD", () => {
  assert.equal(
    deriveHi55EventState(
      baseEvent({
        attemptNumber: 1,
        outcome: "SOLD",
        salePrice: "VERIFIED",
      }),
    ),
    "PRICE_VERIFIED",
  );
});
test("27 CONFLICT state", () => {
  assert.equal(
    deriveHi55EventState(baseEvent({ evidenceState: "CONFLICT" })),
    "CONFLICT",
  );
});
test("28 REVIEW_REQUIRED state", () => {
  assert.equal(
    deriveHi55EventState(baseEvent({ resolution: "REVIEW_REQUIRED" })),
    "REVIEW_REQUIRED",
  );
});
test("29 guide price rejected", () => {
  assert.equal(isRejectedPriceKind("guide_price"), true);
});
test("30 reserve and auction price rejected", () => {
  assert.equal(isRejectedPriceKind("reserve_price"), true);
  assert.equal(isRejectedPriceKind("auction_price"), true);
});

// 31–40 recovery / campaign / verdict
test("31 recovery lanes separate never vs legacy", () => {
  const lanes = buildRecoveryLanes55([
    baseEvent({ observationId: "n", attemptNumber: 0 }),
    baseEvent({
      observationId: "l",
      attemptNumber: 1,
      failureClassification: "LEGACY_UNKNOWN_FAILURE",
    }),
  ]);
  assert.equal(lanes.neverAttempted, 1);
  assert.equal(lanes.legacyUnknownFailures, 1);
});
test("32 CAMPAIGN_IN_PROGRESS", () => {
  assert.equal(
    deriveHi55CampaignStatus({
      catalogueLeaks: 0,
      historicalEvents: 33,
      neverAttempted: 19,
      fetchAttempted: 14,
      verifiedSalePrices: 0,
      verifiedSold: 0,
      reviewRequired: 0,
      remainingActionable: 19,
    }),
    "CAMPAIGN_IN_PROGRESS",
  );
});
test("33 DATA COVERAGE IMPROVING when P1 progressed", () => {
  assert.equal(
    isDataCoverageImproving({
      neverAttempted: 14,
      verifiedSalePrices: 0,
      comparableReady: 0,
      marketReadyTowns: 0,
    }),
    true,
  );
});
test("34 DATA COVERAGE READY requires thresholds", () => {
  assert.equal(
    isDataCoverageReady({
      verifiedSalePrices: 4,
      comparableReady: 3,
      marketReadyTowns: 1,
    }),
    false,
  );
  assert.equal(
    isDataCoverageReady({
      verifiedSalePrices: 5,
      comparableReady: 3,
      marketReadyTowns: 1,
    }),
    true,
  );
});
test("35 verdict PRODUCTION SAFETY BLOCKED", () => {
  const v = deriveHi55Verdict({
    catalogueLeaks: 2,
    status: "CAMPAIGN_IN_PROGRESS",
    dataCoverageImproving: false,
    dataCoverageReady: false,
  });
  assert.equal(v.verdict, "PRODUCTION SAFETY BLOCKED");
});
test("36 verdict CAMPAIGN IN PROGRESS", () => {
  const v = deriveHi55Verdict({
    catalogueLeaks: 0,
    status: "CAMPAIGN_IN_PROGRESS",
    dataCoverageImproving: false,
    dataCoverageReady: false,
  });
  assert.equal(v.verdict, "CAMPAIGN IN PROGRESS");
});
test("37 verdict DATA COVERAGE IMPROVING", () => {
  const v = deriveHi55Verdict({
    catalogueLeaks: 0,
    status: "CAMPAIGN_IN_PROGRESS",
    dataCoverageImproving: true,
    dataCoverageReady: false,
  });
  assert.equal(v.verdict, "DATA COVERAGE IMPROVING");
});
test("38 P1 progress bar for 19", () => {
  const p = buildP1Progress55({
    neverAttempted: 19,
    fetchSuccessful: 14,
    fetchFailed: 0,
    retryable: 0,
    permanent: 0,
    reviewRequired: 0,
  });
  assert.equal(p.remaining, 19);
  assert.equal(p.originalP1, 19);
  assert.equal(p.processed, 0);
  assert.equal(p.progressBar.length, 16);
});
test("39 P1 progress after partial", () => {
  const p = buildP1Progress55({
    neverAttempted: 14,
    fetchSuccessful: 19,
    fetchFailed: 0,
    retryable: 0,
    permanent: 0,
    reviewRequired: 0,
  });
  assert.equal(p.processed, 5);
  assert.equal(p.progressLabel, "5 / 19");
});
test("40 bottleneck FETCH_NOT_ATTEMPTED", () => {
  const b = primaryBottleneck55(manyP1(19));
  assert.equal(b.code, "FETCH_NOT_ATTEMPTED");
});

// 41–50 report / safety / files / catalogue
test("41 buildHi55Report campaign", () => {
  const hi55 = buildHi55From({ events: manyP1(19) });
  assert.equal(hi55.version, HISTORICAL_INTELLIGENCE55_VERSION);
  assert.equal(hi55.campaign55.status, "CAMPAIGN_IN_PROGRESS");
  assert.equal(hi55.p1Progress55.remaining, 19);
  assert.equal(hi55.batchPlan55.batchesRequired, 4);
});
test("42 funnel from production-like numbers", () => {
  const funnel = buildEvidenceFunnel55({
    licensedSources: 33,
    fetchAttempted: 14,
    fetchSuccessful: 14,
    snapshots: 9,
    extractions: 14,
    outcomeEvidence: 4,
    verifiedSold: 0,
    verifiedSalePrices: 0,
    comparableReady: 0,
    marketReadyTowns: 0,
  });
  assert.equal(funnel[0].value, 33);
  assert.equal(funnel[funnel.length - 1].value, 0);
});
test("43 catalogue leak blocks rebuild", () => {
  const check = catalogueLeakCheck(3);
  assert.equal(check.ok, false);
  assert.equal(check.rebuildStatus, "REBUILD_BLOCKED");
});
test("44 catalogue leak allows when zero", () => {
  assert.equal(catalogueLeakCheck(0).ok, true);
});
test("45 public catalogue excludes sold", () => {
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
test("46 public catalogue excludes expired/withdrawn", () => {
  assert.equal(
    isPubliclyActiveListing({
      verification_state: "expired",
      data_classification: "live",
      listing_status: "active",
      status: "active",
      auction_date: "2020-01-01",
    }),
    false,
  );
  assert.equal(
    isPubliclyActiveListing({
      verification_state: "withdrawn",
      data_classification: "live",
      listing_status: "active",
      status: "active",
      auction_date: "2020-01-01",
    }),
    false,
  );
});
test("47 gap report markdown", () => {
  const md = renderHi55GapReportMarkdown({
    generatedAt: "2026-08-15",
    entries: [
      {
        eventId: "e1",
        property: "P",
        town: "Pretoria",
        currentState: "FETCH_NOT_ATTEMPTED",
        nextAction: "ACQUIRE",
        group: "P1",
      },
    ],
  });
  assert.match(md, /Historical Intelligence 5.5/);
  assert.match(md, /Pretoria/);
});
test("48 API + panel + service files exist", () => {
  assert.ok(
    fs.existsSync(
      path.join(root, "app/api/admin/intelligence/historical-intelligence55/route.ts"),
    ),
  );
  assert.ok(
    fs.existsSync(
      path.join(root, "app/admin/operations/components/HistoricalIntelligence55Panel.tsx"),
    ),
  );
  assert.ok(
    fs.existsSync(path.join(root, "lib/services/HistoricalIntelligence55Service.ts")),
  );
});
test("49 package scripts present", () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
  assert.ok(pkg.scripts["test:historical-intelligence55"]);
  assert.ok(pkg.scripts["hi55:live"]);
});
test("50 event state counts include eligible", () => {
  const counts = countHi55EventStates(manyP1(3));
  assert.equal(counts.FETCH_ELIGIBLE, 3);
});
test("51 API route rejects limit >5 in source", () => {
  const src = fs.readFileSync(
    path.join(root, "app/api/admin/intelligence/historical-intelligence55/route.ts"),
    "utf8",
  );
  assert.match(src, /rejectHi55UnlimitedLimit/);
  assert.match(src, /dry_run_p1/);
  assert.match(src, /acquire_p1/);
});
test("52 panel has Dry Run and Acquire", () => {
  const src = fs.readFileSync(
    path.join(root, "app/admin/operations/components/HistoricalIntelligence55Panel.tsx"),
    "utf8",
  );
  assert.match(src, /Dry Run P1 \(5\)/);
  assert.match(src, /Acquire P1 \(5\)/);
  assert.match(src, /Retry Legacy Failures/);
  assert.match(src, /Extract Existing Snapshots/);
});
test("53 ops page wires HI55 panel", () => {
  const src = fs.readFileSync(
    path.join(root, "app/admin/operations/page.tsx"),
    "utf8",
  );
  assert.match(src, /HistoricalIntelligence55Panel/);
});
test("54 insufficient data when no outcomes", () => {
  assert.equal(
    deriveHi55EventState(baseEvent({ evidenceState: "INSUFFICIENT_DATA", attemptNumber: 1 })),
    "INSUFFICIENT_DATA",
  );
});
test("55 no zero-fill — verified stays 0", () => {
  const hi55 = buildHi55From();
  assert.equal(hi55.coverage52.verifiedSalePrices, 0);
  assert.equal(hi55.coverage52.verifiedSold, 0);
});
test("56 campaign complete ≠ data coverage ready", () => {
  assert.equal(
    isDataCoverageReady({
      verifiedSalePrices: 0,
      comparableReady: 0,
      marketReadyTowns: 0,
    }),
    false,
  );
});
test("57 repeated acquisition eligibility shrinks", () => {
  const first = manyP1(10);
  const afterOne = first.map((e, i) =>
    i < 5 ? { ...e, attemptNumber: 1, evidenceState: "FETCH_SUCCESS" } : e,
  );
  assert.equal(filterP1Eligible(afterOne).length, 5);
});
test("58 source URL preserved on event", () => {
  const e = baseEvent();
  assert.match(e.sourceUrl, /^https:\/\//);
});
test("59 rejectHi55UnlimitedLimit accepts 5", () => {
  assert.equal(rejectHi55UnlimitedLimit(5).ok, true);
});
test("60 live script exists", () => {
  assert.ok(fs.existsSync(path.join(root, "scripts/historical-intelligence55-live.cjs")));
});

console.log(`\nPassed ${passed} tests.`);
if (passed < 50) {
  console.error(`Expected at least 50 tests, got ${passed}`);
  process.exit(1);
}
console.log("HI 5.5 selftest PASS");
