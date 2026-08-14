import { NextRequest, NextResponse } from "next/server";
import { PermissionService } from "@/lib/auth";
import { SessionService } from "@/lib/auth/SessionService";
import { HistoricalEvidenceQuality44Service } from "@/lib/services/HistoricalEvidenceQuality44Service";
import { LoggerService } from "@/lib/logger";

export async function POST(request: NextRequest) {
  try {
    await PermissionService.requireAdmin();
    const user = await SessionService.currentUser();
    const operator = user?.email ?? user?.id ?? "admin";
    const body = (await request.json()) as {
      eventId?: string;
      action?:
        | "approve_evidence"
        | "reject_evidence"
        | "mark_insufficient"
        | "resolve_conflict"
        | "request_reacquisition";
      field?: string;
      reason?: string;
      reviewId?: string;
    };

    if (!body.eventId || !body.action) {
      return NextResponse.json(
        { ok: false, error: "eventId and action required" },
        { status: 400 },
      );
    }

    const result = await HistoricalEvidenceQuality44Service.reviewOne({
      eventId: body.eventId,
      action: body.action,
      field: body.field,
      operator,
      reason: body.reason,
      reviewId: body.reviewId,
    });

    LoggerService.audit("heq44.review_api", {
      eventId: body.eventId,
      action: body.action,
      operator,
      ok: result.ok,
    });

    return NextResponse.json({ ok: result.ok, result });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unauthorized" },
      { status: 401 },
    );
  }
}
