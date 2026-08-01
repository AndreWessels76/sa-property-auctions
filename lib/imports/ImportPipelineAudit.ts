import { LoggerService } from "@/lib/logger";
import type { ImportPipelineStage } from "@/lib/data/verificationStates";
import { createServiceClient } from "@/lib/supabase/admin";

export type PipelineEventInput = {
  jobId?: string | null;
  propertyId?: string | null;
  connectorId?: string | null;
  stage: ImportPipelineStage;
  status: "started" | "success" | "skipped" | "failed";
  message?: string;
  meta?: Record<string, unknown>;
};

/**
 * Audit trail for import pipeline stages.
 * Persists when import_pipeline_events exists; always logs structured audit.
 */
export class ImportPipelineAudit {
  static async record(event: PipelineEventInput): Promise<void> {
    LoggerService.audit("import.pipeline", {
      jobId: event.jobId ?? null,
      propertyId: event.propertyId ?? null,
      connectorId: event.connectorId ?? null,
      stage: event.stage,
      status: event.status,
      message: event.message ?? null,
      meta: event.meta ?? null,
    });

    try {
      const db = createServiceClient();
      const { error } = await db.from("import_pipeline_events").insert({
        job_id: event.jobId ?? null,
        property_id: event.propertyId ?? null,
        connector_id: event.connectorId ?? null,
        stage: event.stage,
        status: event.status,
        message: event.message ?? null,
        meta: event.meta ?? null,
      });
      if (error) {
        LoggerService.warn("import.pipeline.persist_failed", {
          error: error.message,
        });
      }
    } catch (error) {
      LoggerService.warn("import.pipeline.persist_unavailable", {
        error: error instanceof Error ? error.message : "unknown",
      });
    }
  }

  static async recordStages(
    jobId: string,
    connectorId: string,
    stages: ImportPipelineStage[],
    outcome: "success" | "failed" = "success",
  ): Promise<void> {
    for (const stage of stages) {
      await this.record({
        jobId,
        connectorId,
        stage,
        status: outcome === "failed" && stage === stages[stages.length - 1]
          ? "failed"
          : "success",
        message: `Stage ${stage} ${outcome}`,
      });
    }
  }
}
