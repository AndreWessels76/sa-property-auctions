/**
 * Live Source Re-fetch Engine — deterministic unit selftests (no live network).
 * Run: node scripts/source-refetch-selftest.cjs
 */
const fs = require("fs");
const path = require("path");
const ts = require("typescript");
const Module = require("module");
const assert = require("assert/strict");
const crypto = require("crypto");

const root = path.resolve(__dirname, "..");
const srcDir = path.join(root, "lib", "acquisition", "refetch");

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

const cache = new Map();

function loadTs(rel) {
  const abs = path.join(srcDir, rel);
  if (cache.has(abs)) return cache.get(abs);

  const code = transpileFile(abs);
  const mod = new Module(abs, module);
  mod.filename = abs;
  mod.paths = Module._nodeModulePaths(path.dirname(abs));

  const originalRequire = mod.require.bind(mod);
  mod.require = (id) => {
    if (id.startsWith("@/")) {
      // Soft stubs for app aliases used by licenseGate / robotsGate / fetcher deps
      if (id.includes("licensing")) {
        return {
          evaluatePublicDisplayPermission: (licence) => {
            if (!licence) return { allowed: false, reasons: ["No licence"] };
            if (licence.status !== "active") {
              return { allowed: false, reasons: ["Not active"] };
            }
            if (!licence.public_display_permission) {
              return { allowed: false, reasons: ["No display"] };
            }
            return { allowed: true, reasons: [] };
          },
        };
      }
      if (id.includes("biddersChoice/robots")) {
        return {
          checkRobotsAllowed: async () => ({
            allowed: true,
            reason: "stub allow",
          }),
        };
      }
      if (id.includes("dueDiligence/extraction")) {
        return loadDdStub();
      }
      if (id.includes("logger")) {
        return { LoggerService: { audit() {}, warn() {}, info() {} } };
      }
      if (id.includes("supabase/admin")) {
        return {
          createServiceClient: () => ({
            from: () => ({
              select: () => ({
                eq: () => ({
                  order: () => ({
                    limit: () => ({
                      maybeSingle: async () => ({ data: null, error: { code: "42P01", message: "does not exist" } }),
                    }),
                  }),
                }),
                order: () => ({
                  limit: async () => ({ data: [], error: { code: "42P01" } }),
                }),
              }),
              insert: () => ({
                select: () => ({
                  maybeSingle: async () => ({ data: null, error: { code: "42P01" } }),
                }),
              }),
              upsert: () => ({
                select: () => ({
                  maybeSingle: async () => ({ data: null, error: { code: "42P01" } }),
                }),
              }),
              delete: () => ({
                lt: async () => ({}),
                eq: async () => ({}),
              }),
            }),
          }),
        };
      }
      throw new Error(`Unstubbed alias: ${id}`);
    }
    if (id.startsWith("./") || id.startsWith("../")) {
      const resolved = path.resolve(path.dirname(abs), id);
      const tsPath = resolved.endsWith(".ts") ? resolved : `${resolved}.ts`;
      if (fs.existsSync(tsPath)) {
        return loadTs(path.relative(srcDir, tsPath));
      }
    }
    return originalRequire(id);
  };

  mod._compile(code, abs);
  cache.set(abs, mod.exports);
  return mod.exports;
}

function loadDdStub() {
  return {
    EXTRACTION_VERSION: "1.0.0",
    corpusFromProperty: (p) => p,
    runDueDiligenceExtraction: (corpus) => {
      const text = corpus.source_page_text || corpus.description || "";
      const beds = /(\d+)\s*bed/i.exec(text);
      const land = /([\d.]+)\s*Ha/i.exec(text);
      const date = /(\d{1,2}\s+\w+\s+202\d)/i.exec(text);
      const fields = [];
      if (beds) {
        fields.push({
          field: "bedrooms",
          value: Number(beds[1]),
          verification_state: "extracted_not_yet_verified",
        });
      }
      if (land) {
        fields.push({
          field: "land_size_ha",
          value: Number(land[1]),
          verification_state: "extracted_not_yet_verified",
        });
      }
      if (date) {
        fields.push({
          field: "auction_date",
          value: date[1],
          verification_state: "extracted_not_yet_verified",
        });
      }
      const docMatch = text.match(/https?:\/\/\S+\.pdf/gi) || [];
      return {
        fields,
        documents: docMatch.map((url) => ({ url })),
        stats: {
          fields_found: fields.length,
          documents_found: docMatch.length,
          conflicts: 0,
        },
        completeness: { overall: fields.length * 10 },
        extraction_version: "1.0.0",
      };
    },
  };
}

