import "server-only";

import { randomUUID } from "node:crypto";
import { SessionService } from "@/lib/auth/SessionService";
import { listVerifiedConnectors } from "@/lib/connectors/framework/registry";
import { LoggerService } from "@/lib/logger";
import { PartnershipPlatformService } from "@/lib/services/PartnershipPlatformService";
import { refreshPropertyCache } from "@/lib/services/actions";

export type QuickActionConnectorRow = {
  id: string;
  name: string;
  status: "attempted" | "skipped" | "success" | "failed";
  reason?: string;
  imported?: number;
  updated?: number;
  rejected?: number;
  duplicates?: number;
  errors?: string[];
};

export type RunAllImportsResult = {
  ok: boolean;
  runId: string;
  message: string;
  durationMs: number;
  connectorsTotal: number;
  attempted: number;
  skipped: number;
  successful: number;
  failed: number;
  imported: number;
  updated: number;
  pendingVerification: number;
  duplicates: number;
  rejected: number;
  errors: number;
  connectors: QuickActionConnectorRow[];
  operator: string | null;
};

export type SheriffImportResult = {
  ok: boolean;
  configured: boolean;
  runId: string | null;
  message: string;
  imported?: number;
  updated?: number;
  pendingVerification?: number;
  duplicates?: number;
  rejected?: number;
  errors?: string[];
};

function publicFetchAllowed(): boolean {
  return process.env.BIDDERS_CHOICE_ALLOW_PUBLIC_FETCH === "true";
}

/**
 * Operations Centre Quick Actions — orchestration over existing importers.
 * Never auto-verifies or auto-publishes. Never fabricates connector results.
 */
