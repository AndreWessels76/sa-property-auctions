/**
 * ACI Command Centre v1 — selftests.
 * Run: npm run test:aci
 * No production writes. Does not invent partner credentials.
 */
const fs = require("fs");
const path = require("path");
const ts = require("typescript");
const Module = require("module");
const assert = require("assert/strict");

const root = path.resolve(__dirname, "..");
const cache = new Map();
let passed = 0;

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
    if (id === "server-only") return {};
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
  return loadFromAbs(path.join(root, rel));
}

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function test(name, fn) {
  fn();
  passed += 1;
  console.log(`  ✓ ${name}`);
}

const aci = load("lib/aci/commandCentre.ts");

const baseline = {
  historicalEvents: 33,
  auctionEvents: 38,
  licensedSources: "33/33",
  fetchAttempted: 33,
  fetchSuccessful: 33,
  fetchFailed: 0,
  snapshots: 17,
  extractions: 33,
  outcomeEvidence: 5,
  outcomeMissing: 28,
  verifiedSold: 0,
  soldWithoutPrice: 5,
  verifiedSalePrices: 0,
  comparableReady: 0,
  marketReadyTowns: 0,
  catalogueLeaks: 0,
  legacyUnknownFailures: 0,
};

console.log("ACI Command Centre v1 selftest\n");

test("version is aci-command-centre-1.0.0", () => {
  assert.equal(aci.ACI_COMMAND_CENTRE_VERSION, "aci-command-centre-1.0.0");
});

test("batch limit is 5", () => {
  assert.equal(aci.ACI_MAX_BATCH, 5);
  assert.equal(aci.clampAciBatchLimit(99), 5);
  assert.equal(aci.clampAciBatchLimit(0), 1);
  assert.equal(aci.clampAciBatchLimit(3), 3);
});

test("unlimited limit is rejected", () => {
  const over = aci.rejectAciUnlimitedLimit(6);
  assert.equal(over.ok, false);
  const ok = aci.rejectAciUnlimitedLimit(5);
  assert.equal(ok.ok, true);
});

test("market threshold remains 5", () => {
  assert.equal(aci.ACI_MARKET_THRESHOLD, 5);
});

test("comparable threshold remains 3", () => {
  assert.equal(aci.ACI_COMPARABLE_THRESHOLD, 3);
});

test("sale-price protection rejects reserve/guide/estimate", () => {
  for (const kind of [
    "reserve",
    "guide",
    "starting_bid",
    "auction_price",
    "estimated_value",
    "valuation",
    "market_value",
  ]) {
    assert.equal(aci.isRejectedSalePriceKind(kind), true, kind);
  }
  assert.equal(aci.isRejectedSalePriceKind("actual_sale_price"), false);
});

test("unverified sale price never displays a number", () => {
  assert.equal(
    aci.displayVerifiedSalePrice({ salePrice: 1_200_000, verified: false }),
    "SALE PRICE NOT VERIFIED",
  );
  assert.equal(
    aci.displayVerifiedSalePrice({ salePrice: null, verified: true }),
    "SALE PRICE NOT VERIFIED",
  );
});

test("credential masking never echoes secrets", () => {
  assert.equal(aci.maskSecretPresence("super-secret"), "PRESENT");
  assert.equal(aci.maskSecretPresence(""), "MISSING");
  assert.equal(aci.maskSecretPresence(null), "MISSING");
});

test("publication safety blocks leaks", () => {
  const blocked = aci.publicationSafety(2);
  assert.equal(blocked.safe, false);
  assert.equal(blocked.rebuildAllowed, false);
  assert.equal(blocked.label, "PUBLIC CATALOGUE BLOCKED");
  const safe = aci.publicationSafety(0);
  assert.equal(safe.label, "PUBLIC CATALOGUE SAFE");
});

test("health is AMBER when outcomes missing and feed disconnected", () => {
  const health = aci.buildAciHealth({
    catalogueLeaks: 0,
    outcomeMissing: 28,
    verifiedSalePrices: 0,
    partnerConnected: false,
    partnerAuthorised: false,
  });
  assert.equal(health.tone, "AMBER");
});

test("health is RED on catalogue leaks", () => {
  const health = aci.buildAciHealth({
    catalogueLeaks: 1,
    outcomeMissing: 0,
    verifiedSalePrices: 5,
    partnerConnected: true,
    partnerAuthorised: true,
  });
  assert.equal(health.tone, "RED");
  assert.equal(health.label, "PUBLIC CATALOGUE BLOCKED");
});

