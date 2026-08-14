/**
 * Source consistency across snapshots (HEQ 4.4).
 */

import type { OutcomeObservationRow } from "@/lib/repositories/OutcomeIntelligenceRepository";
import type { EnrichmentRunRow } from "@/lib/repositories/HistoricalEnrichmentRepository";
import type { SourceConsistencyState } from "./types";

export function assessSourceConsistency(input: {
  currentHash?: string | null;
  previousHash?: string | null;
  outcomeObs?: OutcomeObservationRow | null;
  previousOutcomeObs?: OutcomeObservationRow | null;
  recentRuns?: EnrichmentRunRow[];
}): SourceConsistencyState {
  const current = input.currentHash ?? input.outcomeObs?.source_snapshot_id ?? null;
  const previous =
    input.previousHash ??
    input.recentRuns?.find((r) => r.source_hash)?.source_hash ??
    input.previousOutcomeObs?.source_snapshot_id ??
    null;

  if (!current && !previous) return "NO_CHANGE";
  if (current && previous && current === previous) return "NO_CHANGE";

  const curOutcome = input.outcomeObs?.outcome ?? null;
  const prevOutcome = input.previousOutcomeObs?.outcome ?? null;
  const curPrice = input.outcomeObs?.sale_price ?? null;
  const prevPrice = input.previousOutcomeObs?.sale_price ?? null;

  if (
    (curOutcome && prevOutcome && curOutcome !== prevOutcome) ||
    (curPrice != null && prevPrice != null && curPrice !== prevPrice)
  ) {
    return "CONFLICT";
  }

  if (current !== previous) return "CONSISTENT_UPDATE";
  return "NO_CHANGE";
}
