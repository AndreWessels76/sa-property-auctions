import fs from "node:fs";

const path = ".env.local";
const required = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "STRIPE_PRICE_MONTHLY",
  "STRIPE_PRICE_YEARLY",
  "NEXT_PUBLIC_SITE_URL",
];

const map = {};
if (fs.existsSync(path)) {
  for (const line of fs.readFileSync(path, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 0) continue;
    const k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    map[k] = v;
  }
}

function looksPlaceholder(v) {
  if (!v) return true;
  if (v.includes("...")) return true;
  if (/^(x+|your_|changeme|replace)/i.test(v)) return true;
  if (/^sk_test_\.+$/i.test(v)) return true;
  if (/^price_x+$/i.test(v)) return true;
  if (/^whsec_x+$/i.test(v)) return true;
  return false;
}

const report = required.map((k) => {
  const v = map[k] ?? "";
  const present = v.trim().length > 0;
  return {
    key: k,
    present,
    length: present ? v.length : 0,
    looksPlaceholder: present && looksPlaceholder(v),
    kindHint: present
      ? v.startsWith("sk_live")
        ? "stripe_live"
        : v.startsWith("sk_test")
          ? "stripe_test"
          : v.startsWith("http")
            ? "url"
            : "opaque"
      : "missing",
  };
});

const valueGroups = {};
for (const [k, v] of Object.entries(map)) {
  if (!v) continue;
  valueGroups[v] ??= [];
  valueGroups[v].push(k);
}
const exactValueDupes = Object.values(valueGroups).filter((g) => g.length > 1);

console.log(
  JSON.stringify(
    {
      hasEnvLocal: fs.existsSync(path),
      keyCount: Object.keys(map).length,
      required: report,
      exactValueDupes,
      skipEnvValidation: map.SKIP_ENV_VALIDATION === "1",
    },
    null,
    2,
  ),
);
