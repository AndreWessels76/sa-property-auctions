/**
 * Auction Price Intelligence 2A — deterministic unit selftests.
 * Run: node scripts/auction-price-intelligence-selftest.cjs
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

function load(rel) {
  return loadFromAbs(path.join(root, "lib", rel));
}

const {
  calculateDifference,
  calculatePricePerUnit,
  calculateHistoricalChange,
  isValidPositiveAmount,
  isValidPositiveArea,
} = load("intelligence/pricing/priceCalculations.ts");
const { selectReferencePrice, PRICE_FIELD_LABELS } = load(
  "intelligence/pricing/priceBasis.ts",
);
const { buildAuctionPriceIntelligence, NOT_SUPPLIED } = load(
  "intelligence/pricing/priceIntelligence.ts",
);
const { isPubliclyActiveListing } = load("data/publicListingPolicy.ts");

function listing(over = {}) {
  return {
    id: over.id ?? "p1",
    title: over.title ?? "Test property",
    description: null,
    province: "Gauteng",
    town: "Johannesburg",
    suburb: null,
    address: null,
    street_address: null,
    postal_code: null,
    auction_date: over.auction_date ?? "2026-09-01T00:00:00.000Z",
    auction_time: null,
    auction_venue: null,
    auction_price: over.auction_price ?? null,
    estimated_value: over.estimated_value ?? null,
    reserve_price: over.reserve_price ?? null,
    bedrooms: 2,
    bathrooms: 1,
    garages: null,
    property_type: over.property_type ?? "House",
    status: over.status ?? "upcoming",
    listing_status: over.listing_status ?? "upcoming",
    source: "bidders_choice",
    source_name: "Bidders Choice",
    source_url: "https://example.com/listing",
    auction_agency: "Bidders Choice",
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
    registration_link: null,
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

test("percentage and absolute difference", () => {
  const d = calculateDifference(2_000_000, 2_500_000);
  assert.ok(d);
  assert.equal(d.absolute, -500_000);
  assert.equal(d.direction, "below");
  assert.ok(Math.abs(d.percentage - -20) < 0.0001);
});

test("price per m2", () => {
  assert.equal(calculatePricePerUnit(2_000_000, 200), 10_000);
});

test("price per hectare", () => {
  const v = calculatePricePerUnit(8_000_000, 4.164);
  assert.ok(v);
  assert.ok(Math.abs(v - 1_921_229.586935639) < 1);
});

test("historical price change", () => {
  const c = calculateHistoricalChange(1_800_000, 2_100_000);
  assert.ok(c);
  assert.equal(c.absolute, 300_000);
  assert.ok(Math.abs(c.percentage - 16.666666) < 0.01);
});

test("invalid data rejected", () => {
  assert.equal(isValidPositiveAmount(null), false);
  assert.equal(isValidPositiveAmount(0), false);
  assert.equal(isValidPositiveAmount(-1), false);
  assert.equal(isValidPositiveAmount(Number.NaN), false);
  assert.equal(isValidPositiveArea(0), false);
  assert.equal(calculatePricePerUnit(100, 0), null);
  assert.equal(calculateDifference(100, null), null);
});

test("semantics — selectReference never uses auction as estimate", () => {
  const ref = selectReferencePrice({
    estimatedValue: 2_500_000,
    guidePrice: 2_200_000,
    reservePrice: 1_900_000,
  });
  assert.equal(ref.basis, "estimated_value");
  assert.equal(PRICE_FIELD_LABELS.auction_price, "Auction price");
  assert.notEqual(PRICE_FIELD_LABELS.auction_price, PRICE_FIELD_LABELS.guide_price);
});

test("builder does not treat auction_price as guide", () => {
  const intel = buildAuctionPriceIntelligence({
    property: listing({
      auction_price: 2_000_000,
      estimated_value: 2_500_000,
      reserve_price: null,
      floor_size: 200,
    }),
    premium: true,
  });
  assert.equal(intel.current.auctionPrice.value, 2_000_000);
  assert.equal(intel.current.guidePrice.value, null);
  assert.equal(intel.current.guidePrice.display, NOT_SUPPLIED);
  assert.equal(intel.current.estimatedValue.value, 2_500_000);
  assert.ok(intel.difference);
  assert.equal(intel.difference.referenceBasis, "estimated_value");
  assert.match(intel.difference.narrative, /below reference/);
  assert.doesNotMatch(intel.difference.narrative.toLowerCase(), /discount/);
  assert.equal(intel.unitAnalysis.perBuildingM2.value, 10_000);
});

test("reserve is not inferred from estimated value", () => {
  const intel = buildAuctionPriceIntelligence({
    property: listing({
      auction_price: 2_000_000,
      estimated_value: 2_500_000,
      reserve_price: null,
    }),
    premium: true,
  });
  assert.equal(intel.current.reservePrice.value, null);
  assert.equal(intel.current.reservePrice.display, NOT_SUPPLIED);
});

test("estimated value is not sale price", () => {
  const intel = buildAuctionPriceIntelligence({
    property: listing({ estimated_value: 3_000_000, auction_price: null }),
    premium: true,
  });
  assert.equal(intel.current.estimatedValue.label, "Estimated value");
  assert.equal(intel.historical.timeline.length, 0);
});

test("hectares uses agricultural_details only; approximate labelled", () => {
  const intel = buildAuctionPriceIntelligence({
    property: listing({
      property_type: "Guest Farm",
      auction_price: 8_000_000,
      erf_size: 41640,
      agricultural_details: {
        totalHectares: 4.164,
        cropInformation: "Combined Extent: ± 4.164Ha",
      },
    }),
    premium: true,
  });
  assert.ok(intel.unitAnalysis.perHectare.available);
  assert.equal(intel.unitAnalysis.perHectare.approximate, true);
  assert.match(intel.unitAnalysis.perHectare.display, /≈/);
});

test("hectares unavailable without agricultural totalHectares", () => {
  const intel = buildAuctionPriceIntelligence({
    property: listing({
      property_type: "Farm",
      auction_price: 8_000_000,
      erf_size: 50000,
      agricultural_details: null,
    }),
    premium: true,
  });
  assert.equal(intel.unitAnalysis.perHectare.available, false);
});

test("free tier gates hectares and historical timeline", () => {
  const intel = buildAuctionPriceIntelligence({
    property: listing({
      property_type: "Farm",
      auction_price: 8_000_000,
      floor_size: 400,
      agricultural_details: { totalHectares: 10 },
    }),
    propertyMasterId: "master-1",
    auctionEvents: [
      {
        id: "e1",
        property_master_id: "master-1",
        listing_property_id: "p1",
        auction_date: "2024-01-01",
        guide_price: 7_000_000,
        winning_bid: null,
        reserve_price: null,
        opening_bid: null,
        status: "completed",
        source_name: "BC",
        source_url: null,
        verification_state: "verified",
      },
      {
        id: "e2",
        property_master_id: "master-1",
        listing_property_id: "p1",
        auction_date: "2025-01-01",
        guide_price: 8_000_000,
        winning_bid: null,
        reserve_price: null,
        opening_bid: null,
        status: "completed",
        source_name: "BC",
        source_url: null,
        verification_state: "verified",
      },
    ],
    premium: false,
  });
  assert.equal(intel.unitAnalysis.perBuildingM2.available, true);
  assert.equal(intel.unitAnalysis.perHectare.available, false);
  assert.equal(intel.historical.timeline.length, 0);
  assert.match(intel.historical.note ?? "", /Premium/i);
});

test("premium historical timeline and change", () => {
  const intel = buildAuctionPriceIntelligence({
    property: listing({ auction_price: 2_100_000 }),
    propertyMasterId: "master-1",
    auctionEvents: [
      {
        id: "e1",
        property_master_id: "master-1",
        listing_property_id: "p1",
        auction_date: "2024-06-01",
        guide_price: 1_800_000,
        winning_bid: null,
        reserve_price: null,
        opening_bid: null,
        status: "completed",
        source_name: "BC",
        source_url: "https://example.com/a",
        verification_state: "verified",
      },
      {
        id: "e2",
        property_master_id: "master-1",
        listing_property_id: "p1",
        auction_date: "2026-06-01",
        guide_price: 2_100_000,
        winning_bid: null,
        reserve_price: null,
        opening_bid: null,
        status: "upcoming",
        source_name: "BC",
        source_url: "https://example.com/b",
        verification_state: "verified",
      },
    ],
    premium: true,
  });
  assert.equal(intel.historical.timeline.length, 2);
  assert.ok(intel.historical.timeline.every((t) => t.historical === true));
  assert.ok(intel.historical.change);
  assert.match(intel.historical.change.narrative, /Historical auction-price change/);
  assert.doesNotMatch(
    intel.historical.change.narrative.toLowerCase(),
    /appreciation|return|forecast/,
  );
});

test("conflict note when flagged", () => {
  const intel = buildAuctionPriceIntelligence({
    property: listing({ auction_price: 1 }),
    premium: true,
    conflictDetected: true,
  });
  assert.match(intel.conflictNote ?? "", /Price conflict detected/);
});

test("public catalogue expired hidden", () => {
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

test("routes and panel exist", () => {
  assert.ok(
    fs.existsSync(
      path.join(root, "app/api/intelligence/pricing/[id]/route.ts"),
    ),
  );
  assert.ok(
    fs.existsSync(
      path.join(
        root,
        "components/property/detail/AuctionPriceIntelligencePanel.tsx",
      ),
    ),
  );
  const api = fs.readFileSync(
    path.join(root, "app/api/intelligence/pricing/[id]/route.ts"),
    "utf8",
  );
  assert.match(api, /AuctionPriceIntelligenceService/);
  const panel = fs.readFileSync(
    path.join(
      root,
      "components/property/detail/AuctionPriceIntelligencePanel.tsx",
    ),
    "utf8",
  );
  assert.doesNotMatch(panel, /Potential discount|Best investment|Buy now/i);
  assert.match(panel, /Difference vs reference|Not supplied|How this was calculated/);
});

if (!process.exitCode) {
  console.log("All auction-price-intelligence selftests passed");
}
