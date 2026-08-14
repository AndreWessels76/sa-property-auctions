/**
 * Historical Source Coverage 4.8 — production live validation.
 * Run: npm run hsc48:live
 * Optional: HSC48_RUN_ACQUIRE=1 npm run hsc48:live  (Phase C–E)
 */
const fs = require("fs");
const path = require("path");
const ts = require("typescript");
const Module = require("module");
const { createClient } = require("@supabase/supabase-js");

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
    /* optional */
  }
}

loadEnv();

const { buildHistoricalDataset, publicHistoricalRows } = load("intelligence/historical/index.ts");
const { classifyObservations } = load("intelligence/outcomes/index.ts");
const { scoreHistoricalEvidence } = load("intelligence/historicalEvidence/scoring.ts");
const { buildHea43Queue, hea43QueueSummary } = load("acquisition/historicalEvidence43/queue43.ts");
const { isPubliclyActiveListing } = load("data/publicListingPolicy.ts");
const { diagnoseConnectivity } = load("intelligence/investorIntelligence47/connectivityDiagnostic.ts");
const {
  HISTORICAL_SOURCE_COVERAGE48_VERSION,
  buildEventDiagnostic,
  aggregateEventMetrics,
  buildCoverageFractions,
  stateBreakdown,
  deriveHsc48Verdict,
  computeBeforeAfterDelta,
  gapCodesForDiagnostic,
} = load("intelligence/historicalSourceCoverage48/index.ts");

async function countTable(db, table) {
  const { count, error } = await db.from(table).select("id", { count: "exact", head: true });
  if (error) return { count: null, error: error.message };
  return { count: count ?? 0, error: null };
}

