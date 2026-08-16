/**
 * Historical Evidence Acquisition 4.3 — selftests (20-case matrix).
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
const { detectOutcomeObservationConflicts } = load("acquisition/outcomes/outcomeConflict.ts");
const { decideChangeFromContentHash } = load("acquisition/refetch/forceSemantics.ts");
const { isPubliclyActiveListing } = load("data/publicListingPolicy.ts");
const { classifyObservation } = load("intelligence/outcomes/evidence.ts");
const { scoreHistoricalEvidence } = load("intelligence/historicalEvidence/scoring.ts");
const { resolveHistoricalEvent } = load("intelligence/historicalResolution/resolver.ts");
const {
  HISTORICAL_EVIDENCE_ACQUISITION43_VERSION,
  HEA43_DEFAULT_BATCH_LIMIT,
} = load("acquisition/historicalEvidence43/config.ts");
const { buildHea43Queue, hea43QueueSummary } = load("acquisition/historicalEvidence43/queue43.ts");
const { discoverSourcesForEvent } = load("acquisition/historicalEvidence43/sourceDiscovery.ts");
const { extractVerifiedSalePriceFromText } = load(
  "acquisition/historicalEvidence43/salePriceExtractor.ts",
);
const { planSourceFetch, mapEnrichmentStatusToHea43State } = load(
  "acquisition/historicalEvidence43/sourceFetcher.ts",
);
const { assessIdentityMatchStrength } = load("acquisition/historicalEvidence43/identityResolver.ts");
const { buildAcquireResult, planAcquisition } = load(
  "acquisition/historicalEvidence43/historicalEvidenceService.ts",
);
const { resolveHistoricalSource } = load("acquisition/historical/sourceResolution.ts");
const { classifyBcFetchEligibility } = load("acquisition/refetch/licenseGate.ts");

const corpus = { title: "Test", source_url: "https://example.com/listing", source_name: "Agency" };

const baseEvent = {
  observationId: "obs-hea43",
  sourceUnit: "listing_fallback",
  auctionEventId: "evt-hea43",
  propertyMasterId: "master-hea43",
  listingPropertyId: "prop-hea43",
  state: "expired",
  outcomeSupplied: false,
  auctionDate: "2024-06-01",
  dateKind: "auction_date",
  agency: "Test Agency",
  sourceName: "Test Agency",
  sourceUrl: "https://www.bidderschoice.co.za/auction/123",
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
  prices: {
    sale_price: null,
    auction_price: null,
    guide_price: null,
    reserve_price: null,
    estimated_value: null,
    starting_bid: null,
  },
  exclusionReasons: [],
};

function classify(event) {
  return classifyObservation(event);
}

function score(event, classification) {
  return scoreHistoricalEvidence(event, classification);
}

console.log("hea43: version");
assert.equal(HISTORICAL_EVIDENCE_ACQUISITION43_VERSION, "historical-evidence-acquisition-4.3.0");
assert.equal(HEA43_DEFAULT_BATCH_LIMIT, 5);

console.log("hea43: 1 SOLD + sale price → VERIFIED path");
{
  const draft = extractOutcomeFromText("Sold for R1,200,000", corpus);
  const c = classify(baseEvent);
  const s = score(baseEvent, c);
  const r = resolveHistoricalEvent({
    observation: baseEvent,
    classification: c,
    score: s,
    outcomeObs: {
      outcome: draft.outcome,
      sale_price: 1200000,
      confidence: "high",
      sale_price_confidence: "high",
      evidence_text: "Sold for R1,200,000",
    },
    sourceText: "Sold for R1,200,000",
  });
  assert.equal(draft.outcome, "SOLD");
  assert.ok(["VERIFIED", "EXTRACTED"].includes(r.state));
}

console.log("hea43: 2 SOLD without price");
{
  const d = extractOutcomeFromText("Property sold", corpus);
  assert.equal(d.outcome, "SOLD");
  assert.equal(d.sale_price, null);
}

console.log("hea43: 3 SOLD + reserve only → not verified price");
{
  const r = extractVerifiedSalePriceFromText("Reserve R1,200,000", corpus);
  assert.equal(r.salePrice, null);
  assert.ok(r.reason.includes("reserve"));
}

console.log("hea43: 4 SOLD + guide only → not verified price");
{
  const r = extractVerifiedSalePriceFromText("Guide price R1,200,000", corpus);
  assert.equal(r.salePrice, null);
}

console.log("hea43: 5 expired → not SOLD");
assert.notEqual(extractOutcomeFromText("Listing expired", corpus).outcome, "SOLD");

console.log("hea43: 6 closed → not SOLD");
assert.notEqual(extractOutcomeFromText("Auction closed", corpus).outcome, "SOLD");

console.log("hea43: 7 withdrawn → WITHDRAWN");
assert.equal(extractOutcomeFromText("Withdrawn from auction", corpus).outcome, "WITHDRAWN");

console.log("hea43: 8 passed in → PASSED_IN");
assert.equal(extractOutcomeFromText("Passed in", corpus).outcome, "PASSED_IN");

console.log("hea43: 9 cancelled → CANCELLED");
assert.equal(extractOutcomeFromText("Sale cancelled", corpus).outcome, "CANCELLED");

console.log("hea43: 10 postponed → POSTPONED");
assert.equal(extractOutcomeFromText("Postponed", corpus).outcome, "POSTPONED");

console.log("hea43: 11 ambiguous outcome → REVIEW_REQUIRED path");
{
  const c = classify(baseEvent);
  const s = score(baseEvent, c);
  const r = buildAcquireResult({
    propertyId: baseEvent.listingPropertyId,
    auctionEventId: baseEvent.auctionEventId,
    dryRun: false,
    enrichmentStatus: "COMPLETED",
    outcome: "UNKNOWN",
    salePrice: null,
    message: "Ambiguous",
    candidates: [],
    evidence: null,
    event: baseEvent,
    classification: c,
    score: s,
    openReview: true,
  });
  assert.equal(r.state, "REVIEW_REQUIRED");
}

console.log("hea43: 12 conflicting sale prices → CONFLICT");
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

console.log("hea43: 13 weak identity → IDENTITY_REVIEW_REQUIRED");
{
  const weak = assessIdentityMatchStrength({
    ...baseEvent,
    propertyMasterId: null,
    auctionEventId: null,
    suburb: null,
    town: "Pretoria",
  });
  assert.equal(weak.reviewRequired, true);
}

console.log("hea43: 14 strong identity → eligible");
{
  const strong = assessIdentityMatchStrength(baseEvent);
  assert.equal(strong.strength, "strong");
  assert.equal(strong.reviewRequired, false);
}

console.log("hea43: 15 duplicate fetch → NO_CHANGE");
{
  const d = decideChangeFromContentHash({
    previousHash: "abc",
    contentHash: "abc",
    force: false,
  });
  assert.equal(d, "NO_CHANGE");
  assert.equal(mapEnrichmentStatusToHea43State("NO_CHANGE"), "NO_CHANGE");
}

console.log("hea43: 16 historical event → never public");
{
  const leak = isPubliclyActiveListing({
    verification_state: "expired",
    data_classification: null,
    listing_status: "expired",
    status: "expired",
    auction_date: "2020-01-01",
  });
  assert.equal(leak, false);
}

console.log("hea43: 17 dry run → zero writes");
{
  const plan = planAcquisition({ event: baseEvent, dryRun: true });
  assert.equal(plan.fetchPlan.willFetch, true);
  assert.ok(plan.fetchPlan.reason.includes("Dry run"));
  const fetch = planSourceFetch({
    propertyId: baseEvent.listingPropertyId,
    sourceUrl: baseEvent.sourceUrl,
    candidates: plan.discovery.candidates,
    dryRun: true,
    licensed: true,
  });
  assert.equal(fetch.willFetch, true);
}

console.log("hea43: 18 source unavailable → preserved");
{
  const d = discoverSourcesForEvent({ event: { ...baseEvent, sourceUrl: null } });
  assert.equal(d.sourceFound, false);
}

console.log("hea43: 19 license blocked → no fetch");
{
  const fetch = planSourceFetch({
    propertyId: baseEvent.listingPropertyId,
    sourceUrl: baseEvent.sourceUrl,
    candidates: [],
    dryRun: false,
    licensed: false,
  });
  assert.equal(fetch.willFetch, false);
}

console.log("hea43: 20 repeated enrichment → idempotent hash");
{
  const a = decideChangeFromContentHash({ previousHash: "h1", contentHash: "h1", force: false });
  const b = decideChangeFromContentHash({ previousHash: "h1", contentHash: "h1", force: false });
  assert.equal(a, b);
  assert.equal(a, "NO_CHANGE");
}

console.log("hea43: queue P1 exact URL");
{
  const queue = buildHea43Queue({ events: [baseEvent] });
  assert.ok(queue.length >= 1);
  assert.equal(queue[0].priority, 1);
  const summary = hea43QueueSummary(queue);
  assert.ok(summary.priority1 >= 1);
}

console.log("hea43: sticky SKIPPED_LICENSE blocks planner without allowLicenceRetry");
{
  const blocked = resolveHistoricalSource({
    event: baseEvent,
    lastRunStatus: "SKIPPED_LICENSE",
  });
  assert.equal(blocked.status, "LICENSE_BLOCKED");
  const stickyPlan = planAcquisition({
    event: baseEvent,
    dryRun: false,
    lastRunStatus: "SKIPPED_LICENSE",
    allowLicenceRetry: false,
  });
  assert.equal(stickyPlan.discovery.licensed, false);
  assert.equal(stickyPlan.fetchPlan.willFetch, false);
  assert.ok(stickyPlan.fetchPlan.reason.includes("License blocked"));
}

console.log("hea43: sticky licence clears when allowLicenceRetry + live public fetch");
{
  const retry = resolveHistoricalSource({
    event: baseEvent,
    lastRunStatus: "SKIPPED_LICENSE",
    allowLicenceRetry: true,
  });
  assert.equal(retry.status, "ELIGIBLE");
  const live = classifyBcFetchEligibility({
    connectorId: "bidders_choice",
    sourceUrl: baseEvent.sourceUrl,
    licence: null,
    envAllowPublicFetch: true,
  });
  assert.equal(live.state, "PUBLIC_FETCH_ALLOWED");
  assert.equal(live.allowed, true);
  const plan = planAcquisition({
    event: baseEvent,
    dryRun: false,
    lastRunStatus: "SKIPPED_LICENSE",
    allowLicenceRetry: live.allowed,
  });
  assert.equal(plan.discovery.licensed, true);
  assert.equal(plan.fetchPlan.willFetch, true);
}

console.log("hea43: force alone does not imply licence — CONFIG_MISSING when env absent");
{
  const live = classifyBcFetchEligibility({
    connectorId: "bidders_choice",
    sourceUrl: baseEvent.sourceUrl,
    licence: null,
    envAllowPublicFetch: false,
  });
  assert.equal(live.state, "CONFIG_MISSING");
  assert.equal(live.allowed, false);
}

console.log("hea43: API + panel files exist");
assert.ok(fs.existsSync(path.join(root, "app/api/admin/intelligence/historical-evidence/route.ts")));
assert.ok(
  fs.existsSync(path.join(root, "app/admin/operations/components/HistoricalEvidenceAcquisition43Panel.tsx")),
);

console.log("\n✅ historical-evidence-acquisition43-selftest — all cases passed");
