import { IMPORT_PIPELINE_STAGES, type ImportPipelineStage } from "@/lib/data/verificationStates";
import { ImportPipelineAudit } from "@/lib/imports/ImportPipelineAudit";
import type { ConnectorListingEnvelope } from "@/lib/connectors/sourceRegistry";
import { getConnector } from "@/lib/connectors/sourceRegistry";

export type PipelineRunResult = {
  jobId: string;
  connectorId: string;
  stagesCompleted: ImportPipelineStage[];
  success: boolean;
  message: string;
  envelope?: ConnectorListingEnvelope;
};

/**
 * Professional import workflow runner.
 * Stages are audited; concrete download/normalize hooks remain connector-specific.
 * Does not scrape — expects licensed/manual envelopes.
 */
export class ImportPipeline {
  static stages(): ImportPipelineStage[] {
    return [...IMPORT_PIPELINE_STAGES];
  }

  static async runFramework(
    connectorId: string,
    options?: {
      jobId?: string;
      envelope?: ConnectorListingEnvelope;
      skipStages?: ImportPipelineStage[];
    },
  ): Promise<PipelineRunResult> {
    const connector = getConnector(connectorId);
    const jobId =
      options?.jobId ??
      `job_${connectorId}_${Date.now().toString(36)}`;

    if (!connector) {
      await ImportPipelineAudit.record({
        jobId,
        connectorId,
        stage: "discover",
        status: "failed",
        message: `Unknown connector: ${connectorId}`,
      });
      return {
        jobId,
        connectorId,
        stagesCompleted: [],
        success: false,
        message: `Unknown connector: ${connectorId}`,
      };
    }

    const skip = new Set(options?.skipStages ?? []);
    const completed: ImportPipelineStage[] = [];

    for (const stage of IMPORT_PIPELINE_STAGES) {
      if (skip.has(stage)) {
        await ImportPipelineAudit.record({
          jobId,
          connectorId,
          stage,
          status: "skipped",
          message: `Skipped ${stage}`,
        });
        continue;
      }

      await ImportPipelineAudit.record({
        jobId,
        connectorId,
        stage,
        status: "started",
        message: `Starting ${stage}`,
        meta: {
          connectorVersion: connector.connectorVersion,
          importMethod: options?.envelope?.importMethod ?? null,
        },
      });

      // Framework: download/normalize require a licensed envelope or existing importer.
      if (
        (stage === "download" || stage === "normalize") &&
        !options?.envelope
      ) {
        await ImportPipelineAudit.record({
          jobId,
          connectorId,
          stage,
          status: "skipped",
          message:
            "No licensed payload provided — connector framework only (no scraping).",
        });
        completed.push(stage);
        continue;
      }

      await ImportPipelineAudit.record({
        jobId,
        connectorId,
        stage,
        status: "success",
        message: `Completed ${stage} (framework)`,
      });
      completed.push(stage);
    }

    return {
      jobId,
      connectorId,
      stagesCompleted: completed,
      success: true,
      message: `Pipeline framework run for ${connector.name}`,
      envelope: options?.envelope,
    };
  }
}
