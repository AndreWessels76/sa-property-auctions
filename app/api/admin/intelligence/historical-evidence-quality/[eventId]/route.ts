import { NextRequest, NextResponse } from "next/server";
import { PermissionService } from "@/lib/auth";
import { HistoricalEvidenceQuality44Service } from "@/lib/services/HistoricalEvidenceQuality44Service";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ eventId: string }> },
) {
  try {
    await PermissionService.requireAdmin();
    const { eventId } = await context.params;
    const review = await HistoricalEvidenceQuality44Service.reviewForEvent(eventId);
    if (!review) {
      return NextResponse.json({ ok: false, error: "Event not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, eventId, review });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unauthorized" },
      { status: 401 },
    );
  }
}
