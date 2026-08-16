/**
 * Read-only: sample snapshot text around sold/price language for the 5 targets.
 */
import { readFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";

function loadEnv() {
  for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([^#=]+)=(.*)$/);
    if (m && !process.env[m[1]!.trim()]) {
      process.env[m[1]!.trim()] = m[2]!.trim().replace(/^["']|["']$/g, "");
    }
  }
}

const snaps = [
  "44f2d2bd-da75-45fc-bee6-b39a05d7ac94",
  "bd86b5d0-c9a1-42d0-8241-c572d102a68b",
  "53665b7b-f090-47c8-a341-cf942d90ae2f",
  "8b1b4078-6fdc-4bf4-99c2-12904970fdb4",
  "48e49d61-e2fa-4db6-a462-20ff7787e130",
];

async function main() {
  loadEnv();
  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
  const { data, error } = await db
    .from("source_snapshots")
    .select("id, source_url, content_hash, source_text")
    .in("id", snaps);
  if (error) throw error;
  for (const row of data ?? []) {
    const text = row.source_text ?? "";
    const lower = text.toLowerCase();
    const keys = ["sold", "sale price", "hammer", "guide", "reserve", "r ", "zar"];
    const hits: Record<string, number> = {};
    for (const k of keys) hits[k] = (lower.match(new RegExp(k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi")) || []).length;
    const soldIdx = lower.indexOf("sold");
    const snippet =
      soldIdx >= 0 ? text.slice(Math.max(0, soldIdx - 80), soldIdx + 160).replace(/\s+/g, " ") : text.slice(0, 240).replace(/\s+/g, " ");
    console.log(
      JSON.stringify(
        {
          id: row.id,
          url: row.source_url,
          len: text.length,
          hits,
          snippet,
        },
        null,
        2,
      ),
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
