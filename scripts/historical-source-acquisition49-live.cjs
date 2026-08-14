/**
 * Historical Source Acquisition 4.9 — production live validation.
 * Run: npm run hsa49:live
 * Write mode: HSA49_WRITE=1 npm run hsa49:live
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
const { buildHea43Queue } = load("acquisition/historicalEvidence43/queue43.ts");
const { isPubliclyActiveListing } = load("data/publicListingPolicy.ts");
const {
  HSA49_VERSION,
  diagnoseConnectivityExtended,
  buildEventDiagnostic,
  aggregateEventMetrics,
  buildCoverageFractions,
  stateBreakdown,
  buildSourceHealthMetrics,
  failureBreakdown,
  groupGapCounts,
  explainEventGaps,
  countByPriority,
  computeBeforeAfterDelta,
  deriveHsc48Verdict,
} = load("intelligence/historicalSourceCoverage48/index.ts");

async function countTable(db, table) {
  const { count, error } = await db.from(table).select("id", { count: "exact", head: true });
  if (error) return { count: null, error: error.message };
  return { count: count ?? 0, error: null };
}

function metricsSnapshot(m) {
  return {
    eligible: m.historicalEvents,
    attempted: m.fetchAttempted,
    successful: m.successfulFetches,
    failed: m.failedFetches,
    snapshots: m.snapshots,
    extractions: m.extractionAttempted,
    outcomes: m.outcomeObservations,
    verifiedSold: m.verifiedSold,
    verifiedSalePrices: m.verifiedSalePrices,
    retryable: m.retryableFailures ?? 0,
  };
}

function writeReport(payload, md) {
  const jsonPath = path.join(root, "HISTORICAL_SOURCE_ACQUISITION49_LIVE.json");
  const mdPath = path.join(root, "HISTORICAL_SOURCE_ACQUISITION49_REPORT.md");
  fs.writeFileSync(jsonPath, JSON.stringify(payload, null, 2));
  fs.writeFileSync(mdPath, md);
  console.log(`Wrote ${jsonPath}`);
  console.log(`Wrote ${mdPath}`);
}

async function buildMetrics(db) {
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

  const priorityCounts = countByPriority(
    eventDiagnostics.map((e) => e.acquisitionPriority).filter(Boolean),
  );
  const metrics = aggregateEventMetrics(eventDiagnostics, {
    propertyMasters: masterCount ?? 0,
    auctionEvents: (events ?? []).length,
    p1: priorityCounts.p1,
    p2: priorityCounts.p2,
    p3: priorityCounts.p3,
    p4: priorityCounts.p4,
    enrichmentAttempts: (enrichmentRuns ?? []).length,
    catalogueLeaks,
    acquisitionGaps: 0,
    retryableFailures: eventDiagnostics.filter((e) => e.fetchError?.retryable).length,
    p1Eligible: priorityCounts.p1,
    p2Retryable: priorityCounts.p2,
    p3Review: priorityCounts.p3,
    p4Blocked: priorityCounts.p4,
  });

  const failures = eventDiagnostics
    .filter((e) => e.fetchError && e.fetchError.errorCode !== "NONE")
    .map((e) => e.fetchError);

  return {
    eventDiagnostics,
    metrics,
    coverage: buildCoverageFractions(eventDiagnostics),
    stateBreakdown: stateBreakdown(eventDiagnostics),
    sourceHealth: buildSourceHealthMetrics({
      events: eventDiagnostics,
      enrichmentRuns: enrichmentRuns ?? [],
      refetchRuns: refetchRuns ?? [],
    }),
    failureBreakdown: failureBreakdown(failures),
    gapGroups: groupGapCounts(
      eventDiagnostics.map((e) =>
        explainEventGaps({ event: e, priority: e.acquisitionPriority }),
      ),
    ),
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

  const connectivity = diagnoseConnectivityExtended({
    envPresent,
    propertiesCount,
    eventsCount,
    propertiesError,
    eventsError,
  });

  if (
    connectivity.extendedStatus !== "CONNECTED" &&
    connectivity.extendedStatus !== "EMPTY_DATABASE"
  ) {
    const payload = {
      version: HSA49_VERSION,
      generatedAt: new Date().toISOString(),
      mode: "READ_ONLY",
      connectivity,
      verdict: "PRODUCTION BLOCKED",
      reason: connectivity.message,
    };
    writeReport(
      payload,
      `# HSA 4.9 Live Report\n\n**PRODUCTION BLOCKED**\n\n${connectivity.message}\n`,
    );
    console.log(`Verdict: PRODUCTION BLOCKED`);
    return;
  }

  const before = await buildMetrics(db);
  let after = before;
  let delta = null;

  if (process.env.HSA49_WRITE === "1") {
    console.log("HSA49_WRITE=1 — controlled P1 acquisition requires Operations Centre / API");
    console.log("Re-scanning after external acquisition if HSA49_AFTER=1");
  }

  if (process.env.HSA49_AFTER === "1") {
    after = await buildMetrics(db);
    delta = computeBeforeAfterDelta(before.metrics, after.metrics);
  }

  const verdictBlock = deriveHsc48Verdict({
    connectivity,
    metrics: after.metrics,
    engineTested: true,
  });

  const beforeSnap = metricsSnapshot(before.metrics);
  const afterSnap = metricsSnapshot(after.metrics);
  const evidenceGain =
    afterSnap.successful > beforeSnap.successful ||
    afterSnap.snapshots > beforeSnap.snapshots ||
    afterSnap.verifiedSalePrices > beforeSnap.verifiedSalePrices;

  const payload = {
    version: HSA49_VERSION,
    generatedAt: new Date().toISOString(),
    mode: process.env.HSA49_WRITE === "1" ? "WRITE_REQUESTED" : "READ_ONLY",
    connectivity,
    before: beforeSnap,
    after: afterSnap,
    delta: delta ?? (evidenceGain ? "EVIDENCE_GAIN" : "NO EVIDENCE GAIN"),
    metrics: after.metrics,
    coverage: after.coverage,
    stateBreakdown: after.stateBreakdown,
    failureBreakdown: after.failureBreakdown,
    gapGroups: after.gapGroups,
    sourceHealth: after.sourceHealth,
    catalogueLeaks: after.metrics.catalogueLeaks,
    verdict: verdictBlock.verdict,
    reason: verdictBlock.reason,
  };

  const md = `# Historical Source Acquisition 4.9 — Live Report

Generated: ${payload.generatedAt}
Mode: ${payload.mode}

## VERDICT

**${payload.verdict}**

${payload.reason}

## Connectivity

${connectivity.extendedStatus}: ${connectivity.message}

## LIVE METRICS

| Metric | Value |
|--------|-------|
| Property Masters | ${after.metrics.propertyMasters} |
| Historical Events | ${after.metrics.historicalEvents} |
| P1 | ${after.metrics.p1} |
| P2 | ${after.metrics.p2} |
| Fetch Attempted | ${after.metrics.fetchAttempted} |
| Fetch Successful | ${after.metrics.successfulFetches} |
| Fetch Failed | ${after.metrics.failedFetches} |
| Retryable | ${after.metrics.retryableFailures ?? 0} |
| Snapshots | ${after.metrics.snapshots} |
| Extractions | ${after.metrics.extractionAttempted} |
| Verified SOLD | ${after.metrics.verifiedSold} |
| Verified Sale Prices | ${after.metrics.verifiedSalePrices} |
| Catalogue Leaks | ${after.metrics.catalogueLeaks} |

## FETCH FAILURE BREAKDOWN

${Object.entries(after.failureBreakdown)
  .map(([k, v]) => `- ${k}: ${v}`)
  .join("\n") || "- (none)"}

## BEFORE / AFTER

| Metric | Before | After |
|--------|--------|-------|
| Fetch attempted | ${beforeSnap.attempted} | ${afterSnap.attempted} |
| Fetch successful | ${beforeSnap.successful} | ${afterSnap.successful} |
| Snapshots | ${beforeSnap.snapshots} | ${afterSnap.snapshots} |
| Verified sale prices | ${beforeSnap.verifiedSalePrices} | ${afterSnap.verifiedSalePrices} |

${evidenceGain ? "" : "**NO EVIDENCE GAIN** — engine ready, licensed sources have not yielded new verified evidence."}

## Source Health

${after.sourceHealth
  .map(
    (s) =>
      `### ${s.partner}\nEligible: ${s.eligible} · Attempted: ${s.fetchAttempted} · Success rate: ${s.successRate ?? "—"}%`,
  )
  .join("\n\n")}
`;

  writeReport(payload, md);
  console.log(JSON.stringify({ verdict: payload.verdict, metrics: after.metrics }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