function writeReport(report, verdictBlock, events, beforeAfter) {
  const livePath = path.join(root, "HISTORICAL_SOURCE_COVERAGE48_LIVE.json");
  const evidencePath = path.join(root, "HISTORICAL_SOURCE_COVERAGE48_EVIDENCE.json");
  const gapPath = path.join(root, "HISTORICAL_SOURCE_COVERAGE48_GAP_REPORT.md");
  const mdPath = path.join(root, "HISTORICAL_SOURCE_COVERAGE48_REPORT.md");

  fs.writeFileSync(livePath, JSON.stringify(report, null, 2));

  const evidence = {
    version: HISTORICAL_SOURCE_COVERAGE48_VERSION,
    generatedAt: report.generatedAt,
    connectivity: report.connectivity,
    metrics: report.metrics,
    coverage: report.coverage,
    stateBreakdown: report.stateBreakdown,
    events: events.map((e) => ({
      observationId: e.observationId,
      propertyLabel: e.propertyLabel,
      primaryState: e.primaryState,
      stoppingPoint: e.stoppingPoint,
      retryRecommendation: e.retryRecommendation,
      mappedGapCodes: e.mappedGapCodes,
      fetch: e.fetch
        ? {
            httpStatus: e.fetch.httpStatus,
            tlsError: Boolean(e.fetch.tlsError),
            networkError: Boolean(e.fetch.networkError),
            enrichmentStatus: e.fetch.enrichmentStatus,
          }
        : null,
      snapshot: e.snapshot,
      extraction: e.extraction,
      outcomeState: e.outcomeState,
      salePriceState: e.salePriceState,
    })),
    beforeAfter,
  };
  fs.writeFileSync(evidencePath, JSON.stringify(evidence, null, 2));

  const gapLines = events.flatMap((e) =>
    e.mappedGapCodes.map((g) => `- ${g}: ${e.propertyLabel} (${e.primaryState})`),
  );
  fs.writeFileSync(
    gapPath,
    `# HSC 4.8 Gap Report\n\n${gapLines.join("\n") || "No gaps mapped"}\n`,
  );

  const md = `# Historical Source Coverage 4.8 — Live Report

Generated: ${report.generatedAt}

## Verdict

**${report.verdict}**

${report.reason}

## Connectivity

${report.connectivity.status}: ${report.connectivity.message}

## PROVEN IN PRODUCTION

${(verdictBlock.provenInProduction ?? []).map((x) => `- ${x}`).join("\n") || "- (none)"}

## ENGINE TESTED

${(verdictBlock.engineTested ?? []).map((x) => `- ${x}`).join("\n") || "- (none)"}

## SOURCE COVERAGE

${(verdictBlock.sourceCoverage ?? []).map((x) => `- ${x}`).join("\n") || "- (none)"}

## DATA STILL MISSING

${(verdictBlock.dataStillMissing ?? []).map((x) => `- ${x}`).join("\n") || "- (none)"}

## TECHNICAL BLOCKERS

${(verdictBlock.technicalBlockers ?? []).map((x) => `- ${x}`).join("\n") || "- (none)"}

## ADMIN REVIEW REQUIRED

${(verdictBlock.adminReviewRequired ?? []).map((x) => `- ${x}`).join("\n") || "- (none)"}

## Coverage

| Metric | Value |
|--------|-------|
| Historical events | ${report.metrics.historicalEvents} |
| Source found | ${report.metrics.sourceFound} |
| Fetch attempted | ${report.metrics.fetchAttempted} |
| Fetch successful | ${report.metrics.successfulFetches} |
| Snapshots | ${report.metrics.snapshots} |
| No-change | ${report.metrics.noChange} |
| Verified SOLD | ${report.metrics.verifiedSold} |
| Verified sale prices | ${report.metrics.verifiedSalePrices} |
| Catalogue leaks | ${report.metrics.catalogueLeaks} |

## State breakdown

${Object.entries(report.stateBreakdown)
  .map(([k, v]) => `- ${k}: ${v}`)
  .join("\n")}

${
  beforeAfter
    ? `## Before / After

| Metric | Before | After |
|--------|--------|-------|
| Snapshots | ${beforeAfter.before.snapshots} | ${beforeAfter.after.snapshots} |
| Fetch success | ${beforeAfter.before.successfulFetches} | ${beforeAfter.after.successfulFetches} |
| Verified SOLD | ${beforeAfter.before.verifiedSold} | ${beforeAfter.after.verifiedSold} |
| Sale prices | ${beforeAfter.before.verifiedSalePrices} | ${beforeAfter.after.verifiedSalePrices} |
`
    : ""
}
`;
  fs.writeFileSync(mdPath, md);
  console.log(`Wrote ${livePath}`);
  console.log(`Wrote ${evidencePath}`);
  console.log(`Wrote ${gapPath}`);
  console.log(`Wrote ${mdPath}`);
}

