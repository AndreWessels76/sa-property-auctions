/**
 * Read-only: inspect outcome observations created by resolve batch.
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

async function main() {
  loadEnv();
  const ids = [
    "30bfc41b-e349-44e9-967a-f180672282d0",
    "a5abe625-c741-41eb-95ac-be3e281977cf",
    "6917c55b-3481-4ed7-95e3-1ae1819d5532",
    "91b7a353-8179-4e8a-aa00-a1b20d1a5f33",
    "39cf6aa2-6407-43fc-b5bf-a8ea05df9739",
  ];
  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
  const { data, error } = await db
    .from("auction_outcome_observations")
    .select(
      "id, listing_property_id, auction_event_id, outcome, confidence, evidence_text, sale_price, sale_price_confidence, evidence_type, created_at",
    )
    .in("id", ids);
  if (error) throw error;
  console.log(JSON.stringify(data, null, 2));

  const { count } = await db
    .from("auction_outcome_observations")
    .select("*", { count: "exact", head: true });
  console.log("total_outcome_observations", count);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
