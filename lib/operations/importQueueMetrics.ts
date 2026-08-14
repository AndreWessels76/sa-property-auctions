/**
 * Deterministic import queue progress — no fabricated percentages.
 */

export type ImportQueueCounts = {
  total: number;
  completed: number;
  failed: number;
  waiting: number;
  running: number;
};

export type ImportQueueMetrics = ImportQueueCounts & {
  percentage: number;
  label: string;
};

export function calculateImportQueueMetrics(counts: ImportQueueCounts): ImportQueueMetrics {
  const { total, completed, failed, waiting, running } = counts;

  if (total === 0) {
    return {
      total: 0,
      completed: 0,
      failed: 0,
      waiting: 0,
      running: 0,
      percentage: 0,
      label: "No active queue items",
    };
  }

  const percentage = Math.round((completed / total) * 100);

  if (failed === total) {
    return {
      total,
      completed,
      failed,
      waiting,
      running,
      percentage,
      label: `${percentage}% complete (${failed} failed)`,
    };
  }

  if (completed === total) {
    return {
      total,
      completed,
      failed,
      waiting,
      running,
      percentage: 100,
      label: "100% complete",
    };
  }

  if (running > 0) {
    return {
      total,
      completed,
      failed,
      waiting,
      running,
      percentage,
      label: `${percentage}% complete (${running} running)`,
    };
  }

  return {
    total,
    completed,
    failed,
    waiting,
    running,
    percentage,
    label: `${percentage}% complete`,
  };
}

export function formatTodayDelta(count: number): string {
  if (count <= 0) return "0 today";
  return `+${count.toLocaleString("en-ZA")} today`;
}
