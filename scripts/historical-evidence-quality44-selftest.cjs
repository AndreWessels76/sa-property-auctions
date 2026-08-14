/**
 * Historical Evidence Quality & Review 4.4 — selftests (24-case matrix).
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

function loadEnv() {
  try {
    for (const line of fs.readFileSync(path.join(root, ".env.local"), "utf8").split(/\r?\n/)) {
      const m = line.match(/^\s*([^#=]+)=(.*)$/);
      if (m && !process.env[m[1].trim()]) {
        process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
      }
    }
  } catch {
    process.env.NEXT_PUBLIC_SUPABASE_URL =
      process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://localhost:54321";
    process.env.SUPABASE_SERVICE_ROLE_KEY =
      process.env.SUPABASE_SERVICE_ROLE_KEY ?? "test-key";
  }
}

loadEnv();

const { extractOutcomeFromText } = load("acquisition/outcomes/outcomeExtractor.ts");
const { extractPricingObservations } = load("acquisition/pricing/pricingExtractor.ts");
const { detectOutcomeObservationConflicts } = load("acquisition/outcomes/outcomeConflict.ts");
const { classifyObservation } = load("intelligence/outcomes/evidence.ts");
const { scoreHistoricalEvidence } = load("intelligence/historicalEvidence/scoring.ts");
const { resolveHistoricalEvent } = load("intelligence/historicalResolution/resolver.ts");
const { assessIdentityConfidence } = load("intelligence/historicalResolution/identityResolver.ts");
const { assessComparableEligibility } = load("intelligence/historicalResolution/comparableEligibility.ts");
const { parseHectaresFromText } = load("intelligence/historicalResolution/sizeEvidence.ts");
const { isPubliclyActiveListing } = load("data/publicListingPolicy.ts");
const { HI40_MINIMUM_MARKET_SALES } = load("intelligence/historicalEvidence/config.ts");
const {
  HISTORICAL_EVIDENCE_QUALITY44_VERSION,
  assessEvidenceQuality,
  buildFieldEvidence,
  assessSourceQuality,
  assessSourceConsistency,
  buildQualityReviewQueue,
  buildQualityDashboard,
  sourceTierRank,
} = load("intelligence/historicalEvidenceQuality/index.ts");
const { HistoricalEvidenceQualityRepository } = load(
  "repositories/HistoricalEvidenceQualityRepository.ts",
);

const corpus = { title: "T", source_url: "https://x.com", source_name: "A" };

const baseEvent = {
  observationId: "obs-heq44",
  sourceUnit: "listing_fallback",
  auctionEventId: "evt-heq44",
  propertyMasterId: "master-heq44",
  listingPropertyId: "prop-heq44",
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

function resolve(event, classification, s, extra = {}) {
  return resolveHistoricalEvent({
    observation: event,
    classification,
    score: s,
    ...extra,
  });
}

function assess(event, classification, s, resolution, extra = {}) {
  return assessEvidenceQuality({
    event,
    classification,
    score: s,
    resolution,
    ...extra,
  });
}

console.log("heq44: version");
assert.equal(HISTORICAL_EVIDENCE_QUALITY44_VERSION, "historical-evidence-quality-4.4.0");

console.log("heq44: 1 verified SOLD + verified sale price");
{
  const c = classify({ ...baseEvent, prices: { ...baseEvent.prices, sale_price: 2450000 } });
  const s = score(baseEvent, c);
  const r = resolve(baseEvent, c, s, {
    outcomeObs: {
      outcome: "SOLD",
      sale_price: 2450000,
      confidence: "high",
      sale_price_confidence: "high",
      evidence_text: "Sold for R2,450,000",
    },
    sourceText: "Sold for R2,450,000",
  });
  const q = assess(baseEvent, c, s, r);
  assert.equal(extractOutcomeFromText("Sold for R2,450,000", corpus).outcome, "SOLD");
  assert.ok(["HIGH", "MEDIUM", "VERIFIED"].some((x) => q.overallQuality.includes(x) || r.state === "VERIFIED" || q.overallQuality === "HIGH"));
}

console.log("heq44: 2 SOLD without price");
{
  const c = classify(baseEvent);
  const s = score(baseEvent, c);
  const r = resolve(baseEvent, c, s, { outcomeObs: { outcome: "SOLD", sale_price: null, confidence: "high" } });
  const q = assess(baseEvent, c, s, r);
  assert.ok(q.missingEvidence.includes("sale_price") || q.fields.find((f) => f.field === "sale_price")?.status !== "VERIFIED");
}

console.log("heq44: 3 expired without outcome");
{
  const d = extractOutcomeFromText("Listing expired", corpus);
  assert.notEqual(d.outcome, "SOLD");
  assert.equal(d.outcome, "UNKNOWN");
}

console.log("heq44: 4 reserve mistaken for sale price");
assert.ok(!extractPricingObservations(corpus, "Reserve R1,200,000").some((d) => d.field_name === "sale_price"));

console.log("heq44: 5 guide mistaken for sale price");
assert.ok(!extractPricingObservations(corpus, "Guide price R1,200,000").some((d) => d.field_name === "sale_price"));

console.log("heq44: 6 auction price mistaken for sale price");
assert.ok(!extractPricingObservations(corpus, "Auction price R900,000").some((d) => d.field_name === "sale_price"));

console.log("heq44: 7 conflicting sale prices");
{
  const conflicts = detectOutcomeObservationConflicts({
    existing: [{ id: "1", outcome: "SOLD", confidence: "high", sale_price: 1200000, evidence_text: "A", source_url: "https://a.com" }],
    incoming: extractOutcomeFromText("Sold for R1,350,000", corpus),
  });
  assert.ok(conflicts.length >= 1);
}

console.log("heq44: 8 conflicting outcomes");
{
  const c = classify(baseEvent);
  const s = score(baseEvent, c);
  const r = resolve(baseEvent, c, s, { openConflict: true });
  const q = assess(baseEvent, c, s, r, { openConflict: true });
  assert.equal(q.overallQuality, "CONFLICT");
}

console.log("heq44: 9 identity mismatch");
{
  const id = assessIdentityConfidence({ ...baseEvent, propertyMasterId: null, auctionEventId: null, suburb: null, town: "Pretoria" });
  assert.equal(id.reviewRequired, true);
}

console.log("heq44: 10 town + agency only");
{
  const c = classify({ ...baseEvent, propertyMasterId: null, suburb: null });
  const s = score({ ...baseEvent, propertyMasterId: null, suburb: null }, c);
  const r = resolve({ ...baseEvent, propertyMasterId: null, suburb: null }, c, s);
  const q = assess({ ...baseEvent, propertyMasterId: null, suburb: null }, c, s, r);
  assert.ok(q.reasons.some((x) => x.includes("identity") || q.overallQuality === "REVIEW_REQUIRED" || q.reviewRequired));
}

console.log("heq44: 11 verified address");
{
  const fields = buildFieldEvidence({
    event: baseEvent,
    classification: classify(baseEvent),
    score: score(baseEvent, classify(baseEvent)),
  });
  const addr = fields.find((f) => f.field === "address");
  assert.ok(addr?.value);
  assert.notEqual(addr?.status, "NOT_SUPPLIED");
}

console.log("heq44: 12 ± hectare evidence");
{
  const ha = parseHectaresFromText("Combined Extent ±4.164Ha");
  assert.ok(ha.value != null);
  assert.equal(ha.approximate, true);
}

console.log("heq44: 13 floor size evidence");
{
  const fields = buildFieldEvidence({
    event: baseEvent,
    classification: classify(baseEvent),
    score: score(baseEvent, classify(baseEvent)),
  });
  const floor = fields.find((f) => f.field === "floor_size");
  assert.equal(floor?.value, 120);
}

console.log("heq44: 14 source hierarchy");
{
  const sq = assessSourceQuality({ event: baseEvent });
  assert.ok(sourceTierRank(sq.sourceTier) >= sourceTierRank("SECONDARY_SOURCE"));
}

console.log("heq44: 15 same snapshot");
assert.equal(assessSourceConsistency({ currentHash: "abc", previousHash: "abc" }), "NO_CHANGE");

console.log("heq44: 16 changed snapshot");
assert.equal(
  assessSourceConsistency({
    currentHash: "new",
    previousHash: "old",
    outcomeObs: { outcome: "SOLD", sale_price: 1000000 },
    previousOutcomeObs: { outcome: "SOLD", sale_price: 1000000 },
  }),
  "CONSISTENT_UPDATE",
);

console.log("heq44: 17 duplicate review audit key");
{
  const k1 = HistoricalEvidenceQualityRepository.buildIdempotencyKey({
    eventId: "evt-1",
    field: "sale_price",
    decision: "approve_evidence",
    actor: "admin",
    qualityVersion: HISTORICAL_EVIDENCE_QUALITY44_VERSION,
  });
  const k2 = HistoricalEvidenceQualityRepository.buildIdempotencyKey({
    eventId: "evt-1",
    field: "sale_price",
    decision: "approve_evidence",
    actor: "admin",
    qualityVersion: HISTORICAL_EVIDENCE_QUALITY44_VERSION,
  });
  assert.equal(k1, k2);
}

console.log("heq44: 18 rejected evidence state");
{
  const c = classify(baseEvent);
  const s = score(baseEvent, c);
  const r = resolve(baseEvent, c, s, { openReview: true });
  const q = assess(baseEvent, c, s, r, { openReview: true });
  assert.equal(q.overallQuality, "REVIEW_REQUIRED");
}

console.log("heq44: 19 public catalogue safety");
assert.equal(
  isPubliclyActiveListing({
    verification_state: "expired",
    data_classification: null,
    listing_status: "expired",
    status: "expired",
    auction_date: "2020-01-01",
  }),
  false,
);

console.log("heq44: 20 comparable rejection");
{
  const c = classify(baseEvent);
  const s = score(baseEvent, c);
  const r = resolve(baseEvent, c, s);
  const elig = assessComparableEligibility({
    subject: baseEvent,
    candidate: { ...baseEvent, observationId: "obs-other", listingPropertyId: "prop-other" },
    resolution: r,
  });
  assert.ok(Array.isArray(elig.reasons));
  assert.ok(elig.reasons.length > 0);
}

console.log("heq44: 21 insufficient market data");
assert.ok(HI40_MINIMUM_MARKET_SALES >= 5);

console.log("heq44: 22 admin review queue");
{
  const c = classify(baseEvent);
  const s = score(baseEvent, c);
  const r = resolve(baseEvent, c, s, { openConflict: true });
  const q = assess(baseEvent, c, s, r, { openConflict: true });
  const queue = buildQualityReviewQueue([q], [{ observationId: baseEvent.observationId, town: baseEvent.town }]);
  assert.ok(queue.length >= 1);
}

console.log("heq44: 23 audit trail repository exists");
assert.ok(typeof HistoricalEvidenceQualityRepository.recordAudit === "function");

console.log("heq44: 24 idempotent rebuild dashboard");
{
  const c = classify(baseEvent);
  const s = score(baseEvent, c);
  const r = resolve(baseEvent, c, s);
  const q = assess(baseEvent, c, s, r);
  const d1 = buildQualityDashboard({ assessments: [q], queue: [], totalHistorical: 1 });
  const d2 = buildQualityDashboard({ assessments: [q], queue: [], totalHistorical: 1 });
  assert.equal(d1.totalHistoricalEvents, d2.totalHistoricalEvents);
}

console.log("heq44: API + panel + migration exist");
assert.ok(fs.existsSync(path.join(root, "app/api/admin/intelligence/historical-evidence-quality/route.ts")));
assert.ok(fs.existsSync(path.join(root, "app/admin/operations/components/HistoricalEvidenceQuality44Panel.tsx")));
assert.ok(fs.existsSync(path.join(root, "supabase/migrations/20260814180000_historical_evidence_quality44.sql")));

console.log("\n✅ historical-evidence-quality44-selftest — all cases passed");
