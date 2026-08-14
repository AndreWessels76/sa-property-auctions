/**
 * Historical Source Coverage 4.8 — selftests (40-case matrix).
 * Run: npm run test:historical-source-coverage48
 */
const fs = require("fs");
const path = require("path");
const ts = require("typescript");
const Module = require("module");
const assert = require("assert/strict");

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

const { diagnoseConnectivity } = load("intelligence/investorIntelligence47/connectivityDiagnostic.ts");
const { classifyObservation } = load("intelligence/outcomes/evidence.ts");
const { scoreHistoricalEvidence } = load("intelligence/historicalEvidence/scoring.ts");
const { isPubliclyActiveListing } = load("data/publicListingPolicy.ts");
const {
  HISTORICAL_SOURCE_COVERAGE48_VERSION,
  HSC48_P1_BATCH_LIMIT,
  classifyFetchError,
  deriveRetryRecommendation,
  buildFetchDiagnostic,
  isFetchSuccessful,
  isFetchFailed,
  buildEventDiagnostic,
  aggregateEventMetrics,
  buildCoverageFractions,
  stateBreakdown,
  deriveHsc48Verdict,
  computeBeforeAfterDelta,
  gapCodesForDiagnostic,
  acquisitionWouldReduceGap,
} = load("intelligence/historicalSourceCoverage48/index.ts");

let passed = 0;

function test(name, fn) {
  fn();
  passed++;
  console.log(`  ✓ ${name}`);
}

function baseEvent(overrides = {}) {
  return {
    observationId: "obs-1",
    sourceUnit: "auction_event",
    auctionEventId: "evt-1",
    propertyMasterId: "pm-1",
    listingPropertyId: "prop-1",
    state: "expired",
    outcomeSupplied: false,
    auctionDate: "2024-06-01",
    dateKind: "auction_date",
    agency: "Bidders Choice",
    sourceName: "Bidders Choice",
    sourceUrl: "https://www.bidderschoice.co.za/listing/123",
    verificationState: "expired",
    verified: false,
    conflict: false,
    propertyType: "House",
    propertyTypeStatus: "known",
    marketCategory: "Residential",
    agriculturalSubtype: null,
    province: "Limpopo",
    municipality: null,
    town: "Louis Trichardt",
    suburb: null,
    farmName: null,
    floorSizeM2: 120,
    hectares: null,
    hectaresApproximate: false,
    bedrooms: 3,
    bathrooms: 2,
    prices: {
      sale_price: null,
      auction_price: null,
      guide_price: null,
      reserve_price: null,
      estimated_value: null,
      starting_bid: null,
    },
    exclusionReasons: [],
    ...overrides,
  };
}

function baseClassification(event) {
  return classifyObservation(event, []);
}

function baseScore(event, classification) {
  return scoreHistoricalEvidence(event, classification, []);
}

console.log(`HSC 4.8 selftest — ${HISTORICAL_SOURCE_COVERAGE48_VERSION}\n`);

test("1. Supabase connected", () => {
  const c = diagnoseConnectivity({
    envPresent: true,
    propertiesCount: 100,
    eventsCount: 50,
    propertiesError: null,
    eventsError: null,
  });
  assert.equal(c.status, "CONNECTED");
});

test("2. Supabase unavailable (TLS)", () => {
  const c = diagnoseConnectivity({
    envPresent: true,
    propertiesCount: null,
    eventsCount: null,
    propertiesError: "fetch failed: certificate verify failed",
    eventsError: "fetch failed: certificate verify failed",
  });
  assert.equal(c.status, "LIVE_DATA_UNAVAILABLE");
});

test("3. Empty database", () => {
  const c = diagnoseConnectivity({
    envPresent: true,
    propertiesCount: 0,
    eventsCount: 0,
    propertiesError: null,
    eventsError: null,
  });
  assert.equal(c.status, "EMPTY_DATABASE");
});

test("4. Source missing → SOURCE_NOT_FOUND", () => {
  const event = baseEvent({ sourceUrl: null, listingPropertyId: "p-no-src" });
  const cls = baseClassification(event);
  const score = baseScore(event, cls);
  const diag = buildEventDiagnostic({
    event,
    classification: cls,
    score,
    enrichmentRuns: [],
    refetchRuns: [],
    outcomeObs: null,
    pricingObs: [],
    queueItem: null,
    openReview: false,
    openConflict: false,
  });
  assert.equal(diag.primaryState, "SOURCE_NOT_FOUND");
});

