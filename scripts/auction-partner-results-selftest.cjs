/**
 * Auction partner results feed — focused selftests (synthetic fixtures only).
 * Run: npm run test:partner-results
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

const {
  AUCTION_PARTNER_RESULTS_FEED_CONTRACT,
  evaluatePartnerResultRecord,
  hashPartnerResultRecord,
  rejectPartnerResultsUnlimitedLimit,
  buildBiddersChoiceResultsFeedStatus,
  resolvePartnerResultIdentityHeuristic,
  assessResultsFeedConnection,
  partnerResultIdempotencyKey,
  validateAuctionDateMatch,
} = load("partnerships/auctionPartnerResultsFeedContract.ts");

const { adaptBiddersChoiceResultsPayload, adaptBiddersChoiceResultsBatch } = load(
  "partnerships/biddersChoiceResultsFeedAdapter.ts",
);

const AUTH_OK = {
  partnerActive: true,
  resultsLicenceActive: true,
  feedConnected: true,
};

const AUTH_INACTIVE = {
  partnerActive: false,
  resultsLicenceActive: false,
  feedConnected: false,
};

const AUTH_NO_LICENCE = {
  partnerActive: true,
  resultsLicenceActive: false,
  feedConnected: false,
};

const IDENTITY_OK = {
  status: "RESOLVED",
  propertyId: "prop-1",
  auctionEventId: "evt-1",
  propertyMasterId: "master-1",
  method: "externalPropertyId",
  auctionDate: "2025-06-01",
};

function baseRecord(overrides = {}) {
  return {
    partnerCode: "bidders_choice",
    externalResultId: "bc-result-1",
    externalEventId: "bc-evt-1",
    externalPropertyId: "bc-prop-1",
    address: "1 Test Road",
    town: "Pretoria",
    auctionDate: "2025-06-01",
    outcome: "SOLD",
    salePrice: 1250000,
    currency: "ZAR",
    priceClassification: "ACTUAL_SALE_PRICE",
    sourceUrl: "https://partner.example/results/1",
    sourceReference: "BC-RESULT-1",
    observedAt: "2025-06-02T10:00:00.000Z",
    publishedAt: "2025-06-02T12:00:00.000Z",
    evidenceText: "Sold for R1,250,000",
    provenance: {
      sourceType: "PARTNER_RESULTS_FEED",
      sourceId: "bc-result-1",
      retrievedAt: "2025-06-03T08:00:00.000Z",
    },
    ...overrides,
  };
}

console.log("Partner results feed selftest\n");

test("0 contract version 1.1.0 + batch 5", () => {
  assert.equal(
    AUCTION_PARTNER_RESULTS_FEED_CONTRACT.version,
    "auction-partner-results-feed-1.1.0",
  );
  assert.equal(AUCTION_PARTNER_RESULTS_FEED_CONTRACT.maxBatch, 5);
});

test("Fixture A: SOLD + explicit R1,250,000 → VERIFIED_SOLD + SALE_PRICE_VALID", () => {
  const r = evaluatePartnerResultRecord({
    record: baseRecord(),
    auth: AUTH_OK,
    identity: IDENTITY_OK,
    dryRun: true,
  });
  assert.equal(r.decision, "DRY_RUN_ACCEPT");
  assert.equal(r.evidenceLabel, "VERIFIED_SOLD");
  assert.equal(r.salePriceAccepted, true);
  assert.equal(r.classifications.salePrice, "SALE_PRICE_VALID");
  assert.equal(r.classifications.authorisation, "AUTHORISED");
  assert.equal(r.nextPipeline, "HI42_RESOLUTION");
});

test("Fixture B: SOLD + no price → SOLD_WITHOUT_PRICE", () => {
  const r = evaluatePartnerResultRecord({
    record: baseRecord({
      salePrice: null,
      priceClassification: null,
      evidenceText: "Property sold",
    }),
    auth: AUTH_OK,
    identity: IDENTITY_OK,
    dryRun: true,
  });
  assert.equal(r.decision, "DRY_RUN_ACCEPT");
  assert.equal(r.evidenceLabel, "SOLD_WITHOUT_PRICE");
  assert.equal(r.classifications.salePrice, "SALE_PRICE_MISSING");
});

test("Fixture C: EXPIRED → NOT VERIFIED_SOLD", () => {
  const r = evaluatePartnerResultRecord({
    record: baseRecord({ outcome: "EXPIRED", salePrice: null }),
    auth: AUTH_OK,
    identity: IDENTITY_OK,
    dryRun: true,
  });
  assert.equal(r.evidenceLabel, "NOT_PROVEN_SOLD");
  assert.equal(r.salePriceAccepted, false);
});

test("Fixture D: reservePrice only → no verified price", () => {
  const adapted = adaptBiddersChoiceResultsPayload({
    externalResultId: "bc-d",
    outcome: "SOLD",
    salePrice: null,
    reservePrice: 1000000,
    auctionDate: "2025-06-01",
    town: "Pretoria",
    propertyAddress: "1 Test",
    observedAt: "2025-06-02T10:00:00.000Z",
    sourceReference: "bc-d",
  });
  assert.equal(adapted.salePrice, null);
  assert.equal(adapted.reservePrice, 1000000);
  const r = evaluatePartnerResultRecord({
    record: adapted,
    auth: AUTH_OK,
    identity: IDENTITY_OK,
    dryRun: true,
  });
  assert.equal(r.salePriceAccepted, false);
  assert.equal(r.evidenceLabel, "SOLD_WITHOUT_PRICE");
});

test("Fixture E: guidePrice only → no verified price", () => {
  const adapted = adaptBiddersChoiceResultsPayload({
    externalResultId: "bc-e",
    outcome: "SOLD",
    salePrice: null,
    guidePrice: 1100000,
    auctionDate: "2025-06-01",
    town: "Pretoria",
    propertyAddress: "1 Test",
    observedAt: "2025-06-02T10:00:00.000Z",
    sourceReference: "bc-e",
  });
  const r = evaluatePartnerResultRecord({
    record: adapted,
    auth: AUTH_OK,
    identity: IDENTITY_OK,
    dryRun: true,
  });
  assert.equal(r.salePriceAccepted, false);
  assert.ok(r.reasons.some((x) => /Non-sale monetary/i.test(x)));
});

test("Fixture F: salePrice + identity unresolved → reject", () => {
  const identity = resolvePartnerResultIdentityHeuristic(
    baseRecord({
      externalResultId: null,
      externalEventId: null,
      externalPropertyId: null,
      listingPropertyId: null,
      propertyMasterId: null,
      address: null,
      town: null,
    }),
  );
  assert.equal(identity.status, "IDENTITY_UNRESOLVED");
  const r = evaluatePartnerResultRecord({
    record: baseRecord({
      externalResultId: null,
      externalEventId: null,
      externalPropertyId: null,
      address: null,
      town: null,
    }),
    auth: AUTH_OK,
    identity,
    dryRun: true,
  });
  assert.equal(r.decision, "IDENTITY_UNRESOLVED");
  assert.equal(r.salePriceAccepted, false);
});

test("Fixture G: auction date mismatch → reject", () => {
  const r = evaluatePartnerResultRecord({
    record: baseRecord({ auctionDate: "2024-01-15" }),
    auth: AUTH_OK,
    identity: IDENTITY_OK,
    dryRun: true,
  });
  assert.equal(r.decision, "AUCTION_DATE_MISMATCH");
  assert.equal(r.classifications.auctionDate, "AUCTION_DATE_MISMATCH");
  assert.equal(r.salePriceAccepted, false);
});

test("Fixture H: same externalResultId twice → NO_CHANGE", () => {
  const record = baseRecord({ externalResultId: "dup-1" });
  const key = partnerResultIdempotencyKey(record);
  const r = evaluatePartnerResultRecord({
    record,
    auth: AUTH_OK,
    identity: IDENTITY_OK,
    existingExternalResultKey: key,
    dryRun: true,
  });
  assert.equal(r.decision, "NO_CHANGE");
  assert.equal(r.classifications.duplicate, true);
});

test("Fixture I: six results → limit >5 rejected", () => {
  const gate = rejectPartnerResultsUnlimitedLimit(6);
  assert.equal(gate.ok, false);
  assert.match(gate.reason, /exceeds maximum 5/);
  const batch = adaptBiddersChoiceResultsBatch(
    Array.from({ length: 6 }, (_, i) => ({
      externalResultId: `bc-${i}`,
      outcome: "SOLD",
      salePrice: 100000 + i,
      auctionDate: "2025-06-01",
      town: "Pretoria",
      propertyAddress: `${i} Road`,
      observedAt: "2025-06-02T10:00:00.000Z",
      sourceReference: `bc-${i}`,
    })),
  );
  assert.equal(batch.length, 6);
  assert.equal(rejectPartnerResultsUnlimitedLimit(5).ok, true);
});

test("Fixture J: unauthorised partner → NOT_AUTHORISED, zero writes path", () => {
  const r = evaluatePartnerResultRecord({
    record: baseRecord(),
    auth: AUTH_NO_LICENCE,
    identity: IDENTITY_OK,
    dryRun: true,
  });
  assert.equal(r.decision, "UNAUTHORIZED_SOURCE");
  assert.equal(r.classifications.authorisation, "NOT_AUTHORISED");
  assert.equal(r.nextPipeline, null);
});

test("guide classification on salePrice field rejected", () => {
  const r = evaluatePartnerResultRecord({
    record: baseRecord({
      salePrice: 900000,
      priceClassification: "guide_price",
    }),
    auth: AUTH_OK,
    identity: IDENTITY_OK,
    dryRun: true,
  });
  assert.equal(r.salePriceAccepted, false);
  assert.equal(r.evidenceLabel, "SOLD_WITHOUT_PRICE");
});

test("WITHDRAWN / PASSED_IN not verified sold", () => {
  for (const outcome of ["WITHDRAWN", "PASSED_IN"]) {
    const r = evaluatePartnerResultRecord({
      record: baseRecord({ outcome, salePrice: null }),
      auth: AUTH_OK,
      identity: IDENTITY_OK,
      dryRun: true,
    });
    assert.equal(r.evidenceLabel, "NOT_PROVEN_SOLD");
  }
});

test("ambiguous identity", () => {
  const r = evaluatePartnerResultRecord({
    record: baseRecord(),
    auth: AUTH_OK,
    identity: {
      status: "AMBIGUOUS",
      reason: "Multiple property masters match",
      candidateIds: ["a", "b"],
    },
    dryRun: true,
  });
  assert.equal(r.decision, "AMBIGUOUS_IDENTITY");
});

test("partner inactive", () => {
  const r = evaluatePartnerResultRecord({
    record: baseRecord(),
    auth: AUTH_INACTIVE,
    identity: IDENTITY_OK,
    dryRun: true,
  });
  assert.equal(r.decision, "UNAUTHORIZED_SOURCE");
});

test("invalid negative price / currency / provenance / source", () => {
  assert.equal(
    evaluatePartnerResultRecord({
      record: baseRecord({ salePrice: -100 }),
      auth: AUTH_OK,
      identity: IDENTITY_OK,
      dryRun: true,
    }).decision,
    "DRY_RUN_REJECT",
  );
  assert.equal(
    evaluatePartnerResultRecord({
      record: baseRecord({ currency: "USD" }),
      auth: AUTH_OK,
      identity: IDENTITY_OK,
      dryRun: true,
    }).decision,
    "DRY_RUN_REJECT",
  );
  assert.equal(
    evaluatePartnerResultRecord({
      record: baseRecord({ provenance: null }),
      auth: AUTH_OK,
      identity: IDENTITY_OK,
      dryRun: true,
    }).decision,
    "DRY_RUN_REJECT",
  );
  assert.equal(
    evaluatePartnerResultRecord({
      record: baseRecord({ sourceUrl: null, sourceReference: null }),
      auth: AUTH_OK,
      identity: IDENTITY_OK,
      dryRun: true,
    }).decision,
    "DRY_RUN_REJECT",
  );
});

test("content hash unchanged → NO_CHANGE", () => {
  const record = baseRecord();
  const hash = hashPartnerResultRecord(record);
  const r = evaluatePartnerResultRecord({
    record,
    auth: AUTH_OK,
    identity: IDENTITY_OK,
    existingContentHash: hash,
    dryRun: true,
  });
  assert.equal(r.decision, "NO_CHANGE");
});

test("connection assessment: env flag alone is NOT connected", () => {
  const bare = assessResultsFeedConnection({
    feedUrl: null,
    feedCredentialConfigured: false,
    connectionValidated: true,
  });
  assert.equal(bare.feedConnected, false);
  assert.equal(bare.configured, false);

  const configuredOnly = assessResultsFeedConnection({
    feedUrl: "https://partner.example/results",
    feedCredentialConfigured: true,
    connectionValidated: false,
  });
  assert.equal(configuredOnly.configured, true);
  assert.equal(configuredOnly.feedConnected, false);

  const validated = assessResultsFeedConnection({
    feedUrl: "https://partner.example/results",
    feedCredentialConfigured: true,
    connectionValidated: true,
  });
  assert.equal(validated.feedConnected, true);
});

test("status defaults — feed not connected, production write blocked", () => {
  const status = buildBiddersChoiceResultsFeedStatus({
    auth: AUTH_NO_LICENCE,
    connection: assessResultsFeedConnection({
      feedUrl: null,
      feedCredentialConfigured: false,
      connectionValidated: false,
    }),
    verifiedResultsReceived: 0,
    verifiedSalePrices: 0,
  });
  assert.equal(status.contract, "READY");
  assert.equal(status.partnerCode, "bidders_choice");
  assert.equal(status.resultsFeed, "NOT_CONNECTED");
  assert.equal(status.authorisation, "NOT_AUTHORISED");
  assert.equal(status.ingestion, "BLOCKED");
  assert.equal(status.productionWrite, "BLOCKED");
  assert.equal(status.activePartnerForResults, false);
});

test("auction date match helper", () => {
  assert.equal(
    validateAuctionDateMatch({
      recordAuctionDate: "2025-06-01",
      expectedAuctionDate: "2025-06-01T12:00:00Z",
    }).ok,
    true,
  );
  assert.equal(
    validateAuctionDateMatch({
      recordAuctionDate: "2025-06-02",
      expectedAuctionDate: "2025-06-01",
    }).ok,
    false,
  );
});

test("adapter maps SOLD AT AUCTION and never maps guide→salePrice", () => {
  const rec = adaptBiddersChoiceResultsPayload({
    externalResultId: "x1",
    outcome: "SOLD AT AUCTION",
    salePrice: 1250000,
    guidePrice: 999,
    auctionDate: "2025-06-01",
    observedAt: "2025-06-02T10:00:00.000Z",
    sourceUrl: "https://example.test/r/1",
  });
  assert.equal(rec.outcome, "SOLD");
  assert.equal(rec.salePrice, 1250000);
  assert.equal(rec.guidePrice, 999);
  assert.equal(rec.priceClassification, "ACTUAL_SALE_PRICE");
});

test("ops panel + API + adapter + service exist", () => {
  assert.ok(
    fs.existsSync(
      path.join(
        root,
        "app/admin/operations/components/BiddersChoiceResultsFeedPanel.tsx",
      ),
    ),
  );
  assert.ok(
    fs.existsSync(
      path.join(root, "app/api/admin/acquisition/partner-results/route.ts"),
    ),
  );
  assert.ok(
    fs.existsSync(
      path.join(root, "lib/partnerships/biddersChoiceResultsFeedAdapter.ts"),
    ),
  );
  assert.ok(
    fs.existsSync(
      path.join(root, "lib/services/AuctionPartnerResultsIngestionService.ts"),
    ),
  );
  const page = fs.readFileSync(
    path.join(root, "app/admin/operations/page.tsx"),
    "utf8",
  );
  assert.match(page, /BiddersChoiceResultsFeedPanel/);
});

console.log(`\nPassed ${passed} tests.`);
console.log("Partner results feed selftest PASS");
