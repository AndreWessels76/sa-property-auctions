import { NextRequest, NextResponse } from "next/server";
import { PermissionService } from "@/lib/auth";
import { SessionService } from "@/lib/auth/SessionService";
import { HistoricalSourceCoverage48Service } from "@/lib/services/HistoricalSourceCoverage48Service";
import { LoggerService } from "@/lib/logger";

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
      action?:
        | "refresh_diagnostics"
        | "dry_run_p1"
        | "acquire_p1"
        | "rebuild_intelligence";
      limit?: number;
    };

    const limit = body.limit
      ? Math.min(Math.max(body.limit, 1), 10)
      : undefined;

    if (body.action === "refresh_diagnostics" || !body.action) {
      const report = await HistoricalSourceCoverage48Service.refreshDiagnostics();
      return NextResponse.json({ ok: true, report });
    }

    if (body.action === "dry_run_p1") {
      const result = await HistoricalSourceCoverage48Service.dryRunP1({
        operator,
        limit,
      });
      return NextResponse.json({ ok: result.ok, result });
    }

    if (body.action === "acquire_p1") {
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

    if (body.action === "rebuild_intelligence") {
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