async function buildFromDb(db) {
  const [
    { data: properties },
    { data: events },
    { data: pricingObs },
    { data: outcomeObs },
    { data: enrichmentRuns },
    { data: refetchRuns },
    { count: masterCount },
  ] = await Promise.all([
    db.from("properties").select("*").limit(2000),
    db.from("auction_events").select("*").limit(2000),
    db.from("pricing_observations").select("*").limit(5000),
    db.from("auction_outcome_observations").select("*").limit(5000),
    db.from("historical_enrichment_runs").select("*").limit(500),
    db.from("source_refetch_runs").select("*").limit(500),
    db.from("property_masters").select("id", { count: "exact", head: true }),
  ]);

  const dataset = buildHistoricalDataset({
    events: events ?? [],
    listings: (properties ?? []).map((p) => ({
      id: p.id,
      title: p.title,
      property_type: p.property_type,
      listing_status: p.listing_status,
      status: p.status,
      verification_state: p.verification_state,
      data_classification: p.data_classification,
      auction_date: p.auction_date,
      auction_price: p.auction_price,
      reserve_price: p.reserve_price,
      estimated_value: p.estimated_value,
      floor_size: p.floor_size,
      erf_size: p.erf_size,
      bedrooms: p.bedrooms,
      bathrooms: p.bathrooms,
      province: p.province,
      town: p.town,
      suburb: p.suburb,
      municipality: p.municipality,
      auction_agency: p.auction_agency,
      source_name: p.source_name,
      source_url: p.source_url,
      property_master_id: p.property_master_id,
      farm_name: p.farm_name,
    })),
    masters: [],
    observations: pricingObs ?? [],
  });

  const historical = publicHistoricalRows(dataset);
  const classifications = classifyObservations(historical, pricingObs ?? []);
  const byId = new Map(classifications.map((c) => [c.observationId, c]));

  const queue = buildHea43Queue({
    events: historical,
    observations: outcomeObs ?? [],
    recentRuns: enrichmentRuns ?? [],
  });
  const qs = hea43QueueSummary(queue);
  const queueByProperty = new Map(queue.map((q) => [q.propertyId, q]));

  let catalogueLeaks = 0;
  for (const p of properties ?? []) {
    if (
      ["expired", "sold", "withdrawn", "cancelled", "passed_in"].includes(
        p.verification_state ?? "",
      ) &&
      isPubliclyActiveListing({
        verification_state: p.verification_state,
        data_classification: p.data_classification,
        listing_status: p.listing_status,
        status: p.status,
        auction_date: p.auction_date,
      })
    ) {
      catalogueLeaks++;
    }
  }

  const eventDiagnostics = historical.map((observation) => {
    const classification = byId.get(observation.observationId);
    const score = scoreHistoricalEvidence(observation, classification, pricingObs ?? []);
    const outcomeObsRow =
      (outcomeObs ?? []).find(
        (o) =>
          (observation.auctionEventId && o.auction_event_id === observation.auctionEventId) ||
          (observation.listingPropertyId && o.listing_property_id === observation.listingPropertyId),
      ) ?? null;
    const eventPricing = (pricingObs ?? []).filter(
      (p) =>
        (observation.listingPropertyId && p.property_id === observation.listingPropertyId) ||
        (observation.auctionEventId && p.auction_event_id === observation.auctionEventId),
    );
    return buildEventDiagnostic({
      event: observation,
      classification,
      score,
      enrichmentRuns: enrichmentRuns ?? [],
      refetchRuns: refetchRuns ?? [],
      outcomeObs: outcomeObsRow,
      pricingObs: eventPricing,
      queueItem: observation.listingPropertyId
        ? queueByProperty.get(observation.listingPropertyId) ?? null
        : null,
      openReview: false,
      openConflict: observation.conflict,
    });
  });

  const metrics = aggregateEventMetrics(eventDiagnostics, {
    propertyMasters: masterCount ?? 0,
    auctionEvents: (events ?? []).length,
    p1: qs.priority1,
    p2: qs.priority2,
    p3: qs.priority3,
    p4: qs.priority4,
    enrichmentAttempts: (enrichmentRuns ?? []).length,
    catalogueLeaks,
    acquisitionGaps: 0,
  });

  return {
    eventDiagnostics,
    metrics,
    coverage: buildCoverageFractions(eventDiagnostics),
    stateBreakdown: stateBreakdown(eventDiagnostics),
  };
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const envPresent = Boolean(url && key);

  let propertiesCount = null;
  let eventsCount = null;
  let propertiesError = null;
  let eventsError = null;
  let db = null;

  if (envPresent) {
    db = createClient(url, key, { auth: { persistSession: false } });
    const pc = await countTable(db, "properties");
    propertiesCount = pc.count;
    propertiesError = pc.error;
    const ec = await countTable(db, "auction_events");
    eventsCount = ec.count;
    eventsError = ec.error;
  }

  const connectivity = diagnoseConnectivity({
    envPresent,
    propertiesCount,
    eventsCount,
    propertiesError,
    eventsError,
  });

  if (connectivity.status === "LIVE_DATA_UNAVAILABLE" || connectivity.status === "AUTH_ERROR") {
    const verdictBlock = deriveHsc48Verdict({
      connectivity,
      metrics: {
        propertyMasters: 0,
        auctionEvents: 0,
        historicalEvents: 0,
        p1: 0,
        p2: 0,
        p3: 0,
        p4: 0,
        queueBlocked: 0,
        queueUnavailable: 0,
        queueCompleted: 0,
        enrichmentAttempts: 0,
        successfulFetches: 0,
        failedFetches: 0,
        sourceFound: 0,
        sourceLicensed: 0,
        sourceBlocked: 0,
        sourceUnavailable: 0,
        fetchAttempted: 0,
        tlsErrors: 0,
        networkErrors: 0,
        dnsErrors: 0,
        timeouts: 0,
        http403: 0,
        http404: 0,
        http429: 0,
        http5xx: 0,
        snapshots: 0,
        noChange: 0,
        extractionAttempted: 0,
        extractionSuccessful: 0,
        extractionFailed: 0,
        extractionNoEvidence: 0,
        outcomeObservations: 0,
        verifiedSold: 0,
        soldWithoutPrice: 0,
        unknownOutcomes: 0,
        verifiedSalePrices: 0,
        conflicts: 0,
        reviewRequired: 0,
        comparableReady: 0,
        marketReadyTowns: 0,
        acquisitionGaps: 0,
        catalogueLeaks: 0,
      },
      engineTested: true,
    });

    const report = {
      version: HISTORICAL_SOURCE_COVERAGE48_VERSION,
      generatedAt: new Date().toISOString(),
      connectivity,
      metrics: verdictBlock,
      coverage: { total: 0 },
      stateBreakdown: {},
      verdict: verdictBlock.verdict,
      reason: verdictBlock.reason,
      liveDataUnavailable: true,
    };
    writeReport(report, verdictBlock, [], null);
    console.log(`\nVerdict: ${verdictBlock.verdict}`);
    return;
  }

  // Phase A + B: diagnostic scan, no writes
  const before = await buildFromDb(db);
  let after = before;
  let beforeAfter = null;

  const verdictBlock = deriveHsc48Verdict({
    connectivity,
    metrics: before.metrics,
    engineTested: true,
  });

  const report = {
    version: HISTORICAL_SOURCE_COVERAGE48_VERSION,
    generatedAt: new Date().toISOString(),
    connectivity,
    metrics: before.metrics,
    coverage: before.coverage,
    stateBreakdown: before.stateBreakdown,
    verdict: verdictBlock.verdict,
    reason: verdictBlock.reason,
    liveDataUnavailable: false,
    phase: "A_B_diagnostic_only",
  };

  if (process.env.HSC48_RUN_ACQUIRE === "1") {
    console.log("Phase C: P1 acquire (max 5) via HEA 4.3 — writes enabled");
    // Note: full acquire requires Next.js service layer; live script re-scans after manual acquire
    console.log("Set HSC48_AFTER_ACQUIRE=1 after running Acquire P1 from Operations Centre");
  }

  if (process.env.HSC48_AFTER_ACQUIRE === "1") {
    after = await buildFromDb(db);
    beforeAfter = {
      before: before.metrics,
      after: after.metrics,
      delta: computeBeforeAfterDelta(before.metrics, after.metrics),
    };
    report.phase = "E_after_acquire";
    report.metrics = after.metrics;
    report.coverage = after.coverage;
    report.stateBreakdown = after.stateBreakdown;
  }

  writeReport(report, verdictBlock, after.eventDiagnostics, beforeAfter);
  console.log(JSON.stringify({ verdict: report.verdict, metrics: report.metrics }, null, 2));
  console.log(`\nVerdict: ${report.verdict}`);
  console.log(`Events classified: ${after.eventDiagnostics.length}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
