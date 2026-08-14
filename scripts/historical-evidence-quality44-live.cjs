/**
 * Historical Evidence Quality 4.4 — read-only live validation (CJS runner).
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
  for (const line of fs.readFileSync(path.join(root, ".env.local"), "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([^#=]+)=(.*)$/);
    if (m && !process.env[m[1].trim()]) {
      process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
    }
  }
}

loadEnv();

const { buildHistoricalDataset, publicHistoricalRows } = load("intelligence/historical/index.ts");
const { classifyObservations } = load("intelligence/outcomes/index.ts");
const { scoreHistoricalEvidence } = load("intelligence/historicalEvidence/scoring.ts");
const { resolveHistoricalEvent } = load("intelligence/historicalResolution/resolver.ts");
const {
  assessEvidenceQuality,
  buildQualityReviewQueue,
  buildQualityDashboard,
  queueSummary,
  HISTORICAL_EVIDENCE_QUALITY44_VERSION,
} = load("intelligence/historicalEvidenceQuality/index.ts");
const { isPubliclyActiveListing } = load("data/publicListingPolicy.ts");

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env");

  const db = createClient(url, key, { auth: { persistSession: false } });

  async function count(table) {
    const { count, error } = await db.from(table).select("*", { count: "exact", head: true });
    if (error) return null;
    return count ?? 0;
  }

  const { data: properties } = await db.from("properties").select("*").limit(500);
  const { data: events } = await db.from("auction_events").select("*").limit(500);
  const { data: pricingObs } = await db.from("pricing_observations").select("*").limit(500);
  const { data: outcomeObs } = await db.from("auction_outcome_observations").select("*").limit(500);
  const { data: enrichmentRuns } = await db.from("historical_enrichment_runs").select("*").limit(500);

  const publicLeaks = (properties ?? []).filter((p) =>
    ["expired", "sold", "withdrawn"].includes(p.verification_state ?? "") &&
    isPubliclyActiveListing({
      verification_state: p.verification_state,
      data_classification: p.data_classification,
      listing_status: p.listing_status,
      status: p.status,
      auction_date: p.auction_date,
    }),
  );

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

  const publicHist = publicHistoricalRows(dataset);
  const classifications = classifyObservations(publicHist, pricingObs ?? []);
  const assessments = [];

  for (const event of publicHist) {
    const c = classifications.find((x) => x.observationId === event.observationId) ?? classifications[0];
    if (!c) continue;
    const score = scoreHistoricalEvidence(event, c, pricingObs ?? []);
    const obs = (outcomeObs ?? []).find(
      (o) =>
        (event.auctionEventId && o.auction_event_id === event.auctionEventId) ||
        (event.listingPropertyId && o.listing_property_id === event.listingPropertyId),
    );
    const propertyRuns = (enrichmentRuns ?? []).filter((r) => r.property_id === event.listingPropertyId);
    const resolution = resolveHistoricalEvent({
      observation: event,
      classification: c,
      score,
      outcomeObs: obs ?? null,
    });
    assessments.push(
      assessEvidenceQuality({
        event,
        classification: c,
        score,
        resolution,
        outcomeObs: obs ?? null,
        pricingObs: pricingObs ?? [],
        recentRuns: propertyRuns,
      }),
    );
  }

  const queue = buildQualityReviewQueue(
    assessments,
    publicHist.map((e) => ({ observationId: e.observationId, town: e.town })),
  );
  const dashboard = buildQualityDashboard({
    assessments,
    queue,
    totalHistorical: publicHist.length,
  });

  const report = {
    timestamp: new Date().toISOString(),
    version: HISTORICAL_EVIDENCE_QUALITY44_VERSION,
    historical_events: publicHist.length,
    high_quality: dashboard.highQuality,
    medium_quality: dashboard.mediumQuality,
    low_quality: dashboard.lowQuality,
    review_required: dashboard.reviewRequired,
    conflicts: dashboard.conflicts,
    insufficient_data: dashboard.insufficientData,
    verified_outcomes: dashboard.confirmedOutcomes,
    verified_sold: dashboard.verifiedSold,
    verified_sale_prices: dashboard.verifiedSalePrices,
    source_coverage_pct: dashboard.sourceCoverage,
    snapshot_coverage_pct: dashboard.snapshotCoverage,
    comparable_ready: dashboard.comparableReady,
    review_queue: queueSummary(queue),
    public_catalogue_leaks: publicLeaks.length,
    table_counts: {
      property_masters: await count("property_masters"),
      auction_events: await count("auction_events"),
      properties: await count("properties"),
    },
    verdict:
      publicLeaks.length > 0
        ? "BLOCKED — PUBLIC CATALOGUE LEAK"
        : dashboard.verifiedSalePrices >= 5
          ? "PRODUCTION READY"
          : dashboard.verifiedSalePrices >= 1
            ? "READY WITH LIMITATIONS"
            : "INSUFFICIENT DATA — ENGINE READY",
  };

  fs.writeFileSync(
    path.join(root, "HISTORICAL_EVIDENCE_QUALITY44_LIVE.json"),
    JSON.stringify(report, null, 2),
    "utf8",
  );

  const md = `# Historical Evidence Quality 4.4 — Live Validation Report

**Generated:** ${report.timestamp}  
**Version:** ${report.version}  
**Verdict:** ${report.verdict}

| Metric | Value |
|--------|------:|
| Historical events | ${report.historical_events} |
| High quality | ${report.high_quality} |
| Medium quality | ${report.medium_quality} |
| Review required | ${report.review_required} |
| Verified SOLD | ${report.verified_sold} |
| Verified sale prices | ${report.verified_sale_prices} |
| Source coverage % | ${report.source_coverage_pct} |
| Snapshot coverage % | ${report.snapshot_coverage_pct} |
| Comparable ready | ${report.comparable_ready} |
| Public catalogue leaks | ${report.public_catalogue_leaks} |

Read-only validation — no writes performed.
`;

  fs.writeFileSync(path.join(root, "HISTORICAL_EVIDENCE_QUALITY44_REPORT.md"), md, "utf8");
  console.log(JSON.stringify(report, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
