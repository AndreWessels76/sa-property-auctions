import { NextRequest, NextResponse } from "next/server";
import { PermissionService } from "@/lib/auth";
import { SessionService } from "@/lib/auth/SessionService";
import { HistoricalIntelligence52Service } from "@/lib/services/HistoricalIntelligence52Service";
import { LoggerService } from "@/lib/logger";

type Hi52Action =
  | "refresh"
  | "dry_run_p1"
  | "acquire_p1"
  | "dry_run_legacy"
  | "retry_legacy_failures"
  | "dry_run_extraction"
  | "extract_snapshots"
  | "resolve_evidence"
  | "quality_audit"
  | "rebuild_intelligence";

function normalizeAction(action?: string): Hi52Action | null {
  if (!action) return "refresh";
  const aliases: Record<string, Hi52Action> = {
    dry_run: "dry_run_p1",
    acquire: "acquire_p1",
    rebuild: "rebuild_intelligence",
    extract: "extract_snapshots",
  };
  return (aliases[action] ?? action) as Hi52Action;
}

export async function GET() {
  try {
    await PermissionService.requireAdmin();
    const dashboard = await HistoricalIntelligence52Service.adminDashboard();
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
    const body = (await request.json()) as { action?: string; limit?: number };
    const action = normalizeAction(body.action);
    const limit = body.limit ? Math.min(Math.max(body.limit, 1), 5) : undefined;

    if (action === "refresh") {
      const report = await HistoricalIntelligence52Service.buildReport();
      return NextResponse.json({ ok: true, report });
    }

    if (action === "dry_run_p1") {
      const result = await HistoricalIntelligence52Service.dryRunP1({ operator, limit });
      return NextResponse.json({ ok: result.ok, result });
    }

    if (action === "acquire_p1") {
      const result = await HistoricalIntelligence52Service.acquireP1Batch({
        operator,
        limit,
        dryRun: false,
      });
      LoggerService.audit("hi52.admin.acquire_p1", { operator, limit });
      return NextResponse.json({ ok: result.ok, result });
    }

    if (action === "dry_run_legacy") {
      const result = await HistoricalIntelligence52Service.dryRunLegacy({ operator, limit });
      return NextResponse.json({ ok: result.ok, result });
    }

    if (action === "retry_legacy_failures") {
      const result = await HistoricalIntelligence52Service.retryLegacyFailuresBatch({
        operator,
        limit,
        dryRun: false,
      });
      LoggerService.audit("hi52.admin.retry_legacy", { operator, limit });
      return NextResponse.json({ ok: result.ok, result });
    }

    if (action === "dry_run_extraction") {
      const result = await HistoricalIntelligence52Service.dryRunExtraction({
        operator,
        limit,
      });
      return NextResponse.json({ ok: result.ok, result });
    }

    if (action === "extract_snapshots") {
      const result = await HistoricalIntelligence52Service.extractSnapshotsBatch({
        operator,
        limit,
        dryRun: false,
      });
      return NextResponse.json({ ok: result.ok, result });
    }

    if (action === "resolve_evidence") {
      const result = await HistoricalIntelligence52Service.resolveEvidence({ operator, limit });
      return NextResponse.json({ ok: result.ok, result });
    }

    if (action === "quality_audit") {
      const result = await HistoricalIntelligence52Service.runQualityAudit({ operator });
      return NextResponse.json({ ok: result.ok, result });
    }

    if (action === "rebuild_intelligence") {
      const result = await HistoricalIntelligence52Service.rebuildIntelligence(operator);
      return NextResponse.json({ ok: result.ok, result });
    }

    return NextResponse.json({ ok: false, error: "Unknown action" }, { status: 400 });
  } catch (error) {
    LoggerService.error("hi52.intelligence failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Failed" },
      { status: 500 },
    );
  }
}
