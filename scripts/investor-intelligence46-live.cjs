/**
 * Investor Intelligence 4.6 — read-only live validation (CJS runner).
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
const { buildInvestorDashboard46 } = load("intelligence/investorIntelligence46/dashboard.ts");
const { detectAcquisitionGaps46, countGapsByPriority } = load("intelligence/investorIntelligence46/acquisitionGaps.ts");
const { INVESTOR_INTELLIGENCE46_VERSION, II46_MINIMUM_MARKET_SALES } = load(
  "intelligence/investorIntelligence46/config.ts",
);
const { isPubliclyActiveListing } = load("data/publicListingPolicy.ts");
const { buildSaleEvidence } = load("intelligence/comparables/saleEvidence.ts");

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env");

  const db = createClient(url, key, { auth: { persistSession: false } });

  const { data: properties, error: propertiesError } = await db.from("properties").select("*").limit(1000);
  const { data: events, error: eventsError } = await db.from("auction_events").select("*").limit(1000);
  const { data: pricingObs } = await db.from("pricing_observations").select("*").limit(2000);

  const { diagnoseConnectivity } = load("intelligence/investorIntelligence47/connectivityDiagnostic.ts");

  const connectivity = diagnoseConnectivity({
    envPresent: true,
    propertiesCount: propertiesError ? null : (properties ?? []).length,
    eventsCount: eventsError ? null : (events ?? []).length,
    propertiesError: propertiesError?.message ?? null,
    eventsError: eventsError?.message ?? null,
  });

  if (connectivity.status === "LIVE_DATA_UNAVAILABLE" || connectivity.status === "AUTH_ERROR") {
    const live = {
      version: INVESTOR_INTELLIGENCE46_VERSION,
      generatedAt: new Date().toISOString(),
      verdict: "PRODUCTION BLOCKED",
      connectivity,
      liveDataUnavailable: true,
      databaseFacts: {
        propertiesSampled: 0,
        auctionEventsSampled: 0,
        historicalEvents: 0,
        verifiedSold: 0,
        verifiedSalePrices: 0,
      },
      note: "0 properties/events here means LIVE_DATA_UNAVAILABLE — not necessarily empty production DB. Use node --use-system-ca.",
    };
    fs.writeFileSync(path.join(root, "INVESTOR_INTELLIGENCE46_LIVE.json"), JSON.stringify(live, null, 2));
    console.log(JSON.stringify(live, null, 2));
    console.log(`\nVerdict: ${live.verdict} (${connectivity.message})`);
    return;
  }

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

  const byListing = new Map();
  for (const e of scoredEvents) {
    const id = e.observation.listingPropertyId;
    if (!id) continue;
    const existing = byListing.get(id) ?? { observations: [], scoredEvents: [] };
    existing.observations.push(e.observation);
    existing.scoredEvents.push({
      observation: e.observation,
      classification: e.classification,
      score: e.score,
    });
    byListing.set(id, existing);
  }

  const dashboard = buildInvestorDashboard46([...byListing.values()]);

  const allGaps = [];
  for (const p of props.slice(0, 100)) {
    const ctx = byListing.get(p.id) ?? { observations: [], scoredEvents: [] };
    allGaps.push(
      ...detectAcquisitionGaps46({
        property: p,
        ctx,
        comparableCount: 0,
        rejectedComparableCount: 0,
        hasConflict: ctx.observations.some((o) => o.conflict),
        historicalEventCount: ctx.observations.length,
      }),
    );
  }
  const gapPri = countGapsByPriority(allGaps);

  let catalogueLeaks = 0;
  for (const p of props) {
    if (
      (p.listing_status === "sold" ||
        p.listing_status === "expired" ||
        p.listing_status === "withdrawn" ||
        p.status === "sold" ||
        p.status === "expired") &&
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

  const verifiedSold = scoredEvents.filter(
    (e) => e.classification?.outcome === "SOLD" && e.classification?.confirmed,
  ).length;

  const verifiedSalePrices = scoredEvents.filter((e) => {
    const sale = buildSaleEvidence(e.observation, pricing);
    return sale.verifiedSale && sale.salePrice != null;
  }).length;

  const verdict =
    verifiedSalePrices >= II46_MINIMUM_MARKET_SALES
      ? "PRODUCTION READY WITH LIMITATIONS"
      : "INSUFFICIENT DATA — ENGINE READY";

  const live = {
    version: INVESTOR_INTELLIGENCE46_VERSION,
    generatedAt: new Date().toISOString(),
    verdict,
    databaseFacts: {
      propertiesSampled: props.length,
      auctionEventsSampled: evts.length,
      historicalEvents: summary.historicalEventCount,
      verifiedSold,
      verifiedSalePrices,
    },
    engineResults: {
      dashboard,
      gapPriority: gapPri,
      marketStatisticsAvailable: verifiedSalePrices >= II46_MINIMUM_MARKET_SALES,
    },
    insufficientData: {
      verifiedSalePricesBelowMinimum: verifiedSalePrices < II46_MINIMUM_MARKET_SALES,
      minimumRequired: II46_MINIMUM_MARKET_SALES,
    },
    conflicts: summary.conflictCount,
    acquisitionGaps: gapPri.total,
    publicSafety: { catalogueLeaks, ok: catalogueLeaks === 0 },
  };

  fs.writeFileSync(path.join(root, "INVESTOR_INTELLIGENCE46_LIVE.json"), JSON.stringify(live, null, 2));

  const report = `# Investor Intelligence 4.6 — Live Validation Report

Generated: ${live.generatedAt}

## VERDICT

**${verdict}**

## DATABASE FACTS

| Metric | Value |
|--------|------:|
| Properties (sample) | ${props.length} |
| Auction events (sample) | ${evts.length} |
| Historical events | ${summary.historicalEventCount} |
| Verified SOLD | ${verifiedSold} |
| Verified sale prices | ${verifiedSalePrices} |

## ENGINE RESULTS

| Metric | Value |
|--------|------:|
| Properties analysed | ${dashboard.propertiesAnalysed} |
| High evidence | ${dashboard.highEvidence} |
| Medium evidence | ${dashboard.mediumEvidence} |
| Low evidence | ${dashboard.lowEvidence} |
| Insufficient data | ${dashboard.insufficientData} |
| Acquisition gaps | ${gapPri.total} |
| P1 / P2 / P3 / P4 | ${gapPri.p1} / ${gapPri.p2} / ${gapPri.p3} / ${gapPri.p4} |

## INSUFFICIENT DATA

Verified sale prices ${verifiedSalePrices < II46_MINIMUM_MARKET_SALES ? "below" : "meet"} minimum (${II46_MINIMUM_MARKET_SALES}) for market medians.

## CONFLICTS

Open conflicts on historical evidence: ${summary.conflictCount}

## PUBLIC SAFETY

Catalogue leaks: ${catalogueLeaks}

## Note

Absence of verified sale prices is not a negative investment signal.
The engine reports \`INSUFFICIENT_DATA\` explicitly.
`;

  fs.writeFileSync(path.join(root, "INVESTOR_INTELLIGENCE46_REPORT.md"), report);

  fs.writeFileSync(
    path.join(root, "INVESTOR_INTELLIGENCE46_EVIDENCE.json"),
    JSON.stringify(
      {
        version: INVESTOR_INTELLIGENCE46_VERSION,
        modules: ["lib/intelligence/investorIntelligence46/"],
        tests: "scripts/investor-intelligence46-selftest.cjs",
      },
      null,
      2,
    ),
  );

  fs.writeFileSync(
    path.join(root, "INVESTOR_INTELLIGENCE46_GAP_REPORT.md"),
    `# II 4.6 Gap Report\n\nTotal gaps detected (sample): ${gapPri.total}\n`,
  );

  console.log(JSON.stringify(live, null, 2));
  console.log(`\nVerdict: ${verdict}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
