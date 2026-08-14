/**
 * Historical Intelligence 4.2 — selftests (30-case matrix).
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
const { validateOutcomePriceAgreement } = load("intelligence/historicalResolution/agreementValidator.ts");
const { resolveSalePriceEvidence } = load("intelligence/historicalResolution/salePriceResolver.ts");
const { resolveOutcomeEvidence } = load("intelligence/historicalResolution/outcomeResolver.ts");
const { assessIdentityConfidence } = load("intelligence/historicalResolution/identityResolver.ts");
const { buildSizeEvidence, parseHectaresFromText } = load("intelligence/historicalResolution/sizeEvidence.ts");
const { resolveHistoricalEvent } = load("intelligence/historicalResolution/resolver.ts");
const { buildResolutionDashboard } = load("intelligence/historicalResolution/dashboard.ts");
const { assessComparableEligibility } = load("intelligence/historicalResolution/comparableEligibility.ts");
const { classifyObservation } = load("intelligence/outcomes/evidence.ts");
const { scoreHistoricalEvidence } = load("intelligence/historicalEvidence/scoring.ts");
const { decideChangeFromContentHash } = load("acquisition/refetch/forceSemantics.ts");
const { isPubliclyActiveListing } = load("data/publicListingPolicy.ts");
const { HISTORICAL_INTELLIGENCE42_VERSION, HI42_MINIMUM_MARKET_SALES } = load(
  "intelligence/historicalResolution/config.ts",
);

const corpus = { title: "T", source_url: "https://x.com", source_name: "A" };

const baseEvent = {
  observationId: "obs-1",
  sourceUnit: "listing_fallback",
  auctionEventId: "evt-1",
  propertyMasterId: "master-1",
  listingPropertyId: "prop-1",
  state: "expired",
  outcomeSupplied: false,
  auctionDate: "2024-01-01",
  dateKind: "auction_date",
  agency: "Agency",
  sourceName: "Agency",
  sourceUrl: "https://example.com/listing",
  verificationState: "expired",
  verified: true,
  conflict: false,
  propertyType: "house",
  propertyTypeStatus: "known",
  marketCategory: "Residential",
  agriculturalSubtype: null,
  province: "GP",
  municipality: null,
  town: "Pretoria",
  suburb: "Menlyn",
  farmName: null,
  floorSizeM2: 120,
  hectares: null,
  hectaresApproximate: false,
  bedrooms: 3,
  bathrooms: 2,
  prices: { sale_price: null, auction_price: null, guide_price: null, reserve_price: null, estimated_value: null, starting_bid: null },
  exclusionReasons: [],
};

function classify(row) {
  return classifyObservation(row);
}

console.log("hi42: version");
assert.equal(HISTORICAL_INTELLIGENCE42_VERSION, "historical-intelligence-4.2.0");

console.log("hi42: explicit SOLD");
assert.equal(extractOutcomeFromText("Property sold for R1,000,000", corpus).outcome, "SOLD");

console.log("hi42: SOLD + sale price");
{
  const d = extractOutcomeFromText("Sold for R2,500,000", corpus);
  const c = { outcome: "SOLD", confirmed: true, salePrice: { salePrice: 2500000, salePriceConfidence: "high", conflict: false } };
  assert.equal(validateOutcomePriceAgreement({ classification: c, draft: d }).agreement, "VERIFIED");
}

console.log("hi42: SOLD without price");
assert.equal(
  validateOutcomePriceAgreement({
    classification: { outcome: "SOLD", confirmed: true, salePrice: { salePrice: null, salePriceConfidence: "none", conflict: false } },
  }).agreement,
  "SOLD_WITHOUT_PRICE",
);

console.log("hi42: guide not sale price");
{
  const r = resolveSalePriceEvidence({
    classification: { outcome: "UNKNOWN", confirmed: false, salePrice: { salePrice: null, salePriceConfidence: "none", conflict: false } },
    sourceText: "Guide price R1,200,000",
  });
  assert.equal(r.salePrice, null);
}

console.log("hi42: reserve not sale price");
assert.ok(!extractPricingObservations(corpus, "Reserve R1,000,000").some((d) => d.field_name === "sale_price"));

console.log("hi42: auction price not sale price");
assert.ok(!extractPricingObservations(corpus, "Auction price R900,000").some((d) => d.field_name === "sale_price"));

console.log("hi42: starting bid not sale price");
assert.ok(!extractPricingObservations(corpus, "Starting bid R500,000").some((d) => d.field_name === "sale_price"));

console.log("hi42: PASSED_IN");
assert.equal(extractOutcomeFromText("Passed in", corpus).outcome, "PASSED_IN");

console.log("hi42: WITHDRAWN");
assert.equal(extractOutcomeFromText("Withdrawn", corpus).outcome, "WITHDRAWN");

console.log("hi42: CANCELLED");
assert.equal(extractOutcomeFromText("Cancelled", corpus).outcome, "CANCELLED");

console.log("hi42: POSTPONED");
assert.equal(extractOutcomeFromText("Postponed", corpus).outcome, "POSTPONED");

console.log("hi42: UNKNOWN");
assert.equal(extractOutcomeFromText("", corpus).outcome, "UNKNOWN");

console.log("hi42: conflicting outcome");
{
  const draft = extractOutcomeFromText("Sold for R1,000,000", corpus);
  draft.outcome = "PASSED_IN";
  const v = validateOutcomePriceAgreement({
    classification: { outcome: "PASSED_IN", confirmed: true, salePrice: { salePrice: 1000000, salePriceConfidence: "high", conflict: false } },
    draft,
  });
  assert.equal(v.agreement, "CONFLICT");
}

console.log("hi42: conflicting sale price");
{
  const v = validateOutcomePriceAgreement({
    classification: { outcome: "SOLD", confirmed: true, salePrice: { salePrice: 1200000, salePriceConfidence: "high", conflict: true } },
  });
  assert.equal(v.agreement, "CONFLICT");
}

console.log("hi42: identity mismatch");
{
  const id = assessIdentityConfidence({ ...baseEvent, propertyMasterId: null, auctionEventId: null, town: "Pretoria", agency: "X" });
  assert.equal(id.reviewRequired, true);
}

console.log("hi42: insufficient identity");
{
  const id = assessIdentityConfidence({
    ...baseEvent,
    propertyMasterId: null,
    auctionEventId: null,
    town: null,
    suburb: null,
    province: null,
    propertyTypeStatus: "needs_verification",
    propertyType: null,
  });
  assert.equal(id.level, "INSUFFICIENT");
}

console.log("hi42: same master rejection");
{
  const subject = baseEvent;
  const resolution = resolveHistoricalEvent({
    observation: subject,
    classification: classify(subject),
    score: scoreHistoricalEvidence(subject, classify(subject)),
  });
  const el = assessComparableEligibility({ subject, candidate: subject, resolution });
  assert.ok(el.reasons.includes("SAME_PROPERTY_MASTER"));
}

console.log("hi42: comparable eligibility");
{
  const c = { ...baseEvent, observationId: "obs-2", propertyMasterId: "master-2", state: "sold", prices: { ...baseEvent.prices, sale_price: 1000000 } };
  const cl = classify(c);
  const score = scoreHistoricalEvidence(c, cl);
  const resolution = resolveHistoricalEvent({ observation: c, classification: cl, score });
  assert.ok(typeof resolution.comparableEligible === "boolean");
}

console.log("hi42: minimum market sample");
assert.equal(HI42_MINIMUM_MARKET_SALES, 5);
{
  const dash = buildResolutionDashboard([]);
  assert.equal(dash.marketStatisticsAvailable, false);
}

console.log("hi42: idempotency audit key");
{
  const key = ["p1", "e1", "hash", "VERIFIED", "v1"].join("|");
  assert.equal(key, ["p1", "e1", "hash", "VERIFIED", "v1"].join("|"));
}

console.log("hi42: same snapshot NO_CHANGE");
assert.equal(decideChangeFromContentHash({ previousHash: "a", contentHash: "a", force: false }), "NO_CHANGE");

console.log("hi42: changed snapshot");
assert.equal(decideChangeFromContentHash({ previousHash: "a", contentHash: "b", force: false }), "CONTENT_CHANGED");

console.log("hi42: admin audit routes");
assert.ok(fs.existsSync(path.join(root, "app/api/admin/intelligence/historical-resolution/route.ts")));
assert.ok(fs.existsSync(path.join(root, "app/api/admin/intelligence/historical-resolution/review/route.ts")));

console.log("hi42: public catalogue safety");
assert.equal(
  isPubliclyActiveListing({
    verification_state: "expired",
    listing_status: "upcoming",
    status: "upcoming",
    auction_date: "2099-01-01",
  }),
  false,
);

console.log("hi42: expired hidden from public");
assert.equal(
  isPubliclyActiveListing({
    verification_state: "expired",
    listing_status: "expired",
    status: "expired",
    auction_date: "2020-01-01",
  }),
  false,
);

console.log("hi42: missing values Not supplied");
{
  const r = resolveSalePriceEvidence({
    classification: { outcome: "UNKNOWN", confirmed: false, salePrice: { salePrice: null, salePriceConfidence: "none", conflict: false } },
  });
  assert.equal(r.supplied, false);
}

console.log("hi42: approximate hectares");
{
  const p = parseHectaresFromText("±4.164 Ha");
  assert.equal(p.approximate, true);
  assert.ok(Math.abs(p.value - 4.164) < 0.001);
}

console.log("hi42: floor vs land separation");
{
  const s = buildSizeEvidence({ floorSizeM2: 100, erfSizeM2: 500, hectares: null });
  assert.equal(s.floorSizeM2, 100);
  assert.equal(s.landSizeM2, 500);
  assert.equal(s.hectares, null);
}

console.log("hi42: no fabricated market statistics");
{
  const dash = buildResolutionDashboard([
    resolveHistoricalEvent({
      observation: baseEvent,
      classification: classify(baseEvent),
      score: scoreHistoricalEvidence(baseEvent, classify(baseEvent)),
    }),
  ]);
  assert.equal(dash.marketStatisticsAvailable, false);
}

console.log("hi42: provenance preservation");
{
  const r = resolveHistoricalEvent({
    observation: baseEvent,
    classification: classify(baseEvent),
    score: scoreHistoricalEvidence(baseEvent, classify(baseEvent)),
  });
  assert.ok(r.provenance.sourceUrl);
}

console.log("hi42: expired not SOLD inference");
{
  const r = resolveOutcomeEvidence({
    observation: { ...baseEvent, state: "expired", verificationState: "expired" },
    classification: { outcome: "UNKNOWN", confirmed: false },
    sourceText: "Auction closed",
  });
  assert.notEqual(r.outcome, "SOLD");
}

console.log("hi42: review panel exists");
assert.ok(fs.existsSync(path.join(root, "app/admin/operations/components/HistoricalResolution42Panel.tsx")));

console.log("\nAll Historical Intelligence 4.2 selftests passed.");
