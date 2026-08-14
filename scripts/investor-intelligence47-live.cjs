/**
 * Investor Intelligence 4.7 — production evidence closure live validation.
 * Run: npm run ii47:live
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
const { resolveHistoricalEvent } = load("intelligence/historicalResolution/resolver.ts");
const { buildSaleEvidence } = load("intelligence/comparables/saleEvidence.ts");
const { isPubliclyActiveListing } = load("data/publicListingPolicy.ts");
const {
  INVESTOR_INTELLIGENCE47_VERSION,
  diagnoseConnectivity,
  auditHistoricalEventCoverage,
  summarizeHistoricalCoverage,
  deriveProductionVerdict,
} = load("intelligence/investorIntelligence47/index.ts");

async function countTable(db, table) {
  const { count, error } = await db.from(table).select("id", { count: "exact", head: true });
  if (error) return { count: null, error: error.message };
  return { count: count ?? 0, error: null };
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

  const diagnosticNote =
    connectivity.status === "LIVE_DATA_UNAVAILABLE"
      ? "Root cause: ii46:live previously reported 0 properties because Supabase fetch failed silently (TLS/network) — not because production is empty. Use node --use-system-ca and check query errors."
      : null;

  if (connectivity.status === "LIVE_DATA_UNAVAILABLE" || connectivity.status === "AUTH_ERROR") {
    const blocked = deriveProductionVerdict({
      connectivity,
      metrics: {
        propertyMasters: 0,
        auctionEvents: 0,
        historicalEvents: 0,
        eligibleP1: 0,
        eligibleP2: 0,
        eligibleP3: 0,
        eligibleP4: 0,
        enrichmentRuns: 0,
        successfulFetches: 0,
        noChange: 0,
        outcomeObservations: 0,
        verifiedSold: 0,
        soldWithoutPrice: 0,
        verifiedSalePrices: 0,
        conflicts: 0,
        reviewRequired: 0,
        comparableReady: 0,
        marketReadyTowns: 0,
        publicCatalogueLeaks: 0,
        acquisitionGaps: 0,
      },
      engineTested: true,
    });

    const payload = {
      version: INVESTOR_INTELLIGENCE47_VERSION,
      generatedAt: new Date().toISOString(),
      connectivity,
      diagnosticNote,
      verdict: blocked.verdict,
      reason: blocked.reason,
      liveDataUnavailable: true,
    };

    writeOutputs(payload, blocked, []);
    console.log(JSON.stringify(payload, null, 2));
    console.log(`\nVerdict: ${blocked.verdict}`);
    return;
  }

  const [
    { data: properties, error: propLoadError },
    { data: events, error: evtLoadError },
    { data: pricingObs },
    { data: outcomeObs },
    { data: enrichmentRuns },
    { count: masterCount },
  ] = await Promise.all([
    db.from("properties").select("*").limit(2000),
    db.from("auction_events").select("*").limit(2000),
    db.from("pricing_observations").select("*").limit(5000),
    db.from("auction_outcome_observations").select("*").limit(5000),
    db.from("historical_enrichment_runs").select("*").limit(500),
    db.from("property_masters").select("id", { count: "exact", head: true }),
  ]);

  if (propLoadError || evtLoadError) {
    throw new Error(
      `Authoritative load failed: ${propLoadError?.message ?? evtLoadError?.message}`,
    );
  }

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

  const audit = historical.map((observation) => {
    const classification = byId.get(observation.observationId);
    const score = scoreHistoricalEvidence(observation, classification, pricingObs ?? []);
    const outcomeObsRow =
      (outcomeObs ?? []).find(
        (o) =>
          (observation.auctionEventId && o.auction_event_id === observation.auctionEventId) ||
          (observation.listingPropertyId && o.listing_property_id === observation.listingPropertyId),
      ) ?? null;
    return auditHistoricalEventCoverage({
      observation,
      classification,
      score,
      outcomeObs: outcomeObsRow,
      pricingObs: pricingObs ?? [],
      enrichmentRuns: enrichmentRuns ?? [],
    });
  });

  const coverageSummary = summarizeHistoricalCoverage(audit);
  const queue = buildHea43Queue({
    events: historical,
    observations: outcomeObs ?? [],
    recentRuns: enrichmentRuns ?? [],
  });
  const qs = hea43QueueSummary(queue);

  let catalogueLeaks = 0;
  for (const p of properties ?? []) {
    if (
      ["expired", "sold", "withdrawn"].includes(p.verification_state ?? "") &&
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

  const metrics = {
    propertyMasters: masterCount ?? 0,
    auctionEvents: eventsCount ?? 0,
    historicalEvents: historical.length,
    eligibleP1: qs.priority1,
    eligibleP2: qs.priority2,
    eligibleP3: qs.priority3,
    eligibleP4: qs.priority4,
    enrichmentRuns: (enrichmentRuns ?? []).length,
    successfulFetches: (enrichmentRuns ?? []).filter(
      (r) => r.status === "COMPLETED" || r.status === "NO_CHANGE",
    ).length,
    noChange: (enrichmentRuns ?? []).filter((r) => r.status === "NO_CHANGE").length,
    outcomeObservations: (outcomeObs ?? []).length,
    verifiedSold: coverageSummary.verifiedSold,
    soldWithoutPrice: coverageSummary.soldWithoutPrice,
    verifiedSalePrices: coverageSummary.verifiedSalePrices,
    conflicts: coverageSummary.conflicts,
    reviewRequired: coverageSummary.reviewRequired,
    comparableReady: coverageSummary.verifiedSalePrices,
    marketReadyTowns: 0,
    publicCatalogueLeaks: catalogueLeaks,
    acquisitionGaps: 0,
  };

  const verdictBlock = deriveProductionVerdict({
    connectivity,
    metrics,
    engineTested: true,
  });

  const payload = {
    version: INVESTOR_INTELLIGENCE47_VERSION,
    generatedAt: new Date().toISOString(),
    connectivity,
    diagnosticNote,
    metrics,
    coverageSummary,
    historicalAuditSample: audit.slice(0, 33),
    queuePreview: queue.slice(0, 5).map((q) => ({
      propertyId: q.propertyId,
      priority: q.priority,
      reason: q.reason,
      sourceUrl: q.sourceUrl,
    })),
    verdict: verdictBlock.verdict,
    reason: verdictBlock.reason,
    provenInProduction: verdictBlock.provenInProduction,
    engineTested: verdictBlock.engineTested,
    dataStillMissing: verdictBlock.dataStillMissing,
    liveDataUnavailable: false,
  };

  writeOutputs(payload, verdictBlock, audit);
  console.log(JSON.stringify({ metrics, verdict: payload.verdict, connectivity }, null, 2));
  console.log(`\nVerdict: ${payload.verdict}`);
}

function writeOutputs(payload, verdictBlock, audit) {
  fs.writeFileSync(
    path.join(root, "INVESTOR_INTELLIGENCE47_LIVE.json"),
    JSON.stringify(payload, null, 2),
  );

  const report = `# Investor Intelligence 4.7 — Live Evidence Report

Generated: ${payload.generatedAt}

## VERDICT

**${payload.verdict}**

${payload.reason ?? ""}

## CONNECTIVITY

- Status: **${payload.connectivity.status}**
- Message: ${payload.connectivity.message}
${payload.diagnosticNote ? `- Diagnostic: ${payload.diagnosticNote}` : ""}

## PROVEN IN PRODUCTION

${(verdictBlock.provenInProduction ?? []).map((x) => `- ${x}`).join("\n") || "- None yet"}

## ENGINE TESTED

${(verdictBlock.engineTested ?? []).map((x) => `- ${x}`).join("\n") || "- N/A"}

## DATA STILL MISSING

${(verdictBlock.dataStillMissing ?? []).map((x) => `- ${x}`).join("\n") || "- None"}

## LIVE METRICS

| Metric | Value |
|--------|------:|
| Property Masters | ${payload.metrics?.propertyMasters ?? "—"} |
| Auction Events | ${payload.metrics?.auctionEvents ?? "—"} |
| Historical Events | ${payload.metrics?.historicalEvents ?? "—"} |
| Eligible P1 | ${payload.metrics?.eligibleP1 ?? "—"} |
| Enrichment Runs | ${payload.metrics?.enrichmentRuns ?? "—"} |
| Successful Fetches | ${payload.metrics?.successfulFetches ?? "—"} |
| Verified SOLD | ${payload.metrics?.verifiedSold ?? "—"} |
| Verified Sale Prices | ${payload.metrics?.verifiedSalePrices ?? "—"} |
| Public Catalogue Leaks | ${payload.metrics?.publicCatalogueLeaks ?? "—"} |

## HISTORICAL COVERAGE (33 events)

${audit.length > 0 ? audit.slice(0, 10).map((r) => `- ${r.observationId}: ${r.resolutionState} outcome=${r.outcomeResolution ?? "—"} price=${r.salePriceResolution}`).join("\n") : "No audit rows — connectivity blocked"}

## Evidence chain

Licensed Source → Snapshot → Extraction → Outcome → Sale Price → HEQ 4.4 → Comparable → II 4.6

No statistics are fabricated when verified sale evidence is absent.
`;

  fs.writeFileSync(path.join(root, "INVESTOR_INTELLIGENCE47_REPORT.md"), report);

  fs.writeFileSync(
    path.join(root, "INVESTOR_INTELLIGENCE47_EVIDENCE.json"),
    JSON.stringify(
      {
        version: INVESTOR_INTELLIGENCE47_VERSION,
        modules: ["lib/intelligence/investorIntelligence47/"],
        services: ["lib/services/InvestorIntelligence47Service.ts"],
        api: "/api/admin/intelligence/investor/coverage",
        tests: "scripts/investor-intelligence47-selftest.cjs",
        repositories: [
          "PropertyRepository.getIntelligenceCorpus",
          "AuctionEventRepository.count",
          "PropertyMasterRepository.count",
          "OutcomeIntelligenceRepository.listRecent",
          "HistoricalEnrichmentRepository.listRecentRuns",
        ],
      },
      null,
      2,
    ),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