function test(name, fn) {
  try {
    const r = fn();
    if (r && typeof r.then === "function") {
      return r.then(
        () => console.log("ok -", name),
        (err) => {
          console.error("fail -", name);
          console.error(err);
          process.exitCode = 1;
        },
      );
    }
    console.log("ok -", name);
  } catch (err) {
    console.error("fail -", name);
    console.error(err);
    process.exitCode = 1;
  }
}

const {
  evaluateFetchPermission,
} = loadTs("licenseGate.ts");
const { hostAllowed, contentTypeAllowed, refetchPriority, intervalForPriority, resolveFetchPolicy } =
  loadTs("fetchPolicy.ts");
const { sha256Content } = loadTs("sourceSnapshotService.ts");
const {
  classifyFieldChange,
  detectExtractionChanges,
  detectDocumentUrlChanges,
  summarizeChangeClasses,
} = loadTs("sourceChangeDetector.ts");
const { allowRate, resetRateBuckets } = loadTs("rateLimiter.ts");
const { scheduleRefetchOrder, selectUpcomingForRefetch } = loadTs("refetchScheduler.ts");
const { htmlToPlainText, extractHtmlTitle } = loadTs("sourceFetcher.ts");
const {
  decideChangeFromContentHash,
  shouldCreateSnapshot,
  shouldRunExtraction,
} = loadTs("forceSemantics.ts");

const libCache = new Map();

function loadFromAbs(abs) {
  if (libCache.has(abs)) return libCache.get(abs);
  const code = transpileFile(abs);
  const mod = new Module(abs, module);
  mod.filename = abs;
  mod.paths = Module._nodeModulePaths(path.dirname(abs));
  const originalRequire = mod.require.bind(mod);
  mod.require = (id) => {
    if (id.startsWith("@/")) {
      const aliasAbs = path.join(root, id.slice(2));
      const tsPath = aliasAbs.endsWith(".ts") ? aliasAbs : `${aliasAbs}.ts`;
      if (fs.existsSync(tsPath)) return loadFromAbs(tsPath);
    }
    if (id.startsWith("./") || id.startsWith("../")) {
      const resolved = path.resolve(path.dirname(abs), id);
      const tsPath = resolved.endsWith(".ts") ? resolved : `${resolved}.ts`;
      if (fs.existsSync(tsPath)) return loadFromAbs(tsPath);
    }
    return originalRequire(id);
  };
  libCache.set(abs, mod.exports);
  mod._compile(code, abs);
  libCache.set(abs, mod.exports);
  return mod.exports;
}

const { isPubliclyActiveListing, HISTORICAL_INTELLIGENCE_STATES } = loadFromAbs(
  path.join(root, "lib", "data", "publicListingPolicy.ts"),
);
const { suggestLifecycleFromDates } = loadFromAbs(
  path.join(root, "lib", "data", "listingLifecycle.ts"),
);

const evidence = {
  generated_at: new Date().toISOString(),
  tests: [],
  live_fetch: null,
  verdict_notes: [],
};

function record(name, pass, detail) {
  evidence.tests.push({ name, pass, detail });
}

