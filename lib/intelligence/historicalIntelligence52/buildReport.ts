import type { Hi51IntelligenceReport } from "@/lib/intelligence/historicalIntelligence51";
import { HISTORICAL_INTELLIGENCE52_VERSION } from "./config";
import { countExecutionStates } from "./executionState";
import { buildStageSummaries } from "./stages";
import { rankBottlenecks, primaryBottleneck } from "./bottleneck";
import { buildCoverage52 } from "./candidates";
import { buildEvidenceLabels, deriveHi52Verdict, nextAdminActionFromReport } from "./verdict";
import type { Hi52IntelligenceReport } from "./types";

export function buildHi52Report(hi51: Hi51IntelligenceReport): Hi52IntelligenceReport {
  const stages = buildStageSummaries({
    events: hi51.events,
    p1Processed: hi51.p1Progress.processed,
  });
  const bottleneckRanked = rankBottlenecks(hi51.events);
  const primary = primaryBottleneck(hi51.events);
  const coverage52 = buildCoverage52(hi51);
  const verdictBlock = deriveHi52Verdict({
    liveDataUnavailable: hi51.liveDataUnavailable,
    emptyDatabase: hi51.coverageDashboard.historicalEvents === 0,
    catalogueLeaks: coverage52.catalogueLeaks,
    historicalEvents: coverage52.historicalEvents,
    verifiedSalePrices: coverage52.verifiedSalePrices,
    verifiedSold: coverage52.verifiedSold,
    neverAttempted: coverage52.neverAttempted,
    fetchAttempted: hi51.metrics.fetchAttempted,
  });

  return {
    ...hi51,
    version: HISTORICAL_INTELLIGENCE52_VERSION,
    verdict: verdictBlock.verdict,
    reason: verdictBlock.reason,
    bottleneck: primary,
    coverage52,
    stages,
    bottleneckRanked,
    stateMachineCounts: countExecutionStates(hi51.events),
    evidenceLabels: buildEvidenceLabels(hi51),
    nextAdminAction: nextAdminActionFromReport(hi51),
  };
}

export function renderHi52GapReportMarkdown(input: {
  generatedAt: string;
  entries: Array<{
    eventId: string | null;
    property: string;
    town: string | null;
    source: string | null;
    currentState: string;
    lastAttempt: string | null;
    failure: string | null;
    nextAction: string;
    priority: number;
    group: string;
  }>;
}): string {
  const lines = [
    `# Historical Intelligence 5.2 — Gap Report`,
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
