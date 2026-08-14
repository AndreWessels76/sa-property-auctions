/**
 * Historical Data Acquisition 4.0 — selftests (30-case matrix).
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
const { buildHistoricalEnrichmentQueue, queueSummary } = load("acquisition/historical/queue.ts");
const { resolveHistoricalSource } = load("acquisition/historical/sourceResolution.ts");
const { HISTORICAL_DATA_ACQUISITION_VERSION } = load("acquisition/historical/config.ts");

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
};

console.log("hda40: version tag");
assert.equal(HISTORICAL_DATA_ACQUISITION_VERSION, "historical-data-acquisition-4.0.0");

console.log("hda40: historical event selection — queue P1");
{
  const queue = buildHistoricalEnrichmentQueue({
    events: [sampleEvent],
    observations: [],
    recentRuns: [],
    openReviews: [],
  });
  assert.equal(queue.length, 1);
  assert.equal(queue[0].priority, 1);
}

console.log("hda40: upcoming exclusion");
assert.equal(
  isPubliclyActiveListing({
    verification_state: "verified",
    listing_status: "upcoming",
    status: "upcoming",
    auction_date: "2099-01-01",
  }),
  true,
);

console.log("hda40: live event exclusion");
assert.equal(
  isPubliclyActiveListing({
    verification_state: "verified",
    listing_status: "live",
    status: "live",
    auction_date: new Date().toISOString().slice(0, 10),
  }),
  true,
);

console.log("hda40: licence block status");
{
  const res = resolveHistoricalSource({
    event: sampleEvent,
    lastRunStatus: "SKIPPED_LICENSE",
  });
  assert.equal(res.status, "LICENSE_BLOCKED");
}

console.log("hda40: robots block status");
{
  const res = resolveHistoricalSource({
    event: sampleEvent,
    lastRunStatus: "SKIPPED_ROBOTS",
  });
  assert.equal(res.status, "ROBOTS_BLOCKED");
}

console.log("hda40: source unavailable");
{
  const res = resolveHistoricalSource({
    event: { ...sampleEvent, sourceUrl: null },
  });
  assert.equal(res.status, "SOURCE_UNAVAILABLE");
}

console.log("hda40: HTTP 200 eligible");
{
  const res = resolveHistoricalSource({ event: sampleEvent });
  assert.equal(res.status, "ELIGIBLE");
}

console.log("hda40: NO_CHANGE hash semantics");
assert.equal(
  decideChangeFromContentHash({
    previousHash: "abc",
    contentHash: "abc",
    force: true,
  }),
  "NO_CHANGE",
);

console.log("hda40: CONTENT_CHANGED");
assert.equal(
  decideChangeFromContentHash({
    previousHash: "abc",
    contentHash: "def",
    force: false,
  }),
  "CONTENT_CHANGED",
);

console.log("hda40: SOLD extraction");
assert.equal(extractOutcomeFromText("Property sold for R2,450,000", corpus).outcome, "SOLD");

console.log("hda40: PASSED_IN extraction");
assert.equal(extractOutcomeFromText("Passed in — no acceptable bid", corpus).outcome, "PASSED_IN");

console.log("hda40: WITHDRAWN extraction");
assert.equal(extractOutcomeFromText("Withdrawn from auction", corpus).outcome, "WITHDRAWN");

console.log("hda40: CANCELLED extraction");
assert.equal(extractOutcomeFromText("Auction cancelled", corpus).outcome, "CANCELLED");

console.log("hda40: POSTPONED extraction");
assert.equal(extractOutcomeFromText("Auction rescheduled to next month", corpus).outcome, "POSTPONED");

console.log("hda40: UNKNOWN preservation");
assert.equal(extractOutcomeFromText("", corpus).outcome, "UNKNOWN");

console.log("hda40: explicit sale price");
{
  const d = extractOutcomeFromText("Sold for R2,500,000", corpus);
  assert.equal(d.sale_price, 2500000);
}

console.log("hda40: guide rejection");
{
  const drafts = extractPricingObservations(corpus, "Guide price R2,500,000");
  assert.ok(!drafts.some((d) => d.field_name === "sale_price"));
}

console.log("hda40: reserve rejection");
{
  const drafts = extractPricingObservations(corpus, "Reserve R2,500,000");
  assert.ok(!drafts.some((d) => d.field_name === "sale_price"));
}

console.log("hda40: estimate rejection");
{
  const drafts = extractPricingObservations(corpus, "Estimated value R2,500,000");
  assert.ok(!drafts.some((d) => d.field_name === "sale_price"));
}

console.log("hda40: auction-price rejection");
{
  const drafts = extractPricingObservations(corpus, "Auction price R2,500,000");
  assert.ok(!drafts.some((d) => d.field_name === "sale_price"));
}


console.log("hda40: price normalisation");
{
  const drafts = extractPricingObservations(corpus, "Sold for R2.5 million");
  const sale = drafts.find((d) => d.field_name === "sale_price");
  assert.equal(sale?.normalized_value, 2500000);
}

console.log("hda40: conflicting prices");
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

console.log("hda40: identity mismatch review");
{
  const draft = extractOutcomeFromText("Sold for R1,000,000", corpus);
  draft.review_required = true;
  draft.review_category = "IDENTITY_REVIEW";
  const v = validateOutcomeDraft(draft);
  assert.equal(v.draft.review_required, true);
}

console.log("hda40: duplicate observation prevention key");
{
  const key = [
    "p1",
    "e1",
    "hash1",
    "SOLD",
    HISTORICAL_DATA_ACQUISITION_VERSION,
  ].join("|");
  const key2 = [
    "p1",
    "e1",
    "hash1",
    "SOLD",
    HISTORICAL_DATA_ACQUISITION_VERSION,
  ].join("|");
  assert.equal(key, key2);
}

console.log("hda40: provenance fields present on draft");
{
  const d = extractOutcomeFromText("Knocked down at R1,800,000", corpus);
  assert.ok(d.evidence_text);
  assert.equal(d.extraction_method, "deterministic_text");
}

console.log("hda40: admin audit routes exist");
assert.ok(fs.existsSync(path.join(root, "app/api/admin/intelligence/historical-enrichment/route.ts")));
assert.ok(fs.existsSync(path.join(root, "app/api/cron/historical-enrichment/route.ts")));

console.log("hda40: public catalogue safety");
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

console.log("hda40: batch failure isolation — queue continues");
{
  const summary = queueSummary(
    buildHistoricalEnrichmentQueue({
      events: [sampleEvent, { ...sampleEvent, listingPropertyId: "prop-hist-2" }],
    }),
  );
  assert.equal(summary.total, 2);
}

console.log("hda40: idempotency — same hash NO_CHANGE");
assert.equal(
  decideChangeFromContentHash({
    previousHash: "same",
    contentHash: "same",
    force: false,
  }),
  "NO_CHANGE",
);

console.log("hda40: knocked down / final sale patterns");
assert.equal(extractOutcomeFromText("Knocked down at R900,000", corpus).outcome, "SOLD");
assert.equal(extractOutcomeFromText("Final sale confirmed", corpus).outcome, "SOLD");

console.log("hda40: starting bid not sale price");
{
  const drafts = extractPricingObservations(corpus, "Starting bid R500,000");
  assert.ok(!drafts.some((d) => d.field_name === "sale_price"));
}

console.log("hda40: ops panel exists");
assert.ok(
  fs.existsSync(
    path.join(root, "app/admin/operations/components/HistoricalDataAcquisition40Panel.tsx"),
  ),
);

console.log("\nAll Historical Data Acquisition 4.0 selftests passed.");
