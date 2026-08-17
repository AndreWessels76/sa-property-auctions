/**
 * ACI Command Centre v2 — selftests.
 * Run: npm run test:aci-v2
 * No production writes.
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

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function test(name, fn) {
  fn();
  passed += 1;
  console.log(`  ✓ ${name}`);
}

const v2 = loadFromAbs(path.join(root, "lib/aci/productLayer.ts"));
const v1 = loadFromAbs(path.join(root, "lib/aci/commandCentre.ts"));

console.log("ACI Command Centre v2 selftest\n");

test("v2 version", () => {
  assert.equal(v2.ACI_COMMAND_CENTRE_V2_VERSION, "aci-command-centre-2.0.0");
});

test("expired is never VERIFIED_SOLD", () => {
  assert.equal(
    v2.classifyOutcomeState({ outcome: "EXPIRED", salePrice: "MISSING" }),
    "EXPIRED",
  );
});

test("SOLD without price stays SOLD_WITHOUT_PRICE", () => {
  assert.equal(
    v2.classifyOutcomeState({ outcome: "SOLD_WITHOUT_PRICE", salePrice: "MISSING" }),
    "SOLD_WITHOUT_PRICE",
  );
});

test("sale price protection — unverified excluded from compare", () => {
  const ex = v2.compareExclusion("SALE PRICE NOT VERIFIED");
  assert.equal(ex.included, false);
  assert.equal(ex.label, "EXCLUDED — SALE PRICE NOT VERIFIED");
  assert.equal(v2.compareExclusion("VERIFIED SALE PRICE").included, true);
});

test("market threshold remains 5 — no median below", () => {
  const stats = v2.marketStatistics({ verifiedPrices: [1, 2, 3, 4], town: "Pretoria" });
  assert.equal(stats.status, "INSUFFICIENT_DATA");
  assert.equal(stats.median, null);
  assert.equal(stats.min, null);
});

test("market median only after 5 verified prices", () => {
  const stats = v2.marketStatistics({
    verifiedPrices: [100, 200, 300, 400, 500],
    town: "Pretoria",
  });
  assert.equal(stats.status, "MARKET_READY");
  assert.equal(stats.median, 300);
  assert.equal(stats.count, 5);
});

test("workspace filters SOLD_WITHOUT_PRICE", () => {
  const rows = [
    { town: "A", outcomeState: "SOLD_WITHOUT_PRICE", evidenceState: "OUTCOME_FOUND", salePriceState: "SALE PRICE NOT VERIFIED", evidenceBadge: "SOURCE_FOUND", province: "GP", propertyType: "house", auctionDate: "2026-01-01" },
    { town: "B", outcomeState: "UNKNOWN", evidenceState: "INSUFFICIENT_DATA", salePriceState: "UNKNOWN", evidenceBadge: "INSUFFICIENT_DATA", province: "GP", propertyType: "house", auctionDate: "2026-01-01" },
  ];
  const filtered = v2.filterWorkspaceRows(rows, { outcomeFilter: "SOLD_WITHOUT_PRICE" });
  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].town, "A");
});

test("empty workspace filter result", () => {
  const filtered = v2.filterWorkspaceRows([], { town: "Nowhere" });
  assert.equal(filtered.length, 0);
});

test("opportunity ranking — identity + missing outcome is HIGH PRIORITY", () => {
  assert.equal(
    v2.rankOpportunity({
      identityStrong: true,
      auctionDate: "2026-01-01",
      outcomeState: "UNKNOWN",
      salePriceState: "UNKNOWN",
    }),
    "HIGH PRIORITY",
  );
  assert.equal(
    v2.rankOpportunity({
      identityStrong: true,
      auctionDate: "2026-01-01",
      outcomeState: "VERIFIED_SOLD",
      salePriceState: "VERIFIED SALE PRICE",
    }),
    "COMPLETE",
  );
  assert.equal(
    v2.rankOpportunity({
      identityStrong: false,
      auctionDate: null,
      outcomeState: "UNKNOWN",
      salePriceState: "UNKNOWN",
    }),
    "WAITING",
  );
});

test("timeline does not fabricate missing stages", () => {
  const timeline = v2.buildResearchTimelineV2({
    sourceName: null,
    sourceUrl: null,
    sourceStatus: null,
    auctionDate: null,
    fetchState: null,
    fetchTimestamp: null,
    snapshot: false,
    snapshotId: null,
    snapshotAt: null,
    extraction: null,
    extractionId: null,
    outcome: null,
    salePrice: null,
    saleVerified: false,
    hasDossier: false,
  });
  const sale = timeline.find((s) => s.key === "sale_price");
  assert.equal(sale.available, false);
  assert.equal(sale.state, "NOT AVAILABLE");
  assert.equal(timeline.find((s) => s.key === "discovered").available, true);
});

test("sale price panel never shows an inferred amount", () => {
  const panel = v2.salePricePanel({
    salePriceState: "SALE PRICE NOT VERIFIED",
    verifiedAmount: 1_250_000,
    source: "test",
    timestamp: null,
    snapshotId: null,
  });
  assert.equal(panel.amountDisplay, "SALE PRICE NOT VERIFIED");
});

test("product readiness is not hardcoded", () => {
  const metrics = {
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
  const a = v2.buildProductReadiness(metrics);
  const b = v2.buildProductReadiness(metrics);
  assert.equal(a.overall, b.overall);
  assert.equal(a.components.find((c) => c.key === "market").score, 0);
  assert.equal(a.components.find((c) => c.key === "comparison").score, 0);
  const src = read("lib/aci/productLayer.ts");
  assert.equal(/overall:\s*38/.test(src), false);
});

test("positioning claims are classified", () => {
  const claims = v2.positioningClaims();
  assert.ok(claims.some((c) => c.classification === "VERIFIED"));
  assert.ok(claims.some((c) => c.classification === "INFERENCE"));
  assert.ok(claims.some((c) => c.classification === "UNKNOWN"));
});

test("watchlist parser", () => {
  assert.deepEqual(v2.parseWatchlistIds('["a","b"]'), ["a", "b"]);
  assert.deepEqual(v2.parseWatchlistIds("not-json"), []);
  assert.deepEqual(v2.parseWatchlistIds(null), []);
});

test("batch limit still 5", () => {
  assert.equal(v1.ACI_MAX_BATCH, 5);
  assert.equal(v1.rejectAciUnlimitedLimit(6).ok, false);
});

test("publication safety still blocks leaks", () => {
  assert.equal(v1.publicationSafety(1).label, "PUBLIC CATALOGUE BLOCKED");
});

test("credential masking", () => {
  assert.equal(v1.maskSecretPresence("secret"), "PRESENT");
  assert.equal(v1.maskSecretPresence(""), "MISSING");
});

test("decision states exclude BUY/SELL", () => {
  const src = read("lib/aci/commandCentre.ts") + read("lib/aci/productLayer.ts");
  assert.equal(/\bBUY\b/.test(src), false);
  assert.equal(/INVEST NOW/.test(src), false);
});

test("pages and APIs exist", () => {
  for (const file of [
    "app/admin/aci/workspace/page.tsx",
    "app/admin/aci/watchlist/page.tsx",
    "app/admin/aci/opportunities/page.tsx",
    "app/admin/aci/AciPropertyIntelligenceCard.tsx",
    "app/api/admin/aci/workspace/route.ts",
    "app/api/admin/aci/opportunities/route.ts",
  ]) {
    assert.equal(fs.existsSync(path.join(root, file)), true, file);
  }
});

test("admin permission on new APIs", () => {
  assert.equal(read("app/api/admin/aci/workspace/route.ts").includes("PermissionService.requireAdmin()"), true);
  assert.equal(read("app/api/admin/aci/opportunities/route.ts").includes("PermissionService.requireAdmin()"), true);
});

test("partner secrets stay masked", () => {
  const src = read("app/admin/aci/page.tsx");
  assert.equal(src.includes("RESULTS FEED NOT CONNECTED"), true);
  assert.equal(/BIDDERS_CHOICE_RESULTS_FEED_TOKEN/.test(src), false);
});

test("no migration added", () => {
  const files = fs.readdirSync(path.join(root, "supabase/migrations"));
  assert.equal(files.some((f) => f.includes("aci_v2")), false);
});

test("corpus cache used instead of duplicate HSC per page", () => {
  const src = read("lib/services/AciCommandCentreService.ts");
  assert.equal(src.includes("loadCorpus"), true);
  assert.equal(src.includes("CORPUS_TTL_MS"), true);
});

test("pagination helper", () => {
  const p = v2.paginateRows([1, 2, 3, 4, 5], 2, 2);
  assert.deepEqual(p.rows, [3, 4]);
  assert.equal(p.total, 5);
});

console.log(`\n${passed} tests passed`);
