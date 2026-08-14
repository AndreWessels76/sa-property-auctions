/**
 * Historical Intelligence 5.3 — selftests (60+ cases).
 * Run: npm run test:historical-intelligence53
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

console.log(`HI 5.3 selftest — historical-intelligence-5.3.0\n`);

const { diagnoseConnectivityExtended } = load(
  "intelligence/historicalSourceCoverage48/connectivityExtended.ts",
);
const { classifyFetchFailure } = load(
  "intelligence/historicalSourceCoverage48/fetchErrorClassification.ts",
);
const { isPubliclyActiveListing } = load("data/publicListingPolicy.ts");
const { extractOutcomeFromText } = load("acquisition/outcomes/outcomeExtractor.ts");
const { classifyFailureMetadata } = load("intelligence/historicalIntelligence50/index.ts");
const {
  filterP1Eligible,
  filterLegacyEligible,
  filterMissingExtraction,
  buildP1DryRunCandidates,
  buildLegacyDryRunCandidates52,
  buildExtractionDryRunCandidates,
  clampBatchLimit: clamp52,
} = load("intelligence/historicalIntelligence52/index.ts");
const {
  HISTORICAL_INTELLIGENCE53_VERSION,
  HI53_DEFAULT_BATCH_LIMIT,
  HI53_MAX_BATCH_LIMIT,
  HI53_MINIMUM_MARKET_SALES,
  HI53_MINIMUM_COMPARABLE_SALES,
  deriveCampaignStatus,
  buildCampaignProgress,
  buildP1CampaignStats,
  buildBatchPlan,
  buildEvidenceFunnel,
  renderFunnelText,
  buildExplicitCampaignDelta,
  withNeverAttempted,
  rankBottlenecks53,
  primaryBottleneck53,
  buildReviewQueue,
  buildHi53Report,
  renderHi53GapReportMarkdown,
} = load("intelligence/historicalIntelligence53/index.ts");

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

test("1 version", () => {
  assert.equal(HISTORICAL_INTELLIGENCE53_VERSION, "historical-intelligence-5.3.0");
});

test("2 batch limit 5", () => {
  assert.equal(HI53_DEFAULT_BATCH_LIMIT, 5);
  assert.equal(HI53_MAX_BATCH_LIMIT, 5);
});

test("3 market threshold 5", () => {
  assert.equal(HI53_MINIMUM_MARKET_SALES, 5);
});

test("4 comparable threshold 3", () => {
  assert.equal(HI53_MINIMUM_COMPARABLE_SALES, 3);
});

test("5 P1 candidate selection", () => {
  assert.equal(filterP1Eligible([baseEvent(), baseEvent({ observationId: "x", attemptNumber: 1, evidenceState: "FETCH_SUCCESS" })]).length, 1);
});

test("6 P1 batch limit", () => {
  const events = Array.from({ length: 12 }, (_, i) => baseEvent({ observationId: `o${i}` }));
  assert.equal(buildP1DryRunCandidates(events, 5).length, 5);
});

test("7 P1 ordering stable", () => {
  const events = [baseEvent({ observationId: "a" }), baseEvent({ observationId: "b" })];
  assert.deepEqual(
    buildP1DryRunCandidates(events, 5).map((c) => c.observationId),
    buildP1DryRunCandidates(events, 5).map((c) => c.observationId),
  );
});

test("8 dry-run candidates no write flag in expected action acquire", () => {
  const c = buildP1DryRunCandidates([baseEvent()], 5)[0];
  assert.ok(c.expectedAction.includes("Acquire"));
});

test("9 clamp batch max 5 from hi52", () => {
  assert.equal(clamp52(99), 5);
});

test("10 campaign not started", () => {
  assert.equal(
    deriveCampaignStatus({
      catalogueLeaks: 0,
      historicalEvents: 33,
      neverAttempted: 33,
      fetchAttempted: 0,
      verifiedSalePrices: 0,
      verifiedSold: 0,
    }),
    "CAMPAIGN_NOT_STARTED",
  );
});

test("11 campaign in progress", () => {
  assert.equal(
    deriveCampaignStatus({
      catalogueLeaks: 0,
      historicalEvents: 33,
      neverAttempted: 20,
      fetchAttempted: 13,
      verifiedSalePrices: 0,
      verifiedSold: 0,
    }),
    "CAMPAIGN_IN_PROGRESS",
  );
});

test("12 campaign partially covered", () => {
  assert.equal(
    deriveCampaignStatus({
      catalogueLeaks: 0,
      historicalEvents: 33,
      neverAttempted: 0,
      fetchAttempted: 33,
      verifiedSalePrices: 0,
      verifiedSold: 0,
    }),
    "CAMPAIGN_PARTIALLY_COVERED",
  );
});

test("13 campaign data covered", () => {
  assert.equal(
    deriveCampaignStatus({
      catalogueLeaks: 0,
      historicalEvents: 33,
      neverAttempted: 0,
      fetchAttempted: 33,
      verifiedSalePrices: 5,
      verifiedSold: 5,
    }),
    "CAMPAIGN_DATA_COVERED",
  );
});

test("14 campaign blocked on leaks", () => {
  assert.equal(
    deriveCampaignStatus({
      catalogueLeaks: 1,
      historicalEvents: 33,
      neverAttempted: 20,
      fetchAttempted: 13,
      verifiedSalePrices: 0,
      verifiedSold: 0,
    }),
    "CAMPAIGN_BLOCKED",
  );
});

test("15 progress bar length 20", () => {
  const p = buildCampaignProgress({
    historicalEvents: 33,
    neverAttempted: 20,
    fetchAttempted: 13,
    fetchSuccessful: 9,
    fetchFailed: 4,
    catalogueLeaks: 0,
    verifiedSalePrices: 0,
    verifiedSold: 0,
  });
  assert.equal(p.progressBar.length, 20);
  assert.equal(p.status, "CAMPAIGN_IN_PROGRESS");
});

test("16 batch plan for 20 remaining", () => {
  const plan = buildBatchPlan({ remaining: 20 });
  assert.equal(plan.length, 4);
  assert.equal(plan[0].status, "next");
  assert.equal(plan[0].size, 5);
  assert.equal(plan[3].remainingAfter, 0);
});

test("17 batch plan dynamic remaining 7", () => {
  const plan = buildBatchPlan({ remaining: 7 });
  assert.equal(plan.length, 2);
  assert.equal(plan[0].size, 5);
  assert.equal(plan[1].size, 2);
});

test("18 P1 campaign stats", () => {
  const s = buildP1CampaignStats({
    neverAttempted: 20,
    fetchSuccessful: 9,
    fetchFailed: 4,
    retryable: 0,
    permanent: 4,
  });
  assert.equal(s.remaining, 20);
  assert.equal(s.plannedBatches, 4);
});

test("19 funnel steps order", () => {
  const f = buildEvidenceFunnel({
    historicalEvents: 33,
    licensedSources: 33,
    fetchAttempted: 13,
    fetchSuccessful: 9,
    snapshots: 4,
    extractions: 9,
    outcomeEvidence: 2,
    verifiedSold: 0,
    verifiedSalePrices: 0,
  });
  assert.equal(f[0].key, "historicalEvents");
  assert.equal(f[f.length - 1].key, "verifiedSalePrices");
  assert.equal(f.length, 9);
});

test("20 funnel text includes arrows", () => {
  const text = renderFunnelText(
    buildEvidenceFunnel({
      historicalEvents: 33,
      licensedSources: 33,
      fetchAttempted: 13,
      fetchSuccessful: 9,
      snapshots: 4,
      extractions: 9,
      outcomeEvidence: 2,
      verifiedSold: 0,
      verifiedSalePrices: 0,
    }),
  );
  assert.ok(text.includes("↓"));
});

test("21 explicit delta never hides zeros", () => {
  const before = withNeverAttempted(
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
  const delta = buildExplicitCampaignDelta({ before, after: before });
  assert.equal(delta.changes.length, 10);
  assert.ok(delta.lines.every((l) => l.includes("(0)")));
  assert.equal(delta.improved, false);
});

test("22 explicit delta shows improvement", () => {
  const before = withNeverAttempted(
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
  const after = withNeverAttempted({ ...before, fetchAttempted: 18, fetchSuccessful: 12, snapshots: 7 }, 15);
  const delta = buildExplicitCampaignDelta({ before, after });
  assert.ok(delta.lines.some((l) => l.includes("20 → 15")));
  assert.equal(delta.improved, true);
});

test("23 bottleneck FETCH_NOT_ATTEMPTED first", () => {
  const events = Array.from({ length: 10 }, (_, i) => baseEvent({ observationId: `p${i}` }));
  assert.equal(primaryBottleneck53(events).code, "FETCH_NOT_ATTEMPTED");
});

test("24 bottleneck ranking includes legacy", () => {
  const ranked = rankBottlenecks53([
    baseEvent({
      failureClassification: "LEGACY_UNKNOWN_FAILURE",
      attemptNumber: 1,
      evidenceState: "FETCH_HTTP_ERROR",
    }),
  ]);
  assert.ok(ranked.some((r) => r.code === "LEGACY_UNKNOWN_FAILURE"));
});

test("25 legacy filter", () => {
  assert.equal(
    filterLegacyEligible([
      baseEvent({ failureClassification: "LEGACY_UNKNOWN_FAILURE", attemptNumber: 1 }),
    ]).length,
    1,
  );
});

test("26 legacy dry-run", () => {
  const c = buildLegacyDryRunCandidates52(
    [baseEvent({ failureClassification: "LEGACY_UNKNOWN_FAILURE", attemptNumber: 1 })],
    5,
  );
  assert.equal(c.length, 1);
});

test("27 missing extraction filter", () => {
  assert.equal(
    filterMissingExtraction([
      baseEvent({ snapshot: true, extraction: "NOT_RUN", evidenceState: "SNAPSHOT_AVAILABLE" }),
    ]).length,
    1,
  );
});

test("28 extraction dry-run no refetch", () => {
  const c = buildExtractionDryRunCandidates(
    [baseEvent({ snapshot: true, extraction: "NOT_RUN", evidenceState: "SNAPSHOT_AVAILABLE" })],
    5,
  )[0];
  assert.ok(c.expectedAction.includes("no refetch"));
});

test("29 HTTP 503 retryable", () => {
  assert.equal(classifyFetchFailure({ httpStatus: 503 }).retryable, true);
});

test("30 HTTP 404 permanent", () => {
  assert.equal(classifyFetchFailure({ httpStatus: 404 }).retryable, false);
});

test("31 network error", () => {
  assert.equal(classifyFetchFailure({ error: "fetch failed" }).errorCode, "CONNECTION_ERROR");
});

test("32 TLS error", () => {
  assert.equal(classifyFetchFailure({ error: "certificate TLS failed" }).errorCode, "TLS_ERROR");
});

test("33 timeout", () => {
  assert.equal(classifyFetchFailure({ error: "timeout ETIMEDOUT" }).errorCode, "TIMEOUT");
});

test("34 DNS error", () => {
  assert.equal(classifyFetchFailure({ error: "getaddrinfo ENOTFOUND" }).errorCode, "DNS_ERROR");
});

test("35 legacy metadata", () => {
  assert.equal(
    classifyFailureMetadata({
      enrichmentRun: { meta: {} },
      fetchAttempted: true,
      fetchSuccessful: false,
      httpStatus: null,
    }),
    "LEGACY_UNKNOWN_FAILURE",
  );
});

test("36 guide price rejected", () => {
  const out = extractOutcomeFromText("Guide price R 500 000", {
    source_url: "https://x.com",
    source_name: "BC",
  });
  assert.ok(!out || out.salePrice == null);
});

test("37 reserve rejected", () => {
  const out = extractOutcomeFromText("Reserve R 800 000", {
    source_url: "https://x.com",
    source_name: "BC",
  });
  assert.ok(!out || out.salePrice == null);
});

test("38 auction price rejected", () => {
  const out = extractOutcomeFromText("Opening bid R 100 000", {
    source_url: "https://x.com",
    source_name: "BC",
  });
  assert.ok(!out || out.salePrice == null);
});

test("39 identity review in queue", () => {
  const q = buildReviewQueue([baseEvent({ resolution: "REVIEW_REQUIRED" })]);
  assert.ok(q.some((i) => i.category === "identity"));
});

test("40 sale price review in queue", () => {
  const q = buildReviewQueue([baseEvent({ outcome: "SOLD", salePrice: "MISSING" })]);
  assert.ok(q.some((i) => i.category === "sale_price"));
});

test("41 conflict in queue", () => {
  const q = buildReviewQueue([baseEvent({ evidenceState: "CONFLICT", outcome: "CONFLICT" })]);
  assert.ok(q.some((i) => i.category === "source_conflict"));
});

test("42 source unavailable in queue", () => {
  const q = buildReviewQueue([
    baseEvent({ recoveryPriority: 4, attemptNumber: 1, evidenceState: "FETCH_BLOCKED" }),
  ]);
  assert.ok(q.some((i) => i.category === "source_unavailable"));
});

test("43 catalogue sold excluded", () => {
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

test("44 catalogue expired excluded", () => {
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

test("45 catalogue withdrawn excluded", () => {
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

test("46 connectivity unavailable", () => {
  assert.equal(
    diagnoseConnectivityExtended({
      envPresent: true,
      propertiesCount: null,
      eventsCount: null,
      propertiesError: "fetch failed",
      eventsError: null,
    }).extendedStatus,
    "LIVE_DATA_UNAVAILABLE",
  );
});

test("47 empty database", () => {
  assert.equal(
    diagnoseConnectivityExtended({
      envPresent: true,
      propertiesCount: 0,
      eventsCount: 0,
      propertiesError: null,
      eventsError: null,
    }).extendedStatus,
    "EMPTY_DATABASE",
  );
});

test("48 buildHi53Report composes campaign", () => {
  const report = buildHi53Report(baseHi52());
  assert.equal(report.version, HISTORICAL_INTELLIGENCE53_VERSION);
  assert.equal(report.campaign.status, "CAMPAIGN_IN_PROGRESS");
  assert.equal(report.evidenceFunnel.length, 9);
  assert.ok(report.catalogueSafe);
});

test("49 buildHi53 blocks on leaks", () => {
  const report = buildHi53Report(
    baseHi52({
      coverage52: {
        ...baseHi52().coverage52,
        catalogueLeaks: 2,
      },
    }),
  );
  assert.equal(report.catalogueSafe, false);
  assert.ok(report.nextAdminAction.includes("PUBLIC SAFETY"));
});

test("50 gap report markdown", () => {
  const md = renderHi53GapReportMarkdown({
    generatedAt: "2026-01-01",
    entries: [
      {
        eventId: "e1",
        property: "Farm X",
        town: "Town",
        currentState: "FETCH_ELIGIBLE_P1",
        nextAction: "ACQUIRE",
        group: "P1",
      },
    ],
  });
  assert.ok(md.includes("Farm X"));
  assert.ok(md.includes("P1"));
});

test("51 API route exists", () => {
  assert.ok(
    fs.existsSync(path.join(root, "app/api/admin/intelligence/historical-intelligence53/route.ts")),
  );
});

test("52 panel exists", () => {
  assert.ok(
    fs.existsSync(
      path.join(root, "app/admin/operations/components/HistoricalIntelligence53Panel.tsx"),
    ),
  );
});

test("53 service exists", () => {
  assert.ok(fs.existsSync(path.join(root, "lib/services/HistoricalIntelligence53Service.ts")));
});

test("54 live script exists", () => {
  assert.ok(fs.existsSync(path.join(root, "scripts/historical-intelligence53-live.cjs")));
});

test("55 duplicate prevention — dry run idempotent", () => {
  const events = [baseEvent({ observationId: "a" }), baseEvent({ observationId: "b" })];
  assert.deepEqual(buildP1DryRunCandidates(events, 5), buildP1DryRunCandidates(events, 5));
});

test("56 review queue never drops source unavailable", () => {
  const q = buildReviewQueue([
    baseEvent({
      observationId: "perm",
      recoveryPriority: 4,
      attemptNumber: 2,
      evidenceState: "FETCH_BLOCKED",
    }),
  ]);
  assert.ok(q.length >= 1);
});

test("57 outcome missing review", () => {
  const q = buildReviewQueue([
    baseEvent({
      extraction: "SUCCESS",
      outcome: "UNKNOWN",
      evidenceState: "EXTRACTION_AVAILABLE",
      attemptNumber: 1,
    }),
  ]);
  assert.ok(q.some((i) => i.category === "outcome"));
});

test("58 HTTP 429 retryable", () => {
  assert.equal(classifyFetchFailure({ httpStatus: 429 }).retryable, true);
});

test("59 HTTP 403 not retryable", () => {
  assert.equal(classifyFetchFailure({ httpStatus: 403 }).retryable, false);
});

test("60 SALE_PRICE_MISSING bottleneck when SOLD without price", () => {
  const ranked = rankBottlenecks53([
    baseEvent({
      observationId: "sold",
      attemptNumber: 1,
      evidenceState: "OUTCOME_FOUND",
      outcome: "SOLD",
      salePrice: "MISSING",
      recoveryPriority: 3,
    }),
  ]);
  assert.ok(ranked.some((r) => r.code === "SALE_PRICE_MISSING"));
});

test("61 empty batch plan when remaining 0", () => {
  assert.deepEqual(buildBatchPlan({ remaining: 0 }), []);
});

test("62 report labels insufficient data when no sale prices", () => {
  const report = buildHi53Report(baseHi52());
  assert.ok(report.reportLabels.insufficientData.length > 0);
  assert.ok(report.reportLabels.stillMissing.some((l) => l.includes("verified sale")));
});

console.log(`\n${passed} tests passed.`);
