/**
 * Historical Intelligence 3.0 — Auction Outcome & Market Performance selftests.
 * Run: npm run test:historical-intelligence30
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

const { classifyAuctionOutcome, isConfirmedOutcome } = load(
  "intelligence/outcomes/classification.ts",
);
const { classifyObservation, classifyObservations } = load("intelligence/outcomes/evidence.ts");
const { buildAuctionPerformance } = load("intelligence/outcomes/performance.ts");
const { buildMarketPerformanceReport, buildPropertyHistoryChain } = load(
  "intelligence/outcomes/marketPerformance.ts",
);
const { buildMasterPriceChange } = load("intelligence/outcomes/priceChange.ts");
const { buildMonthlyTimeSeries } = load("intelligence/outcomes/timeseries.ts");
const { detectOutcomeConflicts } = load("intelligence/outcomes/conflicts.ts");
const { outcomeCacheKey, dataVersionFromCorpus } = load("intelligence/outcomes/cache.ts");
const { DEFAULT_OUTCOME_CONFIG, COMPARABLE_WEIGHTS } = load("intelligence/outcomes/config.ts");
const { assertPriceKindSeparation } = load("intelligence/comparables/saleEvidence.ts");
const { isPubliclyActiveListing } = load("data/publicListingPolicy.ts");
const { publicHistoricalRows } = load("intelligence/historical/historicalAggregation.ts");

function obs(overrides = {}) {
  return {
    observationId: "o1",
    sourceUnit: "auction_event",
    auctionEventId: "e1",
    propertyMasterId: "m1",
    listingPropertyId: "p1",
    state: "sold",
    outcomeSupplied: true,
    auctionDate: "2024-06-01",
    dateKind: "auction_date",
    agency: "Test Agency",
    sourceName: "Test",
    sourceUrl: "https://example.com/a",
    verificationState: "verified",
    verified: true,
    conflict: false,
    propertyType: "House",
    propertyTypeStatus: "known",
    marketCategory: "Residential",
    agriculturalSubtype: null,
    province: "Gauteng",
    municipality: null,
    town: "Pretoria",
    suburb: "Menlyn",
    farmName: null,
    floorSizeM2: 120,
    hectares: null,
    hectaresApproximate: false,
    bedrooms: 3,
    bathrooms: 2,
    prices: {
      sale_price: 2_000_000,
      auction_price: 1_800_000,
      guide_price: 2_100_000,
      reserve_price: 1_500_000,
      estimated_value: 2_300_000,
      starting_bid: 1_000_000,
    },
    exclusionReasons: [],
    ...overrides,
  };
}

console.log("hi30: 1 SOLD classification");
assert.equal(classifyAuctionOutcome(obs({ state: "sold" })), "SOLD");

console.log("hi30: 2 WITHDRAWN classification");
assert.equal(classifyAuctionOutcome(obs({ state: "withdrawn" })), "WITHDRAWN");

console.log("hi30: 3 CANCELLED classification");
assert.equal(classifyAuctionOutcome(obs({ state: "cancelled" })), "CANCELLED");

console.log("hi30: 4 EXPIRED classification (not UNSOLD)");
assert.equal(classifyAuctionOutcome(obs({ state: "expired" })), "EXPIRED");
assert.notEqual(classifyAuctionOutcome(obs({ state: "expired" })), "UNSOLD");

console.log("hi30: 5 UNKNOWN classification");
assert.equal(classifyAuctionOutcome(obs({ state: "completed" })), "UNKNOWN");
assert.equal(classifyAuctionOutcome(obs({ state: "unknown" })), "UNKNOWN");

console.log("hi30: 6 sale price semantics");
{
  const c = classifyObservation(obs({ state: "sold" }));
  assert.equal(c.salePrice.salePrice, 2_000_000);
  assert.equal(c.outcome, "SOLD");
}

console.log("hi30: 7 auction price !== sale price");
{
  const c = classifyObservation(obs());
  assert.notEqual(c.salePrice.salePrice, obs().prices.auction_price);
  assert.equal(assertPriceKindSeparation(obs().prices), true);
}

console.log("hi30: 8 guide !== sale price");
assert.notEqual(obs().prices.guide_price, obs().prices.sale_price);

console.log("hi30: 9 reserve !== sale price");
assert.notEqual(obs().prices.reserve_price, obs().prices.sale_price);

console.log("hi30: 10 price/m²");
{
  const report = buildMarketPerformanceReport({
    observations: Array.from({ length: 5 }, (_, i) =>
      obs({
        observationId: `s${i}`,
        listingPropertyId: `p${i}`,
        propertyMasterId: `m${i}`,
        prices: { ...obs().prices, sale_price: 1_000_000 + i * 100_000 },
      }),
    ),
    scope: "test",
  });
  assert.ok(report.medianPricePerM2.median != null || report.medianPricePerM2.notCalculableReason);
}

console.log("hi30: 11 price/ha");
{
  const report = buildMarketPerformanceReport({
    observations: Array.from({ length: 5 }, (_, i) =>
      obs({
        observationId: `h${i}`,
        listingPropertyId: `ph${i}`,
        propertyMasterId: `mh${i}`,
        marketCategory: "Agricultural",
        hectares: 2,
        prices: { ...obs().prices, sale_price: 3_000_000 + i * 50_000 },
      }),
    ),
    scope: "test-ha",
  });
  assert.ok(report.medianPricePerHa.median != null || report.medianPricePerHa.notCalculableReason);
}

console.log("hi30: 12 insufficient data");
{
  const report = buildMarketPerformanceReport({
    observations: [obs()],
    scope: "small",
    config: { ...DEFAULT_OUTCOME_CONFIG, minimumMarketSales: 5 },
  });
  assert.ok(report.medianSalePrice.notCalculableReason?.includes("Insufficient"));
}

console.log("hi30: 13 minimum sample rules");
{
  const report = buildMarketPerformanceReport({
    observations: Array.from({ length: 3 }, (_, i) =>
      obs({ observationId: `m${i}`, listingPropertyId: `lp${i}`, propertyMasterId: `mm${i}` }),
    ),
    scope: "min",
  });
  assert.equal(report.medianSalePrice.median, null);
}

console.log("hi30: 14 outcome coverage");
{
  const rows = [
    obs({ state: "sold" }),
    obs({ observationId: "o2", state: "expired", listingPropertyId: "p2" }),
    obs({ observationId: "o3", state: "unknown", listingPropertyId: "p3" }),
  ];
  const perf = buildAuctionPerformance(classifyObservations(publicHistoricalRows(rows)));
  assert.equal(perf.saleRate.label, "Sold / auctions with confirmed outcome");
  assert.equal(perf.outcomeCoverage.denominator, 3);
  assert.equal(perf.saleRate.denominator, perf.confirmedOutcomes);
}

console.log("hi30: 15 time series");
{
  const rows = classifyObservations(
    publicHistoricalRows([
      obs({ auctionDate: "2024-01-15" }),
      obs({ observationId: "ts2", auctionDate: "2024-02-10", listingPropertyId: "p-ts2" }),
    ]),
  );
  const series = buildMonthlyTimeSeries(rows);
  assert.ok(series.length >= 1);
  assert.equal(series[0].calculable, false);
}

console.log("hi30: 16 master history");
{
  const chain = buildPropertyHistoryChain("m1", publicHistoricalRows([
    obs({ auctionDate: "2023-01-01", state: "expired" }),
    obs({ observationId: "h2", auctionDate: "2024-06-01", state: "sold" }),
  ]));
  assert.equal(chain.events.length, 2);
  assert.equal(chain.events[1].outcome, "SOLD");
}

console.log("hi30: 17 conflicting sources");
{
  const c = classifyObservation(
    obs(),
    [
      {
        field_name: "sale_price",
        normalized_value: 1_800_000,
        status: "verified",
        auction_event_id: "e1",
      },
      {
        field_name: "sale_price",
        normalized_value: 2_100_000,
        status: "verified",
        auction_event_id: "e1",
      },
    ],
  );
  assert.equal(c.salePrice.conflict, true);
  const conflicts = detectOutcomeConflicts([c]);
  assert.ok(conflicts.length >= 1);
}

console.log("hi30: 18 public catalogue safety");
{
  assert.equal(
    isPubliclyActiveListing({
      verification_state: "sold",
      data_classification: "verified",
      listing_status: "sold",
      status: "sold",
      auction_date: "2024-01-01",
    }),
    false,
  );
  assert.equal(
    isPubliclyActiveListing({
      verification_state: "verified",
      data_classification: "verified",
      listing_status: "active",
      status: "active",
      auction_date: "2099-01-01",
    }),
    true,
  );
}

console.log("hi30: 19 cache invalidation keys");
{
  const k1 = outcomeCacheKey({ scope: "town", scopeId: "Pretoria", dataVersion: "10:2024-01" });
  const k2 = outcomeCacheKey({ scope: "town", scopeId: "Pretoria", dataVersion: "11:2024-01" });
  assert.notEqual(k1, k2);
  assert.equal(dataVersionFromCorpus(10, "2024-01"), "10:2024-01");
}

console.log("hi30: 20 provenance");
{
  const c = classifyObservation(obs({ state: "withdrawn" }));
  assert.ok(c.outcomeEvidence.evidenceText);
  assert.ok(c.outcomeEvidence.sourceUrl);
  assert.equal(isConfirmedOutcome(c.outcome), true);
}

console.log("hi30: UNSOLD only with explicit evidence");
assert.equal(classifyAuctionOutcome(obs({ state: "expired" })), "EXPIRED");
assert.equal(
  classifyAuctionOutcome(obs({ state: "completed" }), { rawStatus: "passed in" }),
  "UNSOLD",
);

console.log("hi30: no sale price does not imply UNSOLD");
{
  const c = classifyObservation(obs({ state: "expired", prices: { ...obs().prices, sale_price: null } }));
  assert.equal(c.outcome, "EXPIRED");
  assert.equal(c.salePrice.salePrice, null);
}

console.log("hi30: price change same master");
{
  const rows = classifyObservations(publicHistoricalRows([
    obs({ auctionDate: "2020-01-01", prices: { ...obs().prices, sale_price: 1_000_000 } }),
    obs({
      observationId: "pc2",
      auctionDate: "2024-06-01",
      prices: { ...obs().prices, sale_price: 1_500_000 },
    }),
  ]));
  const change = buildMasterPriceChange("m1", rows);
  assert.equal(change.calculable, true);
  assert.equal(change.percentageChange, 50);
}

console.log("hi30: comparable weights documented");
assert.equal(typeof COMPARABLE_WEIGHTS.suburb, "number");
assert.ok(COMPARABLE_WEIGHTS.verifiedSale >= 15);

console.log("\nAll Historical Intelligence 3.0 selftests passed.");
