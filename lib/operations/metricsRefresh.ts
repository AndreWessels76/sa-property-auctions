export const OPERATIONS_METRICS_REFRESH_EVENT = "operations-metrics-refresh";

export function requestOperationsMetricsRefresh(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(OPERATIONS_METRICS_REFRESH_EVENT));
}
