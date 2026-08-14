/**
 * Property History Backfill 1.0 — deterministic selftests.
 * Run: node scripts/history-backfill-selftest.cjs
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

const { assessIdentityMatch } = load("identity/identityMatch.ts");
const { computePropertyFingerprint } = load("identity/fingerprint.ts");
const {
  resolveBackfillIdentityDecision,
  isAutoAttachDecision,
} = load("backfill/identityDecision.ts");
const {
  classifyBackfillEventStatus,
  detectAuctionVenueKind,
  venueDisplayLabel,
  assessBackfillEvent,
} = load("backfill/eventReconstruction.ts");
const { computeEventFingerprint } = load("backfill/eventFingerprint.ts");
const { assessLocationQuality } = load("backfill/locationQuality.ts");
const { isPubliclyActiveListing } = load("data/publicListingPolicy.ts");

function fpInput(over = {}) {
  return {
    latitude: over.latitude ?? null,
    longitude: over.longitude ?? null,
    streetAddress: over.streetAddress ?? null,
    farmName: over.farmName ?? null,
    farmNumber: over.farmNumber ?? null,
    erfNumber: over.erfNumber ?? null,
    portionNumber: over.portionNumber ?? null,
    title: over.title ?? null,
    town: over.town ?? null,
    province: over.province ?? null,
    landSizeSqm: over.landSizeSqm ?? null,
    combinedExtent: over.combinedExtent ?? null,
    primaryImageHash: over.primaryImageHash ?? null,
    externalReferences: over.externalReferences ?? [],
  };
}

console.log("history-backfill-selftest: identity");

{
  const incoming = fpInput({
    erfNumber: "1234",
    town: "Paarl",
    province: "Western Cape",
    title: "Lovely home",
  });
  const existing = fpInput({
    erfNumber: "1234",
    town: "Paarl",
    province: "Western Cape",
    title: "Different title",
  });
  const match = assessIdentityMatch(incoming, [
    { id: "m1", fingerprint: "pf_x", ...existing },
  ]);
  const decision = resolveBackfillIdentityDecision({
    match,
    signalCount: computePropertyFingerprint(incoming).signalCount,
    alreadyLinked: false,
    locationFlags: [],
  });
  assert.equal(decision.decision, "MATCH_CONFIRMED");
  assert.equal(decision.autoAttach, true);
}

{
  const incoming = fpInput({ title: "Identical Listing Title Only" });
  const existing = fpInput({ title: "Identical Listing Title Only" });
  const match = assessIdentityMatch(incoming, [{ id: "m1", ...existing }]);
  const decision = resolveBackfillIdentityDecision({
    match,
    signalCount: computePropertyFingerprint(incoming).signalCount,
    alreadyLinked: false,
    locationFlags: [],
  });
  assert.equal(decision.autoAttach, false);
  assert.ok(
    decision.decision === "MATCH_REVIEW" ||
      decision.decision === "INSUFFICIENT_EVIDENCE" ||
      decision.decision === "MATCH_REJECTED",
  );
}

{
  const incoming = fpInput({
    erfNumber: "999",
    town: "Stellenbosch",
    province: "Western Cape",
    streetAddress: "12 Main Rd",
  });
  const match = assessIdentityMatch(incoming, []);
  const decision = resolveBackfillIdentityDecision({
    match,
    signalCount: computePropertyFingerprint(incoming).signalCount,
    alreadyLinked: false,
    locationFlags: [],
  });
  assert.equal(decision.decision, "NEW_MASTER");
  assert.equal(isAutoAttachDecision(decision.decision), true);
}

{
  const incoming = fpInput({ title: "Only title" });
  const match = assessIdentityMatch(incoming, []);
  const decision = resolveBackfillIdentityDecision({
    match,
    signalCount: computePropertyFingerprint(incoming).signalCount,
    alreadyLinked: false,
    locationFlags: [],
  });
  assert.equal(decision.autoAttach, false);
}

console.log("history-backfill-selftest: events");

assert.equal(classifyBackfillEventStatus({ verificationState: "expired" }), "expired");
assert.equal(classifyBackfillEventStatus({ listingStatus: "sold" }), "sold");
assert.equal(
  classifyBackfillEventStatus({ listingStatus: "completed" }),
  "closed",
);
assert.equal(
  classifyBackfillEventStatus({
    listingStatus: "upcoming",
    auctionDate: "2020-01-01",
    now: new Date("2026-01-01"),
  }),
  "expired",
);
assert.notEqual(
  classifyBackfillEventStatus({ verificationState: "expired" }),
  "sold",
);

assert.equal(
  detectAuctionVenueKind({ venue: "Online auction platform" }),
  "ONLINE",
);
assert.equal(venueDisplayLabel("ONLINE", null), "Online Auction");

{
  const fp1 = computeEventFingerprint({
    propertyMasterId: "m1",
    auctionDate: "2024-01-01",
    connectorId: "bc",
    externalEventId: "ext1",
  });
  const fp2 = computeEventFingerprint({
    propertyMasterId: "m1",
    auctionDate: "2024-01-01",
    connectorId: "bc",
    externalEventId: "ext1",
  });
  assert.equal(fp1, fp2);
}

{
  const assessment = assessBackfillEvent({
    propertyMasterId: "m1",
    listingPropertyId: "p1",
    existingEventId: "e-existing",
    connectorId: "bc",
    externalListingId: "x1",
  });
  assert.equal(assessment.isDuplicate, true);
  assert.equal(assessment.auditStatus, "DUPLICATE_EVENT");
}

console.log("history-backfill-selftest: location + public safety");

{
  const bad = assessLocationQuality({ town: "unknown", suburb: "of" });
  assert.ok(bad.flags.includes("LOCATION_DATA_REVIEW"));
}

{
  const expiredPublic = isPubliclyActiveListing({
    verification_state: "expired",
    listing_status: "expired",
    status: "expired",
    auction_date: "2020-01-01",
  });
  assert.equal(expiredPublic, false);
}

console.log("history-backfill-selftest: PASS");
