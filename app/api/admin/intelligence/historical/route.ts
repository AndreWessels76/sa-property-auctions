import { NextResponse } from "next/server";
import { PermissionService } from "@/lib/auth";
import { HistoricalIntelligenceService } from "@/lib/services/HistoricalIntelligenceService";
import { ComparableIntelligenceService } from "@/lib/services/ComparableIntelligenceService";

export async function GET() {
  try {
    await PermissionService.requireAdmin();
    const audit = await HistoricalIntelligenceService.adminAudit();
    const comparablesAudit = await ComparableIntelligenceService.adminAudit();
    return NextResponse.json({ ok: true, ...audit, comparablesAudit });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unauthorized",
      },
      { status: 401 },
    );
  }
}
