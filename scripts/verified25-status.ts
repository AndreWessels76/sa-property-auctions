import { readFileSync, existsSync } from "fs";
import { createClient } from "@supabase/supabase-js";

async function main() {
  for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([^#=]+)=(.*)$/);
    if (m && !process.env[m[1].trim()]) {
      process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
    }
  }
  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );

  const { count: verified } = await db
    .from("properties")
    .select("*", { count: "exact", head: true })
    .eq("verification_state", "verified");
  const { count: bc } = await db
    .from("properties")
    .select("*", { count: "exact", head: true })
    .eq("connector_id", "bidders_choice");
  const { count: bcVerified } = await db
    .from("properties")
    .select("*", { count: "exact", head: true })
    .eq("connector_id", "bidders_choice")
    .eq("verification_state", "verified");

  const { data: rejections } = await db
    .from("import_rejections")
    .select("reason,source_url,created_at")
    .order("created_at", { ascending: false })
    .limit(20);

  const { data: bcRows } = await db
    .from("properties")
    .select("source_url,verification_state,title")
    .eq("connector_id", "bidders_choice");

  const discovered = existsSync("VERIFIED25_DISCOVERED_URLS.json")
    ? (JSON.parse(readFileSync("VERIFIED25_DISCOVERED_URLS.json", "utf8")) as {
        urls: string[];
      })
    : { urls: [] };

  const have = new Set(
    (bcRows ?? []).map((r) =>
      (r.source_url ?? "").replace(/\/?$/, "/").toLowerCase(),
    ),
  );
  const remaining = discovered.urls.filter(
    (u) => !have.has(u.replace(/\/?$/, "/").toLowerCase()),
  );

  const reasons: Record<string, number> = {};
  for (const r of rejections ?? []) {
    const key = (r.reason as string).slice(0, 80);
    reasons[key] = (reasons[key] ?? 0) + 1;
  }

  console.log(
    JSON.stringify(
      {
        verified,
        bc,
        bcVerified,
        discovered: discovered.urls.length,
        remaining: remaining.length,
        remainingSample: remaining.slice(0, 8),
        rejectionReasons: reasons,
      },
      null,
      2,
    ),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
