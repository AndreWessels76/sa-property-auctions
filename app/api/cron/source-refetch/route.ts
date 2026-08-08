import { NextResponse } from "next/server";
import { jsonError, jsonOk } from "@/lib/api/http";
import { LoggerService } from "@/lib/logger";
import { SourceRefetchService } from "@/lib/services/SourceRefetchService";

function authorizeCron(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return process.env.NODE_ENV !== "production";
  }
  const header = request.headers.get("authorization");
  return header === `Bearer ${secret}`;
}

/**
 * Scheduled live source re-fetch for upcoming/live licensed sources.
 * Requires CRON_SECRET Bearer in production.
 * Query: ?limit=25&force=0
 */
export async function GET(request: Request) {
  try {
    if (!authorizeCron(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(request.url);
    const limit = Number(url.searchParams.get("limit") ?? "15");
    const force = url.searchParams.get("force") === "1";

    const result = await SourceRefetchService.refreshBatch({
      scope: "upcoming",
      limit: Number.isFinite(limit) ? limit : 15,
      force,
      operator: "cron",
    });

    LoggerService.audit("cron.source_refetch", {
      runId: result.runId,
      processed: result.processed,
      changed: result.changed,
      conflicts: result.conflicts,
      skippedLicense: result.skippedLicense,
      skippedRobots: result.skippedRobots,
    });

    return jsonOk({
      ok: result.ok,
      runId: result.runId,
      message: result.message,
      processed: result.processed,
      changed: result.changed,
      noChange: result.noChange,
      conflicts: result.conflicts,
      skippedLicense: result.skippedLicense,
      skippedRobots: result.skippedRobots,
      unavailable: result.unavailable,
      failed: result.failed,
      durationMs: result.durationMs,
      // Do not leak raw source text / private snapshots in cron response
      results: result.results.map((r) => ({
        propertyId: r.propertyId,
        status: r.status,
        changed: r.changed,
        conflicts: r.conflicts,
        health: r.health,
        httpStatus: r.httpStatus,
        changeClasses: r.changeClasses,
        message: r.message,
      })),
    });
  } catch (error) {
    return jsonError(error, "Source refetch cron failed.");
  }
}
