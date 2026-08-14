import { NextResponse } from "next/server";
import { jsonError, jsonOk } from "@/lib/api/http";
import { LoggerService } from "@/lib/logger";
import { HistoricalEnrichmentService } from "@/lib/services/HistoricalEnrichmentService";

function authorizeCron(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return process.env.NODE_ENV !== "production";
  }
  const header = request.headers.get("authorization");
  return header === `Bearer ${secret}`;
}

/**
 * Scheduled historical outcome & sale price enrichment.
 * Requires CRON_SECRET Bearer in production.
 * Query: ?limit=10&force=0
 */
export async function GET(request: Request) {
  try {
    if (!authorizeCron(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(request.url);
    const limit = Number(url.searchParams.get("limit") ?? "5");
    const force = url.searchParams.get("force") === "1";

    const result = await HistoricalEnrichmentService.enrichBatch({
      scope: "historical",
      limit: Number.isFinite(limit) ? limit : 5,
      force,
      operator: "cron",
    });

    LoggerService.audit("cron.historical_enrichment", {
      runId: result.runId,
      processed: result.processed,
      completed: result.completed,
      noChange: result.noChange,
      conflicts: result.conflicts,
    });

    return jsonOk({
      ok: result.ok,
      runId: result.runId,
      message: result.message,
      processed: result.processed,
      completed: result.completed,
      noChange: result.noChange,
      outcomesExtracted: result.outcomesExtracted,
      salePricesExtracted: result.salePricesExtracted,
      conflicts: result.conflicts,
      reviewRequired: result.reviewRequired,
      results: result.results.map((r) => ({
        propertyId: r.propertyId,
        status: r.status,
        message: r.message,
      })),
    });
  } catch (error) {
    return jsonError(error, "Historical enrichment cron failed.");
  }
}
