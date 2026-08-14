import { NextRequest, NextResponse } from "next/server";
import { PermissionService } from "@/lib/auth";
import { SessionService } from "@/lib/auth/SessionService";
import { HistoricalEnrichmentRepository } from "@/lib/repositories/HistoricalEnrichmentRepository";
import { HistoricalEnrichmentService } from "@/lib/services/HistoricalEnrichmentService";
import { LoggerService } from "@/lib/logger";
import type { QueuePriority } from "@/lib/acquisition/historical";

function parsePriority(value: string | null): QueuePriority | undefined {
  if (!value) return undefined;
  const n = Number(value);
  if (n === 1 || n === 2 || n === 3 || n === 4) return n;
  return undefined;
}

export async function GET(request: NextRequest) {
  try {
    await PermissionService.requireAdmin();
    const url = new URL(request.url);
    if (url.searchParams.get("view") === "queue") {
      const queue = await HistoricalEnrichmentService.buildQueue({
        connector: url.searchParams.get("connector") ?? undefined,
        agency: url.searchParams.get("agency") ?? undefined,
        outcomeState: url.searchParams.get("outcomeState") ?? undefined,
        priority: parsePriority(url.searchParams.get("priority")),
        retryFailed: url.searchParams.get("retryFailed") === "true",
        propertyMasterId: url.searchParams.get("propertyMasterId") ?? undefined,
        auctionEventId: url.searchParams.get("auctionEventId") ?? undefined,
      });
      return NextResponse.json({ ok: true, ...queue });
    }
    const dashboard = await HistoricalEnrichmentService.hde41Dashboard();
    return NextResponse.json({ ok: true, ...dashboard });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unauthorized" },
      { status: 401 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await PermissionService.requireAdmin();
    const user = await SessionService.currentUser();
    const operator = user?.email ?? user?.id ?? "admin";
    const body = (await request.json()) as {
      action?:
        | "refresh"
        | "extract_snapshot"
        | "extract_prices"
        | "batch"
        | "dry_run"
        | "enrich_p1"
        | "enrich_p2"
        | "retry_failed"
        | "rebuild_intelligence"
        | "resolve_review";
      propertyId?: string;
      propertyMasterId?: string;
      auctionEventId?: string;
      scope?: "single" | "batch" | "historical";
      limit?: number;
      force?: boolean;
      dryRun?: boolean;
      rebuild?: boolean;
      connector?: string;
      agency?: string;
      outcomeState?: string;
      priority?: number;
      retryFailed?: boolean;
      reviewId?: string;
      reviewStatus?: string;
      resolutionNote?: string;
    };

    if (body.action === "resolve_review") {
      if (!body.reviewId || !body.reviewStatus) {
        return NextResponse.json(
          { ok: false, error: "reviewId and reviewStatus required" },
          { status: 400 },
        );
      }
      const row = await HistoricalEnrichmentRepository.resolveReview(body.reviewId, {
        status: body.reviewStatus,
        reviewedBy: operator,
        resolutionNote: body.resolutionNote,
      });
      LoggerService.audit("historical.enrichment.review", {
        reviewId: body.reviewId,
        status: body.reviewStatus,
        operator,
      });
      return NextResponse.json({ ok: Boolean(row), review: row });
    }

    if (body.action === "rebuild_intelligence") {
      const result = await HistoricalEnrichmentService.rebuildIntelligenceFull(operator);
      LoggerService.audit("historical.enrichment.rebuild", { operator, ...result });
      return NextResponse.json({ ok: result.ok, result });
    }

    const batchFilters = {
      connector: body.connector,
      agency: body.agency,
      outcomeState: body.outcomeState,
      propertyMasterId: body.propertyMasterId,
      auctionEventId: body.auctionEventId,
      limit: body.limit,
      force: body.force,
      operator,
      rebuild: body.rebuild,
    };

    if (body.action === "dry_run" || body.dryRun) {
      const result = await HistoricalEnrichmentService.enrichBatch({
        scope: body.scope ?? "historical",
        ...batchFilters,
        dryRun: true,
      });
      return NextResponse.json({ ok: result.ok, result });
    }

    if (body.action === "enrich_p1") {
      const result = await HistoricalEnrichmentService.enrichBatch({
        scope: "historical",
        ...batchFilters,
        priority: 1,
      });
      LoggerService.audit("historical.enrichment.batch", {
        operator,
        action: "enrich_p1",
        runId: result.runId,
        processed: result.processed,
      });
      return NextResponse.json({ ok: result.ok, result });
    }

    if (body.action === "enrich_p2") {
      const result = await HistoricalEnrichmentService.enrichBatch({
        scope: "historical",
        ...batchFilters,
        priority: 2,
      });
      LoggerService.audit("historical.enrichment.batch", {
        operator,
        action: "enrich_p2",
        runId: result.runId,
        processed: result.processed,
      });
      return NextResponse.json({ ok: result.ok, result });
    }

    if (body.action === "retry_failed" || body.retryFailed) {
      const result = await HistoricalEnrichmentService.enrichBatch({
        scope: "historical",
        ...batchFilters,
        retryFailed: true,
      });
      LoggerService.audit("historical.enrichment.batch", {
        operator,
        action: "retry_failed",
        runId: result.runId,
        processed: result.processed,
      });
      return NextResponse.json({ ok: result.ok, result });
    }

    if (
      body.action === "batch" ||
      body.scope === "historical" ||
      body.action === "extract_prices"
    ) {
      const result = await HistoricalEnrichmentService.enrichBatch({
        scope: body.scope ?? "historical",
        propertyId: body.propertyId,
        priority: parsePriority(body.priority != null ? String(body.priority) : null),
        retryFailed: body.retryFailed,
        ...batchFilters,
        mode: body.action === "extract_prices" ? "snapshot" : "refetch",
      });
      LoggerService.audit("historical.enrichment.batch", {
        operator,
        action: body.action ?? "batch",
        runId: result.runId,
        processed: result.processed,
      });
      return NextResponse.json({ ok: result.ok, result });
    }

    if (!body.propertyId) {
      return NextResponse.json(
        { ok: false, error: "propertyId required" },
        { status: 400 },
      );
    }

    const result = await HistoricalEnrichmentService.enrichProperty({
      propertyId: body.propertyId,
      force: body.force,
      operator,
      mode:
        body.action === "extract_snapshot" ||
        (body.action as string | undefined) === "extract_prices"
          ? "snapshot"
          : "refetch",
    });

    return NextResponse.json({ ok: result.ok, result });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unauthorized" },
      { status: 401 },
    );
  }
}
