/**
 * Live Operations Metrics 1.0 — read-only production validation.
 * Run: npm run ops-metrics:live
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
  const envPath = path.join(root, ".env.local");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([^#=]+)=(.*)$/);
    if (m && !process.env[m[1].trim()]) {
      process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
    }
  }
}

loadEnv();

const { calculateImportQueueMetrics, formatTodayDelta } = load(
  "operations/importQueueMetrics.ts",
);
const { saDayBounds, OPERATIONS_METRICS_TIMEZONE } = load("operations/saDayBounds.ts");

const serviceSrc = fs.readFileSync(
  path.join(root, "lib", "services", "OperationsMetricsService.ts"),
  "utf8",
);
const versionMatch = serviceSrc.match(/OPERATIONS_METRICS_VERSION = "([^"]+)"/);
const OPERATIONS_METRICS_VERSION = versionMatch ? versionMatch[1] : "operations-metrics-1.0.0";

async function countProperties(db, startIso, endIso) {
  const base = () =>
    db
      .from("properties")
      .select("id", { count: "exact", head: true })
      .not("data_classification", "eq", "seed")
      .not("data_classification", "eq", "demo");

  const { count: total, error: e0 } = await base();
  if (e0) throw e0;

  const { count: importedToday, error: e1 } = await base()
    .gte("imported_at", startIso)
    .lt("imported_at", endIso);
  if (e1) throw e1;

  const { count: createdToday, error: e2 } = await base()
    .is("imported_at", null)
    .gte("created_at", startIso)
    .lt("created_at", endIso);
  if (e2) throw e2;

  return {
    total: total ?? 0,
    today: (importedToday ?? 0) + (createdToday ?? 0),
  };
}

async function countImages(db, startIso, endIso) {
  const { count: total, error: e0 } = await db
    .from("property_images")
    .select("id", { count: "exact", head: true });
  if (e0) throw e0;

  const { count: today, error: e1 } = await db
    .from("property_images")
    .select("id", { count: "exact", head: true })
    .gte("created_at", startIso)
    .lt("created_at", endIso);
  if (e1) throw e1;

  return { total: total ?? 0, today: today ?? 0 };
}

async function countMerged(db) {
  const { count, error } = await db
    .from("property_merge_history")
    .select("id", { count: "exact", head: true });
  if (error) return { value: null, error: error.message };
  return { value: count ?? 0, error: null };
}

async function countFailedImports(db) {
  const { count, error } = await db
    .from("import_jobs")
    .select("id", { count: "exact", head: true })
    .in("status", ["Failed", "failed", "Error", "error"]);
  if (error) return { value: null, error: error.message };
  return { value: count ?? 0, error: null };
}

async function importQueueCounts(db) {
  const { data, error } = await db.from("import_queue").select("queue_status");
  if (error) return { counts: null, error: error.message };

  const rows = data ?? [];
  return {
    counts: {
      total: rows.length,
      completed: rows.filter((r) => r.queue_status === "Completed").length,
      failed: rows.filter((r) => r.queue_status === "Failed").length,
      waiting: rows.filter((r) => r.queue_status === "Waiting").length,
      running: rows.filter((r) => r.queue_status === "Running").length,
    },
    error: null,
  };
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)");

  const db = createClient(url, key, { auth: { persistSession: false } });
  const bounds = saDayBounds();
  const generatedAt = new Date().toISOString();

  const properties = await countProperties(db, bounds.startIso, bounds.endIso);
  const images = await countImages(db, bounds.startIso, bounds.endIso);
  const merged = await countMerged(db);
  const failed = await countFailedImports(db);
  const queueResult = await importQueueCounts(db);

  const queueCounts = queueResult.counts ?? {
    total: 0,
    completed: 0,
    failed: 0,
    waiting: 0,
    running: 0,
  };
  const importQueue = calculateImportQueueMetrics(queueCounts);

  const payload = {
    version: OPERATIONS_METRICS_VERSION,
    generatedAt,
    timezone: OPERATIONS_METRICS_TIMEZONE,
    saDate: bounds.dateLabel,
    dayBounds: bounds,
    noHardcodedDemoValues: true,
    metrics: {
      properties: {
        total: properties.total,
        today: properties.today,
        todayLabel: formatTodayDelta(properties.today),
        source: "properties (excluding seed/demo data_classification)",
      },
      images: {
        total: images.total,
        today: images.today,
        todayLabel: formatTodayDelta(images.today),
        source: "property_images",
      },
      mergedRecords: {
        value: merged.value,
        source: "property_merge_history row count (logged merge/deduplication actions)",
        unavailable: merged.error,
      },
      failedImports: {
        value: failed.value,
        source: "import_jobs where status in Failed/error",
        unavailable: failed.error,
      },
      importQueue: {
        ...importQueue,
        formula: "completedItems / totalItems * 100 (rounded)",
        source: "import_queue.queue_status",
        unavailable: queueResult.error,
      },
    },
  };

  const jsonPath = path.join(root, "OPERATIONS_METRICS_LIVE.json");
  fs.writeFileSync(jsonPath, JSON.stringify(payload, null, 2));

  const md = `# Operations Metrics 1.0 — Live Validation Report

**Verdict:** LIVE OPERATIONS METRICS 1.0 — READY${merged.error || failed.error || queueResult.error ? " WITH LIMITATIONS" : ""}

**Generated:** ${generatedAt}  
**SA date:** ${bounds.dateLabel}  
**Timezone:** ${OPERATIONS_METRICS_TIMEZONE}  
**Version:** ${OPERATIONS_METRICS_VERSION}

## Confirmation

- No hardcoded demo values (18,432 / 57,892 / 842 / 75%) are used in this report.
- All counts below are read directly from production Supabase tables.

## Metrics

| Metric | Source | Value |
|--------|--------|-------|
| Properties total | \`properties\` (excl. seed/demo) | ${properties.total.toLocaleString("en-ZA")} |
| Properties today | \`imported_at\` or \`created_at\` (SA day) | ${properties.today.toLocaleString("en-ZA")} (${formatTodayDelta(properties.today)}) |
| Images total | \`property_images\` | ${images.total.toLocaleString("en-ZA")} |
| Images today | \`property_images.created_at\` (SA day) | ${images.today.toLocaleString("en-ZA")} (${formatTodayDelta(images.today)}) |
| Merged records | \`property_merge_history\` | ${merged.value == null ? "NOT AVAILABLE" : merged.value.toLocaleString("en-ZA")} |
| Failed imports | \`import_jobs\` (Failed/error) | ${failed.value == null ? "NOT AVAILABLE" : failed.value.toLocaleString("en-ZA")} |

## Import queue

- **Source:** \`import_queue.queue_status\`
- **Total:** ${queueCounts.total}
- **Completed:** ${queueCounts.completed}
- **Failed:** ${queueCounts.failed}
- **Waiting:** ${queueCounts.waiting}
- **Running:** ${queueCounts.running}
- **Percentage:** ${importQueue.percentage}%
- **Label:** ${importQueue.label}
- **Formula:** completed / total × 100 (rounded)

## Day bounds (UTC ISO)

- Start: ${bounds.startIso}
- End: ${bounds.endIso}

## Limitations

${[
  merged.error ? `- Merged records: ${merged.error}` : null,
  failed.error ? `- Failed imports: ${failed.error}` : null,
  queueResult.error ? `- Import queue: ${queueResult.error}` : null,
]
  .filter(Boolean)
  .join("\n") || "None — all authoritative tables queried successfully."}

## API

- \`GET /api/admin/operations/metrics\` (admin-authenticated)
`;

  const mdPath = path.join(root, "OPERATIONS_METRICS10_REPORT.md");
  fs.writeFileSync(mdPath, md);

  console.log("Wrote", jsonPath);
  console.log("Wrote", mdPath);
  console.log(JSON.stringify(payload.metrics, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
