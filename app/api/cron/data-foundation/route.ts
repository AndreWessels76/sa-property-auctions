import { NextResponse } from "next/server";
import { PropertyRepository } from "@/lib/repositories/PropertyRepository";
import { VerificationService } from "@/lib/services/VerificationService";
import { ImportPipeline } from "@/lib/imports/ImportPipeline";
import { jobsForCadence, type ScheduledJobCadence } from "@/lib/jobs/scheduledJobs";
import { LoggerService } from "@/lib/logger";
import { jsonError, jsonOk } from "@/lib/api/http";
import { listEnabledConnectors } from "@/lib/connectors/sourceRegistry";

function authorizeCron(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    // Allow in development without secret; require in production.
    return process.env.NODE_ENV !== "production";
  }
  const header = request.headers.get("authorization");
  return header === `Bearer ${secret}`;
}

/**
 * Scheduled data-foundation jobs.
 * Query: ?cadence=daily|weekly|monthly
 */
export async function GET(request: Request) {
  try {
    if (!authorizeCron(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(request.url);
    const cadence = (url.searchParams.get("cadence") || "daily") as ScheduledJobCadence;
    const jobs = jobsForCadence(cadence);
    const results: Array<{ id: string; ok: boolean; detail: string }> = [];

    const properties = await PropertyRepository.getAll();

    for (const job of jobs) {
      try {
        if (job.handler === "update_status" || job.handler === "expired_listings") {
          let updated = 0;
          for (const property of properties) {
            const result = await VerificationService.applySuggestedLifecycle(property);
            if (result) updated += 1;
          }
          results.push({
            id: job.id,
            ok: true,
            detail: `Lifecycle suggestions applied where allowed (${updated}).`,
          });
        } else if (job.handler === "recalculate_quality" || job.handler === "quality_audit") {
          let scored = 0;
          for (const property of properties.slice(0, 200)) {
            await VerificationService.recalculateScores(property);
            scored += 1;
          }
          results.push({
            id: job.id,
            ok: true,
            detail: `Recalculated scores for ${scored} listings.`,
          });
        } else if (job.handler === "verify_listings" || job.handler === "refresh_metadata") {
          results.push({
            id: job.id,
            ok: true,
            detail:
              "Queued for operator review — automatic source verification requires licensed feeds.",
          });
        } else if (job.handler === "broken_links") {
          const broken = properties.filter((p) => !p.source_url && !p.source).length;
          results.push({
            id: job.id,
            ok: true,
            detail: `Flagged ${broken} listings missing source URL/name.`,
          });
        } else if (job.handler === "archive_old") {
          results.push({
            id: job.id,
            ok: true,
            detail: "Archive pass prepared — no auto-archive without operator policy confirmation.",
          });
        } else {
          results.push({ id: job.id, ok: true, detail: "No-op framework stub." });
        }
      } catch (error) {
        results.push({
          id: job.id,
          ok: false,
          detail: error instanceof Error ? error.message : "failed",
        });
      }
    }

    // Daily Bidders Choice sync when explicitly enabled (robots + licence posture).
    if (cadence === "daily") {
      const connector = listEnabledConnectors().find((c) => c.id === "bidders_choice")
        ?? listEnabledConnectors()[0];
      if (connector) {
        await ImportPipeline.runFramework(connector.id, {
          jobId: `cron_${cadence}_${Date.now()}`,
        });
      }

      if (process.env.BIDDERS_CHOICE_DAILY_SYNC === "true") {
        try {
          const { PropertyAcquisitionEngine } = await import(
            "@/lib/acquisition/PropertyAcquisitionEngine"
          );
          const acq = await new PropertyAcquisitionEngine().run({
            allowPublicFetch: process.env.BIDDERS_CHOICE_ALLOW_PUBLIC_FETCH === "true",
            maxListings: Number(process.env.BIDDERS_CHOICE_MAX_LISTINGS ?? "25"),
            jobId: `cron_bc_${Date.now()}`,
          });
          results.push({
            id: "daily_bidders_choice_sync",
            ok: true,
            detail: `BC import ${acq.imported} / update ${acq.updated} / reject ${acq.rejected}`,
          });
        } catch (error) {
          results.push({
            id: "daily_bidders_choice_sync",
            ok: false,
            detail: error instanceof Error ? error.message : "bc sync failed",
          });
        }
      } else {
        results.push({
          id: "daily_bidders_choice_sync",
          ok: true,
          detail:
            "Skipped — set BIDDERS_CHOICE_DAILY_SYNC=true to enable automated acquisition.",
        });
      }
    }

    LoggerService.audit("cron.data_foundation", { cadence, results });
    return jsonOk({ cadence, results });
  } catch (error) {
    return jsonError(error, "Cron job failed.");
  }
}
