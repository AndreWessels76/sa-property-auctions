/**
 * Transpile + run Due Diligence extraction tests using local typescript.
 * No network / no tsx required.
 */
const fs = require("fs");
const path = require("path");
const ts = require("typescript");
const Module = require("module");
const assert = require("assert/strict");

const root = path.resolve(__dirname, "..");
const srcDir = path.join(root, "lib", "dueDiligence", "extraction");

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
    if (id.endsWith(".ts") && fs.existsSync(id)) {
      return loadFromAbs(id);
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

  cache.set(abs, mod.exports);
  mod._compile(code, abs);
  cache.set(abs, mod.exports);
  return mod.exports;
}

function loadTs(relFromExtraction) {
  return loadFromAbs(path.join(srcDir, relFromExtraction));
}

const { runDueDiligenceExtraction } = loadTs("extractionService.ts");
const { normalizeLandFromText } = loadTs("normalizer.ts");
const { detectConflicts } = loadTs("sourceExtractor.ts");

let passed = 0;
function test(name, fn) {
  try {
    fn();
    passed += 1;
    console.log("ok -", name);
  } catch (err) {
    console.error("fail -", name);
    console.error(err);
    process.exitCode = 1;
  }
}

test("Benoni bedrooms/scheme/town/suburb", () => {
  const result = runDueDiligenceExtraction({
    title: "Insolvent Estate Online Auction Unit in Crystal Park Benoni",
    description:
      "2-Bedroom unit in Benoni SS The Orchards, Crystal Park. Online auction.",
    verification_state: "verified",
    source_name: "Bidders Choice",
  });
  const map = Object.fromEntries(result.fields.map((f) => [f.field, f]));
  assert.equal(map.bedrooms.value, 2);
  assert.equal(map.scheme.value, "The Orchards");
  assert.equal(map.town.value, "Benoni");
  assert.equal(map.suburb.value, "Crystal Park");
  assert.equal(map.auction_mode.value, "Online");
});

test("Open/close auction period", () => {
  const result = runDueDiligenceExtraction({
    description: "Open Aug 11, close Aug 12. Register to bid.",
    verification_state: "verified",
  });
  const map = Object.fromEntries(result.fields.map((f) => [f.field, f]));
  assert.ok(map.auction_open_at?.value);
  assert.ok(map.auction_close_at?.value);
  assert.notEqual(map.auction_open_at.value, map.auction_close_at.value);
});

test("Combined Extent ±4.164Ha", () => {
  const land = normalizeLandFromText("Combined Extent: ±4.164Ha");
  assert.equal(land.hectares, 4.164);
  assert.equal(land.approximate, true);
  assert.equal(land.square_metres, 41640);
  const result = runDueDiligenceExtraction({
    description: "Combined Extent: ±4.164Ha with boreholes and grazing.",
    verification_state: "verified",
  });
  const map = Object.fromEntries(result.fields.map((f) => [f.field, f]));
  assert.equal(map.land_size_hectares.value, 4.164);
  assert.equal(map.land_size_approximate.value, true);
});

test("No fabricated municipality", () => {
  const result = runDueDiligenceExtraction({
    description: "Beautiful farm in Limpopo near Haenertsburg.",
    verification_state: "verified",
    province: "Limpopo",
    town: "Haenertsburg",
  });
  assert.equal(
    result.fields.find((f) => f.field === "municipality"),
    undefined,
  );
});

test("Conflict detection", () => {
  const conflicts = detectConflicts([
    {
      field: "land_size_hectares",
      value: 4.164,
      original_text: "a",
      source: "A",
      source_url: null,
      extraction_method: "deterministic_text",
      extracted_at: new Date().toISOString(),
      verification_state: "source_confirmed",
    },
    {
      field: "land_size_hectares",
      value: 4.21,
      original_text: "b",
      source: "B",
      source_url: null,
      extraction_method: "structured_field",
      extracted_at: new Date().toISOString(),
      verification_state: "verified",
    },
  ]);
  assert.equal(conflicts.length, 1);
});

test("Deposit percentage", () => {
  const result = runDueDiligenceExtraction({
    description: "10% deposit required within 24 hours.",
    verification_state: "verified",
  });
  assert.equal(
    result.fields.find((f) => f.field === "deposit_percentage")?.value,
    10,
  );
});

