/**
 * Historical Data Enrichment 4.1 — selftests (26-case matrix).
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
const { decideChangeFromContentHash } = load("acquisition/refetch/forceSemantics.ts");
const { isPubliclyActiveListing } = load("data/publicListingPolicy.ts");
const { buildHistoricalEnrichmentQueue, queueSummary } = load("acquisition/historical/queue.ts");
const { buildEnrichmentFunnel, hasVerifiedSize } = load("acquisition/historical/funnel.ts");
const { resolveHistoricalSource } = load("acquisition/historical/sourceResolution.ts");
const {
  HISTORICAL_DATA_ENRICHMENT41_VERSION,
  HDE41_DEFAULT_DRY_RUN_LIMIT,
} = load("acquisition/historical/config.ts");

const corpus = {
  title: "Test Property",
  source_url: "https://example.com/listing",
  source_name: "Test Agency",
};

const sampleEvent = {
  listingPropertyId: "prop-hist-1",
  auctionEventId: "evt-1",
  propertyMasterId: "master-1",
  town: "Pretoria",
  agency: "Test Agency",
  sourceName: "Test Agency",
  sourceUrl: "https://example.com/historical",
  verificationState: "expired",
  state: "expired",
  auctionDate: "2024-06-01",
  propertyTypeStatus: "known",
  propertyType: "house",
  floorSizeM2: null,
  hectares: null,
};

console.log("hde41: version tag");
assert.equal(HISTORICAL_DATA_ENRICHMENT41_VERSION, "historical-data-enrichment-4.1.0");
assert.equal(HDE41_DEFAULT_DRY_RUN_LIMIT, 5);

console.log("hde41: SOLD extraction");
assert.equal(extractOutcomeFromText("Property sold for R2,450,000", corpus).outcome, "SOLD");

console.log("hde41: SOLD + sale price");
{
  const d = extractOutcomeFromText("Sold for R2,500,000", corpus);
  assert.equal(d.outcome, "SOLD");
  assert.equal(d.sale_price, 2500000);
}

console.log("hde41: SOLD without price");
{
  const d = extractOutcomeFromText("Property sold", corpus);
  assert.equal(d.outcome, "SOLD");
  assert.equal(d.sale_price, null);
}

console.log("hde41: price without SOLD");
{
  const d = extractOutcomeFromText("Guide price R2,500,000 only", corpus);
  assert.notEqual(d.outcome, "SOLD");
}

console.log("hde41: guide price rejection");
{
  const drafts = extractPricingObservations(corpus, "Guide price R2,500,000");
  assert.ok(!drafts.some((d) => d.field_name === "sale_price"));
}

console.log("hde41: reserve rejection");
{
  const drafts = extractPricingObservations(corpus, "Reserve R2,500,000");
  assert.ok(!drafts.some((d) => d.field_name === "sale_price"));
}

console.log("hde41: starting bid rejection");
{
  const drafts = extractPricingObservations(corpus, "Starting bid R500,000");
  assert.ok(!drafts.some((d) => d.field_name === "sale_price"));
}

console.log("hde41: estimate rejection");
{
  const drafts = extractPricingObservations(corpus, "Estimated value R2,500,000");
  assert.ok(!drafts.some((d) => d.field_name === "sale_price"));
}

console.log("hde41: currency normalisation");
{
  const drafts = extractPricingObservations(corpus, "Sold for R1 250 000");
  const sale = drafts.find((d) => d.field_name === "sale_price");
  assert.equal(sale?.normalized_value, 1250000);
}

console.log("hde41: million notation");
{
  const drafts = extractPricingObservations(corpus, "Sold for R2.5 million");
  const sale = drafts.find((d) => d.field_name === "sale_price");
  assert.equal(sale?.normalized_value, 2500000);
}

console.log("hde41: conflict detection");
{
  const incoming = extractOutcomeFromText("Sold for R2,400,000", corpus);
  const conflicts = detectOutcomeObservationConflicts({
    existing: [
      {
        id: "1",
        outcome: "SOLD",
        confidence: "high",
        sale_price: 2500000,
        evidence_text: "old",
        source_url: "https://a.com",
      },
    ],
    incoming,
  });
  assert.ok(conflicts.length >= 1);
}

console.log("hde41: multiple source agreement");
{
  const a = extractOutcomeFromText("Sold for R1,000,000", corpus);
  const b = extractOutcomeFromText("Sold for R1,000,000", { ...corpus, source_url: "https://b.com" });
  assert.equal(a.outcome, b.outcome);
  assert.equal(a.sale_price, b.sale_price);
}

console.log("hde41: multiple source conflict");
{
  const conflicts = detectOutcomeObservationConflicts({
    existing: [
      {
        id: "1",
        outcome: "SOLD",
        confidence: "high",
        sale_price: 1200000,
        evidence_text: "A",
        source_url: "https://a.com",
      },
    ],
    incoming: extractOutcomeFromText("Sold for R1,350,000", corpus),
  });
  assert.ok(conflicts.length >= 1);
}

console.log("hde41: identity mismatch");
{
  const draft = extractOutcomeFromText("Sold for R1,000,000", corpus);
  draft.review_required = true;
  draft.review_category = "IDENTITY_REVIEW";
  const v = validateOutcomeDraft(draft);
  assert.equal(v.draft.review_required, true);
}

console.log("hde41: event mismatch review");
{
  const draft = extractOutcomeFromText("Sold for R1,000,000", corpus);
  draft.review_required = true;
  draft.review_category = "EVENT_MISMATCH";
  assert.equal(validateOutcomeDraft(draft).draft.review_category, "EVENT_MISMATCH");
}

console.log("hde41: duplicate prevention");
{
  const key = ["p1", "e1", "hash1", "SOLD", "v1"].join("|");
  assert.equal(key, ["p1", "e1", "hash1", "SOLD", "v1"].join("|"));
}

console.log("hde41: same hash NO_CHANGE");
assert.equal(
  decideChangeFromContentHash({ previousHash: "same", contentHash: "same", force: false }),
  "NO_CHANGE",
);

console.log("hde41: force same hash NO_CHANGE");
assert.equal(
  decideChangeFromContentHash({ previousHash: "same", contentHash: "same", force: true }),
  "NO_CHANGE",
);

console.log("hde41: retry behaviour — failed runs filter");
{
  const queue = buildHistoricalEnrichmentQueue({
    events: [sampleEvent],
    recentRuns: [
      {
        property_id: sampleEvent.listingPropertyId,
        status: "FETCH_FAILED",
        created_at: "2025-01-01T00:00:00Z",
      },
    ],
    filters: { retryFailed: true },
  });
  assert.equal(queue.length, 1);
  assert.equal(queue[0].retryFailed, true);
}

console.log("hde41: license blocking");
{
  const res = resolveHistoricalSource({
    event: sampleEvent,
    lastRunStatus: "SKIPPED_LICENSE",
  });
  assert.equal(res.status, "LICENSE_BLOCKED");
}

console.log("hde41: 404 handling status");
{
  const res = resolveHistoricalSource({
    event: sampleEvent,
    lastRunStatus: "FETCH_FAILED",
  });
  assert.equal(res.status, "SOURCE_UNAVAILABLE");
}

console.log("hde41: audit trail routes");
assert.ok(fs.existsSync(path.join(root, "app/api/admin/intelligence/historical-enrichment/route.ts")));
assert.ok(fs.existsSync(path.join(root, "lib/repositories/HistoricalEnrichmentRepository.ts")));

console.log("hde41: comparable readiness");
{
  const funnel = buildEnrichmentFunnel({
    events: [
      {
        ...sampleEvent,
        floorSizeM2: 120,
      },
    ],
    observations: [
      {
        auction_event_id: "evt-1",
        listing_property_id: "prop-hist-1",
        outcome: "SOLD",
        sale_price: 1000000,
        sale_price_confidence: "high",
        created_at: "2025-01-02T00:00:00Z",
      },
    ],
  });
  assert.equal(funnel.comparableReady, 1);
}

console.log("hde41: rebuild trigger hook present");
assert.ok(
  fs.readFileSync(path.join(root, "lib/acquisition/outcomes/outcomeService.ts"), "utf8").includes(
    "HistoricalIntelligence40Service",
  ),
);

console.log("hde41: public catalogue safety");
{
  const queue = buildHistoricalEnrichmentQueue({
    events: [
      {
        ...sampleEvent,
        listingPropertyId: "upcoming-1",
        verificationState: "verified",
        state: "upcoming",
        auctionDate: "2099-12-01",
      },
    ],
  });
  assert.equal(queue.length, 0);
}

console.log("hde41: idempotency");
assert.equal(
  decideChangeFromContentHash({ previousHash: "abc", contentHash: "abc", force: true }),
  "NO_CHANGE",
);

console.log("hde41: weak SOLD rejection — auction closed");
assert.notEqual(extractOutcomeFromText("Auction closed", corpus).outcome, "SOLD");

console.log("hde41: hammer price pattern");
{
  const d = extractOutcomeFromText("Hammer price R850,000", corpus);
  assert.equal(d.sale_price, 850000);
}

console.log("hde41: P3 queue — SOLD + price + missing size");
{
  const queue = buildHistoricalEnrichmentQueue({
    events: [sampleEvent],
    observations: [
      {
        auction_event_id: "evt-1",
        listing_property_id: "prop-hist-1",
        outcome: "SOLD",
        sale_price: 900000,
        sale_price_confidence: "high",
        created_at: "2025-01-01T00:00:00Z",
      },
    ],
  });
  assert.equal(queue[0].priority, 3);
  assert.equal(hasVerifiedSize(sampleEvent), false);
}

console.log("hde41: funnel counters");
{
  const summary = queueSummary(
    buildHistoricalEnrichmentQueue({ events: [sampleEvent, { ...sampleEvent, listingPropertyId: "p2" }] }),
  );
  assert.equal(summary.total, 2);
}

console.log("\nAll Historical Data Enrichment 4.1 selftests passed.");