async function run() {
  await test("license blocked without licence or env", () => {
    const r = evaluateFetchPermission({
      licence: null,
      connectorId: "bidders_choice",
      envAllowPublicFetch: false,
    });
    assert.equal(r.allowed, false);
    record("license_blocked", true, r.reasons.join("; "));
  });

  await test("license allowed with active licence", () => {
    const r = evaluateFetchPermission({
      licence: {
        partner_id: "x",
        licence_label: "BC",
        public_display_permission: true,
        image_usage_rights: true,
        document_usage_rights: false,
        status: "active",
      },
      connectorId: "bidders_choice",
    });
    assert.equal(r.allowed, true);
    record("license_active", true, "allowed");
  });

  await test("license allowed via env override", () => {
    const r = evaluateFetchPermission({
      licence: null,
      connectorId: "bidders_choice",
      envAllowPublicFetch: true,
    });
    assert.equal(r.allowed, true);
    record("license_env", true, "BIDDERS_CHOICE_ALLOW_PUBLIC_FETCH");
  });

  await test("host allowlist", () => {
    const policy = resolveFetchPolicy();
    assert.equal(hostAllowed("https://www.bidderschoice.co.za/listing/1", policy), true);
    assert.equal(hostAllowed("https://evil.example/x", policy), false);
    record("host_allowlist", true, "bc allowed, evil blocked");
  });

  await test("content type allowlist", () => {
    const policy = resolveFetchPolicy();
    assert.equal(contentTypeAllowed("text/html; charset=utf-8", policy), true);
    assert.equal(contentTypeAllowed("application/pdf", policy), false);
    record("content_type", true, "html ok pdf blocked");
  });

  await test("content hash deterministic", () => {
    const a = sha256Content("hello");
    const b = sha256Content("hello");
    const c = sha256Content("hello!");
    assert.equal(a, b);
    assert.notEqual(a, c);
    assert.equal(a.length, 64);
    record("content_hash", true, a.slice(0, 12));
  });

  await test("verified conflict never silent overwrite", () => {
    const change = classifyFieldChange({
      field: "land_size_ha",
      previous: {
        field: "land_size_ha",
        value: 4.164,
        verification_state: "verified",
      },
      next: {
        field: "land_size_ha",
        value: 4.21,
        verification_state: "extracted_not_yet_verified",
      },
    });
    assert.equal(change.outcome, "CONFLICT");
    assert.equal(change.changeClass, "CONFLICT_REVIEW_REQUIRED");
    record("verified_conflict", true, "4.164 vs 4.21 → CONFLICT");
  });

  await test("source_confirmed update is UPDATED not conflict", () => {
    const change = classifyFieldChange({
      field: "bedrooms",
      previous: {
        field: "bedrooms",
        value: 2,
        verification_state: "source_confirmed",
      },
      next: {
        field: "bedrooms",
        value: 3,
        verification_state: "extracted_not_yet_verified",
      },
    });
    assert.equal(change.outcome, "UPDATED");
    record("source_confirmed_update", true, "2 → 3 UPDATED");
  });

  await test("auction date change classification", () => {
    const changes = detectExtractionChanges(
      {
        fields: [
          {
            field: "auction_date",
            value: "11 Aug 2026",
            verification_state: "source_confirmed",
          },
        ],
      },
      {
        fields: [
          {
            field: "auction_date",
            value: "18 Aug 2026",
            verification_state: "extracted_not_yet_verified",
          },
        ],
        documents: [],
        stats: {},
      },
    );
    assert.equal(changes[0].changeClass, "AUCTION_DATE_CHANGED");
    record("auction_date_change", true, "11→18 Aug");
  });

  await test("document add/remove detection", () => {
    const docs = detectDocumentUrlChanges(
      ["https://example.com/a.pdf"],
      ["https://example.com/b.pdf"],
    );
    assert.equal(docs.length, 2);
    assert.ok(docs.some((d) => d.changeClass === "DOCUMENT_ADDED"));
    assert.ok(docs.some((d) => d.changeClass === "DOCUMENT_REMOVED"));
    record("document_change", true, "add+remove");
  });

  await test("removed verified value → CONFLICT", () => {
    const change = classifyFieldChange({
      field: "viewing_date",
      previous: {
        field: "viewing_date",
        value: "3 August",
        verification_state: "verified",
      },
      next: undefined,
    });
    assert.equal(change.outcome, "CONFLICT");
    assert.equal(change.changeClass, "CONFLICT_REVIEW_REQUIRED");
    record("source_value_removed_verified", true, "CONFLICT");
  });

  await test("rate limiter blocks storm", () => {
    resetRateBuckets();
    let allowed = 0;
    for (let i = 0; i < 10; i++) {
      if (allowRate({ key: "t", maxPerMinute: 3 })) allowed += 1;
    }
    assert.equal(allowed, 3);
    record("rate_limit", true, "3/10 allowed");
  });

  await test("priority ordering live > upcoming > historical", () => {
    const live = refetchPriority({ listingStatus: "live", auctionDate: null });
    const soon = refetchPriority({
      listingStatus: "upcoming",
      auctionDate: new Date(Date.now() + 12 * 3600_000).toISOString(),
    });
    const hist = refetchPriority({
      listingStatus: "completed",
      auctionDate: "2020-01-01",
    });
    assert.ok(live > soon);
    assert.ok(soon > hist);
    assert.ok(intervalForPriority(soon) <= 24 * 3600_000);
    record("priority", true, `live=${live} soon=${soon} hist=${hist}`);
  });

  await test("html to text strips scripts", () => {
    const text = htmlToPlainText(
      "<html><script>evil()</script><title>X</title><body>2 bed · 4.164 Ha</body></html>",
    );
    assert.ok(!text.includes("evil"));
    assert.ok(text.includes("2 bed"));
    assert.equal(extractHtmlTitle("<title> Guest Farm </title>"), "Guest Farm");
    record("html_plain", true, text.slice(0, 40));
  });

  await test("scheduler selects upcoming with source urls", () => {
    const selected = selectUpcomingForRefetch(
      [
        { id: "1", title: "A", source_url: null, listing_status: "upcoming" },
        {
          id: "2",
          title: "B",
          source_url: "https://www.bidderschoice.co.za/x",
          listing_status: "live",
          auction_date: new Date().toISOString(),
        },
        {
          id: "3",
          title: "C",
          source_url: "https://www.bidderschoice.co.za/y",
          listing_status: "upcoming",
          auction_date: new Date(Date.now() + 10 * 86400_000).toISOString(),
        },
      ],
      10,
    );
    assert.equal(selected.length, 2);
    assert.equal(selected[0].id, "2");
    record("scheduler", true, selected.map((p) => p.id).join(","));
  });

  await test("cron + admin routes exist", () => {
    assert.ok(
      fs.existsSync(
        path.join(root, "app/api/cron/source-refetch/route.ts"),
      ),
    );
    assert.ok(
      fs.existsSync(
        path.join(root, "app/api/admin/operations/source-refetch/route.ts"),
      ),
    );
    const cron = fs.readFileSync(
      path.join(root, "app/api/cron/source-refetch/route.ts"),
      "utf8",
    );
    assert.match(cron, /CRON_SECRET/);
    assert.match(cron, /status: 401/);
    const qa = fs.readFileSync(
      path.join(root, "app/admin/operations/components/QuickActions.tsx"),
      "utf8",
    );
    assert.match(qa, /Refresh Upcoming Sources/);
    assert.match(qa, /source-refetch/);
    record("routes", true, "cron+admin+quick action");
  });

  await test("summarize change classes", () => {
    const classes = summarizeChangeClasses([
      {
        field: "a",
        previous: 1,
        next: 2,
        outcome: "UPDATED",
        changeClass: "PROPERTY_DATA_CHANGED",
      },
      {
        field: "b",
        previous: "x",
        next: "y",
        outcome: "CONFLICT",
        changeClass: "CONFLICT_REVIEW_REQUIRED",
      },
    ]);
    assert.ok(classes.includes("PROPERTY_DATA_CHANGED"));
    assert.ok(classes.includes("CONFLICT_REVIEW_REQUIRED"));
    record("change_classes", true, classes.join(","));
  });

  await test("extraction linkage wired for CONTENT_CHANGED", () => {
    const svc = fs.readFileSync(
      path.join(srcDir, "sourceRefetchService.ts"),
      "utf8",
    );
    const link = fs.readFileSync(
      path.join(srcDir, "refetchExtractionLinkage.ts"),
      "utf8",
    );
    const audit = fs.readFileSync(
      path.join(srcDir, "refetchAudit.ts"),
      "utf8",
    );
    assert.match(svc, /persistRefetchExtraction/);
    assert.match(svc, /extractionRunId/);
    assert.match(svc, /extraction_run_id/);
    assert.match(link, /DueDiligenceExtractionRepository\.recordRun/);
    assert.match(link, /refetch_provenance/);
    assert.match(audit, /linkExtractionRun/);
    // NO_CHANGE path must not call persist
    const noChangeBlock = svc.slice(
      svc.indexOf("NO_CHANGE — content hash unchanged"),
      svc.indexOf("Changed — run deterministic"),
    );
    assert.doesNotMatch(noChangeBlock, /persistRefetchExtraction/);
    record("extraction_linkage", true, "persist+audit wired");
  });

  await test("enrich_from_snapshot API action exists", () => {
    const api = fs.readFileSync(
      path.join(root, "app/api/admin/operations/source-refetch/route.ts"),
      "utf8",
    );
    assert.match(api, /enrich_from_snapshot/);
    record("enrich_api", true, "admin action present");
  });

  await test("Test A — same hash is NO_CHANGE without snapshot/extraction", () => {
    const hash = sha256Content("page-v1");
    const decision = decideChangeFromContentHash({
      previousHash: hash,
      contentHash: hash,
      force: false,
    });
    assert.equal(decision, "NO_CHANGE");
    assert.equal(shouldCreateSnapshot(decision), false);
    assert.equal(shouldRunExtraction(decision), false);
    record("test_a_normal_unchanged", true, "NO_CHANGE no snapshot no DD");
  });

  await test("Test B — forced identical hash is still NO_CHANGE", () => {
    const hash = sha256Content("page-v1");
    const decision = decideChangeFromContentHash({
      previousHash: hash,
      contentHash: hash,
      force: true,
    });
    assert.equal(decision, "NO_CHANGE");
    assert.equal(shouldCreateSnapshot(decision), false);
    assert.equal(shouldRunExtraction(decision), false);
    const svc = fs.readFileSync(
      path.join(srcDir, "sourceRefetchService.ts"),
      "utf8",
    );
    assert.match(svc, /decideChangeFromContentHash/);
    assert.match(svc, /forced: input\.force === true/);
    assert.match(svc, /findByUrlAndHash/);
    // force must not skip the hash equality branch
    assert.doesNotMatch(
      svc,
      /if \(!input\.force && previousHash && previousHash === contentHash\)/,
    );
    record("test_b_forced_unchanged", true, "force does not pretend change");
  });

  await test("Test C — forced different hash is CONTENT_CHANGED", () => {
    const decision = decideChangeFromContentHash({
      previousHash: sha256Content("page-v1"),
      contentHash: sha256Content("page-v2"),
      force: true,
    });
    assert.equal(decision, "CONTENT_CHANGED");
    assert.equal(shouldCreateSnapshot(decision), true);
    assert.equal(shouldRunExtraction(decision), true);
    const svc = fs.readFileSync(
      path.join(srcDir, "sourceRefetchService.ts"),
      "utf8",
    );
    assert.match(svc, /persistRefetchExtraction/);
    assert.match(svc, /extraction_run_id/);
    record("test_c_forced_changed", true, "changed hash → snapshot + DD");
  });

  await test("Test D — expired listing hidden from public, retained historically", () => {
    const past = "2026-08-04T00:00:00.000Z";
    const now = new Date("2026-08-13T12:00:00.000Z");
    const lifecycle = suggestLifecycleFromDates({
      auctionDate: past,
      currentStatus: "upcoming",
      now,
    });
    assert.equal(lifecycle, "expired");
    const publicVisible = isPubliclyActiveListing({
      verification_state: "expired",
      listing_status: "expired",
      auction_date: past,
      now,
    });
    assert.equal(publicVisible, false);
    const stillVerifiedButPast = isPubliclyActiveListing({
      verification_state: "verified",
      listing_status: "expired",
      auction_date: past,
      now,
    });
    assert.equal(stillVerifiedButPast, false);
    assert.ok(HISTORICAL_INTELLIGENCE_STATES.includes("expired"));
    const upcoming = isPubliclyActiveListing({
      verification_state: "verified",
      listing_status: "upcoming",
      auction_date: "2026-09-01T00:00:00.000Z",
      now,
    });
    assert.equal(upcoming, true);
    const policySrc = fs.readFileSync(
      path.join(root, "lib", "data", "publicListingPolicy.ts"),
      "utf8",
    );
    assert.match(policySrc, /PUBLIC_LISTING_STATUSES = \["upcoming", "live"\]/);
    assert.match(policySrc, /"expired"/);
    const refetchSrc = fs.readFileSync(
      path.join(srcDir, "sourceRefetchService.ts"),
      "utf8",
    );
    assert.doesNotMatch(refetchSrc, /\.update\(\s*\{[^}]*verification_state/);
    record("test_d_expired_catalogue", true, "expired hidden, intelligence keeps expired");
  });

  await test("Test E — verified field change is CONFLICT not overwrite", () => {
    const change = classifyFieldChange({
      field: "land_size_ha",
      previous: {
        field: "land_size_ha",
        value: 4.164,
        verification_state: "verified",
      },
      next: {
        field: "land_size_ha",
        value: 4.21,
        verification_state: "extracted_not_yet_verified",
      },
    });
    assert.equal(change.outcome, "CONFLICT");
    assert.equal(change.previous, 4.164);
    assert.equal(change.next, 4.21);
    record("test_e_verified_conflict", true, "verified 4.164 protected");
  });

  await test("Test F — refetch never creates Property Master or Auction Event", () => {
    const svc = fs.readFileSync(
      path.join(srcDir, "sourceRefetchService.ts"),
      "utf8",
    );
    const orch = fs.readFileSync(
      path.join(root, "lib/services/SourceRefetchService.ts"),
      "utf8",
    );
    assert.doesNotMatch(svc, /property_masters|auction_events|PropertyIdentity/);
    assert.doesNotMatch(orch, /property_masters|auction_events|PropertyIdentity/);
    record("test_f_identity", true, "no master/event creation in refetch path");
  });

  // Optional live BC fetch — only when explicitly enabled
  if (process.env.BIDDERS_CHOICE_ALLOW_PUBLIC_FETCH === "true") {
    await test("live bidders choice fetch (optional)", async () => {
      const { fetchSourcePage } = loadTs("sourceFetcher.ts");
      const policy = resolveFetchPolicy({ maxRetries: 1, timeoutMs: 15000 });
      const url =
        process.env.BIDDERS_CHOICE_TEST_URL ||
        "https://www.bidderschoice.co.za/";
      const res = await fetchSourcePage({ url, policy });
      evidence.live_fetch = {
        url,
        ok: res.ok,
        status: res.status,
        bytes: res.bytes,
        hash: res.body
          ? crypto.createHash("sha256").update(res.body).digest("hex").slice(0, 16)
          : null,
        error: res.error,
      };
      // Do not fail suite if site blocks — record evidence only
      record(
        "live_fetch",
        true,
        `status=${res.status} ok=${res.ok} error=${res.error ?? "none"}`,
      );
    });
  } else {
    evidence.verdict_notes.push(
      "Live BC fetch skipped — BIDDERS_CHOICE_ALLOW_PUBLIC_FETCH not true",
    );
    record("live_fetch_skipped", true, "env not enabled");
  }

  const outPath = path.join(root, "LIVE_SOURCE_REFETCH_EVIDENCE.json");
  fs.writeFileSync(outPath, JSON.stringify(evidence, null, 2));
  console.log("\nWrote", outPath);

  if (!process.exitCode) {
    console.log("All source-refetch selftests passed");
  }
}

run();
