/**
 * Dual-gate dry-run for the 5 licence-blocked BC events (NO network fetch).
 *
 * Usage:
 *   $env:BIDDERS_CHOICE_ALLOW_PUBLIC_FETCH='true'
 *   npx --yes tsx --import ./scripts/shims/register-server-only.mjs scripts/historical-intelligence56-licence-gate-dryrun.ts
 */
import { readFileSync, writeFileSync } from "fs";

const OUT = "HISTORICAL_INTELLIGENCE56_LICENCE_GATE_DRYRUN.json";
const PRIOR_RUN = "hi51_p1_msueqt04";

const TARGETS = [
  {
    label: "Bedfordview",
    propertyId: "6ea5fcfe-92cf-40e8-9992-fd966c596071",
    auctionEventId: "1035c18c-d257-40d1-8e2d-f6a65c98fc7d",
  },
  {
    label: "Clanwilliam",
    propertyId: "08448def-23c9-49df-9f4a-f13898520f7f",
    auctionEventId: "2eeb5157-8342-41d1-9abd-39c15066eb1b",
  },
  {
    label: "Germiston",
    propertyId: "e7f52518-2ff1-45f9-8163-02909986a3e2",
    auctionEventId: "faeb4be7-8701-493c-a602-9ed20f88c6d8",
  },
  {
    label: "Phase (Middelburg Hope City)",
    propertyId: "5907bdb8-fc4b-4a8b-b054-174e8d3a8d87",
    auctionEventId: "cb1427a6-6259-49ee-99f8-c6ccb83c0407",
  },
  {
    label: "Port Alfred",
    propertyId: "97442d62-e95c-4f5f-a562-17e5e809dd1c",
    auctionEventId: "34f87ade-7ad2-4d92-afbd-2b2fcee6645e",
  },
] as const;

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

  const { classifyBcFetchEligibility } = await import(
    "../lib/acquisition/refetch/licenseGate"
  );
  const { planAcquisition } = await import(
    "../lib/acquisition/historicalEvidence43"
  );
  const { HistoricalIntelligence40Service } = await import(
    "../lib/services/HistoricalIntelligence40Service"
  );
  const { HistoricalEnrichmentRepository } = await import(
    "../lib/repositories/HistoricalEnrichmentRepository"
  );
  const { PartnerLicenceRepository, PartnershipRepository } = await import(
    "../lib/repositories/PartnershipRepository"
  );

  const envPresent =
    process.env.BIDDERS_CHOICE_ALLOW_PUBLIC_FETCH === undefined
      ? "ABSENT"
      : process.env.BIDDERS_CHOICE_ALLOW_PUBLIC_FETCH === "true"
        ? "PRESENT_TRUE"
        : "PRESENT_NOT_TRUE";
  const envAllow = process.env.BIDDERS_CHOICE_ALLOW_PUBLIC_FETCH === "true";

  const partner = await PartnershipRepository.getPartnerByCode("bidders_choice");
  const licences = partner?.id
    ? await PartnerLicenceRepository.listByPartner(partner.id)
    : [];
  const activeLicence = licences.find((l) => l.status === "active") ?? null;

  const livePermission = classifyBcFetchEligibility({
    connectorId: "bidders_choice",
    sourceUrl: "https://bidderschoice.co.za/",
    licence: activeLicence,
    envAllowPublicFetch: envAllow,
  });

  const scored = await HistoricalIntelligence40Service.loadScoredEvents();
  const runs = await HistoricalEnrichmentRepository.listRecentRuns(500);

  const rows = [];
  for (const t of TARGETS) {
    const match = scored.find(
      (e) => e.observation.listingPropertyId === t.propertyId,
    );
    const lastRun = runs.find((r) => r.property_id === t.propertyId) ?? null;
    const lastStatus = lastRun?.status ?? null;
    const sticky =
      (lastStatus ?? "").toUpperCase().includes("SKIPPED_LICENSE") ||
      (lastStatus ?? "").toUpperCase() === "LICENSE_BLOCKED";

    const planSticky = match
      ? planAcquisition({
          event: match.observation,
          dryRun: true,
          lastRunStatus: lastStatus,
          allowLicenceRetry: false,
        })
      : null;
    const planLive = match
      ? planAcquisition({
          event: match.observation,
          dryRun: true,
          lastRunStatus: lastStatus,
          allowLicenceRetry: sticky && livePermission.allowed,
        })
      : null;

    const eventLive = classifyBcFetchEligibility({
      connectorId: "bidders_choice",
      sourceUrl: match?.observation.sourceUrl ?? null,
      licence: activeLicence,
      envAllowPublicFetch: envAllow,
    });

    rows.push({
      property: t.label,
      propertyId: t.propertyId,
      auctionEventId: t.auctionEventId,
      partner: "bidders_choice",
      sourceUrl: match?.observation.sourceUrl ?? null,
      lastEnrichmentStatus: lastStatus,
      stickyLicenceBlock: sticky,
      heaEligibleWithoutRetry: planSticky?.discovery.licensed ?? null,
      heaWillFetchWithoutRetry: planSticky?.fetchPlan.willFetch ?? null,
      heaEligibleWithLivePermission: planLive?.discovery.licensed ?? null,
      heaWillFetchWithLivePermission: planLive?.fetchPlan.willFetch ?? null,
      heaReason: planLive?.fetchPlan.reason ?? null,
      sourceRefetchPermission: eventLive.state,
      sourceRefetchAllowed: eventLive.allowed,
      envPresent,
      licenceRow: activeLicence ? "active" : "absent",
      finalFetchDecision:
        eventLive.allowed && (planLive?.fetchPlan.willFetch ?? false)
          ? "ALLOW"
          : "BLOCK",
      reason: eventLive.allowed
        ? planLive?.fetchPlan.reason ?? eventLive.reasons.join("; ")
        : eventLive.reasons.join("; "),
    });
  }

  const allAllow = rows.every((r) => r.finalFetchDecision === "ALLOW");
  const payload = {
    generatedAt: new Date().toISOString(),
    priorRun: PRIOR_RUN,
    message: "DRY RUN — NO NETWORK FETCH — NO PRODUCTION WRITE",
    envBIDDERS_CHOICE_ALLOW_PUBLIC_FETCH: envPresent,
    partnerLicencesTableRows: licences.length,
    livePermission,
    rows,
    readyForForcedRetry: allAllow,
  };

  writeFileSync(OUT, JSON.stringify(payload, null, 2));
  console.log(JSON.stringify(payload, null, 2));
  if (!allAllow) process.exit(2);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
