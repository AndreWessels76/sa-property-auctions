import { NextRequest, NextResponse } from "next/server";
import { PermissionService } from "@/lib/auth";
import { SessionService } from "@/lib/auth/SessionService";
import { InvestorIntelligence47Service } from "@/lib/services/InvestorIntelligence47Service";
import { LoggerService } from "@/lib/logger";

export async function GET() {
  try {
    await PermissionService.requireAdmin();
    const dashboard = await InvestorIntelligence47Service.adminDashboard();
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
      action?: "dry_run_p1" | "acquire_p1" | "rebuild_intelligence" | "refresh_coverage";
      limit?: number;
    };

    if (body.action === "dry_run_p1") {
      const result = await InvestorIntelligence47Service.acquireP1Batch({
        dryRun: true,
        operator,
        limit: body.limit,
      });
      return NextResponse.json({ ok: result.ok, result });
    }

    if (body.action === "acquire_p1") {
      const result = await InvestorIntelligence47Service.acquireP1Batch({
        dryRun: false,
        operator,
        limit: body.limit,
      });
      LoggerService.audit("ii47.admin.acquire_p1", {
        operator,
        processed: result.acquisition?.processed,
      });
      return NextResponse.json({ ok: result.ok, result });
    }

    if (body.action === "rebuild_intelligence" || body.action === "refresh_coverage") {
      const result = await InvestorIntelligence47Service.rebuildIntelligence(operator);
      return NextResponse.json({ ok: result.ok, result });
    }

    return NextResponse.json({ ok: false, error: "Unknown action" }, { status: 400 });
  } catch (error) {
    LoggerService.error("ii47.coverage failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Failed" },
      { status: 500 },
    );
  }
}
