import { NextRequest, NextResponse } from "next/server";
import { PermissionService } from "@/lib/auth";
import { HistoricalEvidenceAcquisition43Service } from "@/lib/services/HistoricalEvidenceAcquisition43Service";
import { HistoricalIntelligence42Service } from "@/lib/services/HistoricalIntelligence42Service";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ eventId: string }> },
) {
  try {
    await PermissionService.requireAdmin();
    const { eventId } = await context.params;
    const review = await HistoricalIntelligence42Service.reviewForEvent(eventId);
    if (!review) {
      return NextResponse.json({ ok: false, error: "Event not found" }, { status: 404 });
    }
    const queue = await HistoricalEvidenceAcquisition43Service.buildQueue({
      auctionEventId: eventId,
    });
    return NextResponse.json({
      ok: true,
      eventId,
      review,
      queueItem: queue.queue[0] ?? null,
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unauthorized" },
      { status: 401 },
    );
  }
}
