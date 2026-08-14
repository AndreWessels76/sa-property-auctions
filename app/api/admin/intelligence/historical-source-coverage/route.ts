import { NextRequest, NextResponse } from "next/server";
import { PermissionService } from "@/lib/auth";
import { SessionService } from "@/lib/auth/SessionService";
import { HistoricalSourceCoverage48Service } from "@/lib/services/HistoricalSourceCoverage48Service";
import { LoggerService } from "@/lib/logger";

type CoverageAction =
  | "refresh"
  | "refresh_diagnostics"
  | "dry_run"
  | "dry_run_p1"
  | "acquire_p1"
  | "retry_failed"
  | "retry_network_failures"
  | "rebuild"
  | "rebuild_intelligence";

function normalizeAction(action?: string): CoverageAction | null {
  if (!action) return "refresh_diagnostics";
  const aliases: Record<string, CoverageAction> = {
    refresh: "refresh_diagnostics",
    dry_run: "dry_run_p1",
    rebuild: "rebuild_intelligence",
  };
  return (aliases[action] ?? action) as CoverageAction;
}

export async function GET() {
  try {
    await PermissionService.requireAdmin();
    const dashboard = await HistoricalSourceCoverage48Service.adminDashboard();
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
      action?: string;
      limit?: number;
    };

    const action = normalizeAction(body.action);
    const limit = body.limit
      ? Math.min(Math.max(body.limit, 1), 10)
      : undefined;

    if (action === "refresh_diagnostics") {
      const report = await HistoricalSourceCoverage48Service.refreshDiagnostics();
      return NextResponse.json({ ok: true, report });
    }

    if (action === "dry_run_p1") {
      const result = await HistoricalSourceCoverage48Service.dryRunP1({
        operator,
        limit,
      });
      return NextResponse.json({ ok: result.ok, result });
    }

    if (action === "acquire_p1") {
      const result = await HistoricalSourceCoverage48Service.acquireP1Batch({
        dryRun: false,
        operator,
        limit,
      });
      LoggerService.audit("hsc48.admin.acquire_p1", {
        operator,
        processed: result.acquisition?.processed,
      });
      return NextResponse.json({ ok: result.ok, result });
    }

    if (action === "retry_failed") {
      const result = await HistoricalSourceCoverage48Service.retryFailedBatch({
        operator,
        limit,
        dryRun: false,
      });
      return NextResponse.json({ ok: result.ok, result });
    }

    if (action === "retry_network_failures") {
      const result = await HistoricalSourceCoverage48Service.retryNetworkFailuresBatch({
        operator,
        limit,
        dryRun: false,
      });
      return NextResponse.json({ ok: result.ok, result });
    }

    if (action === "rebuild_intelligence") {
      const result = await HistoricalSourceCoverage48Service.rebuildIntelligence(operator);
      return NextResponse.json({ ok: result.ok, result });
    }

    return NextResponse.json({ ok: false, error: "Unknown action" }, { status: 400 });
  } catch (error) {
    LoggerService.error("hsc48.coverage failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Failed" },
      { status: 500 },
    );
  }
}
