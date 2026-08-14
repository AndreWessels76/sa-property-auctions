/**
 * Historical Intelligence 5.3 — production live validation (read-only).
 * Run: npm run hi53:live
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
  diagnoseConnectivityExtended,
  buildEventDiagnostic,
  aggregateEventMetrics,
  buildCoverageFractions,
  countByPriority,
  deriveHsc48Verdict,
  assignAcquisitionPriority,
} = load("intelligence/historicalSourceCoverage48/index.ts");
const {
  HISTORICAL_INTELLIGENCE51_VERSION,
  buildHi51Report,
} = load("intelligence/historicalIntelligence51/index.ts");
const {
  HISTORICAL_INTELLIGENCE52_VERSION,
  buildHi52Report,
  renderHi52GapReportMarkdown,
} = load("intelligence/historicalIntelligence52/index.ts");
const {
  HISTORICAL_INTELLIGENCE53_VERSION,
  buildHi53Report,
  renderHi53GapReportMarkdown,
} = load("intelligence/historicalIntelligence53/index.ts");
const { renderGapReportMarkdown } = load("intelligence/historicalIntelligence50/index.ts");

async function countTable(db, table) {
  const { count, error } = await db.from(table).select("id", { count: "exact", head: true });
  if (error) return { count: null, error: error.message };
  return { count: count ?? 0, error: null };
}

async function buildProductionReport(db) {
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
    const diagnostic = buildEventDiagnostic({
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
    diagnostic.acquisitionPriority = assignAcquisitionPriority({
      event: diagnostic,
      enrichmentRuns: enrichmentRuns ?? [],
    });
    return diagnostic;
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

  const coverage = buildCoverageFractions(eventDiagnostics);
  const verdictBlock = deriveHsc48Verdict({
    connectivity: { status: "CONNECTED", message: "Live query" },
    metrics,
    engineTested: true,
  });

  const hscReport = {
    version: "historical-source-coverage-4.9.0",
    generatedAt: new Date().toISOString(),
    connectivity: { status: "CONNECTED", message: "Production database reachable" },
    metrics,
    coverage,
    events: eventDiagnostics,
    stateBreakdown: {},
    verdict: verdictBlock.verdict,
    reason: verdictBlock.reason,
    provenInProduction: verdictBlock.provenInProduction,
    engineTested: verdictBlock.engineTested,
    sourceCoverage: verdictBlock.sourceCoverage,
    dataStillMissing: verdictBlock.dataStillMissing,
    technicalBlockers: verdictBlock.technicalBlockers,
    adminReviewRequired: verdictBlock.adminReviewRequired,
    liveDataUnavailable: false,
  };

  return buildHi53Report(
    buildHi52Report(buildHi51Report({ hscReport, enrichmentRuns: enrichmentRuns ?? [] })),
  );
}

function writeArtifacts(report) {
  const livePath = path.join(root, "HISTORICAL_INTELLIGENCE53_LIVE.json");
  const evidencePath = path.join(root, "HISTORICAL_INTELLIGENCE53_EVIDENCE.json");
  const reportPath = path.join(root, "HISTORICAL_INTELLIGENCE53_REPORT.md");
  const gapPath = path.join(root, "HISTORICAL_INTELLIGENCE53_GAP_REPORT.md");

  fs.writeFileSync(livePath, JSON.stringify(report, null, 2));
  fs.writeFileSync(
    evidencePath,
    JSON.stringify(
      {
        version: report.version,
        generatedAt: report.generatedAt,
        connectivity: report.connectivity,
        coverageDashboard: report.coverageDashboard,
        stateBreakdown: report.stateBreakdown,
        successRates: report.successRates,
        bottleneck: report.bottleneck,
        events: report.events,
        chainSuccessRates: report.chainSuccessRates,
        p1Progress: report.p1Progress,
        fetchResults: report.fetchResults,
        batchHistory: report.batchHistory,
        campaign: report.campaign,
        p1Campaign: report.p1Campaign,
        batchPlan: report.batchPlan,
        evidenceFunnel: report.evidenceFunnel,
        bottleneck53: report.bottleneck53,
        bottleneckRanked53: report.bottleneckRanked53,
        reviewQueue: report.reviewQueue,
        reportLabels: report.reportLabels,
        catalogueSafe: report.catalogueSafe,
        nextAdminAction: report.nextAdminAction,
        gapEntries: report.gapEntries,
      },
      null,
      2,
    ),
  );

  const md = `# Historical Intelligence 5.3 — Live Report

Generated: ${report.generatedAt}

## VERDICT

**${report.verdict}**

${report.reason}

## CAMPAIGN

**${report.campaign?.status ?? "—"}**

${report.campaign?.progressBar ?? ""}

${report.campaign?.summaryLine ?? ""}

## PROVEN IN PRODUCTION

${(report.reportLabels?.provenInProduction ?? []).map((l) => `- ${l}`).join("\n") || "- (none)"}

## TESTED

${(report.reportLabels?.tested ?? []).map((l) => `- ${l}`).join("\n") || "- (none)"}

## RECOVERED

${(report.reportLabels?.recovered ?? []).map((l) => `- ${l}`).join("\n") || "- (none)"}

## STILL MISSING

${(report.reportLabels?.stillMissing ?? []).map((l) => `- ${l}`).join("\n") || "- (none)"}

## REVIEW REQUIRED

${(report.reportLabels?.reviewRequired ?? []).map((l) => `- ${l}`).join("\n") || "- (none)"}

## INSUFFICIENT DATA

${(report.reportLabels?.insufficientData ?? []).map((l) => `- ${l}`).join("\n") || "- (none)"}

## EVIDENCE FUNNEL

${(report.evidenceFunnel ?? []).map((s, i) => `${i === 0 ? "" : "↓ "}${s.value} ${s.label}`).join("\n")}

## BOTTLENECK

**${report.bottleneck53?.code ?? report.bottleneck?.code ?? "—"}** — ${report.bottleneck53?.count ?? report.bottleneck?.count}/${report.bottleneck53?.total ?? report.bottleneck?.total}

Recommended: ${report.bottleneck53?.recommendedAction ?? report.bottleneck?.recommendedAction}

${(report.bottleneckRanked53 ?? []).map((b) => `- ${b.code}: ${b.count}/${b.total} → ${b.recommendedAction}`).join("\n")}

## PUBLIC SAFETY

Catalogue leaks: **${report.coverage52?.catalogueLeaks ?? 0}**
Catalogue safe: **${report.catalogueSafe ? "YES" : "NO"}**

## NEXT ADMIN ACTION

${report.nextAdminAction ?? "Dry Run P1 (5) → Acquire P1 (5)"}
`;

  fs.writeFileSync(reportPath, md);
  fs.writeFileSync(
    gapPath,
    renderHi53GapReportMarkdown({
      generatedAt: report.generatedAt,
      entries: (report.gapEntries ?? []).map((e) => ({
        eventId: e.eventId ?? null,
        property: e.property ?? "—",
        town: e.town ?? null,
        currentState: e.currentState ?? "—",
        nextAction: e.nextAction ?? "—",
        group: e.group ?? "GAP",
      })),
    }),
  );

  console.log(`Wrote ${livePath}`);
  console.log(`Wrote ${evidencePath}`);
  console.log(`Wrote ${reportPath}`);
  console.log(`Wrote ${gapPath}`);
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const envPresent = Boolean(url && key);

  let propertiesCount = null;
  let eventsCount = null;
  let propertiesError = null;
  let eventsError = null;

  if (envPresent) {
    const db = createClient(url, key, { auth: { persistSession: false } });
    const pc = await countTable(db, "properties");
    propertiesCount = pc.count;
    propertiesError = pc.error;
    const ec = await countTable(db, "auction_events");
    eventsCount = ec.count;
    eventsError = ec.error;

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
      const blocked = {
        version: HISTORICAL_INTELLIGENCE53_VERSION,
        generatedAt: new Date().toISOString(),
        verdict: "PRODUCTION BLOCKED — LIVE DATA UNAVAILABLE",
        reason: connectivity.message,
        connectivity,
      };
      fs.writeFileSync(
        path.join(root, "HISTORICAL_INTELLIGENCE53_LIVE.json"),
        JSON.stringify(blocked, null, 2),
      );
      console.log("Verdict: PRODUCTION BLOCKED — LIVE_DATA_UNAVAILABLE");
      return;
    }

    if (connectivity.extendedStatus === "EMPTY_DATABASE") {
      const empty = {
        version: HISTORICAL_INTELLIGENCE53_VERSION,
        generatedAt: new Date().toISOString(),
        verdict: "EMPTY DATABASE",
        reason: connectivity.message,
        connectivity,
      };
      fs.writeFileSync(
        path.join(root, "HISTORICAL_INTELLIGENCE53_LIVE.json"),
        JSON.stringify(empty, null, 2),
      );
      console.log("Verdict: EMPTY DATABASE");
      return;
    }

    const report = await buildProductionReport(db);
    writeArtifacts(report);
    console.log(JSON.stringify({ verdict: report.verdict, bottleneck: report.bottleneck }, null, 2));
    return;
  }

  console.log("PRODUCTION BLOCKED — missing Supabase credentials");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
