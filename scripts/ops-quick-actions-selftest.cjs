/**
 * Operations Centre Quick Actions — destination + sheriff policy selftest.
 * Run: node scripts/ops-quick-actions-selftest.cjs
 */
const assert = require("assert/strict");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");

function assertRouteExists(routePath) {
  // Map app route to filesystem
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

test("Sheriff connector is placeholder (not production feed)", () => {
  const src = fs.readFileSync(
    path.join(root, "lib", "connectors", "sheriff", "connector.ts"),
    "utf8",
  );
  assert.match(src, /Tydelik toetsdata|temporary|test data/i);
});

test("QuickActions wires handlers (not dead buttons)", () => {
  const src = fs.readFileSync(
    path.join(root, "app", "admin", "operations", "components", "QuickActions.tsx"),
    "utf8",
  );
  assert.match(src, /run_all_imports/);
  assert.match(src, /run_sheriff_import/);
  assert.match(src, /\/admin\/acquisition/);
  assert.match(src, /\/intelligence/);
  assert.match(src, /Running Imports\.\.\./);
  assert.match(src, /toast\./);
});

test("PermissionService distinguishes auth vs admin", () => {
  const src = fs.readFileSync(
    path.join(root, "lib", "auth", "PermissionService.ts"),
    "utf8",
  );
  assert.match(src, /Authentication required/);
  assert.match(src, /Admin access required/);
});

if (!process.exitCode) {
  console.log("\nAll ops quick-action selftests passed");
}
