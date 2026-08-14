import { NextRequest, NextResponse } from "next/server";
import { PermissionService } from "@/lib/auth";
import { InvestorIntelligence46Service } from "@/lib/services/InvestorIntelligence46Service";

export async function GET() {
  try {
    await PermissionService.requireAdmin();
    const gaps = await InvestorIntelligence46Service.listGaps();
    return NextResponse.json({ ok: true, gaps });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unauthorized" },
      { status: 401 },
    );
  }
}
