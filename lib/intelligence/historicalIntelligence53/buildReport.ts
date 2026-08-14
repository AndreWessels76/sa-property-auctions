import type { Hi52IntelligenceReport } from "@/lib/intelligence/historicalIntelligence52";
import { HISTORICAL_INTELLIGENCE53_VERSION, HI53_DEFAULT_BATCH_LIMIT } from "./config";
import {
  buildBatchPlan,
  buildCampaignProgress,
  buildP1CampaignStats,
} from "./campaign";
import { buildEvidenceFunnel } from "./funnel";
import { primaryBottleneck53, rankBottlenecks53 } from "./bottleneck";
import { buildReviewQueue } from "./reviewQueue";
import type { Hi53IntelligenceReport, Hi53ReportLabels } from "./types";

function parseLicensedCount(licensedSources: string | number): number {
  if (typeof licensedSources === "number") return licensedSources;
  const m = String(licensedSources).match(/^(\d+)/);
  return m ? Number(m[1]) : 0;
}

function parseSlashNum(value: string | number, fallback = 0): number {
  if (typeof value === "number") return value;
  const m = String(value).match(/^(\d+)/);
  return m ? Number(m[1]) : fallback;
}

export function buildReportLabels(input: {
  hi52: Hi52IntelligenceReport;
  catalogueSafe: boolean;
  reviewCount: number;
}): Hi53ReportLabels {
  const cov = input.hi52.coverage52;
  const provenInProduction: string[] = [];
  const tested: string[] = [
    "HI 5.3 campaign controller (batch limit 5)",
    "Explicit before/after deltas (zeros visible)",
    "Ranked bottleneck + review queue",
  ];
  const recovered: string[] = [];
  const stillMissing: string[] = [];
  const reviewRequired: string[] = [];
  const insufficientData: string[] = [];

  if (input.catalogueSafe) {
    provenInProduction.push("Public catalogue safety — 0 leaks");
  }
  provenInProduction.push(`Historical events: ${cov.historicalEvents}`);
  provenInProduction.push(`Licensed sources: ${cov.licensedSources}`);
  provenInProduction.push(`Fetch attempted: ${cov.fetchAttempted}`);
  provenInProduction.push(`Fetch successful: ${cov.fetchSuccessful}`);

  if (cov.fetchSuccessful > 0) {
    recovered.push(`${cov.fetchSuccessful} successful fetches in production`);
  }
  if (parseSlashNum(cov.snapshots) > 0) {
    recovered.push(`${cov.snapshots} snapshots available`);
  }
  if (parseSlashNum(cov.extractions) > 0) {
    recovered.push(`${cov.extractions} extractions available`);
  }
  if (parseSlashNum(cov.outcomeEvidence) > 0) {
    recovered.push(`${cov.outcomeEvidence} outcome observations`);
  }

  if (cov.neverAttempted > 0) {
    stillMissing.push(`${cov.neverAttempted} events never fetch-attempted`);
  }
  if (cov.legacyFailures > 0) {
    stillMissing.push(`${cov.legacyFailures} legacy failures awaiting modern metadata retry`);
  }
  if (cov.verifiedSold === 0) stillMissing.push("No verified SOLD outcomes");
  if (cov.verifiedSalePrices === 0) stillMissing.push("No verified sale prices");

  if (input.reviewCount > 0) {
    reviewRequired.push(`${input.reviewCount} review queue items`);
  }

  if (cov.verifiedSalePrices === 0) {
    insufficientData.push("Sale statistics — INSUFFICIENT_DATA (no verified sale prices)");
  }
  if (cov.comparableReady === 0) {
    insufficientData.push("Comparables — INSUFFICIENT_DATA (min 3)");
  }
  if (cov.marketReadyTowns === 0) {
    insufficientData.push("Market towns — INSUFFICIENT_DATA (min 5 sales)");
  }

  return {
    provenInProduction,
    tested,
    recovered,
    stillMissing,
    reviewRequired,
    insufficientData,
  };
}