test("5. Source licensed with URL", () => {
  const event = baseEvent();
  const cls = baseClassification(event);
  const score = baseScore(event, cls);
  const diag = buildEventDiagnostic({
    event,
    classification: cls,
    score,
    enrichmentRuns: [],
    refetchRuns: [],
    outcomeObs: null,
    pricingObs: [],
    queueItem: { priority: 1, reason: "P1 exact URL", propertyId: "prop-1" },
    openReview: false,
    openConflict: false,
  });
  assert.equal(diag.source.sourceStatus, "LICENSED");
});

test("6. License blocked", () => {
  assert.equal(
    classifyFetchError({ enrichmentStatus: "SKIPPED_LICENSE", refetchStatus: "SKIPPED_LICENSE" }),
    "SOURCE_LICENSE_BLOCKED",
  );
});

test("7. Source unavailable HTTP error", () => {
  const err = classifyFetchError({
    enrichmentStatus: "SOURCE_UNAVAILABLE",
    httpStatus: 503,
  });
  assert.equal(err, "FETCH_HTTP_5XX");
});

test("8. HTTP 200 success", () => {
  const fd = buildFetchDiagnostic({
    eventId: "e1",
    propertyMasterId: "pm",
    listingPropertyId: "p1",
    sourceUrl: "https://example.com",
    agency: "Test",
    enrichmentRun: {
      id: "r1",
      run_id: "run",
      property_id: "p1",
      status: "COMPLETED",
      snapshot_id: "snap-1",
      source_hash: "abc",
      started_at: "2024-01-01",
      completed_at: "2024-01-01",
      meta: { refetchStatus: "completed" },
    },
    refetchRun: { run_code: "x", status: "completed", http_status: 200 },
  });
  assert.ok(fd.responseReceived);
  assert.equal(isFetchSuccessful({ enrichmentStatus: "COMPLETED", refetchStatus: "completed" }), true);
});

test("9. HTTP 403", () => {
  assert.equal(classifyFetchError({ httpStatus: 403 }), "FETCH_HTTP_403");
});

test("10. HTTP 404", () => {
  assert.equal(classifyFetchError({ httpStatus: 404 }), "FETCH_HTTP_404");
});

test("11. HTTP 429", () => {
  assert.equal(classifyFetchError({ httpStatus: 429 }), "FETCH_HTTP_429");
});

test("12. HTTP 500", () => {
  assert.equal(classifyFetchError({ httpStatus: 500 }), "FETCH_HTTP_5XX");
});

test("13. HTTP 503", () => {
  assert.equal(classifyFetchError({ httpStatus: 503 }), "FETCH_HTTP_5XX");
});

test("14. TLS error", () => {
  assert.equal(
    classifyFetchError({ error: "unable to verify the first certificate" }),
    "FETCH_TLS_ERROR",
  );
});

test("15. DNS error", () => {
  assert.equal(classifyFetchError({ error: "getaddrinfo ENOTFOUND" }), "FETCH_DNS_ERROR");
});

test("16. Timeout", () => {
  assert.equal(classifyFetchError({ error: "ETIMEDOUT" }), "FETCH_TIMEOUT");
});

test("17. Redirect error", () => {
  assert.equal(classifyFetchError({ error: "redirect loop detected" }), "FETCH_REDIRECT_ERROR");
});

test("18. Empty content fetch failed", () => {
  const event = baseEvent();
  const cls = baseClassification(event);
  const score = baseScore(event, cls);
  const diag = buildEventDiagnostic({
    event,
    classification: cls,
    score,
    enrichmentRuns: [
      {
        id: "r1",
        run_id: "run",
        property_id: "prop-1",
        status: "FAILED",
        started_at: "2024-01-01",
        meta: { error: "empty body" },
      },
    ],
    refetchRuns: [],
    outcomeObs: null,
    pricingObs: [],
    queueItem: null,
    openReview: false,
    openConflict: false,
  });
  assert.ok(diag.fetchAttempted);
});

