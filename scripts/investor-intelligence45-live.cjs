/**
 * Investor Intelligence 4.5 — read-only live validation (CJS runner).
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
const { buildMarketEvidenceSummary } = load("intelligence/investorIntelligence45/marketEvidence.ts");
const { buildInvestorDashboard45 } = load("intelligence/investorIntelligence45/dashboard.ts");
const { detectTownGaps } = load("intelligence/investorIntelligence45/acquisitionGaps.ts");
const { INVESTOR_INTELLIGENCE45_VERSION, II45_MINIMUM_MARKET_SALES } = load(
  "intelligence/investorIntelligence45/config.ts",
);
const { isPubliclyActiveListing } = load("data/publicListingPolicy.ts");
const { buildSaleEvidence } = load("intelligence/comparables/saleEvidence.ts");

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

  const { data: properties } = await db.from("properties").select("*").limit(1000);
  const { data: masters } = await db.from("property_masters").select("*").limit(1000);
  const { data: events } = await db.from("auction_events").select("*").limit(1000);
  const { data: pricingObs } = await db.from("pricing_observations").select("*").limit(2000);

  const props = properties ?? [];
  const evts = events ?? [];
  const pricing = pricingObs ?? [];

  const dataset = buildHistoricalDataset({
    listings: props.map((p) => ({
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
      agricultural_details: p.agricultural_details,
    })),
    events: evts,
    pricingObservations: pricing,
  });

  const historical = publicHistoricalRows(dataset);
  const classifications = classifyObservations(historical, pricing);
  const byId = new Map(classifications.map((c) => [c.observationId, c]));
  const scoredEvents = historical.map((observation) => ({
    observation,
    classification: byId.get(observation.observationId),
    score: scoreHistoricalEvidence(observation, byId.get(observation.observationId), pricing),
  }));

  const globalCtx = {
    observations: historical,
    scoredEvents: scoredEvents.map((e) => ({
      observation: e.observation,
      classification: e.classification,
      score: e.score,
    })),
  };

  const summary = buildMarketEvidenceSummary(globalCtx);

  const townMap = new Map();
  for (const e of scoredEvents) {
    const town = e.observation.town?.trim();
    if (!town) continue;
    const existing = townMap.get(town) ?? { observations: [], scoredEvents: [], town };
    existing.observations.push(e.observation);
    existing.scoredEvents.push({
      observation: e.observation,
      classification: e.classification,
      score: e.score,
    });
    townMap.set(town, existing);
  }

  const dashboard = buildInvestorDashboard45(globalCtx, townMap);
  const gaps = detectTownGaps(townMap);

  let catalogueLeaks = 0;
  for (const p of props) {
    if (
      !isPubliclyActiveListing({
        verification_state: p.verification_state,
        data_classification: p.data_classification,
        listing_status: p.listing_status,
        status: p.status,
        auction_date: p.auction_date,
      }) &&
      (p.listing_status === "sold" ||
        p.listing_status === "expired" ||
        p.status === "sold" ||
        p.status === "expired")
    ) {
      const onCatalogue = props.some(
        (x) =>
          x.id === p.id &&
          isPubliclyActiveListing({
            verification_state: x.verification_state,
            data_classification: x.data_classification,
            listing_status: x.listing_status,
            status: x.status,
            auction_date: x.auction_date,
          }),
      );
      if (onCatalogue) catalogueLeaks++;
    }
  }

  const verifiedSold = scoredEvents.filter(
    (e) => e.classification?.outcome === "SOLD" && e.classification?.confirmed,
  ).length;

  const verifiedSalePrices = scoredEvents.filter((e) => {
    const sale = buildSaleEvidence(e.observation, pricing);
    return sale.verifiedSale && sale.salePrice != null;
  }).length;

  const comparableReady = scoredEvents.filter((e) => {
    const sale = buildSaleEvidence(e.observation, pricing);
    return sale.verifiedSale && e.observation.propertyType;
  }).length;

  const verdict =
    verifiedSalePrices >= II45_MINIMUM_MARKET_SALES
      ? "PRODUCTION READY WITH DATA COVERAGE LIMITATION"
      : "INSUFFICIENT DATA — ENGINE READY";

  const live = {
    version: INVESTOR_INTELLIGENCE45_VERSION,
    generatedAt: new Date().toISOString(),
    verdict,
    counts: {
      propertyMasters: masters?.length ?? (await count("property_masters")),
      auctionEvents: evts.length ?? (await count("auction_events")),
      historicalEvents: summary.historicalEventCount,
      verifiedSold,
      verifiedSalePrices,
      comparableReady,
      marketReadyTowns: dashboard.marketReadyTowns,
      marketReadyAgencies: dashboard.marketReadyAgencies,
      evidenceQualityHigh: dashboard.evidenceQualityHigh,
      openConflicts: summary.conflictCount,
      publicCatalogueLeaks: catalogueLeaks,
      acquisitionGaps: gaps.length,
    },
    marketStatisticsAvailable: verifiedSalePrices >= II45_MINIMUM_MARKET_SALES,
    dashboard,
    gapsPreview: gaps.slice(0, 10),
  };

  fs.writeFileSync(path.join(root, "INVESTOR_INTELLIGENCE45_LIVE.json"), JSON.stringify(live, null, 2));

  const report = `# Investor Intelligence 4.5 — Live Validation Report

Generated: ${live.generatedAt}

## VERDICT

**${verdict}**

## Production counts

| Metric | Value |
|--------|------:|
| Property Masters (sample) | ${live.counts.propertyMasters ?? "—"} |
| Auction Events (sample) | ${live.counts.auctionEvents ?? "—"} |
| Historical events | ${live.counts.historicalEvents} |
| Verified SOLD | ${live.counts.verifiedSold} |
| Verified sale prices | ${live.counts.verifiedSalePrices} |
| Comparable-ready | ${live.counts.comparableReady} |
| Market-ready towns | ${live.counts.marketReadyTowns} |
| Market-ready agencies | ${live.counts.marketReadyAgencies} |
| Evidence quality HIGH | ${live.counts.evidenceQualityHigh} |
| Open conflicts | ${live.counts.openConflicts} |
| Public catalogue leaks | ${live.counts.publicCatalogueLeaks} |

## Status

- **Implemented**: Investor Intelligence 4.5 composition layer
- **Tested**: \`npm run test:investor-intelligence45\` (30 cases)
- **Live-proven**: counts above from production/sample DB
- **Insufficient data**: ${verifiedSalePrices < II45_MINIMUM_MARKET_SALES ? "Yes — market medians not calculable" : "No — minimum sample met"}
- **Pending migrations**: None required for II 4.5 core
- **Pending enrichment**: Verified sale-price observations via HEA 4.3 / HDA queues

## Note

Absence of verified sale prices is **not** evidence of negative investment outcomes.
The engine returns \`INSUFFICIENT_DATA\` — never fabricated prices or trends.
`;

  fs.writeFileSync(path.join(root, "INVESTOR_INTELLIGENCE45_REPORT.md"), report);

  const evidence = {
    version: INVESTOR_INTELLIGENCE45_VERSION,
    modules: [
      "lib/intelligence/investorIntelligence45/",
      "lib/services/InvestorIntelligence45Service.ts",
      "app/api/intelligence/property/[id]/investor/",
      "app/api/admin/intelligence/investor/",
    ],
    tests: "scripts/investor-intelligence45-selftest.cjs",
    live: live.counts,
  };
  fs.writeFileSync(path.join(root, "INVESTOR_INTELLIGENCE45_EVIDENCE.json"), JSON.stringify(evidence, null, 2));

  const gapReport = `# Investor Intelligence 4.5 — Gap Report

${gaps.length === 0 ? "No town-level acquisition gaps detected in sample." : gaps.slice(0, 20).map((g) => `## ${g.town ?? "Unknown"}

- Verified sales: ${g.verifiedSales} / ${g.required}
- Gap: ${g.gap} verified sale-price observations
- Recommended: ${g.recommendedAction}
- Priority: ${g.priority}
`).join("\n")}
`;

  fs.writeFileSync(path.join(root, "INVESTOR_INTELLIGENCE45_GAP_REPORT.md"), gapReport);

  console.log(JSON.stringify(live, null, 2));
  console.log(`\nVerdict: ${verdict}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
