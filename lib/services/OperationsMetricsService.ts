import "server-only";

import {
  calculateImportQueueMetrics,
  formatTodayDelta,
  type ImportQueueMetrics,
} from "@/lib/operations/importQueueMetrics";
import { saDayBounds, OPERATIONS_METRICS_TIMEZONE } from "@/lib/operations/saDayBounds";
import { OperationsMetricsRepository } from "@/lib/repositories/OperationsMetricsRepository";
import type { OperationsMetricsSnapshot } from "@/lib/repositories/OperationsMetricsRepository";

export const OPERATIONS_METRICS_VERSION = "operations-metrics-1.0.0";

export type OperationsMetricsResponse = {
  ok: true;
  version: string;
  properties: { total: number; today: number; todayLabel: string };
  images: { total: number; today: number; todayLabel: string };
  mergedRecords: number;
  failedImports: number;
  importQueue: ImportQueueMetrics;
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

    const importQueue = calculateImportQueueMetrics(snapshot.importQueue);

    return {
      ok: true,
      version: OPERATIONS_METRICS_VERSION,
      properties: {
        total: snapshot.propertiesTotal,
        today: snapshot.propertiesToday,
        todayLabel: formatTodayDelta(snapshot.propertiesToday),
      },
      images: {
        total: snapshot.imagesTotal,
        today: snapshot.imagesToday,
        todayLabel: formatTodayDelta(snapshot.imagesToday),
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
