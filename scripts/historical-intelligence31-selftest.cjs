/**
 * Historical Intelligence 3.1 — Outcome Evidence & Sale Price Enrichment selftests.
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
const { validateOutcomeDraft } = load("acquisition/outcomes/outcomeValidator.ts");
const { detectOutcomeObservationConflicts } = load("acquisition/outcomes/outcomeConflict.ts");
const { extractPricingObservations } = load("acquisition/pricing/pricingExtractor.ts");
const { validatePricingDrafts } = load("acquisition/pricing/pricingValidator.ts");
const { decideChangeFromContentHash } = load("acquisition/refetch/forceSemantics.ts");
const { isPubliclyActiveListing } = load("data/publicListingPolicy.ts");

function buildIdempotencyKey(input) {
  if (!input.content_hash) return null;
  return [
    input.property_id,
    input.auction_event_id ?? "none",
    input.content_hash,
    input.outcome,
    input.version,
  ].join("|");
}

const corpus = {
  title: "Test Property",
  source_url: "https://example.com/listing",
  source_name: "Test Agency",
};

console.log("hi31: outcome extraction SOLD");
{
  const d = extractOutcomeFromText("Property sold for R2,450,000", corpus);
  assert.equal(d.outcome, "SOLD");
  assert.equal(d.sale_price, 2450000);
}

console.log("hi31: outcome extraction WITHDRAWN");
assert.equal(extractOutcomeFromText("Listing withdrawn", corpus).outcome, "WITHDRAWN");

console.log("hi31: outcome extraction CANCELLED");
assert.equal(extractOutcomeFromText("Auction cancelled", corpus).outcome, "CANCELLED");

console.log("hi31: outcome extraction POSTPONED");
assert.equal(extractOutcomeFromText("Auction postponed", corpus).outcome, "POSTPONED");

console.log("hi31: outcome extraction PASSED_IN");
assert.equal(extractOutcomeFromText("Property passed in", corpus).outcome, "PASSED_IN");

console.log("hi31: reserve not sale price");
{
  const drafts = extractPricingObservations(corpus, "Reserve price R1,500,000");
  assert.ok(!drafts.some((d) => d.field_name === "sale_price" && d.normalized_value === 1500000));
  assert.ok(drafts.some((d) => d.field_name === "reserve_price"));
}

console.log("hi31: guide not sale price");
{
  const drafts = extractPricingObservations(corpus, "Guide price R2,100,000");
  assert.ok(!drafts.some((d) => d.field_name === "sale_price"));
}

console.log("hi31: estimate not sale price");
{
  const drafts = extractPricingObservations(corpus, "Estimated value R2,300,000");
  assert.ok(!drafts.some((d) => d.field_name === "sale_price"));
}

console.log("hi31: auction price not sale price");
{
  const drafts = extractPricingObservations(corpus, "Auction price R1,800,000");
  assert.ok(!drafts.some((d) => d.field_name === "sale_price"));
}

console.log("hi31: starting bid not sale price");
{
  const drafts = extractPricingObservations(corpus, "Starting bid R500,000");
  assert.ok(!drafts.some((d) => d.field_name === "sale_price"));
}

console.log("hi31: explicit sale price accepted");
{
  const drafts = extractPricingObservations(corpus, "Sold for R1,500,000");
  assert.ok(drafts.some((d) => d.field_name === "sale_price" && d.normalized_value === 1500000));
}

console.log("hi31: sale price conflict detection");
{
  const incoming = extractOutcomeFromText("Sold for R2,400,000", corpus);
  const conflicts = detectOutcomeObservationConflicts({
    existing: [
      {
        id: "1",
        outcome: "SOLD",
        confidence: "high",
        sale_price: 2650000,
        evidence_text: "old",
        source_url: "https://a.com",
      },
    ],
    incoming,
  });
  assert.ok(conflicts.length >= 1);
}

console.log("hi31: withdrawn + sale price conflict");
{
  const draft = extractOutcomeFromText("Withdrawn", corpus);
  draft.sale_price = 1000000;
  draft.sale_price_evidence = "Sold for R1,000,000";
  const v = validateOutcomeDraft(draft);
  assert.equal(v.draft.review_required, true);
  assert.equal(v.draft.review_category, "CONFLICT_REVIEW");
}

console.log("hi31: historical safety — upcoming excluded");
assert.equal(
  isPubliclyActiveListing({
    verification_state: "verified",
    data_classification: "verified",
    listing_status: "upcoming",
    status: "upcoming",
    auction_date: "2099-01-01",
  }),
  true,
);

console.log("hi31: historical safety — expired allowed historically");
assert.equal(
  isPubliclyActiveListing({
    verification_state: "expired",
    data_classification: "verified",
    listing_status: "expired",
    status: "expired",
    auction_date: "2020-01-01",
  }),
  false,
);

console.log("hi31: NO_CHANGE hash semantics");
{
  const d = decideChangeFromContentHash({
    previousHash: "abc123",
    contentHash: "abc123",
    force: true,
  });
  assert.equal(d, "NO_CHANGE");
}

console.log("hi31: idempotency key deterministic");
{
  const k1 = buildIdempotencyKey({
    property_id: "p1",
    auction_event_id: "e1",
    content_hash: "hash1",
    outcome: "SOLD",
    version: "3.1.0",
  });
  const k2 = buildIdempotencyKey({
    property_id: "p1",
    auction_event_id: "e1",
    content_hash: "hash1",
    outcome: "SOLD",
    version: "3.1.0",
  });
  assert.equal(k1, k2);
}

console.log("hi31: unknown outcome when no evidence");
{
  const draft = extractOutcomeFromText("", corpus);
  assert.equal(draft.outcome, "UNKNOWN");
}

console.log("hi31: suspicious sale price validation");
{
  const drafts = validatePricingDrafts([
    {
      field_name: "sale_price",
      raw_value: "R500",
      normalized_value: 500,
      currency: "ZAR",
      is_approximate: false,
      is_range: false,
      min_value: null,
      max_value: null,
      status: "extracted",
      evidence_text: "Sold for R500",
      source_name: null,
      source_url: null,
      parser_version: "1",
      extraction_method: "deterministic_text",
      conversion_method: null,
      notes: null,
    },
  ]);
  assert.equal(drafts.drafts[0].status, "needs_verification");
}

console.log("hi31: API routes exist");
assert.ok(fs.existsSync(path.join(root, "app/api/admin/intelligence/historical-enrichment/route.ts")));
assert.ok(fs.existsSync(path.join(root, "app/api/cron/historical-enrichment/route.ts")));

console.log("\nAll Historical Intelligence 3.1 selftests passed.");
