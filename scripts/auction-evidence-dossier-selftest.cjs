/**
 * Auction Evidence Dossier — selftests.
 * Run: npm run test:auction-evidence-dossier
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

function test(name, fn) {
  fn();
  passed++;
  console.log(`  ✓ ${name}`);
}

console.log("Auction Evidence Dossier selftest\n");

const {
  AUCTION_EVIDENCE_DOSSIER_VERSION,
  DOSSIER_POSITIONING,
  buildAuctionEvidenceDossier,
  formatSalePriceDisplay,
  isRejectedPriceKind,
  deriveOverallTruthStatus,
  deriveDossierOutcomeLabel,
} = load("property/auctionEvidenceDossier.ts");

const {
  detectEvidenceAlerts,
  queueEvidenceAlert,
  confirmEvidenceAlertDelivery,
  summarizeAlertDelivery,
} = load("alerts/EvidenceAlertDetector.ts");
const {
  AUCTION_PARTNER_FEED_CONTRACT,
  acceptPartnerSalePrice,
} = load("partnerships/auctionPartnerFeedContract.ts");
const {
  createEmptyPartnerPilotRegistry,
  validatePartnerPilotDraft,
  admitPartnerContribution,
} = load("partnerships/partnerPilotOnboarding.ts");
const {
  rankTownAcquisitionOpportunities,
  summarizePriorityBuckets,
} = load("intelligence/evidenceCoverage/index.ts");
const { isPubliclyActiveListing } = load("data/publicListingPolicy.ts");

test("1 version", () => {
  assert.equal(AUCTION_EVIDENCE_DOSSIER_VERSION, "auction-evidence-dossier-1.0.0");
});

test("2 positioning primary", () => {
  assert.match(DOSSIER_POSITIONING.primary, /Prove what happened/);
});

test("3 sale price insufficient never R0", () => {
  assert.equal(
    formatSalePriceDisplay({ salePrice: null, verified: false }),
    "Sale price not verified.",
  );
  assert.equal(
    formatSalePriceDisplay({ salePrice: 0, verified: false }),
    "Sale price not verified.",
  );
});

test("4 verified sale price formats", () => {
  assert.match(
    formatSalePriceDisplay({ salePrice: 850000, verified: true }),
    /R850/,
  );
});

test("5 reject guide/reserve/auction price kinds", () => {
  assert.equal(isRejectedPriceKind("guide_price"), true);
  assert.equal(isRejectedPriceKind("reserve"), true);
  assert.equal(isRejectedPriceKind("auction_price"), true);
  assert.equal(isRejectedPriceKind("starting_bid"), true);
  assert.equal(isRejectedPriceKind("sale_price"), false);
});

test("6 truth INSUFFICIENT when empty", () => {
  assert.equal(
    deriveOverallTruthStatus({
      verifiedSold: 0,
      verifiedSalePrices: 0,
      eventCount: 0,
    }),
    "INSUFFICIENT_DATA",
  );
});

test("7 truth VERIFIED with sold+price", () => {
  assert.equal(
    deriveOverallTruthStatus({
      verifiedSold: 1,
      verifiedSalePrices: 1,
      eventCount: 1,
    }),
    "VERIFIED",
  );
});

test("8 dossier builds with zero prices", () => {
  const d = buildAuctionEvidenceDossier({
    propertyId: "p1",
    propertyTitle: "Test",
    propertyMasterId: "m1",
    researchFields: [{ label: "Town", value: null, status: "not_supplied" }],
    timelineEvents: [],
    performance: { verifiedSalePrices: 0, comparableCount: 0, comparableConfidence: null },
  });
  assert.equal(d.salePrice.value, "Sale price not verified.");
  assert.equal(d.outcomeLabel, "INSUFFICIENT DATA");
  assert.equal(d.coverage.dataCoverage, "INSUFFICIENT");
  assert.equal(d.coverage.engineStatus, "READY");
  assert.equal(d.market.insufficient, true);
  assert.equal(d.truthStatus, "INSUFFICIENT_DATA");
});

test("9 expired not sold in timeline notes", () => {
  const d = buildAuctionEvidenceDossier({
    propertyId: "p1",
    propertyTitle: "Test",
    propertyMasterId: "m1",
    researchFields: [],
    timelineEvents: [
      {
        auctionEventId: "e1",
        auctionDate: "2024-01-01",
        outcome: "EXPIRED",
        salePrice: null,
        sourceUrl: "https://example.com",
        confidence: "low",
      },
    ],
  });
  assert.ok(d.timeline[0].notes.some((n) => /not treated as SOLD/i.test(n)));
  assert.equal(d.timeline[0].salePriceDisplay, "Sale price not verified.");
});

test("10 market threshold never lowered", () => {
  const d = buildAuctionEvidenceDossier({
    propertyId: "p1",
    propertyTitle: "Test",
    propertyMasterId: null,
    researchFields: [],
    timelineEvents: [],
    performance: { verifiedSalePrices: 4, comparableCount: 2, comparableConfidence: "Low" },
    marketThreshold: 5,
    comparableMinimum: 3,
  });
  assert.equal(d.market.insufficient, true);
  assert.equal(d.comparables.insufficient, true);
  assert.match(d.market.medianDisplay, /INSUFFICIENT/);
});

test("11 evidence alerts sold discovery", () => {
  const signals = detectEvidenceAlerts(
    {
      auctionEventIds: ["a"],
      auctionDates: ["2024-01-01"],
      outcomes: ["UNKNOWN"],
      verifiedSalePrices: 0,
      soldEvidence: 0,
      sourceUrls: [],
      conflicts: 0,
      comparableCount: 0,
    },
    {
      auctionEventIds: ["a"],
      auctionDates: ["2024-01-01"],
      outcomes: ["SOLD"],
      verifiedSalePrices: 1,
      soldEvidence: 1,
      sourceUrls: ["https://x"],
      conflicts: 0,
      comparableCount: 0,
    },
  );
  assert.ok(signals.some((s) => s.type === "SOLD_EVIDENCE_DISCOVERED"));
  assert.ok(signals.some((s) => s.type === "VERIFIED_SALE_PRICE_DISCOVERED"));
});

test("12 guide-only does not invent sale price alert", () => {
  const signals = detectEvidenceAlerts(
    {
      auctionEventIds: [],
      auctionDates: [],
      outcomes: [],
      verifiedSalePrices: 0,
      soldEvidence: 0,
      sourceUrls: [],
      conflicts: 0,
      comparableCount: 0,
      guideOrReserveOnly: true,
    },
    {
      auctionEventIds: [],
      auctionDates: [],
      outcomes: [],
      verifiedSalePrices: 0,
      soldEvidence: 0,
      sourceUrls: [],
      conflicts: 0,
      comparableCount: 0,
      guideOrReserveOnly: true,
    },
  );
  assert.equal(signals.filter((s) => s.type === "VERIFIED_SALE_PRICE_DISCOVERED").length, 0);
});

test("13 partner feed rejects unverified sale", () => {
  const r = acceptPartnerSalePrice({
    partnerCode: "x",
    partnerName: "X",
    propertyExternalId: null,
    propertyMasterId: null,
    auctionEventExternalId: null,
    auctionDate: null,
    outcome: "SOLD",
    salePrice: 100,
    currency: "ZAR",
    verifiedSale: false,
    sourceUrl: null,
    observedAt: "2026-01-01",
    evidenceText: null,
    confidence: "high",
  });
  assert.equal(r.ok, false);
});

test("14 partner feed accepts verified sold", () => {
  const r = acceptPartnerSalePrice({
    partnerCode: "x",
    partnerName: "X",
    propertyExternalId: null,
    propertyMasterId: null,
    auctionEventExternalId: null,
    auctionDate: null,
    outcome: "SOLD",
    salePrice: 100000,
    currency: "ZAR",
    verifiedSale: true,
    sourceUrl: "https://x",
    observedAt: "2026-01-01",
    evidenceText: "Sold for R100000",
    confidence: "high",
  });
  assert.equal(r.ok, true);
});

test("15 partner contract rejects guide kinds", () => {
  assert.ok(AUCTION_PARTNER_FEED_CONTRACT.salePriceRules.rejectedKinds.includes("guide_price"));
});

test("16 catalogue sold excluded", () => {
  assert.equal(
    isPubliclyActiveListing({
      verification_state: "sold",
      data_classification: "live",
      listing_status: "active",
      status: "active",
      auction_date: "2020-01-01",
    }),
    false,
  );
});

test("17 files exist", () => {
  assert.ok(
    fs.existsSync(
      path.join(root, "components/property/dossier/AuctionEvidenceDossierPanel.tsx"),
    ),
  );
  assert.ok(
    fs.existsSync(path.join(root, "lib/services/AuctionEvidenceDossierService.ts")),
  );
  assert.ok(
    fs.existsSync(
      path.join(root, "app/api/intelligence/property/[id]/dossier/route.ts"),
    ),
  );
});

test("18 research page positions dossier", () => {
  const src = fs.readFileSync(
    path.join(root, "app/properties/[id]/research/page.tsx"),
    "utf8",
  );
  assert.match(src, /AuctionEvidenceDossierPanel/);
  assert.match(src, /Prove what happened/);
});

test("19 HI54 panel shows ENGINE vs DATA", () => {
  const src = fs.readFileSync(
    path.join(root, "app/admin/operations/components/HistoricalIntelligence54Panel.tsx"),
    "utf8",
  );
  assert.match(src, /ENGINE STATUS/);
  assert.match(src, /DATA COVERAGE/);
});

test("20 identity unknown not hidden", () => {
  const d = buildAuctionEvidenceDossier({
    propertyId: "p1",
    propertyTitle: "Test",
    propertyMasterId: null,
    researchFields: [{ label: "Municipality", value: null, status: "not_supplied" }],
    timelineEvents: [],
  });
  assert.equal(d.identityClaims[0].status, "UNKNOWN");
  assert.equal(d.identityClaims[0].value, null);
});

test("21 outcome label never invents SOLD", () => {
  assert.equal(
    deriveDossierOutcomeLabel({
      truthStatus: "INSUFFICIENT_DATA",
      verifiedSold: 0,
      verifiedSalePrices: 0,
    }),
    "INSUFFICIENT DATA",
  );
  assert.equal(
    deriveDossierOutcomeLabel({
      truthStatus: "SOURCE_CONFIRMED",
      verifiedSold: 1,
      verifiedSalePrices: 0,
    }),
    "SOLD WITHOUT PRICE",
  );
  assert.equal(
    deriveDossierOutcomeLabel({
      truthStatus: "VERIFIED",
      verifiedSold: 1,
      verifiedSalePrices: 1,
    }),
    "VERIFIED SOLD",
  );
});

test("22 alerts not delivered without confirmation", () => {
  const signals = detectEvidenceAlerts(
    {
      auctionEventIds: [],
      auctionDates: [],
      outcomes: [],
      verifiedSalePrices: 0,
      soldEvidence: 0,
      sourceUrls: [],
      conflicts: 0,
      comparableCount: 0,
    },
    {
      auctionEventIds: ["a1"],
      auctionDates: ["2024-01-01"],
      outcomes: ["SOLD"],
      verifiedSalePrices: 1,
      soldEvidence: 1,
      sourceUrls: ["https://x"],
      conflicts: 0,
      comparableCount: 3,
      marketReadyTowns: 1,
    },
  );
  assert.ok(signals.every((s) => s.deliveryStatus === "DETECTED"));
  assert.ok(signals.some((s) => s.type === "NEW_VERIFIED_SALE"));
  assert.ok(signals.some((s) => s.type === "COMPARABLE_READY"));
  assert.ok(signals.some((s) => s.type === "MARKET_READY_TOWN"));
  const queued = queueEvidenceAlert(signals[0]);
  assert.equal(queued.deliveryStatus, "QUEUED");
  const fake = confirmEvidenceAlertDelivery(queued, { delivered: true });
  assert.equal(fake.deliveryStatus, "FAILED");
  const real = confirmEvidenceAlertDelivery(queued, {
    delivered: true,
    providerReceiptId: "rcpt_1",
  });
  assert.equal(real.deliveryStatus, "DELIVERED");
  const summary = summarizeAlertDelivery([signals[0], queued, real, fake]);
  assert.equal(summary.DETECTED, 1);
  assert.equal(summary.QUEUED, 1);
  assert.equal(summary.DELIVERED, 1);
  assert.equal(summary.FAILED, 1);
});

test("23 partner pilot registry empty — no invented partners", () => {
  const reg = createEmptyPartnerPilotRegistry();
  assert.equal(reg.pilots.length, 0);
  assert.equal(reg.activePartners, 0);
  assert.equal(reg.verifiedPartnerEvidence, 0);
  const draft = validatePartnerPilotDraft({
    partnerCode: "",
    partnerName: "",
    feedType: "push_api",
    authentication: "unconfigured",
    sourceTier: "UNKNOWN",
    coverageNotes: "",
    dataFreshnessSlaHours: null,
    fieldMappingComplete: false,
    validationEnabled: false,
    provenanceRequired: true,
    conflictHandling: "unconfigured",
    status: "DRAFT",
    autoVerified: false,
  });
  assert.equal(draft.ok, false);
});

test("24 partner contribution still requires HI42", () => {
  const r = admitPartnerContribution({
    partnerCode: "pilot",
    partnerName: "Pilot",
    propertyExternalId: null,
    propertyMasterId: null,
    auctionEventExternalId: null,
    auctionDate: null,
    outcome: "SOLD",
    salePrice: 100,
    currency: "ZAR",
    verifiedSale: true,
    sourceUrl: "https://x",
    observedAt: "2026-01-01",
    evidenceText: "Sold",
    confidence: "high",
  });
  assert.equal(r.admitted, true);
  assert.equal(r.salePriceAccepted, true);
  assert.equal(r.nextPipeline, "HI42_RESOLUTION");
});

test("25 town opportunities rank without fabricating median", () => {
  const rows = rankTownAcquisitionOpportunities([
    {
      observationId: "1",
      auctionEventId: "a1",
      propertyLabel: "P",
      town: "PRETORIA",
      agency: null,
      auctionDate: null,
      sourceUrl: null,
      sourceStatus: "LICENSED",
      recoveryPriority: 1,
      evidenceState: "FETCH_NOT_ATTEMPTED",
      fetchState: null,
      httpStatus: null,
      errorCode: null,
      failureClassification: "NONE",
      retryable: false,
      snapshot: false,
      extraction: "NOT_RUN",
      outcome: "SOLD",
      salePrice: "VERIFIED",
      resolution: null,
      evidenceQuality: null,
      lastAttempt: null,
      attemptNumber: 0,
      nextAction: "ACQUIRE",
    },
    {
      observationId: "2",
      auctionEventId: "a2",
      propertyLabel: "P2",
      town: "PRETORIA",
      agency: null,
      auctionDate: null,
      sourceUrl: null,
      sourceStatus: "LICENSED",
      recoveryPriority: 1,
      evidenceState: "FETCH_NOT_ATTEMPTED",
      fetchState: null,
      httpStatus: null,
      errorCode: null,
      failureClassification: "NONE",
      retryable: false,
      snapshot: false,
      extraction: "NOT_RUN",
      outcome: "UNKNOWN",
      salePrice: "MISSING",
      resolution: null,
      evidenceQuality: null,
      lastAttempt: null,
      attemptNumber: 0,
      nextAction: "ACQUIRE",
    },
  ]);
  assert.equal(rows[0].town, "PRETORIA");
  assert.equal(rows[0].verifiedSalePrices, 1);
  assert.equal(rows[0].requiredAdditionalVerifiedSales, 4);
  assert.equal(rows[0].marketReady, false);
  assert.equal(rows[0].priority, "MEDIUM");
  const buckets = summarizePriorityBuckets(rows.length ? [
    {
      observationId: "1",
      auctionEventId: "a1",
      propertyLabel: "P",
      town: "PRETORIA",
      agency: null,
      auctionDate: null,
      sourceUrl: null,
      sourceStatus: "LICENSED",
      recoveryPriority: 1,
      evidenceState: "FETCH_NOT_ATTEMPTED",
      fetchState: null,
      httpStatus: null,
      errorCode: null,
      failureClassification: "NONE",
      retryable: false,
      snapshot: false,
      extraction: "NOT_RUN",
      outcome: "UNKNOWN",
      salePrice: "MISSING",
      resolution: null,
      evidenceQuality: null,
      lastAttempt: null,
      attemptNumber: 0,
      nextAction: "ACQUIRE",
    },
  ] : []);
  assert.equal(buckets.p1Remaining, 1);
});

test("26 dossier outcome label on build", () => {
  const d = buildAuctionEvidenceDossier({
    propertyId: "p1",
    propertyTitle: "Test",
    propertyMasterId: null,
    researchFields: [],
    timelineEvents: [],
  });
  assert.equal(d.outcomeLabel, "INSUFFICIENT DATA");
  assert.match(d.salePrice.value ?? "", /Sale price not verified/);
});

test("27 HI54 panel town opportunities", () => {
  const src = fs.readFileSync(
    path.join(root, "app/admin/operations/components/HistoricalIntelligence54Panel.tsx"),
    "utf8",
  );
  assert.match(src, /Town acquisition opportunities/);
  assert.match(src, /P1 Remaining/);
  assert.match(src, /DATA COVERAGE READY|dataCoverageStatus54/);
});

console.log(`\nPassed ${passed} tests.`);
if (passed < 27) {
  console.error(`Expected at least 27 tests, got ${passed}`);
  process.exit(1);
}
console.log("Auction Evidence Dossier selftest PASS");