export class OperationsQuickActionsService {
  /**
   * Run all eligible verified connectors.
   * Awaiting-license / unhealthy connectors are skipped with reasons.
   */
  static async runAllImports(operatorEmail?: string | null): Promise<RunAllImportsResult> {
    const started = Date.now();
    const runId = `qa_all_${randomUUID().slice(0, 8)}`;
    const connectors = listVerifiedConnectors();
    const rows: QuickActionConnectorRow[] = [];

    let imported = 0;
    let updated = 0;
    let rejected = 0;
    let duplicates = 0;
    let errorCount = 0;
    let attempted = 0;
    let skipped = 0;
    let successful = 0;
    let failed = 0;

    // Ensure partnership registry is synced (soft-fail inside service)
    try {
      await PartnershipPlatformService.syncRegistryFromPlugins();
    } catch {
      /* registry sync optional if migration missing */
    }

    for (const connector of connectors) {
      const def = connector.definition;
      const health = await connector.healthCheck();

      if (!def.enabled) {
        skipped += 1;
        rows.push({
          id: def.id,
          name: def.name,
          status: "skipped",
          reason: "Disabled",
        });
        continue;
      }

      if (health.status === "awaiting_license") {
        skipped += 1;
        rows.push({
          id: def.id,
          name: def.name,
          status: "skipped",
          reason: "Skipped — awaiting license",
        });
        continue;
      }

      if (health.status !== "healthy" && health.status !== "degraded") {
        skipped += 1;
        rows.push({
          id: def.id,
          name: def.name,
          status: "skipped",
          reason: `Skipped — connector health: ${health.status}`,
        });
        continue;
      }

      // Only Bidders Choice has a production acquisition path today
      if (def.id !== "bidders_choice") {
        skipped += 1;
        rows.push({
          id: def.id,
          name: def.name,
          status: "skipped",
          reason: "Skipped — no live import runner wired (licensed feed required)",
        });
        continue;
      }

      if (!publicFetchAllowed()) {
        skipped += 1;
        rows.push({
          id: def.id,
          name: def.name,
          status: "skipped",
          reason:
            "Skipped — BIDDERS_CHOICE_ALLOW_PUBLIC_FETCH is not enabled (licensed feed / CSV required)",
        });
        continue;
      }

      attempted += 1;
      let importShellId: string | null = null;
      let run: Awaited<
        ReturnType<typeof PartnershipPlatformService.beginImport>
      >["run"] | null = null;
      try {
        const started = await PartnershipPlatformService.beginImport({
          connectorId: def.id,
          importMethod: "scheduled",
        });
        importShellId = started.id;
        run = started.run;
      } catch {
        run = null;
      }

      try {
        const { PropertyAcquisitionEngine } = await import(
          "@/lib/acquisition/PropertyAcquisitionEngine"
        );
        const maxListings = Number(
          process.env.BIDDERS_CHOICE_MAX_LISTINGS ?? "25",
        );
        const result = await new PropertyAcquisitionEngine().run({
          allowPublicFetch: true,
          maxListings: Number.isFinite(maxListings) ? maxListings : 25,
          jobId: `${runId}_${def.id}`,
        });

        imported += result.imported ?? 0;
        updated += result.updated ?? 0;
        rejected += result.rejected ?? 0;
        duplicates += result.duplicates ?? 0;
        const errs = result.errors ?? [];
        errorCount += errs.length;

        if (run) {
          try {
            await PartnershipPlatformService.finishImport(run, {
              status:
                errs.length > 0 &&
                (result.imported ?? 0) === 0 &&
                (result.updated ?? 0) === 0
                  ? "failed"
                  : "completed",
              rowsReceived:
                (result.imported ?? 0) +
                (result.updated ?? 0) +
                (result.rejected ?? 0) +
                (result.duplicates ?? 0),
              rowsAccepted: (result.imported ?? 0) + (result.updated ?? 0),
              rowsRejected: result.rejected ?? 0,
              duplicates: result.duplicates ?? 0,
              newProperties: result.imported ?? 0,
              updatedProperties: result.updated ?? 0,
              errors: errs,
              warnings: [
                `ops_quick_action_run:${runId}`,
                `shell:${importShellId ?? "n/a"}`,
              ],
            });
          } catch {
            /* audit table optional */
          }
        }

        if (
          errs.length > 0 &&
          (result.imported ?? 0) === 0 &&
          (result.updated ?? 0) === 0
        ) {
          failed += 1;
          rows.push({
            id: def.id,
            name: def.name,
            status: "failed",
            reason: errs[0] ?? "Import failed",
            imported: result.imported,
            updated: result.updated,
            rejected: result.rejected,
            duplicates: result.duplicates,
            errors: errs,
          });
        } else {
          successful += 1;
          rows.push({
            id: def.id,
            name: def.name,
            status: "success",
            imported: result.imported,
            updated: result.updated,
            rejected: result.rejected,
            duplicates: result.duplicates,
            errors: errs,
          });
        }
      } catch (error) {
        failed += 1;
        errorCount += 1;
        const message =
          error instanceof Error ? error.message : "Import failed";
        if (run) {
          try {
            await PartnershipPlatformService.finishImport(run, {
              status: "failed",
              errors: [message],
              warnings: [`ops_quick_action_run:${runId}`],
            });
          } catch {
            /* audit table optional */
          }
        }
        rows.push({
          id: def.id,
          name: def.name,
          status: "failed",
          reason: message,
          errors: [message],
        });
      }
    }

    if (attempted > 0) {
      try {
        await refreshPropertyCache();
      } catch {
        /* cache refresh best-effort */
      }
    }

    const durationMs = Date.now() - started;
    const pendingVerification = imported; // new rows enter pending verification by pipeline design

    let message: string;
    if (connectors.length === 0) {
      message = "No connectors registered.";
    } else if (attempted === 0) {
      message = "No eligible connectors are currently available.";
    } else if (failed > 0 && successful === 0) {
      message = "Import failed. Please check the import logs.";
    } else {
      message = "Imports completed successfully.";
    }

    const operator =
      operatorEmail ??
      (await SessionService.currentUser())?.email ??
      null;

    LoggerService.audit("ops.quick_actions.run_all_imports", {
      runId,
      operator,
      attempted,
      skipped,
      successful,
      failed,
      imported,
      updated,
      rejected,
      durationMs,
    });

    return {
      ok: failed === 0 || successful > 0,
      runId,
      message,
      durationMs,
      connectorsTotal: connectors.length,
      attempted,
      skipped,
      successful,
      failed,
      imported,
      updated,
      pendingVerification,
      duplicates,
      rejected,
      errors: errorCount,
      connectors: rows,
      operator,
    };
  }

  /**
   * Sheriff importer exists as a stub with temporary test data.
   * Do not execute fake imports — report not configured.
   */
  static async runSheriffImport(): Promise<SheriffImportResult> {
    const runId = `qa_sheriff_${randomUUID().slice(0, 8)}`;

    // SheriffConnector.fetch() returns hardcoded Unsplash sample rows ("Tydelik toetsdata").
    // Running it would fabricate listings — prohibited.
    const configured = false;

    LoggerService.audit("ops.quick_actions.run_sheriff_import", {
      runId,
      configured,
      result: "not_configured",
    });

    return {
      ok: true,
      configured,
      runId,
      message: "Sheriff import is not configured yet.",
    };
  }
}
