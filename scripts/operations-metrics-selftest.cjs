/**
 * Live Operations Metrics 1.0 — regression selftest (A–M matrix).
 * Run: npm run test:operations-metrics
 */
const assert = require("assert/strict");
const fs = require("fs");
const path = require("path");
const ts = require("typescript");
const Module = require("module");

const root = path.resolve(__dirname, "..");
const cache = new Map();

const DEMO_VALUES = ["18,432", "57,892", "+245 Today", "+612 Today", "842", "75% Complete"];

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
    if (id === "server-only") return {};
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

const { calculateImportQueueMetrics, formatTodayDelta } = load(
  "operations/importQueueMetrics.ts",
);
const { saDayBounds, OPERATIONS_METRICS_TIMEZONE } = load("operations/saDayBounds.ts");

const serviceSrc = fs.readFileSync(
  path.join(root, "lib", "services", "OperationsMetricsService.ts"),
  "utf8",
);
const versionMatch = serviceSrc.match(/OPERATIONS_METRICS_VERSION = "([^"]+)"/);
const OPERATIONS_METRICS_VERSION = versionMatch ? versionMatch[1] : "";

function test(name, fn) {
  try {
    fn();
    console.log("ok -", name);
  } catch (err) {
    console.error("fail -", name);
    console.error(err);
    process.exitCode = 1;
  }
}

/** A — property total comes from repository (not hardcoded). */
test("A: property total sourced from properties table count", () => {
  const repo = fs.readFileSync(
    path.join(root, "lib", "repositories", "OperationsMetricsRepository.ts"),
    "utf8",
  );
  assert.match(repo, /from\("properties"\)/);
  assert.match(repo, /countPropertiesTotal/);
  assert.match(repo, /data_classification.*seed/);
  assert.match(repo, /data_classification.*demo/);
});

/** B — properties today uses SA day bounds on imported_at / created_at. */
test("B: properties today uses SA day bounds", () => {
  const repo = fs.readFileSync(
    path.join(root, "lib", "repositories", "OperationsMetricsRepository.ts"),
    "utf8",
  );
  assert.match(repo, /countPropertiesToday/);
  assert.match(repo, /imported_at/);
  assert.match(repo, /created_at/);
  const bounds = saDayBounds(new Date("2026-08-14T10:00:00.000Z"));
  assert.equal(bounds.dateLabel, "2026-08-14");
  assert.match(bounds.startIso, /T/);
  assert.ok(new Date(bounds.endIso) > new Date(bounds.startIso));
});

/** C — image total from property_images. */
test("C: image total sourced from property_images", () => {
  const repo = fs.readFileSync(
    path.join(root, "lib", "repositories", "OperationsMetricsRepository.ts"),
    "utf8",
  );
  assert.match(repo, /from\("property_images"\)/);
  assert.match(repo, /countImagesTotal/);
});

/** D — images today from property_images.created_at. */
test("D: images today uses property_images.created_at", () => {
  const repo = fs.readFileSync(
    path.join(root, "lib", "repositories", "OperationsMetricsRepository.ts"),
    "utf8",
  );
  assert.match(repo, /countImagesToday/);
  assert.equal(formatTodayDelta(0), "0 today");
  assert.equal(formatTodayDelta(612), "+612 today");
});

/** E — merged records = property_merge_history rows. */
test("E: merged records = property_merge_history count", () => {
  const repo = fs.readFileSync(
    path.join(root, "lib", "repositories", "OperationsMetricsRepository.ts"),
    "utf8",
  );
  assert.match(repo, /property_merge_history/);
  assert.match(repo, /logged merge\/deduplication/i);
});

/** F — failed imports from import_jobs failed statuses. */
test("F: failed imports from import_jobs failed statuses", () => {
  const repo = fs.readFileSync(
    path.join(root, "lib", "repositories", "OperationsMetricsRepository.ts"),
    "utf8",
  );
  assert.match(repo, /from\("import_jobs"\)/);
  assert.match(repo, /Failed/);
});

/** G — queue percentage = completed / total. */
test("G: queue percentage = completed / total", () => {
  const m = calculateImportQueueMetrics({
    total: 4,
    completed: 3,
    failed: 0,
    waiting: 1,
    running: 0,
  });
  assert.equal(m.percentage, 75);
  assert.match(m.label, /75%/);
});