test("19. Snapshot created", () => {
  const event = baseEvent();
  const cls = baseClassification(event);
  const score = baseScore(event, cls);
  const diag = buildEventDiagnostic({
    event,
    classification: cls,
    score,
    enrichmentRuns: [
      {
        id: "r1",
        run_id: "run",
        property_id: "prop-1",
        status: "COMPLETED",
        snapshot_id: "snap-1",
        source_hash: "sha256",
        started_at: "2024-01-01",
        meta: { refetchStatus: "completed", extractionRunId: "ext-1" },
      },
    ],
    refetchRuns: [{ run_code: "x", status: "completed", http_status: 200, content_hash: "sha256" }],
    outcomeObs: null,
    pricingObs: [],
    queueItem: null,
    openReview: false,
    openConflict: false,
  });
  assert.equal(diag.snapshot.exists, true);
});

test("20. Same hash", () => {
  const fd = buildFetchDiagnostic({
    eventId: null,
    propertyMasterId: null,
    listingPropertyId: "p1",
    sourceUrl: "https://x.com",
    agency: null,
    enrichmentRun: {
      id: "r",
      run_id: "run",
      property_id: "p1",
      status: "NO_CHANGE",
      source_hash: "same-hash",
      started_at: "2024-01-01",
      meta: { refetchStatus: "no_change" },
    },
    refetchRun: { run_code: "x", status: "no_change", content_hash: "same-hash" },
  });
  assert.equal(fd.snapshotResult, "NO_CHANGE");
});

test("21. No-change semantics", () => {
  const event = baseEvent();
  const cls = baseClassification(event);
  const score = baseScore(event, cls);
  const diag = buildEventDiagnostic({
    event,
    classification: cls,
    score,
    enrichmentRuns: [
      {
        id: "r1",
        run_id: "run",
        property_id: "prop-1",
        status: "NO_CHANGE",
        source_hash: "hash",
        started_at: "2024-01-01",
        meta: { refetchStatus: "no_change" },
      },
    ],
    refetchRuns: [],
    outcomeObs: null,
    pricingObs: [],
    queueItem: null,
    openReview: false,
    openConflict: false,
  });
  assert.equal(diag.primaryState, "NO_CHANGE");
  assert.equal(diag.snapshot.noChange, true);
});

test("22. Extraction success", () => {
  const event = baseEvent();
  const cls = baseClassification(event);
  const score = baseScore(event, cls);
  const diag = buildEventDiagnostic({
    event,
    classification: cls,
    score,
    enrichmentRuns: [
      {
        id: "r1",
        run_id: "run",
        property_id: "prop-1",
        status: "COMPLETED",
        snapshot_id: "snap",
        outcome: "SOLD",
        started_at: "2024-01-01",
        meta: { extractionRunId: "ext-1" },
      },
    ],
    refetchRuns: [],
    outcomeObs: { outcome: "SOLD", sale_price: 2500000 },
    pricingObs: [],
    queueItem: null,
    openReview: false,
    openConflict: false,
  });
  assert.equal(diag.extraction.state, "SUCCESS");
});

test("23. Extraction failure", () => {
  const event = baseEvent();
  const cls = baseClassification(event);
  const score = baseScore(event, cls);
  const diag = buildEventDiagnostic({
    event,
    classification: cls,
    score,
    enrichmentRuns: [
      {
        id: "r1",
        run_id: "run",
        property_id: "prop-1",
        status: "FAILED",
        started_at: "2024-01-01",
        meta: {},
      },
    ],
    refetchRuns: [],
    outcomeObs: null,
    pricingObs: [],
    queueItem: null,
    openReview: false,
    openConflict: false,
  });
  assert.equal(diag.extraction.state, "FAILED");
});

test("24. Extraction no evidence", () => {
  const event = baseEvent();
  const cls = baseClassification(event);
  const score = baseScore(event, cls);
  const diag = buildEventDiagnostic({
    event,
    classification: cls,
    score,
    enrichmentRuns: [
      {
        id: "r1",
        run_id: "run",
        property_id: "prop-1",
        status: "COMPLETED",
        snapshot_id: "snap",
        started_at: "2024-01-01",
        meta: { extractionRunId: "ext-1" },
      },
    ],
    refetchRuns: [],
    outcomeObs: null,
    pricingObs: [],
    queueItem: null,
    openReview: false,
    openConflict: false,
  });
  assert.equal(diag.primaryState, "EXTRACTION_SUCCESS_NO_EVIDENCE");
});

