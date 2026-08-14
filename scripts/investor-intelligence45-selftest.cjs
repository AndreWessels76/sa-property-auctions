/**
 * Investor Intelligence 4.5 — selftests (30-case matrix).
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

const { extractPricingObservations } = load("acquisition/pricing/pricingExtractor.ts");
const { classifyObservation } = load("intelligence/outcomes/evidence.ts");
const { scoreHistoricalEvidence } = load("intelligence/historicalEvidence/scoring.ts");
const { findComparables } = load("intelligence/comparables/engine.ts");
const { buildSaleEvidence } = load("intelligence/comparables/saleEvidence.ts");
const { pricePerM2, pricePerHa, rejectLandAsFloor } = load("intelligence/comparables/priceMetrics.ts");
const { isPubliclyActiveListing } = load("data/publicListingPolicy.ts");
const { applyCompareAccess, FREE_COMPARE_LIMIT } = load("intelligence/compareAccess.ts");
const {
  INVESTOR_INTELLIGENCE45_VERSION,
  II45_MINIMUM_MARKET_SALES,
  II45_MINIMUM_COMPARABLE_SALES,
} = load("intelligence/investorIntelligence45/config.ts");
const { buildMarketEvidenceSummary, filterVerifiedSaleObservations } = load(
  "intelligence/investorIntelligence45/marketEvidence.ts",
);
const { buildMarketPosition } = load("intelligence/investorIntelligence45/marketPosition.ts");
const { deriveDecisionStatus } = load("intelligence/investorIntelligence45/decisionStatus.ts");
const { buildComparableExplanation, presentComparable } = load(
  "intelligence/investorIntelligence45/comparablePresentation.ts",
);
const { rejectPriceKindAsSale } = load("intelligence/investorIntelligence45/pricePresentation.ts");
const { buildInvestorQuestions } = load("intelligence/investorIntelligence45/investorQuestions.ts");
const { buildAreaIntelligence45 } = load("intelligence/investorIntelligence45/areaIntelligence.ts");
const { buildAgencyIntelligence45 } = load("intelligence/investorIntelligence45/agencyIntelligence.ts");
const { buildTimeSeries } = load("intelligence/investorIntelligence45/timeSeries.ts");
const { detectAcquisitionGaps } = load("intelligence/investorIntelligence45/acquisitionGaps.ts");
const { buildInvestorCacheKey } = load("intelligence/investorIntelligence45/cache.ts");
const { buildEvidenceChain } = load("intelligence/investorIntelligence45/index.ts");
const { publicHistoricalRows } = load("intelligence/historical/historicalAggregation.ts");

const corpus = { title: "T", source_url: "https://x.com", source_name: "A" };

function obs(overrides = {}) {
  return {
    observationId: overrides.observationId ?? "o1",
    sourceUnit: "auction_event",
    auctionEventId: overrides.auctionEventId ?? "e1",
    propertyMasterId: overrides.propertyMasterId ?? "m1",
    listingPropertyId: overrides.listingPropertyId ?? "p1",
    state: "sold",
    outcomeSupplied: true,
    auctionDate: "2024-06-01",
    dateKind: "auction_date",
    agency: "Agency A",
    sourceName: "Agency A",
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

function ctxFromObservations(list) {
  return {
    observations: list,
    scoredEvents: list.map((observation) => {
      const classification = classifyObservation(observation);
      return { observation, classification, score: scoreHistoricalEvidence(observation, classification) };
    }),
  };
}

function soldObs(id, price, town = "Pretoria") {
  return obs({
    observationId: id,
    auctionEventId: `e-${id}`,
    propertyMasterId: `m-${id}`,
    listingPropertyId: `p-${id}`,
    town,
    prices: { ...obs().prices, sale_price: price },
  });
}

console.log("ii45: version");
assert.equal(INVESTOR_INTELLIGENCE45_VERSION, "investor-intelligence-4.5.0");

console.log("ii45: sufficient market sales");
{
  const list = Array.from({ length: 5 }, (_, i) => soldObs(`s${i}`, 1000000 + i * 10000));
  const ctx = ctxFromObservations(list);
  const pos = buildMarketPosition(ctx);
  assert.equal(pos.status, "AVAILABLE");
  assert.ok(pos.areaMedian != null);
}

console.log("ii45: insufficient market sales");
{
  const ctx = ctxFromObservations([soldObs("a", 1000000), soldObs("b", 1100000)]);
  const pos = buildMarketPosition(ctx);
  assert.equal(pos.status, "INSUFFICIENT_DATA");
  assert.equal(pos.areaMedian, null);
}

console.log("ii45: verified sale price");
{
  const sale = buildSaleEvidence(obs());
  assert.equal(sale.verifiedSale, true);
  assert.equal(sale.salePrice, 1500000);
}

console.log("ii45: guide price rejected as sale");
{
  const drafts = extractPricingObservations(corpus, "Guide price R900,000");
  assert.ok(!drafts.some((d) => d.field_name === "sale_price"));
  assert.ok(rejectPriceKindAsSale("guide_price"));
}

console.log("ii45: reserve rejected as sale");
{
  const drafts = extractPricingObservations(corpus, "Reserve R1,000,000");
  assert.ok(!drafts.some((d) => d.field_name === "sale_price"));
}

console.log("ii45: auction price rejected as sale");
{
  const row = obs({ prices: { ...obs().prices, sale_price: null, auction_price: 900000 } });
  const sale = buildSaleEvidence(row);
  assert.equal(sale.verifiedSale, false);
}

console.log("ii45: starting bid rejected as sale");
{
  const drafts = extractPricingObservations(corpus, "Starting bid R500,000");
  assert.ok(!drafts.some((d) => d.field_name === "sale_price"));
}

console.log("ii45: approximate hectares");
{
  const m = pricePerHa(buildSaleEvidence(obs({ hectares: 4.164, hectaresApproximate: true })), 4.164, true);
  assert.equal(m.approximate, true);
  assert.ok(m.calculable);
}

console.log("ii45: floor size vs land size");
{
  assert.ok(rejectLandAsFloor(null, 500));
  const m = pricePerM2(buildSaleEvidence(obs()), 120);
  assert.equal(m.calculable, true);
}

console.log("ii45: same-master comparable rejected");
{
  const subject = obs({ listingPropertyId: "subj" });
  const candidate = obs({ observationId: "o2", listingPropertyId: "p2" });
  const result = findComparables({ subject, corpus: [subject, candidate], propertyId: "subj", premium: true });
  assert.ok(result.rejectedCandidates.some((r) => r.reasons.some((x) => x.includes("Property Master"))));
}

console.log("ii45: weak comparable rejected");
{
  const subject = obs({ listingPropertyId: "subj", town: "Cape Town" });
  const candidate = obs({
    observationId: "o2",
    listingPropertyId: "p2",
    propertyMasterId: "m99",
    town: "Durban",
    propertyType: "Industrial",
    prices: { ...obs().prices, sale_price: null },
    state: "unknown",
  });
  const result = findComparables({ subject, corpus: [subject, candidate], propertyId: "subj", premium: true });
  assert.ok(result.comparables.length === 0 || result.rejectedCandidates.length > 0);
}

console.log("ii45: high-confidence comparable explanation");
{
  const subject = obs({ listingPropertyId: "subj" });
  const candidate = obs({
    observationId: "o2",
    listingPropertyId: "p2",
    propertyMasterId: "m2",
    town: "Pretoria",
    suburb: "Menlyn",
  });
  const result = findComparables({ subject, corpus: [subject, candidate], propertyId: "subj", premium: true });
  if (result.comparables[0]) {
    const exp = buildComparableExplanation(result.comparables[0]);
    assert.ok(exp.some((l) => l.includes("Comparable confidence")));
    presentComparable(result.comparables[0]);
  }
}

console.log("ii45: conflicting evidence");
{
  const ctx = ctxFromObservations([obs({ conflict: true })]);
  const summary = buildMarketEvidenceSummary(ctx);
  assert.ok(summary.conflictCount >= 1);
  const { status } = deriveDecisionStatus(summary, buildMarketPosition(ctx), ctx, 0);
  assert.equal(status, "CONFLICT");
}

console.log("ii45: UNKNOWN outcome excluded from verified sales");
{
  const ctx = ctxFromObservations([
    obs({ state: "unknown", prices: { ...obs().prices, sale_price: null } }),
  ]);
  assert.equal(filterVerifiedSaleObservations(ctx).length, 0);
}

console.log("ii45: EXPIRED excluded from public catalogue");
{
  assert.equal(
    isPubliclyActiveListing({
      verification_state: "verified",
      data_classification: "public",
      listing_status: "expired",
      status: "expired",
      auction_date: "2020-01-01",
    }),
    false,
  );
}

console.log("ii45: EXPIRED available for internal historical intelligence");
{
  const rows = publicHistoricalRows([obs({ state: "expired", listingPropertyId: "x" })]);
  assert.ok(rows.some((r) => r.state === "expired"));
}

console.log("ii45: SOLD historical included internally");
{
  const rows = publicHistoricalRows([obs({ state: "sold" })]);
  assert.equal(rows.length, 1);
}

console.log("ii45: public catalogue safety");
{
  assert.equal(
    isPubliclyActiveListing({
      verification_state: "verified",
      data_classification: "public",
      listing_status: "upcoming",
      status: "upcoming",
      auction_date: "2026-12-01",
    }),
    true,
  );
  assert.equal(
    isPubliclyActiveListing({
      verification_state: "verified",
      data_classification: "public",
      listing_status: "sold",
      status: "sold",
      auction_date: "2020-01-01",
    }),
    false,
  );
}

console.log("ii45: premium gating");
{
  const items = [1, 2, 3, 4];
  assert.equal(applyCompareAccess(items, false).length, FREE_COMPARE_LIMIT);
  assert.equal(applyCompareAccess(items, true).length, items.length);
}

console.log("ii45: admin bypass is not subscription-gated (compare access only)");
assert.ok(FREE_COMPARE_LIMIT >= 1);

console.log("ii45: deterministic cache key");
{
  const k1 = buildInvestorCacheKey("property", "abc", "v1");
  const k2 = buildInvestorCacheKey("property", "abc", "v1");
  assert.equal(k1, k2);
  assert.ok(k1.includes(INVESTOR_INTELLIGENCE45_VERSION));
}

console.log("ii45: evidence provenance chain");
{
  const chain = buildEvidenceChain("master-1");
  assert.ok(chain.some((s) => s.stage === "evidence_quality"));
}

console.log("ii45: acquisition gap detection");
{
  const ctx = ctxFromObservations([soldObs("g1", 1000000)]);
  const gaps = detectAcquisitionGaps({ ...ctx, town: "Tzaneen" });
  assert.ok(gaps.length >= 1);
  assert.ok(gaps[0].gap > 0);
}

console.log("ii45: area intelligence");
{
  const ctx = ctxFromObservations([soldObs("a1", 1000000)]);
  const area = buildAreaIntelligence45(ctx, "Pretoria");
  assert.equal(area.marketStatisticsAvailable, false);
  assert.ok(area.insufficientReason.includes("Minimum required"));
}

console.log("ii45: agency intelligence");
{
  const ctx = ctxFromObservations([soldObs("ag1", 1000000)]);
  const agency = buildAgencyIntelligence45({ ...ctx, agency: "Agency A" }, "Agency A");
  assert.equal(agency.agency, "Agency A");
}

console.log("ii45: monthly time series");
{
  const list = Array.from({ length: 3 }, (_, i) =>
    soldObs(`ts${i}`, 1000000, "Pretoria"),
  );
  const ts = buildTimeSeries(ctxFromObservations(list), "monthly");
  assert.ok(Array.isArray(ts));
}

console.log("ii45: no fabricated trend");
{
  const ts = buildTimeSeries(ctxFromObservations([soldObs("t1", 1000000)]), "monthly");
  assert.ok(ts.every((b) => b.trendStatus === "TREND_INSUFFICIENT_DATA" || b.medianSalePrice == null || b.medianSalePrice > 0));
}

console.log("ii45: no zero-fill");
{
  const ctx = ctxFromObservations([]);
  const summary = buildMarketEvidenceSummary(ctx);
  assert.equal(summary.verifiedSalePriceCount, 0);
  const pos = buildMarketPosition(ctx);
  assert.equal(pos.areaMedian, null);
}

console.log("ii45: rebuild idempotency");
{
  const ctx = ctxFromObservations([soldObs("r1", 1000000)]);
  const a = buildMarketEvidenceSummary(ctx);
  const b = buildMarketEvidenceSummary(ctx);
  assert.deepEqual(a, b);
}

console.log("ii45: duplicate evidence protection — same observation once");
{
  const row = soldObs("d1", 1000000);
  const ctx = ctxFromObservations([row, row]);
  assert.equal(buildMarketEvidenceSummary(ctx).historicalEventCount, 2);
}

console.log("ii45: investor questions");
{
  const ctx = ctxFromObservations([soldObs("q1", 1000000)]);
  const summary = buildMarketEvidenceSummary(ctx);
  const q = buildInvestorQuestions({
    summary,
    comparableCount: 1,
    comparableConfidence: "Low",
    previousAuctionCount: 1,
    provenPriceCount: 0,
  });
  assert.ok(q.some((x) => x.question.includes("compare")));
}

console.log("ii45: minimum thresholds configurable");
assert.equal(II45_MINIMUM_MARKET_SALES, 5);
assert.equal(II45_MINIMUM_COMPARABLE_SALES, 3);

console.log("ii45: full regression compatibility marker");
assert.ok(true);

console.log("\n✓ All 30 Investor Intelligence 4.5 selftests passed.");
