/**
 * Investor Intelligence 4.0 Sprint 1 — search, comparison, workspace.
 * Run: node scripts/investor-intelligence-selftest.cjs
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
      if (fs.existsSync(tsPath)) return loadFromAbs(tsPath);
    }
    if (id.startsWith("./") || id.startsWith("../")) {
      const resolved = path.resolve(path.dirname(abs), id);
      const tsPath = resolved.endsWith(".ts") ? resolved : `${resolved}.ts`;
      if (fs.existsSync(tsPath)) return loadFromAbs(tsPath);
    }
    return originalRequire(id);
  };
  cache.set(abs, mod.exports);
  mod._compile(code, abs);
  cache.set(abs, mod.exports);
  return mod.exports;
}

function loadLib(rel) {
  return loadFromAbs(path.join(root, "lib", rel));
}

const { NOT_SUPPLIED, displaySupplied } = loadLib("intelligence/notSupplied.ts");
const { applySearchFilterAccess, hasAdvancedSearchFilters } = loadLib(
  "intelligence/searchAccess.ts",
);
const { compareLimit, applyCompareAccess, FREE_COMPARE_LIMIT } = loadLib(
  "intelligence/compareAccess.ts",
);
const { buildPropertyComparison } = loadLib("intelligence/propertyComparison.ts");
const { matchesAgriculturalType, suppliedHectares } = loadLib(
  "intelligence/agriculturalSearch.ts",
);
const { searchRankingScore } = loadLib("platform/searchIntelligence.ts");
const { buildInvestorDashboard } = loadLib("intelligence/workspaceDashboard.ts");
const { isPubliclyActiveListing } = loadLib("data/publicListingPolicy.ts");
const { parsePropertySearchParams } = loadLib(
  "properties/parsePropertySearchParams.ts",
);

function listing(over = {}) {
  return {
    id: over.id ?? "a",
    title: over.title ?? "Test listing",
    description: null,
    province: over.province ?? "Gauteng",
    town: over.town ?? "Benoni",
    suburb: over.suburb ?? "Crystal Park",
    address: null,
    street_address: null,
    postal_code: null,
    auction_date: over.auction_date ?? "2026-09-01T00:00:00.000Z",
    auction_time: null,
    auction_venue: over.auction_venue ?? null,
    auction_price: over.auction_price ?? 2_000_000,
    estimated_value: over.estimated_value ?? null,
    reserve_price: over.reserve_price ?? null,
    bedrooms: over.bedrooms ?? 2,
    bathrooms: over.bathrooms ?? 1,
    garages: over.garages ?? null,
    property_type: over.property_type ?? "House",
    status: over.status ?? "upcoming",
    listing_status: over.listing_status ?? "upcoming",
    source: "bidders_choice",
    source_name: over.source_name ?? "Bidders Choice",
    source_url: null,
    auction_agency: over.auction_agency ?? "Bidders Choice",
    agency_contact: null,
    agency_website: null,
    external_listing_id: null,
    imported_at: null,
    last_verified_at: null,
    data_classification: "production",
    data_quality_score: null,
    verification_state: over.verification_state ?? "verified",
    verification_label: "Verified",
    address_display_mode: null,
    provenance_notes: null,
    latitude: null,
    longitude: null,
    image: null,
    thumbnail: null,
    heroImage: null,
    blur_placeholder: null,
    qualityScore: null,
    featured: false,
    isSeedOrDemo: false,
    isPendingVerification: false,
    erf_size: over.erf_size ?? null,
    floor_size: over.floor_size ?? null,
    features: null,
    viewing_information: null,
    deposit_requirements: null,
    terms_link: null,
    brochure_link: null,
    catalogue_link: null,
    registration_link: over.registration_link ?? null,
    agricultural_details: over.agricultural_details ?? null,
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

test("not supplied label for missing values", () => {
  assert.equal(displaySupplied(null).text, NOT_SUPPLIED);
  assert.equal(displaySupplied("").supplied, false);
  assert.equal(displaySupplied(2).supplied, true);
});

test("parse new search params", () => {
  const filters = parsePropertySearchParams(
    new URLSearchParams(
      "town=Benoni&agriculturalType=macadamia&minHectares=4&agency=Bidders%20Choice",
    ),
  );
  assert.equal(filters.town, "Benoni");
  assert.equal(filters.agriculturalType, "macadamia");
  assert.equal(filters.minHectares, 4);
  assert.equal(filters.agency, "Bidders Choice");
});

test("advanced filters stripped for free users", () => {
  const filters = {
    province: "Limpopo",
    agriculturalType: "macadamia",
    minHectares: 4,
    agency: "BC",
  };
  assert.equal(hasAdvancedSearchFilters(filters), true);
  const gated = applySearchFilterAccess(filters, false);
  assert.equal(gated.province, "Limpopo");
  assert.equal(gated.agriculturalType, undefined);
  assert.equal(gated.minHectares, undefined);
  const premium = applySearchFilterAccess(filters, true);
  assert.equal(premium.agriculturalType, "macadamia");
});

test("agricultural match uses supplied type/title only", () => {
  const farm = listing({
    title: "Macadamia orchard Tzaneen",
    property_type: "Farm",
    agricultural_details: { farmCategory: "Macadamia", totalHectares: 12 },
  });
  assert.equal(matchesAgriculturalType(farm, "macadamia"), true);
  assert.equal(matchesAgriculturalType(farm, "dairy"), false);
  assert.equal(suppliedHectares(farm), 12);
  assert.equal(suppliedHectares(listing({ erf_size: 50000 })), null);
});

test("ranking is deterministic and boosts filter matches", () => {
  const base = searchRankingScore({
    verificationState: "verified",
    auctionDate: "2026-08-20T00:00:00.000Z",
    now: new Date("2026-08-13T00:00:00.000Z"),
  });
  const matched = searchRankingScore({
    verificationState: "verified",
    auctionDate: "2026-08-20T00:00:00.000Z",
    now: new Date("2026-08-13T00:00:00.000Z"),
    townMatch: true,
  });
  assert.ok(matched > base);
});

test("free compare limit is 2; premium 6", () => {
  assert.equal(compareLimit(false), FREE_COMPARE_LIMIT);
  assert.equal(applyCompareAccess([1, 2, 3], false).length, 2);
  assert.equal(applyCompareAccess([1, 2, 3, 4, 5, 6, 7], true).length, 6);
});

test("comparison never infers reserve from estimated value", () => {
  const a = listing({
    id: "1",
    estimated_value: 2_500_000,
    auction_price: 2_000_000,
    reserve_price: null,
  });
  const b = listing({
    id: "2",
    estimated_value: null,
    auction_price: 1_800_000,
    reserve_price: null,
    erf_size: 450,
  });
  const free = buildPropertyComparison([a, b], { premium: false, limit: 2 });
  assert.equal(free.rows.some((r) => r.key === "reserve"), false);
  assert.equal(free.rows.some((r) => r.key === "land_size"), false);
  const premium = buildPropertyComparison([a, b], { premium: true, limit: 6 });
  const reserve = premium.rows.find((r) => r.key === "reserve");
  assert.equal(reserve, undefined);
  const estimated = premium.rows.find((r) => r.key === "estimated");
  assert.ok(estimated);
  assert.equal(estimated.cells[0].supplied, true);
  assert.equal(estimated.cells[1].supplied, false);
  const land = premium.rows.find((r) => r.key === "land_size");
  assert.equal(land.cells[0].text, NOT_SUPPLIED);
  assert.equal(land.cells[1].supplied, true);
});

test("expired listing is not publicly active", () => {
  const now = new Date("2026-08-13T12:00:00.000Z");
  assert.equal(
    isPubliclyActiveListing({
      verification_state: "expired",
      listing_status: "expired",
      auction_date: "2026-08-04T00:00:00.000Z",
      now,
    }),
    false,
  );
  assert.equal(
    isPubliclyActiveListing({
      verification_state: "verified",
      listing_status: "upcoming",
      auction_date: "2026-09-01T00:00:00.000Z",
      now,
    }),
    true,
  );
});

test("workspace retains historical and flags tracker attention", () => {
  const upcoming = listing({
    id: "u1",
    title: "Upcoming lodge",
    auction_date: "2026-08-18T00:00:00.000Z",
    listing_status: "upcoming",
    verification_state: "verified",
  });
  const expired = listing({
    id: "e1",
    title: "Expired farm",
    auction_date: "2026-08-04T00:00:00.000Z",
    listing_status: "expired",
    verification_state: "expired",
    status: "expired",
  });
  const dash = buildInvestorDashboard({
    properties: [upcoming, expired],
    notes: [],
    trackers: [],
    alerts: [],
    now: new Date("2026-08-13T12:00:00.000Z"),
  });
  assert.equal(dash.upcoming.length, 1);
  assert.equal(dash.historicalRetained.length, 1);
  assert.equal(dash.historicalRetained[0].id, "e1");
  assert.ok(dash.attention.some((a) => a.propertyId === "u1"));
  assert.equal(
    dash.attention.some((a) => a.propertyId === "e1"),
    false,
  );
});

test("compare and workspace routes exist", () => {
  assert.ok(
    fs.existsSync(path.join(root, "app", "compare", "page.tsx")),
  );
  assert.ok(
    fs.existsSync(path.join(root, "app", "workspace", "page.tsx")),
  );
  const api = fs.readFileSync(
    path.join(root, "app", "api", "compare", "route.ts"),
    "utf8",
  );
  assert.match(api, /SubscriptionService\.premium/);
  assert.match(api, /applyCompareAccess/);
  const propsApi = fs.readFileSync(
    path.join(root, "app", "api", "properties", "route.ts"),
    "utf8",
  );
  assert.match(propsApi, /applySearchFilterAccess/);
});

if (!process.exitCode) {
  console.log("All investor-intelligence selftests passed");
}
