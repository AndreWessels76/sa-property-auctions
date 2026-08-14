import { NextResponse } from "next/server";
import { PermissionService } from "@/lib/auth";
import { HistoricalIntelligence40Service } from "@/lib/services/HistoricalIntelligence40Service";

export async function GET() {
  try {
    await PermissionService.requireAdmin();
    const data = await HistoricalIntelligence40Service.adminConflicts();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unauthorized" },
      { status: 401 },
    );
  }
}
