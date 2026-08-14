import "server-only";

import {
  calculateImportQueueMetrics,
  formatTodayDelta,
  type ImportQueueMetrics,
} from "@/lib/operations/importQueueMetrics";
import { saDayBounds, OPERATIONS_METRICS_TIMEZONE } from "@/lib/operations/saDayBounds";
import { OperationsMetricsRepository } from "@/lib/repositories/OperationsMetricsRepository";
import type { OperationsMetricsSnapshot } from "@/lib/repositories/OperationsMetricsRepository";

export const OPERATIONS_METRICS_VERSION = "operations-metrics-1.1.0";

export type OperationsMetricsResponse = {
  ok: true;
  version: string;
  properties: {
    total: number | null;
    today: number | null;
    todayLabel: string;
  };
  images: {
    total: number | null;
    today: number | null;
    todayLabel: string;
  };
  mergedRecords: number | null;
  failedImports: number | null;
  importQueue: ImportQueueMetrics | null;
  generatedAt: string;
  timezone: string;
  saDate: string;
  sources: OperationsMetricsSnapshot["sources"];
  unavailable: string[];
};

export class OperationsMetricsService {
  static async getMetrics(): Promise<OperationsMetricsResponse> {
    const bounds = saDayBounds();
    const snapshot = await OperationsMetricsRepository.loadSnapshot(
      bounds.startIso,
      bounds.endIso,
    );

    const importQueue =
      snapshot.importQueue === null
        ? null
        : calculateImportQueueMetrics(snapshot.importQueue);

    return {
      ok: true,
      version: OPERATIONS_METRICS_VERSION,
      properties: {
        total: snapshot.propertiesTotal,
        today: snapshot.propertiesToday,
        todayLabel:
          snapshot.propertiesToday === null
            ? "DATA UNAVAILABLE"
            : formatTodayDelta(snapshot.propertiesToday),
      },
      images: {
        total: snapshot.imagesTotal,
        today: snapshot.imagesToday,
        todayLabel:
          snapshot.imagesToday === null
            ? "DATA UNAVAILABLE"
            : formatTodayDelta(snapshot.imagesToday),
      },
      mergedRecords: snapshot.mergedRecords,
      failedImports: snapshot.failedImports,
      importQueue,
      generatedAt: new Date().toISOString(),
      timezone: OPERATIONS_METRICS_TIMEZONE,
      saDate: bounds.dateLabel,
      sources: snapshot.sources,
      unavailable: snapshot.unavailable,
    };
  }
}
