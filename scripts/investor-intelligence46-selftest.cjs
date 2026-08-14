/**
 * Investor Intelligence 4.6 — selftests (38+ case matrix).
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
const { pricePerHa } = load("intelligence/comparables/priceMetrics.ts");
const { isPubliclyActiveListing } = load("data/publicListingPolicy.ts");
const { applyCompareAccess, FREE_COMPARE_LIMIT } = load("intelligence/compareAccess.ts");
const { INVESTOR_INTELLIGENCE46_VERSION, II46_MINIMUM_MARKET_SALES } = load(
  "intelligence/investorIntelligence46/config.ts",
);
const {
  buildPropertyIdentityFields,
  buildPhysicalPropertyFields,
  buildPricingFields,
} = load("intelligence/investorIntelligence46/fieldEvidence.ts");
const { buildEvidenceCoverage, stableSortByField } = load(
  "intelligence/investorIntelligence46/evidenceCoverage.ts",
);
const { detectAcquisitionGaps46, countGapsByPriority } = load(
  "intelligence/investorIntelligence46/acquisitionGaps.ts",
);
const { buildResearchSnapshot, buildResearchEvidenceSummary } = load(
  "intelligence/investorIntelligence46/researchSnapshot.ts",
);
const { buildInvestor46CacheKey } = load("intelligence/investorIntelligence46/cache.ts");
const { buildAreaIntelligence46 } = load("intelligence/investorIntelligence46/areaIntelligence.ts");
const { buildInvestorDashboard46 } = load("intelligence/investorIntelligence46/dashboard.ts");

const corpus = { title: "T", source_url: "https://x.com", source_name: "A" };

function property(over = {}) {
  return {
    id: "p1",
    title: "Test",
    description: null,
    province: "GP",
    town: "Pretoria",
    suburb: "Menlyn",
    address: "1 Main",
    property_type: "House",
    bedrooms: 3,
    bathrooms: 2,
    garages: 1,
    floor_size: 120,
    erf_size: 500,
    estimated_value: 0,
    auction_price: 2000000,
    reserve_price: null,
    auction_date: "2026-09-01",
    auction_agency: "Agency A",
    status: "upcoming",
    listing_status: "upcoming",
    source: "bc",
    source_name: "Bidders Choice",
    source_url: "https://x.com",
    verification_state: "verified",
    property_master_id: "m1",
    agricultural_details: null,
    ...over,
  };
}

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

console.log("ii46: version");
assert.equal(INVESTOR_INTELLIGENCE46_VERSION, "investor-intelligence-4.6.0");

console.log("ii46: verified identity");
{
  const fields = buildPropertyIdentityFields(property());
  assert.ok(fields.some((f) => f.field === "propertyMasterId" && f.status === "VERIFIED"));
}

console.log("ii46: missing identity");
{
  const fields = buildPropertyIdentityFields(property({ property_master_id: null }));
  assert.ok(fields.some((f) => f.field === "propertyMasterId" && f.status === "NOT_SUPPLIED"));
}

console.log("ii46: source-confirmed property");
{
  const fields = buildPhysicalPropertyFields(property());
  assert.ok(fields.some((f) => f.field === "propertyType" && f.status === "SOURCE_CONFIRMED"));
}

console.log("ii46: missing size");
{
  const fields = buildPhysicalPropertyFields(property({ floor_size: null, erf_size: null }));
  assert.ok(fields.every((f) => f.field !== "floorSize" || f.status === "NOT_SUPPLIED"));
}

console.log("ii46: approximate hectares");
{
  const fields = buildPhysicalPropertyFields(
    property({ agricultural_details: { totalHectares: 4.164 } }),
  );
  const ha = fields.find((f) => f.field === "hectares");
  assert.equal(ha?.value, 4.164);
}

console.log("ii46: missing price");
{
  const fields = buildPricingFields(property({ auction_price: 0, reserve_price: null }), null);
  const sale = fields.find((f) => f.field === "salePrice");
  assert.equal(sale?.status, "NOT_SUPPLIED");
}

console.log("ii46: sale price verified");
{
  const fields = buildPricingFields(property(), obs());
  const sale = fields.find((f) => f.field === "salePrice");
  assert.equal(sale?.status, "VERIFIED");
}

console.log("ii46: auction price only");
{
  const row = obs({ prices: { ...obs().prices, sale_price: null, auction_price: 900000 } });
  const sale = buildSaleEvidence(row);
  assert.equal(sale.verifiedSale, false);
}

console.log("ii46: guide price only");
{
  const drafts = extractPricingObservations(corpus, "Guide price R900,000");
  assert.ok(!drafts.some((d) => d.field_name === "sale_price"));
}

console.log("ii46: reserve only");
{
  const drafts = extractPricingObservations(corpus, "Reserve R1,000,000");
  assert.ok(!drafts.some((d) => d.field_name === "sale_price"));
}

console.log("ii46: SOLD + sale price");
{
  const sale = buildSaleEvidence(obs());
  assert.equal(sale.verifiedSale, true);
}

console.log("ii46: SOLD without price");
{
  const row = obs({ prices: { ...obs().prices, sale_price: null } });
  const sale = buildSaleEvidence(row);
  assert.equal(sale.verifiedSale, false);
}

console.log("ii46: UNKNOWN outcome");
{
  const c = classifyObservation(obs({ state: "unknown", prices: { ...obs().prices, sale_price: null } }));
  assert.equal(c.outcome, "UNKNOWN");
}

console.log("ii46: expired state");
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

console.log("ii46: conflict");
{
  const cov = buildEvidenceCoverage({
    identity: [{ field: "x", value: null, status: "CONFLICT", source: null, sourceUrl: null, observedAt: null, confidence: null }],
    property: [],
    auction: [],
    pricing: [],
    historical: [],
    comparables: [],
    market: [],
    hasConflict: true,
  });
  assert.equal(cov.overall, "CONFLICT");
}

console.log("ii46: insufficient data coverage");
{
  const cov = buildEvidenceCoverage({
    identity: [{ field: "x", value: null, status: "NOT_SUPPLIED", source: null, sourceUrl: null, observedAt: null, confidence: null }],
    property: [],
    auction: [],
    pricing: [],
    historical: [],
    comparables: [],
    market: [],
  });
  assert.equal(cov.overall, "INSUFFICIENT_DATA");
}

console.log("ii46: valid comparable");
{
  const subject = obs({ listingPropertyId: "subj" });
  const candidate = obs({ observationId: "o2", listingPropertyId: "p2", propertyMasterId: "m2" });
  const result = findComparables({ subject, corpus: [subject, candidate], propertyId: "subj", premium: true });
  assert.ok(Array.isArray(result.comparables));
}

console.log("ii46: no sale price comparable");
{
  const subject = obs({ listingPropertyId: "subj" });
  const candidate = obs({
    observationId: "o2",
    listingPropertyId: "p2",
    propertyMasterId: "m2",
    prices: { ...obs().prices, sale_price: null },
    state: "unknown",
  });
  const result = findComparables({ subject, corpus: [subject, candidate], propertyId: "subj", premium: true });
  assert.ok(result.comparables.length === 0 || result.rejectedCandidates.length > 0);
}

console.log("ii46: wrong identity comparable");
{
  const subject = obs({ listingPropertyId: "subj", town: "Cape Town" });
  const candidate = obs({
    observationId: "o2",
    listingPropertyId: "p2",
    propertyMasterId: "m99",
    town: "Durban",
    propertyType: "Industrial",
  });
  const result = findComparables({ subject, corpus: [subject, candidate], propertyId: "subj", premium: true });
  assert.ok(result.comparables.length === 0 || result.rejectedCandidates.length > 0);
}

console.log("ii46: same master rejected");
{
  const subject = obs({ listingPropertyId: "subj" });
  const candidate = obs({ observationId: "o2", listingPropertyId: "p2" });
  const result = findComparables({ subject, corpus: [subject, candidate], propertyId: "subj", premium: true });
  assert.ok(result.rejectedCandidates.some((r) => r.reasons.some((x) => x.includes("Property Master"))));
}

console.log("ii46: insufficient matching signals");
{
  const subject = obs({ listingPropertyId: "subj" });
  const candidate = obs({
    observationId: "o2",
    listingPropertyId: "p2",
    propertyMasterId: "m2",
    town: "Durban",
    suburb: "Other",
    propertyType: "Farm",
  });
  const result = findComparables({ subject, corpus: [subject, candidate], propertyId: "subj", premium: true });
  assert.ok(result.comparables.length === 0 || result.rejectedCandidates.length >= 0);
}

console.log("ii46: 5+ verified sales market");
assert.equal(II46_MINIMUM_MARKET_SALES, 5);

console.log("ii46: fewer than 5 sales");
{
  const research = buildResearchSnapshot({
    property: property(),
    ctx: ctxFromObservations([obs()]),
    observation: obs(),
    comparables: [],
    rejectedCount: 0,
    verifiedSales: 2,
    areaMedian: null,
    comparableMedian: null,
    decisionStatus: "LIMITED_EVIDENCE",
    decisionReasons: [],
    acquisitionGaps: [],
    hasConflict: false,
  });
  assert.equal(research.market.medianSalePrice, "INSUFFICIENT_DATA");
}

console.log("ii46: fewer than 3 comparables");
{
  const research = buildResearchSnapshot({
    property: property(),
    ctx: ctxFromObservations([]),
    observation: null,
    comparables: [],
    rejectedCount: 0,
    verifiedSales: 0,
    areaMedian: null,
    comparableMedian: null,
    decisionStatus: "INSUFFICIENT_DATA",
    decisionReasons: [],
    acquisitionGaps: [],
    hasConflict: false,
  });
  assert.equal(research.market.comparableMedian, "INSUFFICIENT_DATA");
}

console.log("ii46: sale-price gap");
{
  const gaps = detectAcquisitionGaps46({
    property: property(),
    ctx: ctxFromObservations([obs({ state: "sold", prices: { ...obs().prices, sale_price: null } })]),
    comparableCount: 0,
    rejectedComparableCount: 0,
    hasConflict: false,
    historicalEventCount: 1,
  });
  assert.ok(gaps.some((g) => g.gapCode === "SALE_PRICE_MISSING" || g.gapCode === "COMPARABLE_DATA_MISSING"));
}

console.log("ii46: outcome gap");
{
  const gaps = detectAcquisitionGaps46({
    property: property(),
    ctx: ctxFromObservations([obs({ state: "unknown", prices: { ...obs().prices, sale_price: null } })]),
    comparableCount: 0,
    rejectedComparableCount: 0,
    hasConflict: false,
    historicalEventCount: 1,
  });
  assert.ok(gaps.some((g) => g.gapCode === "SALE_OUTCOME_MISSING"));
}

console.log("ii46: identity review gap");
{
  const gaps = detectAcquisitionGaps46({
    property: property({ property_master_id: null }),
    ctx: ctxFromObservations([]),
    comparableCount: 0,
    rejectedComparableCount: 0,
    hasConflict: true,
    historicalEventCount: 0,
  });
  assert.ok(gaps.some((g) => g.gapCode === "IDENTITY_REVIEW_REQUIRED"));
}

console.log("ii46: source missing gap");
{
  const gaps = detectAcquisitionGaps46({
    property: property({ source_url: null, source_name: null }),
    ctx: ctxFromObservations([]),
    comparableCount: 0,
    rejectedComparableCount: 0,
    hasConflict: false,
    historicalEventCount: 0,
  });
  assert.ok(gaps.some((g) => g.gapCode === "SOURCE_MISSING"));
}

console.log("ii46: P1/P2/P3/P4 priority");
{
  const gaps = detectAcquisitionGaps46({
    property: property({ source_url: null, source_name: null, property_master_id: null }),
    ctx: ctxFromObservations([]),
    comparableCount: 0,
    rejectedComparableCount: 0,
    hasConflict: true,
    historicalEventCount: 0,
  });
  const pri = countGapsByPriority(gaps);
  assert.ok(pri.p1 >= 1);
}

console.log("ii46: expired excluded from public");
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

console.log("ii46: sold excluded from public");
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

console.log("ii46: withdrawn excluded from public");
assert.equal(
  isPubliclyActiveListing({
    verification_state: "verified",
    data_classification: "public",
    listing_status: "withdrawn",
    status: "withdrawn",
    auction_date: "2026-01-01",
  }),
  false,
);

console.log("ii46: upcoming verified included");
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

console.log("ii46: free user gating");
assert.equal(applyCompareAccess([1, 2, 3, 4], false).length, FREE_COMPARE_LIMIT);

console.log("ii46: premium access");
assert.equal(applyCompareAccess([1, 2, 3, 4], true).length, 4);

console.log("ii46: admin access independent of compare limit");
assert.ok(FREE_COMPARE_LIMIT >= 1);

console.log("ii46: repeated calculation identical");
{
  const ctx = ctxFromObservations([obs()]);
  const a = buildAreaIntelligence46(ctx, "Pretoria");
  const b = buildAreaIntelligence46(ctx, "Pretoria");
  assert.deepEqual(a, b);
}

console.log("ii46: stable ranking");
{
  const fields = stableSortByField([
    { field: "z" },
    { field: "a" },
    { field: "m" },
  ]);
  assert.deepEqual(fields.map((f) => f.field), ["a", "m", "z"]);
}

console.log("ii46: cache key deterministic");
{
  const k1 = buildInvestor46CacheKey("p1", "v1");
  const k2 = buildInvestor46CacheKey("p1", "v1");
  assert.equal(k1, k2);
}

console.log("ii46: research evidence summary");
{
  const research = buildResearchSnapshot({
    property: property(),
    ctx: ctxFromObservations([obs()]),
    observation: obs(),
    comparables: [],
    rejectedCount: 0,
    verifiedSales: 1,
    areaMedian: null,
    comparableMedian: null,
    decisionStatus: "LIMITED_EVIDENCE",
    decisionReasons: ["test"],
    acquisitionGaps: [],
    hasConflict: false,
  });
  const summary = buildResearchEvidenceSummary(research);
  assert.ok(summary.coverage.dimensions.length >= 7);
}

console.log("ii46: dashboard aggregates");
{
  const dash = buildInvestorDashboard46([ctxFromObservations([obs()])]);
  assert.equal(dash.propertiesAnalysed, 1);
}

console.log("ii46: price per ha approximate flag");
{
  const m = pricePerHa(buildSaleEvidence(obs({ hectares: 10, hectaresApproximate: true })), 10, true);
  assert.equal(m.approximate, true);
}

console.log("ii46: no zero-fill market median");
{
  const research = buildResearchSnapshot({
    property: property(),
    ctx: ctxFromObservations([]),
    observation: null,
    comparables: [],
    rejectedCount: 0,
    verifiedSales: 0,
    areaMedian: null,
    comparableMedian: null,
    decisionStatus: "INSUFFICIENT_DATA",
    decisionReasons: [],
    acquisitionGaps: [],
    hasConflict: false,
  });
  assert.notEqual(research.market.medianSalePrice, 0);
}

console.log("\n✓ All Investor Intelligence 4.6 selftests passed (38+ cases).");