/** H — empty queue. */
test("H: empty queue returns 0% and no-active label", () => {
  const m = calculateImportQueueMetrics({
    total: 0,
    completed: 0,
    failed: 0,
    waiting: 0,
    running: 0,
  });
  assert.equal(m.percentage, 0);
  assert.equal(m.label, "No active queue items");
});

/** I — all queue items completed. */
test("I: all queue items completed → 100%", () => {
  const m = calculateImportQueueMetrics({
    total: 5,
    completed: 5,
    failed: 0,
    waiting: 0,
    running: 0,
  });
  assert.equal(m.percentage, 100);
  assert.equal(m.label, "100% complete");
});

/** J — failed queue items. */
test("J: all failed queue items", () => {
  const m = calculateImportQueueMetrics({
    total: 3,
    completed: 0,
    failed: 3,
    waiting: 0,
    running: 0,
  });
  assert.equal(m.percentage, 0);
  assert.match(m.label, /failed/);
});

/** K — no hardcoded demo values in Operations Centre UI. */
test("K: no hardcoded demo values in operations UI", () => {
  const page = fs.readFileSync(
    path.join(root, "app", "admin", "operations", "page.tsx"),
    "utf8",
  );
  const metrics = fs.readFileSync(
    path.join(root, "app", "admin", "operations", "components", "LiveOperationsMetrics.tsx"),
    "utf8",
  );
  const importStatus = fs.readFileSync(
    path.join(root, "app", "admin", "operations", "components", "ImportStatus.tsx"),
    "utf8",
  );

  for (const demo of DEMO_VALUES) {
    assert.doesNotMatch(page, new RegExp(demo.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    assert.doesNotMatch(metrics, new RegExp(demo.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    assert.doesNotMatch(importStatus, new RegExp(demo.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }

  assert.match(page, /LiveOperationsMetrics/);
  assert.match(metrics, /\/api\/admin\/operations\/metrics/);
});

/** L — API authentication via requireAdmin. */
test("L: metrics API requires admin", () => {
  const api = fs.readFileSync(
    path.join(root, "app", "api", "admin", "operations", "metrics", "route.ts"),
    "utf8",
  );
  assert.match(api, /PermissionService\.requireAdmin/);
  assert.match(api, /jsonError/);
  const perm = fs.readFileSync(
    path.join(root, "lib", "auth", "PermissionService.ts"),
    "utf8",
  );
  assert.match(perm, /Authentication required/);
  assert.match(perm, /Admin access required/);
});

/** M — production-safe error handling (no fake fallbacks in service). */
test("M: service uses repository snapshot without demo constants", () => {
  const svc = fs.readFileSync(
    path.join(root, "lib", "services", "OperationsMetricsService.ts"),
    "utf8",
  );
  assert.match(svc, /OperationsMetricsRepository\.loadSnapshot/);
  assert.match(svc, /calculateImportQueueMetrics/);
  assert.doesNotMatch(svc, /18432|57892|842/);
  assert.equal(OPERATIONS_METRICS_VERSION, "operations-metrics-1.1.0");
  assert.equal(OPERATIONS_METRICS_TIMEZONE, "Africa/Johannesburg");
  assert.match(svc, /DATA UNAVAILABLE/);
});

test("UI loading and error states present", () => {
  const metrics = fs.readFileSync(
    path.join(root, "app", "admin", "operations", "components", "LiveOperationsMetrics.tsx"),
    "utf8",
  );
  assert.match(metrics, /Loading production metrics/);
  assert.match(metrics, /Live metrics unavailable/);
  assert.match(metrics, /DATA UNAVAILABLE/);
  assert.match(metrics, /Refresh/);
  assert.match(metrics, /cache: "no-store"/);
});

test("Import actions trigger metrics refresh", () => {
  const qa = fs.readFileSync(
    path.join(root, "app", "admin", "operations", "components", "QuickActions.tsx"),
    "utf8",
  );
  assert.match(qa, /requestOperationsMetricsRefresh/);
});

if (!process.exitCode) {
  console.log("\nAll operations-metrics selftests passed");
}
