import { NextResponse } from "next/server";
import { PermissionService } from "@/lib/auth";
import { OutcomeIntelligenceService } from "@/lib/services/OutcomeIntelligenceService";

export async function GET() {
  try {
    await PermissionService.requireAdmin();
    const audit = await OutcomeIntelligenceService.adminAudit();
    return NextResponse.json({ ok: true, ...audit });
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
