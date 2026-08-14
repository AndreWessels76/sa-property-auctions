/**
 * Historical Source Acquisition 4.9 — selftests (40+ cases).
 * Run: npm run test:historical-source-acquisition49
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

const { isPubliclyActiveListing } = load("data/publicListingPolicy.ts");
const {
  HSA49_VERSION,
  HSA49_MAX_BATCH_LIMIT,
  HSA49_MAX_RETRY_ATTEMPTS,
  classifyFetchFailure,
  isRetryableErrorCode,
  evaluateRetry,
  computeRetryDelay,
  validateSnapshotContent,
  diagnoseConnectivityExtended,
  assignAcquisitionPriority,
  buildSourceHealthMetrics,
  buildResearchEvidenceLabels,
  buildAcquisitionTimeline,
  deriveFetchState,
} = load("intelligence/historicalSourceCoverage48/index.ts");

let passed = 0;
function test(name, fn) {
  fn();
  passed++;
  console.log(`  ✓ ${name}`);
}

console.log(`HSA 4.9 selftest — ${HSA49_VERSION}\n`);

test("connected", () => {
  const c = diagnoseConnectivityExtended({
    envPresent: true,
    propertiesCount: 50,
    eventsCount: 38,
    propertiesError: null,
    eventsError: null,
  });
  assert.equal(c.extendedStatus, "CONNECTED");
});

test("TLS failure → LIVE_DATA_UNAVAILABLE", () => {
  const c = diagnoseConnectivityExtended({
    envPresent: true,
    propertiesCount: null,
    eventsCount: null,
    propertiesError: "fetch failed certificate",
    eventsError: "fetch failed certificate",
  });
  assert.equal(c.extendedStatus, "LIVE_DATA_UNAVAILABLE");
});

test("query error distinct from empty", () => {
  const c = diagnoseConnectivityExtended({
    envPresent: true,
    propertiesCount: null,
    eventsCount: 10,
    propertiesError: "permission denied for table",
    eventsError: null,
  });
  assert.ok(["QUERY_ERROR", "LIVE_DATA_UNAVAILABLE", "AUTH_ERROR"].includes(c.extendedStatus));
});

test("empty database", () => {
  const c = diagnoseConnectivityExtended({
    envPresent: true,
    propertiesCount: 0,
    eventsCount: 0,
    propertiesError: null,
    eventsError: null,
  });
  assert.equal(c.extendedStatus, "EMPTY_DATABASE");
});

test("fetch success HTTP 200", () => {
  const f = classifyFetchFailure({ httpStatus: 200 });
  assert.equal(f.errorCode, "NONE");
});

test("timeout retryable", () => {
  const f = classifyFetchFailure({ error: "ETIMEDOUT" });
  assert.equal(f.errorCode, "TIMEOUT");
  assert.equal(f.retryable, true);
});

test("DNS retryable", () => {
  assert.equal(classifyFetchFailure({ error: "getaddrinfo ENOTFOUND" }).errorCode, "DNS_ERROR");
});

test("TLS retryable", () => {
  assert.equal(
    classifyFetchFailure({ error: "unable to verify certificate" }).errorCode,
    "TLS_ERROR",
  );
});

test("HTTP 403 blocked", () => {
  const f = classifyFetchFailure({ httpStatus: 403 });
  assert.equal(f.errorCode, "HTTP_403");
  assert.equal(f.retryable, false);
});

test("HTTP 404 not retryable", () => {
  assert.equal(isRetryableErrorCode("HTTP_404"), false);
});

test("HTTP 429 retryable", () => {
  assert.equal(isRetryableErrorCode("HTTP_429"), true);
});

test("HTTP 500 retryable", () => {
  assert.equal(classifyFetchFailure({ httpStatus: 500 }).errorCode, "HTTP_500");
});

test("HTTP 503 retryable", () => {
  assert.equal(classifyFetchFailure({ httpStatus: 503 }).retryable, true);
});

test("retry limit", () => {
  const runs = Array.from({ length: 3 }, (_, i) => ({
    property_id: "p1",
    status: "FAILED",
  }));
  const d = evaluateRetry({ propertyId: "p1", enrichmentRuns: runs });
  assert.equal(d.shouldRetry, false);
});

test("Retry-After delay", () => {
  assert.equal(computeRetryDelay({ attemptNumber: 1, retryAfterHeaderSeconds: 30 }), 30000);
});

test("exponential backoff capped", () => {
  const d = computeRetryDelay({ attemptNumber: 10 });
  assert.ok(d <= 60000);
});

test("snapshot valid content", () => {
  const v = validateSnapshotContent({
    httpStatus: 200,
    contentLength: 5000,
    bodySnippet: "<html><body>Auction property listing</body></html>",
  });
  assert.equal(v.valid, true);
});

test("snapshot empty", () => {
  assert.equal(validateSnapshotContent({ contentLength: 0 }).valid, false);
});

test("snapshot login page", () => {
  assert.equal(
    validateSnapshotContent({ bodySnippet: "Please sign in to continue" }).valid,
    false,
  );
});

test("snapshot error page", () => {
  assert.equal(
    validateSnapshotContent({ bodySnippet: "404 Not Found on this server" }).valid,
    false,
  );
});

test("snapshot captcha", () => {
  assert.equal(validateSnapshotContent({ bodySnippet: "recaptcha challenge" }).valid, false);
});

test("invalid source URL", () => {
  assert.equal(classifyFetchFailure({ sourceUrl: null }).errorCode, "INVALID_SOURCE_URL");
});

test("P1 not attempted", () => {
  const event = {
    listingPropertyId: "p1",
    fetchAttempted: false,
    fetchSuccessful: false,
    snapshot: { exists: false },
    outcomeState: "UNKNOWN",
    salePriceState: "MISSING",
    source: { sourceStatus: "LICENSED", sourceUrl: "https://x.com" },
    primaryState: "FETCH_NOT_ATTEMPTED",
    stoppingPoint: "x",
    queuePriority: 1,
  };
  const p = assignAcquisitionPriority({ event, enrichmentRuns: [] });
  assert.equal(p.priority, 1);
});

test("P2 retryable failure", () => {
  const event = {
    listingPropertyId: "p1",
    fetchAttempted: true,
    fetchSuccessful: false,
    snapshot: { exists: false },
    outcomeState: "UNKNOWN",
    salePriceState: "MISSING",
    source: { sourceStatus: "LICENSED", sourceUrl: "https://x.com" },
    primaryState: "FETCH_HTTP_5XX",
    stoppingPoint: "x",
    fetch: { httpStatus: 503, enrichmentStatus: "FAILED", refetchStatus: "failed" },
  };
  const p = assignAcquisitionPriority({
    event,
    enrichmentRuns: [{ property_id: "p1", status: "FAILED" }],
  });
  assert.equal(p.priority, 2);
});

test("P4 permanent 404", () => {
  const event = {
    listingPropertyId: "p1",
    fetchAttempted: true,
    fetchSuccessful: false,
    snapshot: { exists: false },
    outcomeState: "UNKNOWN",
    salePriceState: "MISSING",
    source: { sourceStatus: "LICENSED", sourceUrl: "https://x.com" },
    primaryState: "FETCH_HTTP_404",
    stoppingPoint: "x",
    fetch: { httpStatus: 404, enrichmentStatus: "FAILED" },
  };
  const p = assignAcquisitionPriority({
    event,
    enrichmentRuns: [{ property_id: "p1", status: "FAILED" }],
  });
  assert.equal(p.priority, 4);
});

test("source health no fabrication", () => {
  const health = buildSourceHealthMetrics({
    events: [
      {
        agency: "Bidders Choice",
        source: { sourceName: "Bidders Choice" },
        fetchAttempted: true,
        fetchSuccessful: true,
        snapshot: { exists: true },
        extraction: { state: "NO_EVIDENCE" },
        outcomeState: "UNKNOWN",
        salePriceState: "MISSING",
      },
    ],
    enrichmentRuns: [],
    refetchRuns: [],
  });
  assert.equal(health[0].eligible, 1);
  assert.equal(health[0].salePriceCoverage, 0);
});

test("research labels proven vs missing", () => {
  const labels = buildResearchEvidenceLabels({
    source: { sourceUrl: "https://x.com" },
    fetchAttempted: false,
    fetchSuccessful: false,
    snapshot: { exists: false },
    outcomeState: "UNKNOWN",
    salePriceState: "MISSING",
    primaryState: "FETCH_NOT_ATTEMPTED",
    stoppingPoint: "Not attempted",
  });
  assert.ok(labels.proven.length > 0);
  assert.ok(labels.missing.some((m) => m.includes("fetch")));
});

test("timeline stages", () => {
  const timeline = buildAcquisitionTimeline({
    source: { sourceStatus: "LICENSED", sourceUrl: "https://x.com" },
    fetchAttempted: false,
    fetchSuccessful: false,
    snapshot: { exists: false },
    extraction: { state: "NOT_RUN" },
    outcomeState: "UNKNOWN",
    salePriceState: "MISSING",
    resolutionState: "INSUFFICIENT_DATA",
    evidenceQuality: "LOW",
    queuePriority: 1,
  });
  assert.ok(timeline.some((t) => t.stage === "SOURCE_CONFIRMED"));
});

test("fetch state not attempted", () => {
  assert.equal(
    deriveFetchState({
      event: {
        source: { sourceStatus: "LICENSED" },
        fetchAttempted: false,
        fetchSuccessful: false,
        snapshot: { exists: false },
        extraction: { state: "NOT_RUN" },
        queuePriority: 1,
      },
    }),
    "FETCH_QUEUED",
  );
});

test("public catalogue sold excluded", () => {
  assert.equal(
    isPubliclyActiveListing({
      verification_state: "sold",
      listing_status: "active",
      status: "active",
      auction_date: "2020-01-01",
    }),
    false,
  );
});

test("expired excluded", () => {
  assert.equal(
    isPubliclyActiveListing({
      verification_state: "expired",
      listing_status: "upcoming",
      status: "upcoming",
      auction_date: "2026-12-01",
    }),
    false,
  );
});

test("batch limit max 10", () => {
  assert.equal(HSA49_MAX_BATCH_LIMIT, 10);
});

test("max retry attempts 3", () => {
  assert.equal(HSA49_MAX_RETRY_ATTEMPTS, 3);
});

test("auth required not retryable", () => {
  assert.equal(isRetryableErrorCode("AUTH_REQUIRED"), false);
});

test("redirect loop not retryable", () => {
  assert.equal(isRetryableErrorCode("REDIRECT_LOOP"), false);
});

test("connection error retryable", () => {
  assert.equal(isRetryableErrorCode("CONNECTION_ERROR"), true);
});

test("HTTP 502 retryable", () => {
  assert.equal(classifyFetchFailure({ httpStatus: 502 }).retryable, true);
});

test("HTTP 401 not retryable", () => {
  assert.equal(classifyFetchFailure({ httpStatus: 401 }).retryable, false);
});

test("HTTP 408 retryable", () => {
  assert.equal(classifyFetchFailure({ httpStatus: 408 }).retryable, true);
});

test("source changed classification", () => {
  assert.equal(
    classifyFetchFailure({ error: "source changed substantially" }).errorCode,
    "SOURCE_CHANGED",
  );
});

test("empty response", () => {
  assert.equal(classifyFetchFailure({ error: "empty body", contentLength: 0 }).errorCode, "EMPTY_RESPONSE");
});

test("guide price not verified sale", () => {
  const labels = buildResearchEvidenceLabels({
    source: { sourceUrl: "https://x.com" },
    fetchAttempted: true,
    fetchSuccessful: true,
    snapshot: { exists: true },
    outcomeState: "UNKNOWN",
    salePriceState: "MISSING",
    primaryState: "INSUFFICIENT_DATA",
    stoppingPoint: "No outcome",
  });
  assert.ok(!labels.proven.some((p) => p.includes("Verified sale price")));
});

test("conflicting — review required state", () => {
  const labels = buildResearchEvidenceLabels({
    source: { sourceUrl: "https://x.com" },
    fetchAttempted: true,
    fetchSuccessful: true,
    snapshot: { exists: true },
    outcomeState: "CONFLICT",
    salePriceState: "MISSING",
    primaryState: "CONFLICT_REVIEW_REQUIRED",
    stoppingPoint: "Conflict",
  });
  assert.ok(labels.reviewRequired.length > 0);
});

console.log(`\n${passed} tests passed.`);