test("action queue is derived from live bottlenecks", () => {
  const actions = aci.buildAciActionQueue({
    outcomeMissing: 28,
    soldWithoutPrice: 5,
    verifiedSalePrices: 0,
    comparableReady: 0,
    marketReadyTowns: 0,
    catalogueLeaks: 0,
    partnerAuthorised: false,
    partnerConnected: false,
  });
  assert.ok(actions.some((a) => a.id === "outcome_missing"));
  assert.ok(actions.some((a) => a.id === "sold_without_price"));
  assert.ok(actions.some((a) => a.id === "partner_feed"));
  assert.ok(actions.some((a) => a.id === "market"));
  assert.equal(actions.some((a) => a.id === "catalogue_leaks"), false);
});

test("competitive score is reproducible and not hardcoded 38", () => {
  const score = aci.buildCompetitiveScore(baseline);
  const again = aci.buildCompetitiveScore(baseline);
  assert.equal(score.overall, again.overall);
  assert.equal(score.components.length, 9);
  assert.equal(score.components.find((c) => c.key === "sale_price").score, 0);
  assert.equal(score.components.find((c) => c.key === "market").score, 0);
  assert.equal(score.components.find((c) => c.key === "safety").score, 100);
  const src = read("lib/aci/commandCentre.ts");
  assert.equal(/overall:\s*38/.test(src), false);
});

test("empty metrics produce insufficient-data scores", () => {
  const empty = aci.buildCompetitiveScore({
    historicalEvents: 0,
    auctionEvents: 0,
    licensedSources: "0/0",
    fetchAttempted: 0,
    fetchSuccessful: 0,
    fetchFailed: 0,
    snapshots: 0,
    extractions: 0,
    outcomeEvidence: 0,
    outcomeMissing: 0,
    verifiedSold: 0,
    soldWithoutPrice: 0,
    verifiedSalePrices: 0,
    comparableReady: 0,
    marketReadyTowns: 0,
    catalogueLeaks: 0,
    legacyUnknownFailures: 0,
  });
  assert.equal(empty.components.find((c) => c.key === "evidence").score, 0);
  assert.equal(empty.components.find((c) => c.key === "market").explanation.includes("INSUFFICIENT_DATA"), true);
});

test("decision status is INSUFFICIENT DATA without verified price", () => {
  assert.equal(
    aci.deriveDecisionStatus({
      catalogueLeaks: 0,
      outcome: "UNKNOWN",
      salePriceVerified: false,
      comparableReady: false,
      marketReady: false,
    }),
    "INSUFFICIENT DATA",
  );
  assert.equal(
    aci.deriveDecisionStatus({
      catalogueLeaks: 1,
      outcome: "SOLD",
      salePriceVerified: true,
      comparableReady: true,
      marketReady: true,
    }),
    "DO NOT PUBLISH",
  );
});

test("investor workflow does not encourage a decision without comparables", () => {
  const steps = aci.investorWorkflow({
    discovered: true,
    researched: true,
    outcome: "SOLD_WITHOUT_PRICE",
    salePriceVerified: false,
    comparableCount: 0,
  });
  const decide = steps.find((s) => s.stage === "DECIDE");
  assert.equal(decide.state, "INSUFFICIENT DATA");
  assert.equal(decide.ok, false);
});

test("evidence timeline marks sale price not verified", () => {
  const timeline = aci.buildEvidenceTimeline({
    observationId: "obs-1",
    auctionEventId: "evt-1",
    propertyLabel: "Test",
    town: "Pretoria",
    agency: "Bidders Choice",
    auctionDate: "2026-01-01",
    sourceUrl: "https://example.test",
    sourceStatus: "LICENSED",
    recoveryPriority: 2,
    evidenceState: "OUTCOME_FOUND",
    fetchState: "FETCH_SUCCESS",
    httpStatus: 200,
    errorCode: null,
    failureClassification: "NONE",
    retryable: false,
    snapshot: true,
    extraction: "AVAILABLE",
    outcome: "SOLD_WITHOUT_PRICE",
    salePrice: "SOLD_WITHOUT_PRICE",
    resolution: "SOLD_WITHOUT_PRICE",
    evidenceQuality: "LOW",
    lastAttempt: "2026-01-02",
    attemptNumber: 1,
    nextAction: "WAIT_FOR_RESULTS_FEED",
  });
  const sale = timeline.find((s) => s.key === "sale_price");
  assert.equal(sale.state, "NOT VERIFIED");
  assert.equal(sale.done, false);
  const outcome = timeline.find((s) => s.key === "outcome");
  assert.equal(outcome.state, "SOLD_WITHOUT_PRICE");
});

