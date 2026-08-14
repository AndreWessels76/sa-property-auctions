import { NextResponse } from "next/server";
import { PermissionService } from "@/lib/auth";
import { SessionService } from "@/lib/auth/SessionService";
import { HistoricalIntelligence40Service } from "@/lib/services/HistoricalIntelligence40Service";

export async function POST() {
  try {
    await PermissionService.requireAdmin();
    const user = await SessionService.currentUser();
    const operator = user?.email ?? user?.id ?? "admin";
    const result = await HistoricalIntelligence40Service.rebuild(operator);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unauthorized" },
      { status: 401 },
    );
  }
}