export function buildHi53Report(hi52: Hi52IntelligenceReport): Hi53IntelligenceReport {
  const cov = hi52.coverage52;
  const catalogueSafe = cov.catalogueLeaks === 0;
  const campaign = buildCampaignProgress({
    historicalEvents: cov.historicalEvents,
    neverAttempted: cov.neverAttempted,
    fetchAttempted: hi52.metrics.fetchAttempted,
    fetchSuccessful: cov.fetchSuccessful,
    fetchFailed: cov.fetchFailed,
    catalogueLeaks: cov.catalogueLeaks,
    verifiedSalePrices: cov.verifiedSalePrices,
    verifiedSold: cov.verifiedSold,
  });

  const p1Campaign = buildP1CampaignStats({
    neverAttempted: cov.neverAttempted,
    fetchSuccessful: cov.fetchSuccessful,
    fetchFailed: cov.fetchFailed,
    retryable: cov.retryable,
    permanent: cov.permanent,
    batchSize: HI53_DEFAULT_BATCH_LIMIT,
  });

  const batchPlan = buildBatchPlan({
    remaining: cov.neverAttempted,
    batchSize: HI53_DEFAULT_BATCH_LIMIT,
  });

  const evidenceFunnel = buildEvidenceFunnel({
    historicalEvents: cov.historicalEvents,
    licensedSources: parseLicensedCount(cov.licensedSources),
    fetchAttempted: hi52.metrics.fetchAttempted,
    fetchSuccessful: cov.fetchSuccessful,
    snapshots: parseSlashNum(cov.snapshots, hi52.metrics.snapshots),
    extractions: parseSlashNum(cov.extractions, hi52.metrics.extractionAttempted),
    outcomeEvidence: parseSlashNum(cov.outcomeEvidence, hi52.coverage.outcomeEvidence),
    verifiedSold: cov.verifiedSold,
    verifiedSalePrices: cov.verifiedSalePrices,
  });

  const bottleneckRanked53 = rankBottlenecks53(hi52.events);
  const bottleneck53 = primaryBottleneck53(hi52.events);
  const reviewQueue = buildReviewQueue(hi52.events);
  const reportLabels = buildReportLabels({
    hi52,
    catalogueSafe,
    reviewCount: reviewQueue.length,
  });

  const nextAdminAction = catalogueSafe
    ? `${bottleneck53.code} (${bottleneck53.count}/${bottleneck53.total}) → ${bottleneck53.recommendedAction}`
    : "PUBLIC SAFETY FAILURE — BLOCK REBUILD";

  return {
    ...hi52,
    version: HISTORICAL_INTELLIGENCE53_VERSION,
    verdict: catalogueSafe
      ? campaign.status === "CAMPAIGN_DATA_COVERED"
        ? "PRODUCTION DATA COVERED"
        : "INSUFFICIENT DATA — ENGINE READY"
      : "PRODUCTION BLOCKED — LIVE DATA UNAVAILABLE",
    reason: catalogueSafe
      ? campaign.summaryLine
      : `Catalogue leaks = ${cov.catalogueLeaks} — PUBLIC SAFETY FAILURE`,
    campaign,
    p1Campaign,
    batchPlan,
    evidenceFunnel,
    bottleneck53,
    bottleneckRanked53,
    reviewQueue,
    catalogueSafe,
    reportLabels,
    nextAdminAction,
  };
}

export function renderHi53GapReportMarkdown(input: {
  generatedAt: string;
  entries: Array<{
    eventId: string | null;
    property: string;
    town: string | null;
    currentState: string;
    nextAction: string;
    group: string;
  }>;
}): string {
  const lines = [
    `# Historical Intelligence 5.3 — Gap Report`,
    ``,
    `Generated: ${input.generatedAt}`,
    ``,
  ];
  const groups = new Map<string, typeof input.entries>();
  for (const e of input.entries) {
    const list = groups.get(e.group) ?? [];
    list.push(e);
    groups.set(e.group, list);
  }
  for (const [group, entries] of groups) {
    lines.push(`## ${group}`, ``);
    for (const e of entries) {
      lines.push(
        `- **${e.property}** (${e.town ?? "—"}) — ${e.currentState} → ${e.nextAction}`,
      );
    }
    lines.push(``);
  }
  return lines.join("\n");
}
