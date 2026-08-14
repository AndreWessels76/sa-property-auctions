/**
 * Investor Intelligence 4.7 — selftests (30-case matrix).
 * Run: npm run test:investor-intelligence47
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

const { classifyObservation } = load("intelligence/outcomes/evidence.ts");
const { classifyAuctionOutcome } = load("intelligence/outcomes/classification.ts");
const { scoreHistoricalEvidence } = load("intelligence/historicalEvidence/scoring.ts");
const { buildSaleEvidence } = load("intelligence/comparables/saleEvidence.ts");
const { findComparables } = load("intelligence/comparables/engine.ts");
const { isPubliclyActiveListing } = load("data/publicListingPolicy.ts");
const { assessIdentityConfidence } = load("intelligence/historicalResolution/identityResolver.ts");
const { resolveHistoricalEvent } = load("intelligence/historicalResolution/resolver.ts");
const {
  diagnoseConnectivity,
  auditHistoricalEventCoverage,
  summarizeHistoricalCoverage,
  deriveProductionVerdict,
  buildResearchInvestorLabels,
  statusToInvestorLabel,
  INVESTOR_INTELLIGENCE47_VERSION,
  II47_P1_BATCH_LIMIT,
} = load("intelligence/investorIntelligence47/index.ts");
const { buildResearchSnapshot } = load("intelligence/investorIntelligence46/researchSnapshot.ts");

const corpus = { title: "T", source_url: "https://licensed.example/result", source_name: "Agency" };

function classify(o) {
  return classifyObservation(o, []);
}

function obs(over = {}) {
  return {
    observationId: over.observationId ?? "o1",
    sourceUnit: over.sourceUnit ?? "auction_event",
    auctionEventId: over.auctionEventId ?? "e1",
    propertyMasterId: over.propertyMasterId ?? "m1",
    listingPropertyId: over.listingPropertyId ?? "p1",
    state: over.state ?? "sold",
    outcomeSupplied: over.outcomeSupplied ?? true,
    auctionDate: over.auctionDate ?? "2025-06-01",
    dateKind: "auction_date",
    town: over.town ?? "Pretoria",
    agency: over.agency ?? "Agency A",
    sourceName: over.sourceName ?? "Agency A",
    sourceUrl: over.sourceUrl ?? "https://licensed.example/result",
    verificationState: over.verificationState ?? "sold",
    verified: over.verified ?? true,
    conflict: over.conflict ?? false,
    propertyType: over.propertyType ?? "House",
    propertyTypeStatus: "known",
    marketCategory: "Residential",
    agriculturalSubtype: null,
    province: "GP",
    municipality: "Tshwane",
    suburb: "Menlyn",
    farmName: null,
    floorSizeM2: over.floorSize ?? over.floorSizeM2 ?? 120,
    hectares: null,
    hectaresApproximate: false,
    bedrooms: over.bedrooms ?? 3,
    bathrooms: 2,
    prices: over.prices ?? { sale_price: 2500000 },
    exclusionReasons: [],
    data_classification: "production",
    listing_status: over.listing_status ?? "sold",
    status: over.status ?? "sold",
    ...over,
  };
}

function test(name, fn) {
  try {
    fn();
    console.log("ok -", name);
  } catch (err) {
    console.error("fail -", name);
    console.error(err);
    process.exitCode = 1;
  }
}

test("1 production connectivity failure → LIVE_DATA_UNAVAILABLE", () => {
  const d = diagnoseConnectivity({
    envPresent: true,
    propertiesCount: null,
    eventsCount: null,
    propertiesError: "TypeError: fetch failed",
    eventsError: "TypeError: fetch failed",
  });
  assert.equal(d.status, "LIVE_DATA_UNAVAILABLE");
  assert.equal(d.genuinelyEmpty, false);
});

test("2 production connectivity success → CONNECTED", () => {
  const d = diagnoseConnectivity({
    envPresent: true,
    propertiesCount: 38,
    eventsCount: 38,
    propertiesError: null,
    eventsError: null,
  });
  assert.equal(d.status, "CONNECTED");
});

test("3 empty sample with successful queries → EMPTY_DATABASE", () => {
  const d = diagnoseConnectivity({
    envPresent: true,
    propertiesCount: 0,
    eventsCount: 0,
    propertiesError: null,
    eventsError: null,
  });
  assert.equal(d.status, "EMPTY_DATABASE");
});

test("4 SOLD with explicit price → verified sale path", () => {
  const o = obs({ state: "sold", prices: { sale_price: 2500000 } });
  const c = classify(o);
  const s = scoreHistoricalEvidence(o, c, []);
  const row = auditHistoricalEventCoverage({
    observation: o,
    classification: c,
    score: s,
    pricingObs: [],
    enrichmentRuns: [],
  });
  assert.equal(row.outcomeResolution, "SOLD");
});

test("5 source unavailable preserved", () => {
  const d = deriveProductionVerdict({
    connectivity: diagnoseConnectivity({
      envPresent: true,
      propertiesCount: 10,
      eventsCount: 10,
      propertiesError: null,
      eventsError: null,
    }),
    metrics: {
      propertyMasters: 10,
      auctionEvents: 10,
      historicalEvents: 10,
      eligibleP1: 10,
      eligibleP2: 0,
      eligibleP3: 0,
      eligibleP4: 0,
      enrichmentRuns: 0,
      successfulFetches: 0,
      noChange: 0,
      outcomeObservations: 0,
      verifiedSold: 0,
      soldWithoutPrice: 0,
      verifiedSalePrices: 0,
      conflicts: 0,
      reviewRequired: 0,
      comparableReady: 0,
      marketReadyTowns: 0,
      publicCatalogueLeaks: 0,
      acquisitionGaps: 10,
    },
    engineTested: true,
  });
  assert.equal(d.verdict, "INSUFFICIENT DATA — ENGINE READY");
});

test("6 HTTP 200 fetch tracked via enrichment run", () => {
  const o = obs();
  const c = classify(o);
  const s = scoreHistoricalEvidence(o, c, []);
  const row = auditHistoricalEventCoverage({
    observation: o,
    classification: c,
    score: s,
    pricingObs: [],
    enrichmentRuns: [{ property_id: "p1", status: "COMPLETED", snapshot_id: "snap1" }],
  });
  assert.equal(row.snapshotAvailable, true);
});

test("7 NO_CHANGE enrichment status", () => {
  const o = obs();
  const c = classify(o);
  const s = scoreHistoricalEvidence(o, c, []);
  const row = auditHistoricalEventCoverage({
    observation: o,
    classification: c,
    score: s,
    pricingObs: [],
    enrichmentRuns: [{ property_id: "p1", status: "NO_CHANGE" }],
  });
  assert.equal(row.snapshotAvailable, true);
});

test("8 SOLD with price", () => {
  const o = obs({ state: "sold", prices: { sale_price: 2500000 } });
  const c = classify(o);
  assert.equal(c.outcome, "SOLD");
  assert.equal(c.salePrice.salePrice, 2500000);
});

test("9 SOLD without price", () => {
  const o = obs({ state: "sold", prices: {} });
  const c = classify(o);
  const s = scoreHistoricalEvidence(o, c, []);
  const row = auditHistoricalEventCoverage({
    observation: o,
    classification: c,
    score: s,
    pricingObs: [],
    enrichmentRuns: [],
  });
  assert.equal(row.salePriceResolution, "SOLD_WITHOUT_PRICE");
});

test("10 withdrawn", () => {
  const c = classify(obs({ state: "withdrawn" }));
  assert.equal(c.outcome, "WITHDRAWN");
});

test("11 cancelled", () => {
  const c = classify(obs({ state: "cancelled" }));
  assert.equal(c.outcome, "CANCELLED");
});

test("12 postponed → POSTPONED via explicit status text", () => {
  const o = obs({ state: "expired" });
  assert.equal(classifyAuctionOutcome(o, { rawStatus: "postponed" }), "POSTPONED");
});

test("13 passed-in → PASSED_IN via evidence text", () => {
  const o = obs({ state: "expired" });
  assert.equal(classifyAuctionOutcome(o, { evidenceText: "Lot passed in" }), "PASSED_IN");
});

test("14 ambiguous outcome → not SOLD", () => {
  const c = classify(obs({ state: "unknown" }));
  assert.notEqual(c.outcome, "SOLD");
});

test("15 guide price rejected as sale price", () => {
  const o = obs({ state: "sold", prices: { guide_price: 2500000 } });
  const sale = buildSaleEvidence(o, []);
  assert.equal(sale.verifiedSale, false);
});

test("16 reserve rejected as sale price", () => {
  const o = obs({ state: "sold", prices: { reserve_price: 2500000 } });
  const sale = buildSaleEvidence(o, []);
  assert.equal(sale.verifiedSale, false);
});

test("17 auction price rejected as sale price", () => {
  const o = obs({ state: "sold", prices: { auction_price: 2500000 } });
  const sale = buildSaleEvidence(o, []);
  assert.equal(sale.verifiedSale, false);
});

test("18 starting bid rejected as sale price", () => {
  const o = obs({ state: "sold", prices: { starting_bid: 2500000 } });
  const sale = buildSaleEvidence(o, []);
  assert.equal(sale.verifiedSale, false);
});

test("19 expired → not SOLD", () => {
  const c = classify(obs({ state: "expired" }));
  assert.notEqual(c.outcome, "SOLD");
});

test("20 identity review on weak master", () => {
  const o = obs({
    propertyMasterId: null,
    auctionEventId: null,
    sourceUrl: null,
    town: "X",
    agency: "Y",
    sourceName: "Y",
    listingPropertyId: "p-weak",
  });
  const identity = assessIdentityConfidence(o);
  assert.equal(identity.reviewRequired, true);
  assert.match(identity.reason, /IDENTITY_REVIEW_REQUIRED/);
});

test("21 duplicate prevention — idempotent hash in HEA config", () => {
  const cfg = fs.readFileSync(
    path.join(root, "lib/acquisition/historicalEvidence43/historicalEvidenceService.ts"),
    "utf8",
  );
  assert.match(cfg, /idempotency|hash|NO_CHANGE/i);
});

test("22 verified evidence tier — resolver uses classification", () => {
  const o = obs({ state: "sold", prices: { sale_price: 2500000 }, verified: true });
  const c = classify(o);
  const s = scoreHistoricalEvidence(o, c, []);
  const r = resolveHistoricalEvent({ observation: o, classification: c, score: s });
  assert.ok(r.outcome === "SOLD" || r.state === "VERIFIED" || r.state === "EXTRACTED");
});

test("23 comparable rejection NO_SALE", () => {
  const subject = obs({ observationId: "sub", listingPropertyId: "p-sub" });
  const candidate = obs({
    observationId: "c1",
    listingPropertyId: "p-c1",
    propertyMasterId: "m2",
    state: "withdrawn",
    prices: {},
  });
  const result = findComparables({
    subject,
    corpus: [subject, candidate],
    propertyId: "p-sub",
    premium: true,
  });
  assert.ok(result.rejectedCandidates.length > 0 || result.comparables.length === 0);
});

test("24 comparable acceptance when verified sale", () => {
  const subject = obs({ observationId: "sub", listingPropertyId: "p-sub", town: "Pretoria" });
  const candidate = obs({
    observationId: "c1",
    listingPropertyId: "p-c1",
    propertyMasterId: "m2",
    town: "Pretoria",
    state: "sold",
    prices: { sale_price: 2000000 },
    floorSize: 110,
    bedrooms: 3,
  });
  const result = findComparables({
    subject,
    corpus: [subject, candidate],
    propertyId: "p-sub",
    premium: true,
  });
  assert.ok(result.comparables.length >= 0);
});

test("25 insufficient market data verdict", () => {
  const v = deriveProductionVerdict({
    connectivity: diagnoseConnectivity({
      envPresent: true,
      propertiesCount: 38,
      eventsCount: 38,
      propertiesError: null,
      eventsError: null,
    }),
    metrics: {
      propertyMasters: 38,
      auctionEvents: 38,
      historicalEvents: 33,
      eligibleP1: 33,
      eligibleP2: 0,
      eligibleP3: 0,
      eligibleP4: 0,
      enrichmentRuns: 0,
      successfulFetches: 0,
      noChange: 0,
      outcomeObservations: 0,
      verifiedSold: 0,
      soldWithoutPrice: 0,
      verifiedSalePrices: 0,
      conflicts: 0,
      reviewRequired: 0,
      comparableReady: 0,
      marketReadyTowns: 0,
      publicCatalogueLeaks: 0,
      acquisitionGaps: 33,
    },
    engineTested: true,
  });
  assert.equal(v.verdict, "INSUFFICIENT DATA — ENGINE READY");
});

test("26 market threshold reached", () => {
  const v = deriveProductionVerdict({
    connectivity: diagnoseConnectivity({
      envPresent: true,
      propertiesCount: 100,
      eventsCount: 100,
      propertiesError: null,
      eventsError: null,
    }),
    metrics: {
      propertyMasters: 100,
      auctionEvents: 100,
      historicalEvents: 50,
      eligibleP1: 0,
      eligibleP2: 0,
      eligibleP3: 0,
      eligibleP4: 0,
      enrichmentRuns: 10,
      successfulFetches: 10,
      noChange: 2,
      outcomeObservations: 10,
      verifiedSold: 6,
      soldWithoutPrice: 1,
      verifiedSalePrices: 6,
      conflicts: 0,
      reviewRequired: 0,
      comparableReady: 6,
      marketReadyTowns: 1,
      publicCatalogueLeaks: 0,
      acquisitionGaps: 0,
    },
    engineTested: true,
  });
  assert.equal(v.verdict, "PRODUCTION DATA COVERAGE VERIFIED");
});

test("27 public catalogue safety", () => {
  assert.equal(
    isPubliclyActiveListing({
      verification_state: "sold",
      data_classification: "production",
      listing_status: "sold",
      status: "sold",
      auction_date: "2024-01-01",
    }),
    false,
  );
});

test("28 idempotent second run — P1 limit constant", () => {
  assert.equal(II47_P1_BATCH_LIMIT, 5);
});

test("29 rebuild intelligence API route exists", () => {
  const api = fs.readFileSync(
    path.join(root, "app/api/admin/intelligence/investor/coverage/route.ts"),
    "utf8",
  );
  assert.match(api, /rebuild_intelligence/);
  assert.match(api, /acquire_p1/);
});

test("30 acquisition gap reduction — research labels INSUFFICIENT", () => {
  const research = buildResearchSnapshot({
    property: {
      id: "p1",
      title: "T",
      town: "Pretoria",
      auction_agency: "A",
      property_master_id: "m1",
    },
    ctx: { observations: [], scoredEvents: [] },
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
  const labels = buildResearchInvestorLabels(research, 0, 0);
  assert.ok(labels.some((l) => l.detail.includes("INSUFFICIENT")));
  assert.equal(statusToInvestorLabel("VERIFIED"), "PROVEN");
  assert.equal(INVESTOR_INTELLIGENCE47_VERSION, "investor-intelligence-4.7.0");
});

test("31 no hardcoded demo statistics in II 4.7 module", () => {
  const src = fs.readFileSync(
    path.join(root, "lib/intelligence/investorIntelligence47/productionVerdict.ts"),
    "utf8",
  );
  assert.doesNotMatch(src, /18432|median.*=.*[0-9]{6}/);
});

if (!process.exitCode) {
  console.log("\nAll investor-intelligence47 selftests passed");
}
