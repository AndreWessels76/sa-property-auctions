import { BaseRepository } from "./BaseRepository";

function isMissingRelation(error: { message?: string; code?: string } | null): boolean {
  if (!error) return false;
  const msg = (error.message ?? "").toLowerCase();
  return (
    error.code === "42P01" ||
    msg.includes("does not exist") ||
    msg.includes("schema cache") ||
    msg.includes("could not find the table")
  );
}

export type OperationsMetricsSnapshot = {
  propertiesTotal: number;
  propertiesToday: number;
  imagesTotal: number;
  imagesToday: number;
  mergedRecords: number;
  failedImports: number;
  importQueue: {
    total: number;
    completed: number;
    failed: number;
    waiting: number;
    running: number;
  };
  sources: {
    properties: string;
    propertiesToday: string;
    images: string;
    imagesToday: string;
    mergedRecords: string;
    failedImports: string;
    importQueue: string;
  };
  unavailable: string[];
};

export class OperationsMetricsRepository extends BaseRepository {
  private static productionPropertyCountQuery() {
    return this.adminDb()
      .from("properties")
      .select("id", { count: "exact", head: true })
      .not("data_classification", "eq", "seed")
      .not("data_classification", "eq", "demo");
  }

  static async countPropertiesTotal(): Promise<number> {
    const { count, error } = await this.productionPropertyCountQuery();

    if (error) {
      if (isMissingRelation(error)) return 0;
      this.handleError("OperationsMetricsRepository.countPropertiesTotal", error);
    }
    return count ?? 0;
  }

  static async countPropertiesToday(startIso: string, endIso: string): Promise<number> {
    const { count: importedCount, error: e1 } = await this.productionPropertyCountQuery()
      .gte("imported_at", startIso)
      .lt("imported_at", endIso);

    if (e1 && !isMissingRelation(e1)) {
      this.handleError("OperationsMetricsRepository.countPropertiesToday.imported", e1);
    }

    const { count: createdCount, error: e2 } = await this.productionPropertyCountQuery()
      .is("imported_at", null)
      .gte("created_at", startIso)
      .lt("created_at", endIso);

    if (e2 && !isMissingRelation(e2)) {
      this.handleError("OperationsMetricsRepository.countPropertiesToday.created", e2);
    }

    return (importedCount ?? 0) + (createdCount ?? 0);
  }

  static async countImagesTotal(): Promise<number> {
    const db = this.adminDb();
    const { count, error } = await db
      .from("property_images")
      .select("id", { count: "exact", head: true });

    if (error) {
      if (isMissingRelation(error)) return 0;
      this.handleError("OperationsMetricsRepository.countImagesTotal", error);
    }
    return count ?? 0;
  }

  static async countImagesToday(startIso: string, endIso: string): Promise<number> {
    const db = this.adminDb();
    const { count, error } = await db
      .from("property_images")
      .select("id", { count: "exact", head: true })
      .gte("created_at", startIso)
      .lt("created_at", endIso);

    if (error) {
      if (isMissingRelation(error)) return 0;
      this.handleError("OperationsMetricsRepository.countImagesToday", error);
    }
    return count ?? 0;
  }

  /**
   * Merged Records = rows in property_merge_history.
   * Each row is a logged merge/deduplication action during import (see logMergeHistory).
   */
  static async countMergedRecords(): Promise<number | null> {
    const db = this.adminDb();
    const { count, error } = await db
      .from("property_merge_history")
      .select("id", { count: "exact", head: true });

    if (error) {
      if (isMissingRelation(error)) return null;
      this.handleError("OperationsMetricsRepository.countMergedRecords", error);
    }
    return count ?? 0;
  }

  static async countFailedImports(): Promise<number | null> {
    const db = this.adminDb();
    const { count, error } = await db
      .from("import_jobs")
      .select("id", { count: "exact", head: true })
      .in("status", ["Failed", "failed", "Error", "error"]);

    if (error) {
      if (isMissingRelation(error)) return null;
      this.handleError("OperationsMetricsRepository.countFailedImports", error);
    }
    return count ?? 0;
  }

  static async importQueueCounts(): Promise<OperationsMetricsSnapshot["importQueue"] | null> {
    const db = this.adminDb();
    const { data, error } = await db.from("import_queue").select("queue_status");

    if (error) {
      if (isMissingRelation(error)) return null;
      this.handleError("OperationsMetricsRepository.importQueueCounts", error);
    }

    const rows = data ?? [];
    return {
      total: rows.length,
      completed: rows.filter((r) => r.queue_status === "Completed").length,
      failed: rows.filter((r) => r.queue_status === "Failed").length,
      waiting: rows.filter((r) => r.queue_status === "Waiting").length,
      running: rows.filter((r) => r.queue_status === "Running").length,
    };
  }

  static async loadSnapshot(dayStart: string, dayEnd: string): Promise<OperationsMetricsSnapshot> {
    const unavailable: string[] = [];

    const [
      propertiesTotal,
      propertiesToday,
      imagesTotal,
      imagesToday,
      mergedRecords,
      failedImports,
      importQueue,
    ] = await Promise.all([
      this.countPropertiesTotal(),
      this.countPropertiesToday(dayStart, dayEnd),
      this.countImagesTotal(),
      this.countImagesToday(dayStart, dayEnd),
      this.countMergedRecords(),
      this.countFailedImports(),
      this.importQueueCounts(),
    ]);

    if (mergedRecords === null) unavailable.push("mergedRecords");
    if (failedImports === null) unavailable.push("failedImports");
    if (importQueue === null) unavailable.push("importQueue");

    return {
      propertiesTotal,
      propertiesToday,
      imagesTotal,
      imagesToday,
      mergedRecords: mergedRecords ?? 0,
      failedImports: failedImports ?? 0,
      importQueue: importQueue ?? {
        total: 0,
        completed: 0,
        failed: 0,
        waiting: 0,
        running: 0,
      },
      sources: {
        properties: "properties (excluding seed/demo data_classification)",
        propertiesToday: "properties.imported_at or created_at when imported_at null (SA day)",
        images: "property_images",
        imagesToday: "property_images.created_at (SA day)",
        mergedRecords: "property_merge_history row count",
        failedImports: "import_jobs where status in Failed/error",
        importQueue: "import_queue queue_status counts",
      },
      unavailable,
    };
  }
}
