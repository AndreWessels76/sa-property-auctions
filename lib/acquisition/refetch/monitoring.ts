import type { RefetchStatus, SourceHealthState } from "./types";

/**
 * Derive source health — never fabricate beyond observed status.
 */
export function healthFromRefetchStatus(
  status: RefetchStatus | string,
): SourceHealthState {
  switch (status) {
    case "completed":
    case "no_change":
      return "HEALTHY";
    case "SKIPPED_LICENSE":
      return "LICENSE_EXPIRED";
    case "SKIPPED_ROBOTS":
      return "ROBOTS_BLOCKED";
    case "source_unavailable":
      return "SOURCE_UNAVAILABLE";
    case "failed":
      return "ERROR";
    case "SKIPPED_RATE":
    case "SKIPPED_INTERVAL":
    case "SKIPPED_LOCK":
      return "DEGRADED";
    case "SKIPPED_NO_URL":
    case "SKIPPED_CONNECTOR":
      return "BLOCKED";
    default:
      return "UNKNOWN";
  }
}

export type RefetchAlert = {
  type:
    | "repeated_failure"
    | "license_block"
    | "robots_block"
    | "many_changes"
    | "auction_date_change"
    | "document_change"
    | "verified_conflict"
    | "source_disappearance";
  severity: "info" | "warning" | "critical";
  title: string;
  detail: string;
};

/**
 * Build admin alerts from recent run summaries — deterministic thresholds only.
 */
export function buildRefetchAlerts(
  runs: Array<{
    status: string;
    changed?: boolean;
    conflicts?: number;
    change_classes?: string[];
    property_id?: string | null;
    error?: string | null;
  }>,
): RefetchAlert[] {
  const alerts: RefetchAlert[] = [];
  const failures = runs.filter((r) => r.status === "failed");
  const unavailable = runs.filter((r) => r.status === "source_unavailable");
  const license = runs.filter((r) => r.status === "SKIPPED_LICENSE");
  const robots = runs.filter((r) => r.status === "SKIPPED_ROBOTS");
  const changed = runs.filter((r) => r.changed);
  const conflicts = runs.filter((r) => (r.conflicts ?? 0) > 0);
  const dateChanges = runs.filter((r) =>
    (r.change_classes ?? []).includes("AUCTION_DATE_CHANGED"),
  );
  const docChanges = runs.filter((r) =>
    (r.change_classes ?? []).some((c) => String(c).includes("DOCUMENT")),
  );

  if (failures.length >= 3) {
    alerts.push({
      type: "repeated_failure",
      severity: "critical",
      title: "Repeated source fetch failures",
      detail: `${failures.length} failed runs in recent window`,
    });
  }
  if (license.length >= 1) {
    alerts.push({
      type: "license_block",
      severity: "warning",
      title: "License blocked fetch",
      detail: `${license.length} SKIPPED_LICENSE run(s)`,
    });
  }
  if (robots.length >= 1) {
    alerts.push({
      type: "robots_block",
      severity: "warning",
      title: "Robots restriction",
      detail: `${robots.length} SKIPPED_ROBOTS run(s)`,
    });
  }
  if (changed.length >= 10) {
    alerts.push({
      type: "many_changes",
      severity: "info",
      title: "Large number of changed listings",
      detail: `${changed.length} changed sources detected`,
    });
  }
  if (dateChanges.length >= 1) {
    alerts.push({
      type: "auction_date_change",
      severity: "warning",
      title: "Auction date changes detected",
      detail: `${dateChanges.length} AUCTION_DATE_CHANGED`,
    });
  }
  if (docChanges.length >= 1) {
    alerts.push({
      type: "document_change",
      severity: "info",
      title: "Document changes detected",
      detail: `${docChanges.length} document change event(s)`,
    });
  }
  if (conflicts.length >= 1) {
    alerts.push({
      type: "verified_conflict",
      severity: "critical",
      title: "Conflicting verified values",
      detail: `${conflicts.length} run(s) with verified conflicts — admin review required`,
    });
  }
  if (unavailable.length >= 1) {
    alerts.push({
      type: "source_disappearance",
      severity: "warning",
      title: "Unexpected source disappearance",
      detail: `${unavailable.length} SOURCE_UNAVAILABLE (properties retained)`,
    });
  }
  return alerts;
}

export function summarizeRefetchMetrics(
  runs: Array<{
    status: string;
    changed?: boolean;
    conflicts?: number;
    http_status?: number | null;
    fields_changed?: number;
  }>,
) {
  const total = runs.length;
  const success = runs.filter(
    (r) => r.status === "completed" || r.status === "no_change",
  ).length;
  const failed = runs.filter((r) => r.status === "failed").length;
  return {
    total,
    fetchSuccessRate: total === 0 ? null : Math.round((success / total) * 100),
    fetchFailureRate: total === 0 ? null : Math.round((failed / total) * 100),
    robotsBlocks: runs.filter((r) => r.status === "SKIPPED_ROBOTS").length,
    licenseSkips: runs.filter((r) => r.status === "SKIPPED_LICENSE").length,
    http403: runs.filter((r) => r.http_status === 403).length,
    http404: runs.filter((r) => r.http_status === 404).length,
    http429: runs.filter((r) => r.http_status === 429).length,
    serverErrors: runs.filter(
      (r) => r.http_status != null && r.http_status >= 500,
    ).length,
    changedSources: runs.filter((r) => r.changed).length,
    noChangeSources: runs.filter((r) => r.status === "no_change").length,
    conflicts: runs.reduce((s, r) => s + (r.conflicts ?? 0), 0),
    fieldsUpdated: runs.reduce((s, r) => s + (r.fields_changed ?? 0), 0),
  };
}