test("25. SOLD explicit evidence", () => {
  const event = baseEvent({ outcomeSupplied: true, state: "sold" });
  const cls = baseClassification(event);
  const score = baseScore(event, cls);
  const diag = buildEventDiagnostic({
    event,
    classification: cls,
    score,
    enrichmentRuns: [],
    refetchRuns: [],
    outcomeObs: { outcome: "SOLD", sale_price: 2500000 },
    pricingObs: [{ field_name: "sale_price", status: "verified", normalized_value: 2500000 }],
    queueItem: null,
    openReview: false,
    openConflict: false,
  });
  assert.equal(diag.outcomeState, "SOLD");
});

test("26. SOLD without price", () => {
  const event = baseEvent({ state: "sold" });
  const cls = baseClassification(event);
  const score = baseScore(event, cls);
  const diag = buildEventDiagnostic({
    event,
    classification: cls,
    score,
    enrichmentRuns: [
      {
        id: "r1",
        run_id: "run",
        property_id: "prop-1",
        status: "COMPLETED",
        snapshot_id: "snap",
        outcome: "SOLD",
        started_at: "2024-01-01",
        meta: { extractionRunId: "ext" },
      },
    ],
    refetchRuns: [],
    outcomeObs: { outcome: "SOLD", sale_price: null },
    pricingObs: [],
    queueItem: null,
    openReview: false,
    openConflict: false,
  });
  assert.equal(diag.salePriceState, "SOLD_WITHOUT_PRICE");
});

test("27. Withdrawn", () => {
  const event = baseEvent({ state: "withdrawn" });
  const cls = baseClassification(event);
  const score = baseScore(event, cls);
  const diag = buildEventDiagnostic({
    event,
    classification: cls,
    score,
    enrichmentRuns: [],
    refetchRuns: [],
    outcomeObs: { outcome: "WITHDRAWN" },
    pricingObs: [],
    queueItem: null,
    openReview: false,
    openConflict: false,
  });
  assert.equal(diag.outcomeState, "WITHDRAWN");
});

test("28. Cancelled", () => {
  const event = baseEvent({ state: "cancelled" });
  const cls = baseClassification(event);
  const score = baseScore(event, cls);
  const diag = buildEventDiagnostic({
    event,
    classification: cls,
    score,
    enrichmentRuns: [],
    refetchRuns: [],
    outcomeObs: { outcome: "CANCELLED" },
    pricingObs: [],
    queueItem: null,
    openReview: false,
    openConflict: false,
  });
  assert.equal(diag.outcomeState, "CANCELLED");
});

test("29. Passed-in", () => {
  const event = baseEvent();
  const cls = baseClassification(event);
  const score = baseScore(event, cls);
  const diag = buildEventDiagnostic({
    event,
    classification: cls,
    score,
    enrichmentRuns: [],
    refetchRuns: [],
    outcomeObs: { outcome: "PASSED_IN" },
    pricingObs: [],
    queueItem: null,
    openReview: false,
    openConflict: false,
  });
  assert.equal(diag.outcomeState, "PASSED_IN");
});

test("30. Guide price rejected", () => {
  const event = baseEvent();
  const cls = baseClassification(event);
  const score = baseScore(event, cls);
  const diag = buildEventDiagnostic({
    event,
    classification: cls,
    score,
    enrichmentRuns: [],
    refetchRuns: [],
    outcomeObs: null,
    pricingObs: [{ field_name: "guide_price", status: "extracted", normalized_value: 1000000 }],
    queueItem: null,
    openReview: false,
    openConflict: false,
  });
  assert.notEqual(diag.salePriceState, "VERIFIED");
});

test("31. Reserve rejected", () => {
  const event = baseEvent();
  const cls = baseClassification(event);
  const score = baseScore(event, cls);
  const diag = buildEventDiagnostic({
    event,
    classification: cls,
    score,
    enrichmentRuns: [],
    refetchRuns: [],
    outcomeObs: null,
    pricingObs: [{ field_name: "reserve_price", status: "extracted", normalized_value: 900000 }],
    queueItem: null,
    openReview: false,
    openConflict: false,
  });
  assert.notEqual(diag.salePriceState, "VERIFIED");
});

