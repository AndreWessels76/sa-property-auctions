/**
 * Historical Intelligence 2B — deterministic selftests.
 * Run: node scripts/historical-intelligence-selftest.cjs
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
  classifyAuctionEventState,
  classifyListingHistoricalState,
  isCurrentCatalogueState,
} = load("intelligence/historical/eventClassification.ts");
const { median, average, sampleSafety, growthPercent, inTimeWindow } = load(
  "intelligence/historical/historicalMetrics.ts",
);
const { buildHistoricalDataset, publicHistoricalRows } = load(
  "intelligence/historical/historicalAggregation.ts",
);
const { buildHistoricalIntelligenceReport } = load(
  "intelligence/historical/historicalBuilder.ts",
);
const { comparableEligibility } = load(
  "intelligence/historical/historicalComparables.ts",
);
const { isPubliclyActiveListing } = load("data/publicListingPolicy.ts");

function event(over = {}) {
  return {
    id: over.id ?? "e1",
    property_master_id: over.property_master_id ?? "m1",
    listing_property_id: over.listing_property_id ?? "p1",
    external_listing_id: null,
    agency: over.agency ?? "Bidders Choice",
    auction_date: over.auction_date ?? "2025-06-01T00:00:00.000Z",
    auction_time: null,
    venue: null,
    auction_type: null,
    reserve_price: over.reserve_price ?? null,
    opening_bid: over.opening_bid ?? null,
    winning_bid: over.winning_bid ?? null,
    guide_price: over.guide_price ?? null,
    status: over.status ?? "sold",
    source_name: "Bidders Choice",
    source_url: "https://example.com",
    connector_id: "bidders_choice",
    verification_state: over.verification_state ?? "verified",
    brochure_link: null,
    terms_link: null,
    catalogue_link: null,
    documents: null,
    imported_at: "2025-01-01T00:00:00.000Z",
    verified_at: "2025-01-02T00:00:00.000Z",
    created_at: "2025-01-01T00:00:00.000Z",
    updated_at: "2025-01-01T00:00:00.000Z",
  };
}

function listing(over = {}) {
  return {
    id: over.id ?? "p1",
    title: over.title ?? "House in Johannesburg",
    property_type: over.property_type ?? "House",
    listing_status: over.listing_status ?? "sold",
    status: over.status ?? "sold",
    verification_state: over.verification_state ?? "sold",
    data_classification: over.data_classification ?? "production",
    auction_date: over.auction_date ?? "2025-06-01T00:00:00.000Z",
    auction_price: over.auction_price ?? 0,
    reserve_price: over.reserve_price ?? null,
    estimated_value: over.estimated_value ?? 0,
    floor_size: over.floor_size ?? 100,
    erf_size: over.erf_size ?? 500,
    bedrooms: 3,
    bathrooms: 2,
    province: "Gauteng",
    town: over.town ?? "Johannesburg",
    suburb: "Sandton",
    municipality: null,
    auction_agency: "Bidders Choice",
    source_name: "Bidders Choice",
    source_url: "https://example.com",
    property_master_id: over.property_master_id ?? "m1",
    farm_name: null,
    agricultural_details: over.agricultural_details ?? null,
  };
}

// --- Event classification ---
assert.equal(classifyAuctionEventState("sold"), "sold");
assert.equal(classifyAuctionEventState("closed"), "completed");
assert.equal(classifyAuctionEventState("expired"), "expired");
assert.equal(classifyAuctionEventState("withdrawn"), "withdrawn");
assert.equal(classifyAuctionEventState("cancelled"), "cancelled");
assert.equal(classifyAuctionEventState("scheduled"), "upcoming");
assert.equal(classifyAuctionEventState("mystery"), "unknown");
assert.equal(classifyListingHistoricalState({ listingStatus: "expired", verificationState: "expired" }), "expired");
assert.notEqual(classifyListingHistoricalState({ listingStatus: "expired" }), "sold");
assert.notEqual(classifyAuctionEventState("closed"), "sold");
assert.equal(isCurrentCatalogueState("upcoming"), true);
assert.equal(isCurrentCatalogueState("sold"), false);

// --- Metrics ---
assert.equal(median([1, 3, 2]), 2);
assert.equal(median([1, 2, 3, 4]), 2.5);
assert.equal(average([2, 4]), 3);
assert.equal(sampleSafety(0), "insufficient_data");
assert.equal(sampleSafety(1), "limited_one");
assert.equal(sampleSafety(3), "limited_sample");
assert.equal(sampleSafety(5), "statistic");
assert.equal(growthPercent(100, 108), 8);
assert.equal(growthPercent(0, 108), null);
assert.equal(
  inTimeWindow("2026-08-01T00:00:00.000Z", "30d", new Date("2026-08-14T00:00:00.000Z")),
  true,
);

// --- Pricing semantics: sale vs auction vs guide ---
const soldEvent = event({
  status: "sold",
  winning_bid: 1_800_000,
  guide_price: 2_000_000,
  reserve_price: 1_700_000,
});
const ds = buildHistoricalDataset({
  events: [soldEvent],
  listings: [
    listing({
      auction_price: 1_500_000,
      estimated_value: 2_200_000,
    }),
  ],
});
assert.equal(ds.length, 1);
assert.equal(ds[0].prices.sale_price, 1_800_000);
assert.equal(ds[0].prices.guide_price, 2_000_000);
assert.equal(ds[0].prices.reserve_price, 1_700_000);
assert.equal(ds[0].prices.auction_price, 1_500_000);
assert.equal(ds[0].prices.estimated_value, 2_200_000);

const completedNoSale = buildHistoricalDataset({
  events: [event({ id: "e2", status: "closed", winning_bid: 1_800_000, listing_property_id: "p2" })],
  listings: [listing({ id: "p2", listing_status: "completed", status: "completed", verification_state: "verified" })],
});
assert.equal(completedNoSale[0].state, "completed");
assert.equal(completedNoSale[0].prices.sale_price, null, "winning_bid is not sale unless sold");

const report = buildHistoricalIntelligenceReport({ observations: ds });
assert.equal(report.salePrice.count, 1);
assert.equal(report.salePrice.median, 1_800_000);
assert.notEqual(report.salePrice.median, 2_000_000);
assert.equal(report.salePricePerM2.median, 18000);
assert.equal(report.activity.sold, 1);

// Guide must not enter sale average
const mixed = buildHistoricalDataset({
  events: [
    event({ id: "s1", status: "sold", winning_bid: 1_000_000, listing_property_id: "a" }),
    event({ id: "s2", status: "scheduled", guide_price: 9_000_000, listing_property_id: "b" }),
  ],
  listings: [
    listing({ id: "a", listing_status: "sold" }),
    listing({
      id: "b",
      listing_status: "upcoming",
      verification_state: "verified",
      auction_date: "2026-12-01T00:00:00.000Z",
    }),
  ],
});
const mixedReport = buildHistoricalIntelligenceReport({ observations: mixed });
assert.equal(mixedReport.salePrice.median, 1_000_000);
assert.equal(mixedReport.activity.upcomingExcluded >= 0, true);

// Upcoming excluded from historical public rows
assert.equal(publicHistoricalRows(mixed).every((r) => r.state !== "upcoming"), true);

// Withdrawn is not unsold sale
const withdrawn = buildHistoricalDataset({
  events: [event({ id: "w1", status: "withdrawn", winning_bid: 500000 })],
  listings: [listing({ listing_status: "withdrawn", verification_state: "withdrawn" })],
});
const wReport = buildHistoricalIntelligenceReport({ observations: withdrawn });
assert.equal(wReport.activity.withdrawn, 1);
assert.equal(wReport.salePrice.count, 0);
assert.equal(wReport.rates.saleRate.denominator, 1);

// Missing sale price excluded from average
const soldNoPrice = buildHistoricalDataset({
  events: [event({ status: "sold", winning_bid: null })],
  listings: [listing({ auction_price: 0 })],
});
const snp = buildHistoricalIntelligenceReport({ observations: soldNoPrice });
assert.equal(snp.salePrice.count, 0);
assert.equal(snp.salePrice.notCalculableReason, "Insufficient data");
assert.equal(snp.activity.sold, 1);
assert.equal(snp.salePrice.coverageLabel, "0 / 1");

// Zero filling forbidden
assert.equal(snp.salePrice.average, null);
assert.equal(snp.salePrice.median, null);

// Duplicate event protection
const dup = buildHistoricalDataset({
  events: [event({ id: "same" }), event({ id: "same" })],
  listings: [listing()],
});
assert.equal(dup.filter((r) => r.sourceUnit === "auction_event").length, 1);

// Listing fallback not double-counted when event exists
assert.equal(ds.filter((r) => r.listingPropertyId === "p1").length, 1);

// Unverified excluded from public stats
const pending = buildHistoricalDataset({
  events: [event({ verification_state: "pending_verification", status: "sold", winning_bid: 3_000_000 })],
  listings: [listing({ verification_state: "pending_verification" })],
});
const pReport = buildHistoricalIntelligenceReport({ observations: pending });
assert.equal(pReport.salePrice.count, 0);

// Price/ha uses hectares not floor; approximate flag
const farm = buildHistoricalDataset({
  events: [event({ id: "f1", status: "sold", winning_bid: 3_280_000, listing_property_id: "farm1" })],
  listings: [
    listing({
      id: "farm1",
      title: "Guest Farm Tzaneen",
      property_type: "Guest Farm",
      floor_size: 200,
      agricultural_details: { totalHectares: 32.8, farmCategory: "Guest Farm" },
    }),
  ],
  observations: [
    {
      id: "o1",
      property_id: "farm1",
      property_master_id: "m1",
      auction_event_id: "f1",
      field_name: "total_hectares",
      normalized_value: 32.8,
      status: "extracted",
      is_approximate: true,
      is_range: false,
      min_value: null,
      max_value: null,
      source_name: "Bidders Choice",
      evidence_text: "±32.8 ha",
    },
  ],
});
const farmReport = buildHistoricalIntelligenceReport({ observations: farm });
assert.ok(farmReport.salePricePerHa.median);
assert.equal(farmReport.salePricePerHa.isApproximate, true);
assert.ok(Math.abs(farmReport.salePricePerHa.median - 3_280_000 / 32.8) < 1);
assert.notEqual(farmReport.salePricePerM2.median, farmReport.salePricePerHa.median);

// Never mix residential + agricultural sale average as one category
assert.equal(
  farmReport.byMarketCategory.find((c) => c.category === "Agricultural").count,
  1,
);
assert.equal(
  farmReport.byMarketCategory.find((c) => c.category === "Residential").salePrice.count,
  0,
);

// Comparables eligibility
const elig = comparableEligibility(ds[0], "sale_price");
assert.equal(elig.eligible, true);
assert.equal(elig.priceKind, "sale_price");

// Public catalogue
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
assert.equal(
  isPubliclyActiveListing({
    verification_state: "sold",
    listing_status: "sold",
    status: "sold",
    auction_date: "2024-01-01",
  }),
  false,
);

// Routes exist
const histRoute = path.join(root, "app/api/intelligence/historical/route.ts");
const areaRoute = path.join(root, "app/api/intelligence/area/[town]/route.ts");
const agencyRoute = path.join(root, "app/api/intelligence/agency/[agency]/route.ts");
const adminRoute = path.join(root, "app/api/admin/intelligence/historical/route.ts");
const panel = path.join(
  root,
  "components/property/detail/HistoricalAuctionActivityPanel.tsx",
);
assert.equal(fs.existsSync(histRoute), true);
assert.equal(fs.existsSync(areaRoute), true);
assert.equal(fs.existsSync(agencyRoute), true);
assert.equal(fs.existsSync(adminRoute), true);
assert.equal(fs.existsSync(panel), true);

console.log("historical-intelligence-selftest: PASS");
