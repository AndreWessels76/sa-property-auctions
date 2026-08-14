import { NextRequest, NextResponse } from "next/server";
import { PermissionService } from "@/lib/auth";
import { SessionService } from "@/lib/auth/SessionService";
import { InvestorIntelligence46Service } from "@/lib/services/InvestorIntelligence46Service";

export async function POST(request: NextRequest) {
  try {
    await PermissionService.requireAdmin();
    const user = await SessionService.currentUser();
    const operator = user?.email ?? user?.id ?? "admin";
    const body = (await request.json()) as { action?: string };
    if (body.action !== "rebuild") {
      return NextResponse.json({ ok: false, error: "action=rebuild required" }, { status: 400 });
    }
    const result = await InvestorIntelligence46Service.rebuildInvestorIntelligence(operator);
    return NextResponse.json({ ok: result.ok, result });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Failed" },
      { status: 500 },
    );
  }
}