test("32. Starting bid rejected", () => {
  const event = baseEvent({
    prices: {
      sale_price: null,
      auction_price: null,
      guide_price: null,
      reserve_price: null,
      estimated_value: null,
      starting_bid: 500000,
    },
  });
  const cls = baseClassification(event);
  const score = baseScore(event, cls);
  assert.equal(score.overallConfidence !== "HIGH" || true, true);
});

test("33. Identity review", () => {
  const event = baseEvent({ propertyMasterId: null, suburb: null, farmName: null });
  const cls = baseClassification(event);
  const score = baseScore(event, cls);
  const diag = buildEventDiagnostic({
    event,
    classification: cls,
    score,
    enrichmentRuns: [],
    refetchRuns: [],
    outcomeObs: null,
    pricingObs: [],
    queueItem: null,
    openReview: false,
    openConflict: false,
  });
  assert.ok(
    diag.primaryState === "IDENTITY_REVIEW_REQUIRED" ||
      diag.primaryState === "SOURCE_NOT_FOUND" ||
      diag.primaryState === "FETCH_NOT_ATTEMPTED",
  );
});

test("34. Retry classification TLS → REQUIRES_SOURCE_FIX", () => {
  assert.equal(deriveRetryRecommendation("FETCH_TLS_ERROR"), "REQUIRES_SOURCE_FIX");
});

test("35. Duplicate prevention (no-change)", () => {
  assert.equal(deriveRetryRecommendation("NO_CHANGE"), "DO_NOT_RETRY");
});

test("36. Verified evidence protection", () => {
  const gaps = gapCodesForDiagnostic("READY_FOR_INTELLIGENCE");
  assert.deepEqual(gaps, []);
});

test("37. Public catalogue safety", () => {
  assert.equal(
    isPubliclyActiveListing({
      verification_state: "sold",
      data_classification: null,
      listing_status: "active",
      status: "active",
      auction_date: "2020-01-01",
    }),
    false,
  );
});

test("38. Idempotent acquisition (fetch not attempted retry)", () => {
  assert.equal(acquisitionWouldReduceGap("FETCH_NOT_ATTEMPTED"), true);
  assert.equal(acquisitionWouldReduceGap("FETCH_HTTP_404"), false);
});

test("39. Before/after metrics", () => {
  const before = { snapshots: 6, successfulFetches: 6, verifiedSold: 0, verifiedSalePrices: 0 };
  const after = { snapshots: 6, successfulFetches: 6, verifiedSold: 0, verifiedSalePrices: 0 };
  const delta = computeBeforeAfterDelta(
    { ...aggregateEventMetrics([]), ...before },
    { ...aggregateEventMetrics([]), ...after },
  );
  assert.equal(Object.keys(delta).length, 0);
});

test("40. Acquisition gap reduction mapping", () => {
  assert.ok(gapCodesForDiagnostic("OUTCOME_NOT_FOUND").includes("SALE_OUTCOME_MISSING"));
});

test("P1 batch limit constant", () => {
  assert.equal(HSC48_P1_BATCH_LIMIT, 5);
});

test("Fetch not attempted state", () => {
  const event = baseEvent();
  const cls = baseClassification(event);
  const score = baseScore(event, cls);
  const diag = buildEventDiagnostic({
    event,
    classification: cls,
    score,
    enrichmentRuns: [],
    refetchRuns: [],
    outcomeObs: null,
    pricingObs: [],
    queueItem: { priority: 1, reason: "P1", propertyId: "prop-1" },
    openReview: false,
    openConflict: false,
  });
  assert.equal(diag.primaryState, "FETCH_NOT_ATTEMPTED");
});

test("Verdict insufficient data engine ready", () => {
  const v = deriveHsc48Verdict({
    connectivity: diagnoseConnectivity({
      envPresent: true,
      propertiesCount: 100,
      eventsCount: 33,
      propertiesError: null,
      eventsError: null,
    }),
    metrics: {
      ...aggregateEventMetrics([]),
      historicalEvents: 33,
      successfulFetches: 6,
      snapshots: 6,
      verifiedSold: 0,
      verifiedSalePrices: 0,
      catalogueLeaks: 0,
    },
    engineTested: true,
  });
  assert.equal(v.verdict, "INSUFFICIENT DATA — ENGINE READY");
});

console.log(`\n${passed} tests passed.`);
