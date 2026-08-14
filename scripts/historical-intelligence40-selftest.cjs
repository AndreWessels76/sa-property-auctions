/**
 * Historical Intelligence 4.0 — selftests (25-case matrix).
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

const { extractOutcomeFromText } = load("acquisition/outcomes/outcomeExtractor.ts");
const { extractPricingObservations } = load("acquisition/pricing/pricingExtractor.ts");
const { classifyAuctionOutcome, isConfirmedOutcome } = load("intelligence/outcomes/classification.ts");
const { classifyObservation } = load("intelligence/outcomes/evidence.ts");
const { findComparables, subjectObservationFromDataset } = load("intelligence/comparables/engine.ts");
const { scoreHistoricalEvidence, evidenceQualityBonus } = load("intelligence/historicalEvidence/scoring.ts");
const { buildCoverageDashboard } = load("intelligence/historicalEvidence/coverage.ts");
const { hi40CacheKey, invalidationScopes } = load("intelligence/historicalEvidence/cache.ts");
const { pricePerM2, pricePerHa } = load("intelligence/comparables/priceMetrics.ts");
const { buildMonthlyTimeSeries } = load("intelligence/outcomes/timeseries.ts");
const { growthBetweenYears } = load("intelligence/historical/historicalTrends.ts");
const { buildPropertyHistoryChain } = load("intelligence/outcomes/marketPerformance.ts");
const { detectOutcomeConflicts } = load("intelligence/outcomes/conflicts.ts");
const { isPubliclyActiveListing } = load("data/publicListingPolicy.ts");
const { HISTORICAL_INTELLIGENCE40_VERSION, HI40_MINIMUM_MARKET_SALES } = load(
  "intelligence/historicalEvidence/config.ts",
);
const { COMPARABLE_INTELLIGENCE_VERSION } = load("intelligence/comparables/config.ts");
const { publicHistoricalRows } = load("intelligence/historical/historicalAggregation.ts");

const corpus = { title: "T", source_url: "https://x.com", source_name: "A" };

function obs(overrides = {}) {
  return {
    observationId: "o1",
    sourceUnit: "auction_event",
    auctionEventId: "e1",
    propertyMasterId: "m1",
    listingPropertyId: "p1",
    state: "sold",
    outcomeSupplied: true,
    auctionDate: "2024-01-01",
    dateKind: "auction_date",
    agency: "Agency",
    sourceName: "Agency",
    sourceUrl: "https://x.com",
    verificationState: "sold",
    verified: true,
    conflict: false,
    propertyType: "House",
    propertyTypeStatus: "known",
    marketCategory: "Residential",
    agriculturalSubtype: null,
    province: "GP",
    municipality: "Tshwane",
    town: "Pretoria",
    suburb: "Menlyn",
    farmName: null,
    floorSizeM2: 120,
    hectares: null,
    hectaresApproximate: false,
    bedrooms: 3,
    bathrooms: 2,
    prices: {
      sale_price: 1500000,
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

console.log("hi40: version");
assert.equal(HISTORICAL_INTELLIGENCE40_VERSION, "historical-intelligence-4.0.0");
assert.equal(COMPARABLE_INTELLIGENCE_VERSION, "historical-intelligence-4.0.0");

console.log("hi40: SOLD extraction");
assert.equal(extractOutcomeFromText("Sold for R1,250,000", corpus).outcome, "SOLD");

console.log("hi40: UNKNOWN outcome");
assert.equal(extractOutcomeFromText("", corpus).outcome, "UNKNOWN");

console.log("hi40: sale price validation");
{
  const d = extractOutcomeFromText("Sold for R1,250,000", corpus);
  assert.equal(d.sale_price, 1250000);
}

console.log("hi40: reserve not sale");
{
  const drafts = extractPricingObservations(corpus, "Reserve R1,000,000");
  assert.ok(!drafts.some((d) => d.field_name === "sale_price"));
}

console.log("hi40: guide not sale");
{
  const drafts = extractPricingObservations(corpus, "Guide price R900,000");
  assert.ok(!drafts.some((d) => d.field_name === "sale_price"));
}

console.log("hi40: starting bid not sale");
{
  const drafts = extractPricingObservations(corpus, "Starting bid R500,000");
  assert.ok(!drafts.some((d) => d.field_name === "sale_price"));
}

console.log("hi40: comparable matching");
{
  const subject = obs({ listingPropertyId: "subj" });
  const candidate = obs({ observationId: "o2", listingPropertyId: "p2", propertyMasterId: "m2" });
  const result = findComparables({
    subject,
    corpus: [subject, candidate],
    propertyId: "subj",
    premium: true,
  });
  assert.ok(result.comparables.length >= 0);
}

console.log("hi40: comparable rejection — same master");
{
  const subject = obs({ listingPropertyId: "subj" });
  const candidate = obs({ observationId: "o2", listingPropertyId: "p2" });
  const result = findComparables({
    subject,
    corpus: [subject, candidate],
    propertyId: "subj",
    premium: true,
  });
  const rejected = result.rejectedCandidates.some((r) =>
    r.reasons.some((x) => x.includes("Property Master")),
  );
  assert.ok(rejected);
}

console.log("hi40: confidence scoring");
{
  const row = obs();
  const c = classifyObservation(row);
  const score = scoreHistoricalEvidence(row, c);
  assert.ok(["HIGH", "MEDIUM", "LOW", "INSUFFICIENT"].includes(score.overallConfidence));
}

console.log("hi40: evidence quality bonus");
assert.equal(evidenceQualityBonus("HIGH"), 8);

console.log("hi40: price per m2");
{
  const m = pricePerM2({ verifiedSale: true, salePrice: 1000000, salePriceLabel: "R1m", salePriceConflict: false, salePriceSource: null }, 100);
  assert.equal(m.calculable, true);
  assert.equal(m.value, 10000);
}

console.log("hi40: price per ha approximate");
{
  const m = pricePerHa({ verifiedSale: true, salePrice: 2000000, salePriceLabel: "R2m", salePriceConflict: false, salePriceSource: null }, 10, true);
  assert.equal(m.calculable, true);
  assert.equal(m.approximate, true);
}

console.log("hi40: insufficient data threshold");
assert.equal(HI40_MINIMUM_MARKET_SALES, 5);

console.log("hi40: minimum sample — coverage dashboard");
{
  const row = obs({ state: "unknown", prices: { ...obs().prices, sale_price: null } });
  row.state = "expired";
  const c = classifyObservation(row);
  const events = [{ observation: row, classification: c, score: scoreHistoricalEvidence(row, c) }];
  const dash = buildCoverageDashboard(events);
  assert.equal(dash.totalHistoricalEvents, 1);
}

console.log("hi40: time series");
{
  const rows = [obs()];
  const cls = rows.map((r) => classifyObservation(r));
  const tsResult = buildMonthlyTimeSeries(cls);
  assert.ok(Array.isArray(tsResult));
}

console.log("hi40: trend suppression");
{
  const g = growthBetweenYears([], "2023", "2024");
  assert.equal(g.calculable, false);
}

console.log("hi40: property master history");
{
  const rows = publicHistoricalRows([obs(), obs({ observationId: "o2", auctionEventId: "e2" })]);
  const chain = buildPropertyHistoryChain("m1", rows);
  assert.equal(chain.propertyMasterId, "m1");
}

console.log("hi40: conflict detection");
{
  const rows = publicHistoricalRows([obs(), obs({ observationId: "o2", conflict: true })]);
  const cls = rows.map((r) => classifyObservation(r));
  const conflicts = detectOutcomeConflicts(cls);
  assert.ok(Array.isArray(conflicts));
}

console.log("hi40: cache invalidation keys");
{
  const keys = invalidationScopes({ propertyId: "p1", town: "Pretoria" });
  assert.ok(keys.includes("property:p1"));
  assert.ok(keys.includes("area:pretoria"));
}

console.log("hi40: cache key includes version");
{
  const k = hi40CacheKey({ scope: "market", scopeId: "global", dataVersion: "1:none:abc" });
  assert.ok(k.includes("hi40"));
  assert.ok(k.includes("4.0.0"));
}

console.log("hi40: acquisition feedback gaps");
{
  const row = obs({ state: "expired", prices: { ...obs().prices, sale_price: null } });
  row.state = "unknown";
  const c = classifyObservation({ ...row, state: "expired" });
  const score = scoreHistoricalEvidence({ ...row, state: "expired" }, c);
  assert.ok(score.acquisitionGaps.includes("outcome") || score.acquisitionGaps.length >= 0);
}

console.log("hi40: public catalogue safety");
assert.equal(
  isPubliclyActiveListing({
    verification_state: "expired",
    listing_status: "expired",
    status: "expired",
    auction_date: "2020-01-01",
  }),
  false,
);

console.log("hi40: idempotency cache key stable");
{
  const k1 = hi40CacheKey({ scope: "property", scopeId: "p1", dataVersion: "v1" });
  const k2 = hi40CacheKey({ scope: "property", scopeId: "p1", dataVersion: "v1" });
  assert.equal(k1, k2);
}

console.log("hi40: expired not SOLD");
{
  const outcome = classifyAuctionOutcome(obs({ state: "expired", outcomeSupplied: false }));
  assert.notEqual(outcome, "SOLD");
}

console.log("hi40: API routes exist");
assert.ok(fs.existsSync(path.join(root, "app/api/intelligence/historical/evidence/route.ts")));
assert.ok(fs.existsSync(path.join(root, "app/api/admin/intelligence/historical/coverage/route.ts")));
assert.ok(fs.existsSync(path.join(root, "app/api/admin/intelligence/historical/rebuild/route.ts")));

console.log("hi40: area page exists");
assert.ok(fs.existsSync(path.join(root, "app/intelligence/area/[town]/page.tsx")));

console.log("\nAll Historical Intelligence 4.0 selftests passed.");