test("Document discovery", () => {
  const result = runDueDiligenceExtraction({
    terms_link: "https://example.com/conditions.pdf",
    catalogue_link: "https://example.com/catalogue.pdf",
    verification_state: "verified",
  });
  assert.ok(result.documents.length >= 2);
});

// Evidence export
const fixtures = [
  {
    id: "fixture-benoni",
    title: "Insolvent Estate Online Auction Unit in Crystal Park Benoni",
    description:
      "2-Bedroom unit in Benoni SS The Orchards, Crystal Park. Open Aug 11, close Aug 12.",
    verification_state: "verified",
    source_name: "Bidders Choice",
  },
  {
    id: "fixture-haenertsburg",
    title: "Online Auction Guest Farm Haenertsburg Magoebaskloof Limpopo",
    description:
      "Guest Farm Online Auction in Haenertsburg, Magoebaskloof, Limpopo. Combined Extent: ±4.164Ha. Boreholes and grazing.",
    verification_state: "verified",
    town: "Haenertsburg",
    province: "Limpopo",
    source_name: "Bidders Choice",
  },
  {
    id: "fixture-commercial",
    title: "Online Auction Commercial Warehouse Pretoria",
    description: "Commercial warehouse. 5% deposit.",
    verification_state: "verified",
    town: "Pretoria",
    province: "Gauteng",
    terms_link: "https://example.com/terms.pdf",
  },
];

const cases = fixtures.map((f) => {
  const extraction = runDueDiligenceExtraction(f);
  const map = Object.fromEntries(extraction.fields.map((x) => [x.field, x.value]));
  return {
    id: f.id,
    title: f.title,
    display_highlights: {
      bedrooms: map.bedrooms ?? null,
      scheme: map.scheme ?? null,
      town: map.town ?? null,
      suburb: map.suburb ?? null,
      land_size_hectares: map.land_size_hectares ?? null,
      land_size_approximate: map.land_size_approximate ?? null,
      auction_open_at: map.auction_open_at ?? null,
      auction_close_at: map.auction_close_at ?? null,
      auction_mode: map.auction_mode ?? null,
    },
    fields_found: extraction.stats.fields_found,
    documents_found: extraction.stats.documents_found,
    conflicts: extraction.stats.conflicts,
    missing_key_fields: extraction.stats.missing_key_fields,
    completeness: extraction.completeness,
    evidence_sample: extraction.fields
      .filter((x) => x.extraction_method === "deterministic_text")
      .slice(0, 8)
      .map((x) => ({
        field: x.field,
        value: x.value,
        original_text: x.original_text,
        verification_state: x.verification_state,
      })),
  };
});

const evidence = {
  generated_at: new Date().toISOString(),
  extraction_version: "1.0.0",
  principle: "Never guess. Never fabricate. Evidence required.",
  tests_passed: passed,
  cases,
  summary: {
    properties_processed: cases.length,
    fields_extracted: cases.reduce((n, c) => n + c.fields_found, 0),
    documents_discovered: cases.reduce((n, c) => n + c.documents_found, 0),
    conflicts: cases.reduce((n, c) => n + c.conflicts, 0),
    acceptance: {
      benoni_bedrooms:
        cases.find((c) => c.id === "fixture-benoni")?.display_highlights
          .bedrooms === 2,
      benoni_scheme:
        cases.find((c) => c.id === "fixture-benoni")?.display_highlights
          .scheme === "The Orchards",
      haenertsburg_hectares:
        cases.find((c) => c.id === "fixture-haenertsburg")?.display_highlights
          .land_size_hectares === 4.164,
      municipality_listed_as_missing: cases.every((c) =>
        c.missing_key_fields.includes("municipality"),
      ),
    },
  },
};

fs.writeFileSync(
  path.join(root, "DUE_DILIGENCE_EXTRACTION_EVIDENCE.json"),
  JSON.stringify(evidence, null, 2),
);
console.log("Wrote DUE_DILIGENCE_EXTRACTION_EVIDENCE.json");
console.log(JSON.stringify(evidence.summary, null, 2));
if (process.exitCode) {
  console.error(`\n${passed} tests passed before failure`);
} else {
  console.log(`\nAll ${passed} tests passed`);
}
