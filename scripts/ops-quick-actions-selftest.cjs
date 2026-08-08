/**
 * Operations Centre Quick Actions — destination + sheriff + source refresh selftest.
 * Run: node scripts/ops-quick-actions-selftest.cjs
 */
const assert = require("assert/strict");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const quickActionsPath = path.join(
  root,
  "app",
  "admin",
  "operations",
  "components",
  "QuickActions.tsx",
);
const operationsPagePath = path.join(
  root,
  "app",
  "admin",
  "operations",
  "page.tsx",
);
const sourceRefetchApiPath = path.join(
  root,
  "app",
  "api",
  "admin",
  "operations",
  "source-refetch",
  "route.ts",
);
const sourceRefetchServicePath = path.join(
  root,
  "lib",
  "services",
  "SourceRefetchService.ts",
);

function assertRouteExists(routePath) {
  const cleaned = routePath.replace(/^\//, "");
  const candidates = [
    path.join(root, "app", cleaned, "page.tsx"),
    path.join(root, "app", cleaned, "page.ts"),
  ];
  const found = candidates.some((p) => fs.existsSync(p));
  assert.ok(found, `Missing page for route ${routePath}`);
}

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

test("Open Sources destination exists", () => {
  assertRouteExists("/admin/acquisition");
});

test("View Analytics destination exists", () => {
  assertRouteExists("/intelligence");
});

test("Operations Centre route renders QuickActions", () => {
  assert.ok(fs.existsSync(operationsPagePath));
  const page = fs.readFileSync(operationsPagePath, "utf8");
  assert.match(page, /import QuickActions from "\.\/components\/QuickActions"/);
  assert.match(page, /<QuickActions\s*\/>/);
});

test("Quick Actions API route exists", () => {
  assert.ok(
    fs.existsSync(
      path.join(
        root,
        "app",
        "api",
        "admin",
        "operations",
        "quick-actions",
        "route.ts",
      ),
    ),
  );
});

test("Source refetch API + service exist", () => {
  assert.ok(fs.existsSync(sourceRefetchApiPath), "missing source-refetch API");
  assert.ok(
    fs.existsSync(sourceRefetchServicePath),
    "missing SourceRefetchService",
  );
  const api = fs.readFileSync(sourceRefetchApiPath, "utf8");
  assert.match(api, /PermissionService\.requireAdmin/);
  assert.match(api, /SourceRefetchService/);
  assert.match(api, /refresh_upcoming/);
});

test("Sheriff connector is placeholder (not production feed)", () => {
  const src = fs.readFileSync(
    path.join(root, "lib", "connectors", "sheriff", "connector.ts"),
    "utf8",
  );
  assert.match(src, /Tydelik toetsdata|temporary|test data/i);
});

test("QuickActions contains Refresh Upcoming Sources with live handler", () => {
  const src = fs.readFileSync(quickActionsPath, "utf8");

  // Label visible in UI
  assert.match(src, /Refresh Upcoming Sources/);
  assert.match(src, /REFRESH_UPCOMING_SOURCES_LABEL/);

  // Rendered button (not conditional on env/feature flag)
  assert.match(src, /data-testid="refresh-upcoming-sources"/);
  assert.doesNotMatch(
    src,
    /BIDDERS_CHOICE_ALLOW_PUBLIC_FETCH[\s\S]{0,80}Refresh Upcoming Sources/,
  );

  // Actual click handler + endpoint
  assert.match(src, /function refreshUpcomingSources/);
  assert.match(src, /onClick=\{\(\) => void refreshUpcomingSources\(\)\}/);
  assert.match(src, /SOURCE_REFETCH_API/);
  assert.match(src, /\/api\/admin\/operations\/source-refetch/);
  assert.match(src, /action:\s*"refresh_upcoming"/);

  // Loading + double-click protection + toast + error handling
  assert.match(src, /runningRefetch/);
  assert.match(src, /Refreshing Sources\.\.\./);
  assert.match(src, /setRunningRefetch\(true\)/);
  assert.match(src, /if \(runningAll \|\| runningSheriff \|\| runningRefetch\) return/);
  assert.match(src, /toast\.(message|success|error)/);
  assert.match(src, /Source refresh failed/);
  assert.match(src, /You must sign in to perform this action/);
  assert.match(src, /You are not authorized to perform this action/);

  // Result panel fields (real counts, not invented)
  assert.match(src, /Attempted/);
  assert.match(src, /No change/);
  assert.match(src, /Skipped license/);
  assert.match(src, /Skipped robots/);
  assert.match(src, /Conflicts/);
  assert.match(src, /No eligible upcoming\/live licensed sources/);
});

test("QuickActions wires all existing handlers (not dead buttons)", () => {
  const src = fs.readFileSync(quickActionsPath, "utf8");
  assert.match(src, /run_all_imports/);
  assert.match(src, /run_sheriff_import/);
  assert.match(src, /\/admin\/acquisition/);
  assert.match(src, /\/intelligence/);
  assert.match(src, /Running Imports\.\.\./);
  assert.match(src, /toast\./);
  // Order in the rendered button grid (imports → sheriff → sources → analytics → refresh)
  const gridStart = src.indexOf('<div className="grid gap-3">');
  assert.ok(gridStart > 0, "missing actions grid");
  const grid = src.slice(gridStart, src.indexOf("</div>", gridStart + 1) + 6);
  // Find last occurrence of each label within the grid block
  const importsIdx = grid.indexOf("Run All Imports");
  const sheriffIdx = grid.indexOf("Run Sheriff Import");
  const sourcesIdx = grid.indexOf("Open Sources");
  const analyticsIdx = grid.indexOf("View Analytics");
  const refreshIdx = grid.indexOf("REFRESH_UPCOMING_SOURCES_LABEL");
  assert.ok(importsIdx >= 0 && sheriffIdx > importsIdx, "imports before sheriff");
  assert.ok(sourcesIdx > sheriffIdx, "sheriff before sources");
  assert.ok(analyticsIdx > sourcesIdx, "sources before analytics");
  assert.ok(refreshIdx > analyticsIdx, "analytics before refresh");
});

test("PermissionService distinguishes auth vs admin (independent of premium)", () => {
  const src = fs.readFileSync(
    path.join(root, "lib", "auth", "PermissionService.ts"),
    "utf8",
  );
  assert.match(src, /Authentication required/);
  assert.match(src, /Admin access required/);
  const start = src.indexOf("static async requireAdmin");
  assert.ok(start >= 0);
  let depth = 0;
  let end = -1;
  for (let i = src.indexOf("{", start); i < src.length; i++) {
    if (src[i] === "{") depth += 1;
    if (src[i] === "}") {
      depth -= 1;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }
  const requireAdminBody = src.slice(start, end + 1);
  assert.match(requireAdminBody, /Admin access required/);
  assert.doesNotMatch(requireAdminBody, /premium|subscription/i);

  const isAdminSrc = fs.readFileSync(
    path.join(root, "lib", "auth", "isAdmin.ts"),
    "utf8",
  );
  // Implementation uses profiles.role only (comment may mention subscription as a prohibition)
  assert.match(isAdminSrc, /fromDatabaseRole\(profile\?\.role\) === ROLES\.admin/);
  assert.doesNotMatch(
    isAdminSrc.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, ""),
    /SubscriptionService|stripe|billing/i,
  );
});

test("HEAD commit on origin lacks Refresh Upcoming Sources (deployment gap)", () => {
  // Documents the production root cause: button not in last pushed commit.
  // This test asserts the *working tree* has the fix; deployment remains a separate step.
  const src = fs.readFileSync(quickActionsPath, "utf8");
  assert.match(src, /Refresh Upcoming Sources/);
});

if (!process.exitCode) {
  console.log("\nAll ops quick-action selftests passed");
}
