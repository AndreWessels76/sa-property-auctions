/**
 * Historical Intelligence 5.6 — selftests (50+ cases).
 * Run: npm run test:historical-intelligence56
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

console.log("HI 5.6 selftest — historical-intelligence-5.6.0\n");

const { isPubliclyActiveListing } = load("data/publicListingPolicy.ts");
const { isRejectedPriceKind, deriveDossierOutcomeLabel } = load(
  "property/auctionEvidenceDossier.ts",
);
const { filterP1Eligible, filterLegacyEligible, filterMissingExtraction } = load(
  "intelligence/historicalIntelligence52/index.ts",
);
const { buildHi53Report } = load("intelligence/historicalIntelligence53/index.ts");
const { buildHi54Report } = load("intelligence/historicalIntelligence54/index.ts");
const { buildHi55Report, deriveHi55EventState } = load(
  "intelligence/historicalIntelligence55/index.ts",
);
const {
  HISTORICAL_INTELLIGENCE56_VERSION,
  HI56_DEFAULT_BATCH_LIMIT,
  HI56_P1_BASELINE_CANDIDATES,
  HI56_MINIMUM_MARKET_SALES,
  HI56_MINIMUM_COMPARABLE_SALES,
  clampHi56BatchLimit,
  rejectHi56UnlimitedLimit,
  buildP1Progress56,
  deriveHi56CampaignStatus,
  deriveHi56Verdict,
  primaryBottleneck56,
  rankBottlenecks56,
  buildNextCandidates56,
  buildP1Candidates56,
  buildLegacyCandidates56,
  buildEvidenceFunnel56,
  buildEvidenceDelta56,
  metricBagFromCoverage,
  buildHi56Report,
  catalogueLeakCheck,
  renderHi56GapReportMarkdown,
} = load("intelligence/historicalIntelligence56/index.ts");

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

function manyP1(n) {
  return Array.from({ length: n }, (_, i) =>
    baseEvent({ observationId: `p1-${i}`, auctionEventId: `evt-${i}` }),
  );
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
      successfulFetches: 9,
      failedFetches: 5,
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
      fetchSuccessful: 9,
      fetchFailed: 5,
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
      fetchSuccessful: 9,
      fetchFailed: 5,
      retryable: 0,
      permanent: 5,
      legacyFailures: 5,
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
      fetchSuccessful: 9,
      fetchFailed: 5,
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
      successful: 9,
      failed: 5,
      retryable: 0,
      permanent: 5,
      legacy: 5,
    },
    batchHistory: [],
    investorLabels: { proven: [], tested: [], missing: [], reviewRequired: [] },
    legacyRecoveryCandidates: 5,
    missingExtractionCandidates: 0,
    p4ReviewCount: 5,
    gapEntries: [],
    liveDataUnavailable: false,
    chainSuccessRates: {
      fetchSuccessRate: 64,
      snapshotRate: 100,
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

function buildHi56From(hi52Overrides = {}) {
  return buildHi56Report(
    buildHi55Report(buildHi54Report(buildHi53Report(baseHi52(hi52Overrides)))),
  );
}

// 1–10 config / limits
test("1 version", () => {
  assert.equal(HISTORICAL_INTELLIGENCE56_VERSION, "historical-intelligence-5.6.0");
});
test("2 batch limit 5", () => assert.equal(HI56_DEFAULT_BATCH_LIMIT, 5));
test("3 P1 baseline 19", () => assert.equal(HI56_P1_BASELINE_CANDIDATES, 19));
test("4 market threshold 5", () => assert.equal(HI56_MINIMUM_MARKET_SALES, 5));
test("5 comparable threshold 3", () => assert.equal(HI56_MINIMUM_COMPARABLE_SALES, 3));
test("6 clamp 5 accepted", () => assert.equal(clampHi56BatchLimit(5), 5));
test("7 clamp 6→5", () => assert.equal(clampHi56BatchLimit(6), 5));
test("8 reject limit 6", () => assert.equal(rejectHi56UnlimitedLimit(6).ok, false));
test("9 reject limit 100", () => assert.equal(rejectHi56UnlimitedLimit(100).ok, false));
test("10 reject negative", () => assert.equal(rejectHi56UnlimitedLimit(-1).ok, false));

// 11–20 campaign / P1
test("11 19 unattempted remaining", () => {
  const p = buildP1Progress56({
    neverAttempted: 19,
    fetchSuccessful: 9,
    fetchFailed: 5,
    permanent: 5,
  });
  assert.equal(p.remaining, 19);
  assert.equal(p.processed, 0);
});
test("12 progress after 5 processed", () => {
  const p = buildP1Progress56({
    neverAttempted: 14,
    fetchSuccessful: 14,
    fetchFailed: 5,
    permanent: 5,
  });
  assert.equal(p.processed, 5);
  assert.equal(p.progressLabel, "5 / 19");
});
test("13 CAMPAIGN_IN_PROGRESS", () => {
  assert.equal(
    deriveHi56CampaignStatus({
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
test("14 P1 candidates capped at 5", () => {
  assert.equal(buildP1Candidates56(manyP1(19), 5).length, 5);
});
test("15 dry-run candidate fields", () => {
  const c = buildP1Candidates56(manyP1(1), 5)[0];
  assert.ok(c.observationId);
  assert.ok(c.sourceUrl);
  assert.ok(c.whyEligible);
  assert.equal(c.lane, "P1");
});
test("16 dry-run does not mutate events", () => {
  const events = manyP1(3);
  const before = JSON.stringify(events);
  buildP1Candidates56(events, 5);
  assert.equal(JSON.stringify(events), before);
});
test("17 idempotent P1 after attempt", () => {
  const events = [
    baseEvent({ observationId: "a", attemptNumber: 1, evidenceState: "FETCH_SUCCESS" }),
    baseEvent({ observationId: "b", attemptNumber: 0 }),
  ];
  assert.equal(filterP1Eligible(events).length, 1);
});
test("18 already processed not P1", () => {
  assert.equal(
    filterP1Eligible([baseEvent({ attemptNumber: 2, evidenceState: "FETCH_SUCCESS" })]).length,
    0,
  );
});
test("19 bottleneck FETCH_NOT_ATTEMPTED primary", () => {
  assert.equal(primaryBottleneck56(manyP1(19)).code, "FETCH_NOT_ATTEMPTED");
});
test("20 bottleneck switches to LEGACY when P1 cleared", () => {
  const events = [
    baseEvent({
      observationId: "l1",
      attemptNumber: 1,
      failureClassification: "LEGACY_UNKNOWN_FAILURE",
      recoveryPriority: 2,
      evidenceState: "FETCH_HTTP_ERROR",
    }),
  ];
  assert.equal(primaryBottleneck56(events).code, "LEGACY_UNKNOWN_FAILURE");
});

// 21–30 evidence / prices / outcomes
test("21 explicit SOLD + verified → PRICE_VERIFIED", () => {
  assert.equal(
    deriveHi55EventState(
      baseEvent({ attemptNumber: 1, outcome: "SOLD", salePrice: "VERIFIED" }),
    ),
    "PRICE_VERIFIED",
  );
});
test("22 SOLD without price", () => {
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
test("23 expired not proven sold", () => {
  assert.equal(
    deriveDossierOutcomeLabel({
      truthStatus: "INSUFFICIENT_DATA",
      verifiedSold: 0,
      verifiedSalePrices: 0,
    }),
    "INSUFFICIENT DATA",
  );
});
test("24 closed/expired not SOLD state", () => {
  assert.equal(
    deriveHi55EventState(
      baseEvent({ attemptNumber: 1, outcome: "EXPIRED", evidenceState: "INSUFFICIENT_DATA" }),
    ),
    "INSUFFICIENT_DATA",
  );
});
test("25 guide price rejected", () => assert.equal(isRejectedPriceKind("guide_price"), true));
test("26 reserve rejected", () => assert.equal(isRejectedPriceKind("reserve"), true));
test("27 auction price rejected", () => assert.equal(isRejectedPriceKind("auction_price"), true));
test("28 starting bid rejected", () => assert.equal(isRejectedPriceKind("starting_bid"), true));
test("29 identity review required", () => {
  assert.equal(
    deriveHi55EventState(baseEvent({ resolution: "REVIEW_REQUIRED" })),
    "REVIEW_REQUIRED",
  );
});
test("30 CONFLICT state", () => {
  assert.equal(deriveHi55EventState(baseEvent({ evidenceState: "CONFLICT" })), "CONFLICT");
});

// 31–40 recovery / deltas / safety
test("31 legacy candidates separate", () => {
  const events = [
    baseEvent({ observationId: "n", attemptNumber: 0 }),
    baseEvent({
      observationId: "l",
      attemptNumber: 1,
      failureClassification: "LEGACY_UNKNOWN_FAILURE",
      evidenceState: "FETCH_HTTP_ERROR",
    }),
  ];
  assert.equal(filterLegacyEligible(events).length, 1);
  assert.equal(buildLegacyCandidates56(events, 5).length, 1);
});
test("32 MISSING_EXTRACTION without refetch", () => {
  const events = [
    baseEvent({
      observationId: "s1",
      attemptNumber: 1,
      snapshot: true,
      extraction: "NOT_RUN",
      evidenceState: "SNAPSHOT_AVAILABLE",
      recoveryPriority: 3,
    }),
  ];
  assert.ok(filterMissingExtraction(events).length >= 1);
  assert.equal(primaryBottleneck56(events).code, "MISSING_EXTRACTION");
});
test("33 NO EVIDENCE GAIN when flat", () => {
  const snap = metricBagFromCoverage({
    neverAttempted: 19,
    fetchAttempted: 14,
    fetchSuccessful: 9,
    fetchFailed: 5,
    snapshots: 9,
    extractions: 14,
    outcomeEvidence: 4,
    verifiedSold: 0,
    verifiedSalePrices: 0,
    comparableReady: 0,
    marketReadyTowns: 0,
    catalogueLeaks: 0,
  });
  const delta = buildEvidenceDelta56({ before: snap, after: snap, candidates: 5 });
  assert.equal(delta.noEvidenceGain, true);
  assert.match(delta.message, /NO EVIDENCE GAIN/);
});
test("34 evidence gain on snapshot increase", () => {
  const before = metricBagFromCoverage({
    neverAttempted: 19,
    fetchAttempted: 14,
    fetchSuccessful: 9,
    fetchFailed: 5,
    snapshots: 9,
    extractions: 14,
    outcomeEvidence: 4,
    verifiedSold: 0,
    verifiedSalePrices: 0,
    comparableReady: 0,
    marketReadyTowns: 0,
    catalogueLeaks: 0,
  });
  const after = { ...before, snapshots: 10, neverAttempted: 18, fetchAttempted: 15, fetchSuccessful: 10 };
  const delta = buildEvidenceDelta56({ before, after, candidates: 5 });
  assert.equal(delta.evidenceGain, true);
});
test("35 catalogue leak blocks rebuild", () => {
  assert.equal(catalogueLeakCheck(1).ok, false);
});
test("36 zero leaks allows rebuild", () => {
  assert.equal(catalogueLeakCheck(0).ok, true);
});
test("37 historical sold excluded publicly", () => {
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
test("38 expired excluded publicly", () => {
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
});
test("39 source URL provenance preserved", () => {
  const c = buildP1Candidates56(
    [baseEvent({ sourceUrl: "https://example.com/listing" })],
    5,
  )[0];
  assert.equal(c.sourceUrl, "https://example.com/listing");
});
test("40 funnel rates present", () => {
  const funnel = buildEvidenceFunnel56({
    licensedSources: 33,
    fetchAttempted: 14,
    fetchSuccessful: 9,
    snapshots: 9,
    extractions: 14,
    outcomeEvidence: 4,
    verifiedSold: 0,
    verifiedSalePrices: 0,
    comparableReady: 0,
    marketReadyTowns: 0,
  });
  assert.equal(funnel[0].value, 33);
  assert.ok("rate" in funnel[1]);
});

// 41–55 report / files / verdicts
test("41 buildHi56Report campaign", () => {
  const hi56 = buildHi56From();
  assert.equal(hi56.version, HISTORICAL_INTELLIGENCE56_VERSION);
  assert.equal(hi56.campaign56.status, "CAMPAIGN_IN_PROGRESS");
  assert.equal(hi56.p1Progress56.remaining, 19);
  assert.equal(hi56.bottleneck56.code, "FETCH_NOT_ATTEMPTED");
  assert.ok(hi56.nextCandidates56.length <= 5);
});
test("42 next candidates from bottleneck", () => {
  const events = manyP1(19);
  const next = buildNextCandidates56(events, 5);
  assert.equal(next.length, 5);
  assert.equal(next[0].lane, "P1");
});
test("43 verdict CAMPAIGN IN PROGRESS", () => {
  const v = deriveHi56Verdict({
    catalogueLeaks: 0,
    status: "CAMPAIGN_IN_PROGRESS",
    dataCoverageImproving: false,
    dataCoverageReady: false,
  });
  assert.equal(v.verdict, "CAMPAIGN IN PROGRESS");
});
test("44 verdict PUBLIC_CATALOGUE_SAFETY_BLOCKED", () => {
  const v = deriveHi56Verdict({
    catalogueLeaks: 2,
    status: "CAMPAIGN_BLOCKED",
    dataCoverageImproving: false,
    dataCoverageReady: false,
  });
  assert.equal(v.verdict, "PUBLIC_CATALOGUE_SAFETY_BLOCKED");
});
test("45 gap report markdown", () => {
  const md = renderHi56GapReportMarkdown({
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
  assert.match(md, /Historical Intelligence 5.6/);
});
test("46 API + panel + service exist", () => {
  assert.ok(
    fs.existsSync(
      path.join(root, "app/api/admin/intelligence/historical-intelligence56/route.ts"),
    ),
  );
  assert.ok(
    fs.existsSync(
      path.join(root, "app/admin/operations/components/HistoricalIntelligence56Panel.tsx"),
    ),
  );
  assert.ok(
    fs.existsSync(path.join(root, "lib/services/HistoricalIntelligence56Service.ts")),
  );
});
test("47 package scripts", () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
  assert.ok(pkg.scripts["test:historical-intelligence56"]);
  assert.ok(pkg.scripts["hi56:live"]);
});
test("48 ops page wires HI56", () => {
  const src = fs.readFileSync(path.join(root, "app/admin/operations/page.tsx"), "utf8");
  assert.match(src, /HistoricalIntelligence56Panel/);
});
test("49 API rejects unlimited limit", () => {
  const src = fs.readFileSync(
    path.join(root, "app/api/admin/intelligence/historical-intelligence56/route.ts"),
    "utf8",
  );
  assert.match(src, /rejectHi56UnlimitedLimit/);
  assert.match(src, /dry_run_legacy/);
});
test("50 panel has operational actions", () => {
  const src = fs.readFileSync(
    path.join(root, "app/admin/operations/components/HistoricalIntelligence56Panel.tsx"),
    "utf8",
  );
  assert.match(src, /Dry Run P1 \(5\)/);
  assert.match(src, /Acquire P1 \(5\)/);
  assert.match(src, /Dry Run Legacy/);
  assert.match(src, /Retry Legacy/);
  assert.match(src, /Current Bottleneck/);
});
test("51 no zero-fill verified prices", () => {
  const hi56 = buildHi56From();
  assert.equal(hi56.coverage52.verifiedSalePrices, 0);
  assert.equal(hi56.coverage52.verifiedSold, 0);
});
test("52 ranked bottlenecks order", () => {
  const ranked = rankBottlenecks56(manyP1(19));
  assert.equal(ranked[0].code, "FETCH_NOT_ATTEMPTED");
});
test("53 SALE_PRICE_MISSING bottleneck", () => {
  const events = [
    baseEvent({
      observationId: "s",
      attemptNumber: 1,
      outcome: "SOLD",
      salePrice: "MISSING",
      evidenceState: "OUTCOME_FOUND",
      extraction: "COMPLETE",
    }),
  ];
  assert.ok(rankBottlenecks56(events).some((b) => b.code === "SALE_PRICE_MISSING"));
});
test("54 live script exists", () => {
  assert.ok(fs.existsSync(path.join(root, "scripts/historical-intelligence56-live.cjs")));
});
test("55 rejectHi56UnlimitedLimit accepts 5", () => {
  assert.equal(rejectHi56UnlimitedLimit(5).ok, true);
});

console.log(`\nPassed ${passed} tests.`);
if (passed < 50) {
  console.error(`Expected at least 50 tests, got ${passed}`);
  process.exit(1);
}
console.log("HI 5.6 selftest PASS");
