import { NextRequest, NextResponse } from "next/server";
import { PermissionService } from "@/lib/auth";
import { SessionService } from "@/lib/auth/SessionService";
import { HistoricalEvidenceAcquisition43Service } from "@/lib/services/HistoricalEvidenceAcquisition43Service";
import { HistoricalIntelligence42Service } from "@/lib/services/HistoricalIntelligence42Service";
import { LoggerService } from "@/lib/logger";
import type { Hea43QueuePriority } from "@/lib/acquisition/historicalEvidence43";

function parsePriority(value: string | null): Hea43QueuePriority | undefined {
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
      const queue = await HistoricalEvidenceAcquisition43Service.buildQueue({
        connector: url.searchParams.get("connector") ?? undefined,
        agency: url.searchParams.get("agency") ?? undefined,
        partner: url.searchParams.get("partner") ?? undefined,
        priority: parsePriority(url.searchParams.get("priority")),
        retryFailed: url.searchParams.get("retryFailed") === "true",
        propertyMasterId: url.searchParams.get("propertyMasterId") ?? undefined,
        auctionEventId: url.searchParams.get("auctionEventId") ?? undefined,
      });
      return NextResponse.json({ ok: true, ...queue });
    }
    const dashboard = await HistoricalEvidenceAcquisition43Service.dashboard();
    return NextResponse.json(dashboard);
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
        | "acquire_one"
        | "acquire_batch"
        | "acquire_p1"
        | "acquire_p2"
        | "dry_run"
        | "retry_failed";
      propertyId?: string;
      propertyMasterId?: string;
      auctionEventId?: string;
      limit?: number;
      force?: boolean;
      dryRun?: boolean;
      connector?: string;
      agency?: string;
      partner?: string;
      priority?: number;
      retryFailed?: boolean;
    };

    const batchFilters = {
      connector: body.connector,
      agency: body.agency,
      partner: body.partner,
      propertyMasterId: body.propertyMasterId,
      auctionEventId: body.auctionEventId,
      limit: body.limit,
      force: body.force,
      operator,
    };

    if (body.action === "dry_run" || body.dryRun) {
      const result = await HistoricalEvidenceAcquisition43Service.acquireBatch({
        ...batchFilters,
        dryRun: true,
        priority: parsePriority(body.priority != null ? String(body.priority) : null),
      });
      return NextResponse.json({ ok: result.ok, result });
    }

    if (body.action === "acquire_p1") {
      const result = await HistoricalEvidenceAcquisition43Service.acquireBatch({
        ...batchFilters,
        priority: 1,
      });
      LoggerService.audit("historical.evidence43.batch", {
        operator,
        action: "acquire_p1",
        runId: result.runId,
        processed: result.processed,
      });
      return NextResponse.json({ ok: result.ok, result });
    }

    if (body.action === "acquire_p2") {
      const result = await HistoricalEvidenceAcquisition43Service.acquireBatch({
        ...batchFilters,
        priority: 2,
      });
      LoggerService.audit("historical.evidence43.batch", {
        operator,
        action: "acquire_p2",
        runId: result.runId,
        processed: result.processed,
      });
      return NextResponse.json({ ok: result.ok, result });
    }

    if (body.action === "retry_failed" || body.retryFailed) {
      const result = await HistoricalEvidenceAcquisition43Service.acquireBatch({
        ...batchFilters,
        retryFailed: true,
      });
      LoggerService.audit("historical.evidence43.batch", {
        operator,
        action: "retry_failed",
        runId: result.runId,
        processed: result.processed,
      });
      return NextResponse.json({ ok: result.ok, result });
    }

    if (body.action === "acquire_batch" || !body.propertyId) {
      const result = await HistoricalEvidenceAcquisition43Service.acquireBatch({
        ...batchFilters,
        priority: parsePriority(body.priority != null ? String(body.priority) : null),
      });
      LoggerService.audit("historical.evidence43.batch", {
        operator,
        action: body.action ?? "acquire_batch",
        runId: result.runId,
        processed: result.processed,
      });
      return NextResponse.json({ ok: result.ok, result });
    }

    const result = await HistoricalEvidenceAcquisition43Service.acquireOne({
      propertyId: body.propertyId,
      force: body.force,
      operator,
    });
    LoggerService.audit("historical.evidence43.acquire_one", {
      operator,
      propertyId: body.propertyId,
      state: result.state,
    });
    return NextResponse.json({ ok: result.ok, result });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unauthorized" },
      { status: 401 },
    );
  }
}
