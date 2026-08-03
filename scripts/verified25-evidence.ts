import { readFileSync, writeFileSync } from "fs";
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

  const { data: catalogue } = await db
    .from("properties")
    .select(
      "id,title,property_type,province,town,auction_date,auction_agency,source_name,source_url,external_listing_id,imported_at,last_verified_at,connector_id,verification_state,data_classification",
    )
    .eq("verification_state", "verified")
    .order("last_verified_at", { ascending: false });

  const { count: pending } = await db
    .from("properties")
    .select("*", { count: "exact", head: true })
    .eq("verification_state", "pending_verification");

  const { count: rejected } = await db
    .from("import_rejections")
    .select("*", { count: "exact", head: true });

  const byType: Record<string, number> = {};
  const byProvince: Record<string, number> = {};
  for (const row of catalogue ?? []) {
    const t = row.property_type || "Unknown";
    const p = row.province || "Unknown";
    byType[t] = (byType[t] ?? 0) + 1;
    byProvince[p] = (byProvince[p] ?? 0) + 1;
  }

  const evidence = {
    target: 25,
    verifiedCount: catalogue?.length ?? 0,
    pendingCount: pending ?? 0,
    rejectionRows: rejected ?? 0,
    targetMet: (catalogue?.length ?? 0) >= 25,
    byType,
    byProvince,
    allBcVerified: (catalogue ?? []).every(
      (r) => r.connector_id === "bidders_choice",
    ),
    noSeedVerified: (catalogue ?? []).every(
      (r) =>
        r.data_classification !== "seed" &&
        !/seed/i.test(r.source_name ?? "") &&
        !/seed/i.test(r.auction_agency ?? ""),
    ),
    catalogue,
    generatedAt: new Date().toISOString(),
  };

  writeFileSync("VERIFIED25_IMPORT_EVIDENCE.json", JSON.stringify(evidence, null, 2));
  console.log(
    JSON.stringify(
      {
        verifiedCount: evidence.verifiedCount,
        pendingCount: evidence.pendingCount,
        rejectionRows: evidence.rejectionRows,
        targetMet: evidence.targetMet,
        byType,
        byProvince,
        allBcVerified: evidence.allBcVerified,
        noSeedVerified: evidence.noSeedVerified,
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