test("market grouping stays INSUFFICIENT_DATA below 5 verified prices", () => {
  const towns = aci.groupEventsByTown([
    {
      town: "Pretoria",
      outcome: "SOLD_WITHOUT_PRICE",
      salePrice: "MISSING",
      evidenceState: "OUTCOME_FOUND",
    },
    {
      town: "Pretoria",
      outcome: "UNKNOWN",
      salePrice: "MISSING",
      evidenceState: "INSUFFICIENT_DATA",
    },
  ]);
  assert.equal(towns[0].marketStatus, "INSUFFICIENT_DATA");
  assert.equal(towns[0].marketReady, false);
  assert.equal(towns[0].verifiedSalePrices, 0);
});

test("before/after delta uses live numbers", () => {
  const after = { ...baseline, outcomeEvidence: 6, outcomeMissing: 27 };
  const rows = aci.buildBeforeAfterDelta(baseline, after);
  const outcome = rows.find((r) => r.metric === "Outcome Evidence");
  assert.equal(outcome.before, 5);
  assert.equal(outcome.after, 6);
  assert.equal(outcome.delta, 1);
});

test("command centre pages and APIs exist", () => {
  const files = [
    "app/admin/aci/page.tsx",
    "app/admin/aci/discover/page.tsx",
    "app/admin/aci/research/[id]/page.tsx",
    "app/admin/aci/compare/page.tsx",
    "app/admin/aci/market/page.tsx",
    "app/admin/aci/dossier/[id]/page.tsx",
    "app/api/admin/aci/route.ts",
    "app/api/admin/aci/discover/route.ts",
    "app/api/admin/aci/research/[id]/route.ts",
    "app/api/admin/aci/compare/route.ts",
    "app/api/admin/aci/market/route.ts",
    "app/api/admin/aci/dossier/[id]/route.ts",
    "app/api/admin/aci/actions/route.ts",
    "lib/services/AciCommandCentreService.ts",
  ];
  for (const file of files) {
    assert.equal(fs.existsSync(path.join(root, file)), true, file);
  }
});

test("admin APIs require admin auth", () => {
  for (const file of [
    "app/api/admin/aci/route.ts",
    "app/api/admin/aci/discover/route.ts",
    "app/api/admin/aci/compare/route.ts",
    "app/api/admin/aci/market/route.ts",
    "app/api/admin/aci/actions/route.ts",
    "app/api/admin/aci/research/[id]/route.ts",
    "app/api/admin/aci/dossier/[id]/route.ts",
  ]) {
    const src = read(file);
    assert.equal(src.includes("PermissionService.requireAdmin()"), true, file);
  }
});

test("pages do not hard-code production baseline counts", () => {
  const src = read("app/admin/aci/page.tsx");
  assert.equal(src.includes("28/33"), false);
  assert.equal(src.includes("catalogueLeaks = 0"), false);
});

test("partner UI never prints credential values", () => {
  const src = read("app/admin/aci/page.tsx") + read("lib/services/AciCommandCentreService.ts");
  assert.equal(/BIDDERS_CHOICE_RESULTS_FEED_TOKEN/.test(src), false);
  assert.equal(src.includes("summary.partner.credentials"), true);
  assert.equal(src.includes("summary.partner.url"), true);
});

test("actions confirm before writes", () => {
  const src = read("lib/services/AciCommandCentreService.ts");
  assert.equal(src.includes("Explicit confirmation required"), true);
  assert.equal(src.includes("ACI_MAX_BATCH"), true);
  const panel = read("app/admin/aci/AciActionPanel.tsx");
  assert.equal(panel.includes("window.confirm"), true);
  assert.equal(panel.includes("limit: 5"), true);
});

test("service reuses HI56, dossier, and partner results", () => {
  const src = read("lib/services/AciCommandCentreService.ts");
  assert.equal(src.includes("HistoricalIntelligence56Service"), true);
  assert.equal(src.includes("AuctionEvidenceDossierService"), true);
  assert.equal(src.includes("AuctionPartnerResultsIngestionService"), true);
  assert.equal(src.includes("create table"), false);
});

test("no second intelligence engine", () => {
  const src = read("lib/services/AciCommandCentreService.ts");
  assert.equal(/class AciIntelligenceEngine/.test(src), false);
  assert.equal(src.includes("historical-intelligence-5.7"), false);
});

console.log(`\n${passed} tests passed`);
