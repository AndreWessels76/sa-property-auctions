/**
 * Pricing Data Acquisition 1.0 — deterministic selftests.
 * Run: node scripts/pricing-data-acquisition-selftest.cjs
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
  cache.set(abs, mod.exports);
  mod._compile(code, abs);
  cache.set(abs, mod.exports);
  return mod.exports;
}

function load(rel) {
  return loadFromAbs(path.join(root, "lib", rel));
}

const {
  parseZarAmount,
  parseMoneyExpression,
  acresToHectares,
  PRICING_PARSER_VERSION,
} = load("acquisition/pricing/pricingParser.ts");
const {
  normalizeFloorSizeFromText,
  normalizeLandSizeObservation,
} = load("acquisition/pricing/pricingNormalizer.ts");
const {
  extractPricingObservations,
} = load("acquisition/pricing/pricingExtractor.ts");
const { validatePricingDrafts, isPricingNotSupplied } = load(
  "acquisition/pricing/pricingValidator.ts",
);
const { detectPricingConflicts } = load(
  "acquisition/pricing/pricingConflict.ts",
);
const { isPubliclyActiveListing } = load("data/publicListingPolicy.ts");
const { runDueDiligenceExtraction, corpusFromProperty } = load(
  "dueDiligence/extraction/extractionService.ts",
);
// corpusFromProperty is in sourceExtractor — load via index if needed
const dd = load("dueDiligence/extraction/index.ts");

console.log("PRICING_PARSER_VERSION", PRICING_PARSER_VERSION);

// --- Currency ---
assert.equal(parseZarAmount("R2 500 000"), 2500000);
assert.equal(parseZarAmount("R2,500,000"), 2500000);
assert.equal(parseZarAmount("R2.5 million"), 2500000);
assert.equal(parseZarAmount("ZAR 2500000"), 2500000);
assert.equal(parseZarAmount("R2 500 000,00"), 2500000);
assert.equal(parseZarAmount("R2,500,000.00"), 2500000);
assert.equal(parseZarAmount("$100,000"), null);
assert.equal(parseZarAmount("EUR 100000"), null);

const approx = parseMoneyExpression("± R2,500,000");
assert.ok(approx);
assert.equal(approx.amount, 2500000);
assert.equal(approx.isApproximate, true);

const range = parseMoneyExpression("R2m – R2.5m");
assert.ok(range);
assert.equal(range.isRange, true);
assert.equal(range.minValue, 2000000);
assert.equal(range.maxValue, 2500000);

// --- Semantics ---
const corpus = {
  source_name: "Bidders Choice",
  source_url: "https://example.com/listing",
  verification_state: "verified",
};
const text = `
Guide Price: R2,500,000
Reserve: R2,000,000
Starting Bid: R1,500,000
Estimated Value: R3,000,000
From R1,200,000
Floor area: 200 m²
Combined Extent: ±4.164Ha
`;

const drafts = extractPricingObservations(corpus, text);
const byField = Object.fromEntries(drafts.map((d) => [d.field_name, d]));

assert.equal(byField.guide_price.normalized_value, 2500000);
assert.equal(byField.reserve_price.normalized_value, 2000000);
assert.equal(byField.starting_bid.normalized_value, 1500000);
assert.equal(byField.starting_bid.status, "needs_verification");
assert.equal(byField.estimated_value.normalized_value, 3000000);
assert.equal(byField.from_price.status, "needs_verification");
assert.equal(byField.floor_size_m2.normalized_value, 200);
assert.equal(byField.total_hectares.normalized_value, 4.164);
assert.equal(byField.total_hectares.is_approximate, true);

// Starting bid must NOT become reserve
assert.notEqual(byField.starting_bid.field_name, "reserve_price");
assert.equal(byField.reserve_price.normalized_value, 2000000);

// No fabrication when empty
const empty = extractPricingObservations(corpus, "Beautiful home in Johannesburg");
assert.equal(isPricingNotSupplied(empty), true);

// Structured auction_price must stay auction_price (not guide)
const structured = extractPricingObservations(
  { ...corpus, auction_price: 1800000 },
  "No guide text",
);
assert.ok(structured.some((d) => d.field_name === "auction_price" && d.normalized_value === 1800000));
assert.ok(!structured.some((d) => d.field_name === "guide_price"));

// Zero anomaly
const zero = validatePricingDrafts([
  {
    field_name: "auction_price",
    raw_value: "R0",
    normalized_value: 0,
    currency: "ZAR",
    is_approximate: false,
    is_range: false,
    min_value: null,
    max_value: null,
    status: "extracted",
    evidence_text: "R0",
    source_name: "x",
    source_url: null,
    parser_version: PRICING_PARSER_VERSION,
    extraction_method: "deterministic_text",
    conversion_method: null,
    notes: null,
  },
]);
assert.equal(zero.drafts[0].status, "anomaly");

// Acres conversion
const acres = normalizeLandSizeObservation("10 acres");
assert.ok(acres);
assert.ok(acres.conversionMethod);
assert.ok(Math.abs(acres.hectares - acresToHectares(10)) < 1e-6);

const floor = normalizeFloorSizeFromText("Building size: 200 m²");
assert.equal(floor.m2, 200);
const notFloor = normalizeFloorSizeFromText("Erf size: 500 m²");
assert.equal(notFloor, null);

// Conflicts — verified protected
const conflicts = detectPricingConflicts({
  existing: [
    {
      field_name: "auction_price",
      normalized_value: 2000000,
      status: "verified",
      source_name: "old",
      evidence_text: "R2m",
    },
  ],
  incoming: [
    {
      field_name: "auction_price",
      raw_value: "R2200000",
      normalized_value: 2200000,
      currency: "ZAR",
      is_approximate: false,
      is_range: false,
      min_value: null,
      max_value: null,
      status: "extracted",
      evidence_text: "R2.2m",
      source_name: "new",
      source_url: null,
      parser_version: PRICING_PARSER_VERSION,
      extraction_method: "deterministic_text",
      conversion_method: null,
      notes: null,
    },
  ],
});
assert.equal(conflicts.length, 1);
assert.equal(conflicts[0].old_value, 2000000);
assert.equal(conflicts[0].new_value, 2200000);

// DD pipeline includes pricing fields
const extraction = dd.runDueDiligenceExtraction(
  dd.corpusFromProperty({
    title: "Test",
    source_name: "Bidders Choice",
    source_url: "https://example.com",
    verification_state: "verified",
    source_page_text: "Guide Price: R1,100,000\nFloor area: 90m2",
  }),
);
assert.ok(extraction.fields.some((f) => f.field === "guide_price"));
assert.ok(extraction.fields.some((f) => f.field === "floor_size_m2" || f.field === "floor_size"));

// Public catalogue policy regression
assert.equal(
  isPubliclyActiveListing({
    verification_state: "verified",
    listing_status: "upcoming",
    status: "upcoming",
    auction_date: "2026-09-01",
  }),
  true,
);
assert.equal(
  isPubliclyActiveListing({
    verification_state: "verified",
    listing_status: "expired",
    status: "expired",
    auction_date: "2024-01-01",
  }),
  false,
);

console.log("pricing-data-acquisition-selftest: PASS");
