/**
 * NEW EVIDENCE SUPPLY PILOT — baseline (read-only).
 */
import { readFileSync, writeFileSync } from "fs";

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
  const { HistoricalIntelligence56Service } = await import(
    "../lib/services/HistoricalIntelligence56Service"
  );
  const { PartnershipRepository, PartnerLicenceRepository } = await import(
    "../lib/repositories/PartnershipRepository"
  );
  const { classifyBcFetchEligibility } = await import(
    "../lib/acquisition/refetch/licenseGate"
  );
  const { createClient } = await import("@supabase/supabase-js");

  const r = await HistoricalIntelligence56Service.buildReport();
  const partner = await PartnershipRepository.getPartnerByCode("bidders_choice");
  const licences = partner?.id
    ? await PartnerLicenceRepository.listByPartner(partner.id)
    : [];
  const live = classifyBcFetchEligibility({
    connectorId: "bidders_choice",
    sourceUrl: "https://bidderschoice.co.za/",
    licence: licences.find((l) => l.status === "active") ?? null,
    envAllowPublicFetch: process.env.BIDDERS_CHOICE_ALLOW_PUBLIC_FETCH === "true",
  });

  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
  const { count: propertyCount } = await db
    .from("properties")
    .select("*", { count: "exact", head: true });
  const { count: eventCount } = await db
    .from("auction_events")
    .select("*", { count: "exact", head: true });
  const { data: existingUrls } = await db
    .from("properties")
    .select("id, source_url, title, town, verification_state")
    .ilike("source_url", "%bidderschoice%")
    .limit(500);

  const out = {
    generatedAt: new Date().toISOString(),
    coverage52: r.coverage52,
    metrics: {
      historicalEvents: r.coverage52?.historicalEvents,
      auctionEvents: eventCount,
      properties: propertyCount,
      soldWithoutPrice: r.coverage52?.soldWithoutPrice,
      verifiedSold: r.coverage52?.verifiedSold,
      verifiedSalePrices: r.coverage52?.verifiedSalePrices,
      comparableReady: r.coverage52?.comparableReady,
      marketReadyTowns: r.coverage52?.marketReadyTowns,
      catalogueLeaks: r.coverage52?.catalogueLeaks,
      outcomeEvidence: r.coverage52?.outcomeEvidence,
      outcomeMissing:
        (r.bottleneck56 as { code?: string; count?: number } | undefined)?.code ===
        "OUTCOME_MISSING"
          ? (r.bottleneck56 as { count: number }).count
          : null,
    },
    bottleneck56: r.bottleneck56,
    partner: partner
      ? {
          code: partner.partner_code,
          status: partner.status,
          licence_status: partner.licence_status,
          notes: partner.notes,
        }
      : null,
    partnerLicences: licences.length,
    livePermission: live,
    envPublicFetch: process.env.BIDDERS_CHOICE_ALLOW_PUBLIC_FETCH === "true",
    existingBcUrls: (existingUrls ?? []).map((u) => ({
      id: u.id,
      url: u.source_url,
      title: u.title,
      town: u.town,
      verification_state: u.verification_state,
    })),
  };
  writeFileSync("NEW_EVIDENCE_SUPPLY_PILOT_BASELINE.json", JSON.stringify(out, null, 2));
  console.log(
    JSON.stringify(
      {
        metrics: out.metrics,
        livePermission: out.livePermission,
        envPublicFetch: out.envPublicFetch,
        existingBcCount: out.existingBcUrls.length,
        bottleneck: out.bottleneck56,
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
