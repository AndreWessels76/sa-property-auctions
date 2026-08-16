/**
 * HI 5.6 — forced retry of the 5 licence-blocked P1 events from hi51_p1_msueqt04.
 *
 * Requires BIDDERS_CHOICE_ALLOW_PUBLIC_FETCH=true (Option B) OR an active partner_licences row.
 * Max 5. force=true. No Batch 2. No legacy retry.
 *
 * Usage:
 *   $env:NODE_OPTIONS='--use-system-ca'
 *   $env:BIDDERS_CHOICE_ALLOW_PUBLIC_FETCH='true'
 *   npx --yes tsx --import ./scripts/shims/register-server-only.mjs scripts/historical-intelligence56-retry-license-blocked.ts
 */
import { readFileSync, writeFileSync } from "fs";

const OPERATOR = "hi56-retry-license-blocked-batch1";
const OUT = "HISTORICAL_INTELLIGENCE56_RETRY_LICENSE_BLOCKED_BATCH1.json";
const PRIOR_RUN = "hi51_p1_msueqt04";

/** Exact five from hi51_p1_msueqt04 — do not substitute. */
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
  const { HistoricalIntelligence56Service } = await import(
    "../lib/services/HistoricalIntelligence56Service"
  );
  const { HistoricalEvidenceAcquisition43Service } = await import(
    "../lib/services/HistoricalEvidenceAcquisition43Service"
  );
  const { HistoricalSourceCoverage48Service } = await import(
    "../lib/services/HistoricalSourceCoverage48Service"
  );
  const { PartnerLicenceRepository, PartnershipRepository } = await import(
    "../lib/repositories/PartnershipRepository"
  );

  console.log("PHASE 1–4 — Licence diagnostic (no network fetch yet)");

  const partner = await PartnershipRepository.getPartnerByCode("bidders_choice");
  const licences = partner?.id
    ? await PartnerLicenceRepository.listByPartner(partner.id)
    : [];
  const activeLicence =
    licences.find((l) => l.status === "active") ?? null;

  const envAllow = process.env.BIDDERS_CHOICE_ALLOW_PUBLIC_FETCH === "true";
  const eligibility = classifyBcFetchEligibility({
    connectorId: "bidders_choice",
    sourceUrl: TARGETS[0].propertyId ? "https://bidderschoice.co.za/" : null,
    licence: activeLicence,
    envAllowPublicFetch: envAllow,
  });

  console.log(
    JSON.stringify(
      {
        priorRun: PRIOR_RUN,
        partnerCode: partner?.partner_code ?? null,
        partnerLicenceStatus: (partner as { licence_status?: string } | null)
          ?.licence_status,
        partnerLicencesTableRows: licences.length,
        activePartnerLicenceRow: Boolean(activeLicence),
        envAllowPublicFetch: envAllow,
        eligibility,
      },
      null,
      2,
    ),
  );

  if (!eligibility.allowed) {
    const blocked = {
      verdict: "LICENSE BLOCKED",
      eligibility,
      message:
        "Legitimate acquisition permission unavailable — set BIDDERS_CHOICE_ALLOW_PUBLIC_FETCH=true or add an active partner_licences row",
      productionWritesExecuted: [],
      targets: TARGETS,
    };
    writeFileSync(OUT, JSON.stringify(blocked, null, 2));
    console.error("STOP — licence/config still blocked");
    process.exit(1);
  }

  if (TARGETS.length !== 5) {
    console.error("STOP — expected exactly 5 targets");
    process.exit(1);
  }

  const beforeReport = await HistoricalIntelligence56Service.buildReport();
  const leaks =
    beforeReport.safety56?.catalogueLeaks ??
    beforeReport.coverage52?.catalogueLeaks ??
    -1;
  if (typeof leaks === "number" && leaks > 0) {
    writeFileSync(
      OUT,
      JSON.stringify(
        {
          verdict: "PRODUCTION BLOCKED",
          reason: `catalogueLeaks=${leaks}`,
          productionWritesExecuted: [],
        },
        null,
        2,
      ),
    );
    process.exit(1);
  }

  console.log("\nPHASE 5 — Forced retry of exactly 5 licence-blocked events");
  const runId = `hi56_retry_lic_${Date.now().toString(36)}`;
  const results = [];
  for (const t of TARGETS) {
    console.log(`→ force acquireOne ${t.label} (${t.propertyId})`);
    results.push(
      await HistoricalEvidenceAcquisition43Service.acquireOne({
        propertyId: t.propertyId,
        force: true,
        dryRun: false,
        operator: OPERATOR,
        runId,
      }),
    );
  }

  let rebuild: unknown = null;
  const leaksAfterAcquire =
    (await HistoricalIntelligence56Service.buildReport()).safety56
      ?.catalogueLeaks ?? 0;
  if (leaksAfterAcquire > 0) {
    console.error("STOP REBUILD — catalogue leaks > 0");
  } else {
    console.log("PHASE 9–10 — Rebuild (catalogueLeaks=0)");
    rebuild = await HistoricalSourceCoverage48Service.rebuildIntelligence(
      OPERATOR,
    );
  }

  const afterReport = await HistoricalIntelligence56Service.buildReport();

  const payload = {
    generatedAt: new Date().toISOString(),
    operator: OPERATOR,
    priorRun: PRIOR_RUN,
    licencePath: eligibility.state,
    eligibility,
    envAllowPublicFetch: envAllow,
    partnerLicencesTableRows: licences.length,
    runId,
    targets: TARGETS,
    results,
    rebuild,
    before: {
      coverage52: beforeReport.coverage52,
      metrics: beforeReport.metrics,
      bottleneck56: beforeReport.bottleneck56,
    },
    after: {
      coverage52: afterReport.coverage52,
      metrics: afterReport.metrics,
      bottleneck56: afterReport.bottleneck56,
      verdict: afterReport.verdict,
      safety56: afterReport.safety56,
    },
    productionWritesExecuted: [
      "Forced acquireOne ×5 (licence-blocked recovery)",
      leaksAfterAcquire === 0 ? "HSC rebuildIntelligence" : "rebuild skipped",
    ],
    productionWritesNotExecuted: [
      "Batch 2 / remaining never-attempted",
      "Legacy retry",
      "Unlimited acquisition",
    ],
  };

  writeFileSync(OUT, JSON.stringify(payload, null, 2));
  console.log(`\nWrote ${OUT}`);
  console.log(
    JSON.stringify(
      {
        eligibility: eligibility.state,
        processed: results.length,
        okCount: results.filter((r) => r.ok).length,
        states: results.map((r) => ({
          propertyId: r.propertyId,
          state: r.state,
          message: r.message,
          outcome: r.outcome,
          salePrice: r.salePrice,
        })),
        neverAttemptedAfter: afterReport.coverage52?.neverAttempted,
        snapshotsAfter: afterReport.coverage52?.snapshots,
        verifiedSoldAfter: afterReport.coverage52?.verifiedSold,
        catalogueLeaks: afterReport.safety56?.catalogueLeaks,
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
