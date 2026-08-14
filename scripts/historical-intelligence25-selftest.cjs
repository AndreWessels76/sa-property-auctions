/**
 * Historical Intelligence 2.5 — Comparable Sales & Market Evidence selftests.
 * Run: npm run test:historical-intelligence25
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

const { classifyAuctionEventState } = load("intelligence/historical/eventClassification.ts");
const { buildHistoricalDataset, publicHistoricalRows } = load(
  "intelligence/historical/historicalAggregation.ts",
);
const { buildSaleEvidence, assertPriceKindSeparation } = load(
  "intelligence/comparables/saleEvidence.ts",
);
const { pricePerM2, pricePerHa, rejectLandAsFloor } = load(
  "intelligence/comparables/priceMetrics.ts",
);
const { findComparables } = load("intelligence/comparables/engine.ts");
const { buildMarketEvidence } = load("intelligence/comparables/marketEvidence.ts");
const { buildMasterHistory } = load("intelligence/comparables/masterHistory.ts");
const { buildPropertyTimeline } = load("intelligence/comparables/timeline.ts");
const { DEFAULT_COMPARABLE_CONFIG } = load("intelligence/comparables/config.ts");
const { isPubliclyActiveListing } = load("data/publicListingPolicy.ts");

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

console.log("hi25: outcomes");

assert.equal(classifyAuctionEventState("sold"), "sold");
assert.equal(classifyAuctionEventState("expired"), "expired");
assert.equal(classifyAuctionEventState("withdrawn"), "withdrawn");
assert.equal(classifyAuctionEventState("cancelled"), "cancelled");
assert.equal(classifyAuctionEventState("closed"), "completed");

console.log("hi25: price semantics never cross-mapped");

{
  const evidence = buildSaleEvidence(obs());
  assert.equal(evidence.salePrice, 2_000_000);
  assert.notEqual(evidence.salePrice, evidence.auctionPrice);
  assert.notEqual(evidence.salePrice, evidence.guidePrice);
  assert.notEqual(evidence.salePrice, evidence.reservePrice);
  assert.notEqual(evidence.salePrice, evidence.estimatedValue);
  assert.equal(assertPriceKindSeparation(obs().prices), true);
}

console.log("hi25: price per m2");

{
  const evidence = buildSaleEvidence(obs());
  const ppm = pricePerM2(evidence, 120);
  assert.equal(ppm.calculable, true);
  assert.ok(Math.abs(ppm.value - 2_000_000 / 120) < 0.01);
  const missing = pricePerM2(evidence, null);
  assert.equal(missing.calculable, false);
  assert.ok(missing.reason.includes("floor"));
  assert.equal(rejectLandAsFloor(null, 500), true);
}

console.log("hi25: price per ha approximate");

{
  const evidence = buildSaleEvidence(
    obs({ marketCategory: "Agricultural", hectares: 4.164, hectaresApproximate: true }),
  );
  const pph = pricePerHa(evidence, 4.164, true);
  assert.equal(pph.calculable, true);
  assert.equal(pph.approximate, true);
  const zero = pricePerHa(evidence, 0, false);
  assert.equal(zero.calculable, false);
}

console.log("hi25: comparables strong match");

{
  const subject = obs({ listingPropertyId: "subject", propertyMasterId: "ms" });
  const strong = obs({
    observationId: "o2",
    listingPropertyId: "p2",
    propertyMasterId: "m2",
    town: "Pretoria",
    suburb: "Menlyn",
    propertyType: "House",
    floorSizeM2: 115,
  });
  const result = findComparables({
    subject,
    corpus: [subject, strong],
    propertyId: "subject",
    premium: true,
  });
  assert.ok(result.comparables.length >= 1);
  assert.notEqual(result.comparables[0].comparableConfidence, "Insufficient data");
  assert.ok(result.comparables[0].matchingEvidence.length >= 2);
}

console.log("hi25: comparables reject wrong type");

{
  const subject = obs({ listingPropertyId: "subject2", propertyMasterId: "ms2" });
  const wrong = obs({
    observationId: "o3",
    listingPropertyId: "p3",
    propertyMasterId: "m3",
    propertyType: "Warehouse",
    town: "Pretoria",
  });
  const result = findComparables({
    subject,
    corpus: [subject, wrong],
    propertyId: "subject2",
    premium: true,
  });
  assert.equal(result.comparables.length, 0);
  assert.ok(result.rejectedCandidates.length >= 1);
}

console.log("hi25: comparables reject town-only");

{
  const subject = obs({
    listingPropertyId: "subject3",
    propertyMasterId: "ms3",
    propertyType: "Apartment",
    suburb: null,
  });
  const townOnly = obs({
    observationId: "o4",
    listingPropertyId: "p4",
    propertyMasterId: "m4",
    propertyType: "Farm",
    town: "Pretoria",
    suburb: null,
  });
  const result = findComparables({
    subject,
    corpus: [subject, townOnly],
    propertyId: "subject3",
    premium: true,
  });
  assert.equal(result.comparables.length, 0);
}

console.log("hi25: market evidence sample size");

{
  const soldRows = [
    obs({ observationId: "s1", listingPropertyId: "s1", propertyMasterId: "m-s1" }),
    obs({ observationId: "s2", listingPropertyId: "s2", propertyMasterId: "m-s2", prices: { ...obs().prices, sale_price: 2_500_000 } }),
  ];
  const market = buildMarketEvidence({
    observations: soldRows,
    scope: "market",
    scopeLabel: "Test",
    config: { ...DEFAULT_COMPARABLE_CONFIG, minimumMarketSales: 5 },
  });
  assert.equal(market.sampleSize, 2);
  assert.ok(market.limitations.some((l) => l.includes("require at least")));
  assert.equal(market.medianSalePrice.median, null);
}

console.log("hi25: master history");

{
  const rows = publicHistoricalRows([
    obs({ auctionDate: "2023-01-01", state: "expired" }),
    obs({ observationId: "o5", auctionDate: "2024-06-01", state: "sold" }),
  ]);
  const history = buildMasterHistory(rows, "m1");
  assert.equal(history.length, 2);
  assert.equal(history[1].state, "sold");
}

console.log("hi25: timeline evidence only");

{
  const timeline = buildPropertyTimeline(publicHistoricalRows([obs({ state: "sold" })]));
  assert.ok(timeline.some((s) => s.stage === "sold" && s.supported));
  assert.ok(!timeline.some((s) => s.stage === "sold" && !s.evidence));
}

console.log("hi25: public catalogue");

assert.equal(
  isPubliclyActiveListing({
    verification_state: "verified",
    listing_status: "upcoming",
    status: "active",
    auction_date: "2026-12-01",
  }),
  true,
);
assert.equal(
  isPubliclyActiveListing({
    verification_state: "expired",
    listing_status: "expired",
    status: "expired",
    auction_date: "2020-01-01",
  }),
  false,
);

console.log("hi25: event dataset");

{
  const dataset = buildHistoricalDataset({
    events: [
      {
        id: "ev1",
        property_master_id: "m1",
        listing_property_id: "p1",
        status: "sold",
        auction_date: "2024-01-01",
        winning_bid: 1_000_000,
        agency: "A",
        connector_id: "c",
        external_listing_id: "x",
      },
    ],
    listings: [
      {
        id: "p1",
        verification_state: "sold",
        listing_status: "sold",
        status: "sold",
        town: "Cape Town",
        province: "Western Cape",
        property_type: "House",
        property_master_id: "m1",
      },
    ],
    observations: [],
  });
  assert.ok(dataset.some((d) => d.sourceUnit === "auction_event"));
  assert.equal(dataset.find((d) => d.state === "sold")?.prices.sale_price, 1_000_000);
}

console.log("hi25: API route exists");

assert.ok(fs.existsSync(path.join(root, "app/api/intelligence/comparables/[id]/route.ts")));

console.log("historical-intelligence25-selftest: PASS");
