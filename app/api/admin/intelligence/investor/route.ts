import { NextRequest, NextResponse } from "next/server";
import { PermissionService } from "@/lib/auth";
import { SessionService } from "@/lib/auth/SessionService";
import { InvestorIntelligence46Service } from "@/lib/services/InvestorIntelligence46Service";
import { InvestorIntelligence45Service } from "@/lib/services/InvestorIntelligence45Service";
import { LoggerService } from "@/lib/logger";

export async function GET(request: NextRequest) {
  try {
    await PermissionService.requireAdmin();
    const url = new URL(request.url);
    if (url.searchParams.get("view") === "gaps") {
      const gaps = await InvestorIntelligence46Service.listGaps();
      return NextResponse.json({ ok: true, gaps });
    }
    const dashboard = await InvestorIntelligence46Service.adminDashboard();
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
      action?: "market_audit" | "rebuild" | "refresh_gaps" | "refresh_coverage";
    };

    if (body.action === "market_audit") {
      const result = await InvestorIntelligence45Service.runMarketIntelligenceAudit(operator);
      return NextResponse.json({ ok: result.ok, result });
    }

    if (body.action === "refresh_coverage") {
      const result = await InvestorIntelligence46Service.refreshCoverage(operator);
      return NextResponse.json({ ok: result.ok, result });
    }

    if (body.action === "rebuild") {
      const result = await InvestorIntelligence46Service.rebuildInvestorIntelligence(operator);
      return NextResponse.json({ ok: result.ok, result });
    }

    if (body.action === "refresh_gaps") {
      const result = await InvestorIntelligence46Service.refreshAcquisitionGaps(operator);
      return NextResponse.json({ ok: result.ok, result });
    }

    return NextResponse.json({ ok: false, error: "Unknown action" }, { status: 400 });
  } catch (error) {
    LoggerService.error("ii46.admin failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Failed" },
      { status: 500 },
    );
  }
}
