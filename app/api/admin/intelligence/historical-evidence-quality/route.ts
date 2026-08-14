import { NextRequest, NextResponse } from "next/server";
import { PermissionService } from "@/lib/auth";
import { SessionService } from "@/lib/auth/SessionService";
import { HistoricalEvidenceQuality44Service } from "@/lib/services/HistoricalEvidenceQuality44Service";
import { LoggerService } from "@/lib/logger";

export async function GET(request: NextRequest) {
  try {
    await PermissionService.requireAdmin();
    const url = new URL(request.url);
    if (url.searchParams.get("view") === "queue") {
      const dashboard = await HistoricalEvidenceQuality44Service.adminDashboard();
      return NextResponse.json({
        ok: true,
        queue: dashboard.queuePreview,
        queueSummary: dashboard.queueSummary,
      });
    }
    const dashboard = await HistoricalEvidenceQuality44Service.adminDashboard();
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
      action?:
        | "quality_audit"
        | "refresh_p1"
        | "rebuild_intelligence"
        | "review";
      eventId?: string;
      reviewAction?:
        | "approve_evidence"
        | "reject_evidence"
        | "mark_insufficient"
        | "resolve_conflict"
        | "request_reacquisition";
      field?: string;
      reason?: string;
      reviewId?: string;
      limit?: number;
    };

    if (body.action === "quality_audit") {
      const result = await HistoricalEvidenceQuality44Service.runQualityAudit(operator);
      return NextResponse.json({ ok: result.ok, result });
    }

    if (body.action === "refresh_p1") {
      const result = await HistoricalEvidenceQuality44Service.refreshP1Evidence(
        operator,
        body.limit ?? 5,
      );
      LoggerService.audit("heq44.refresh_p1", { operator, ...result });
      return NextResponse.json({ ok: result.ok, result });
    }

    if (body.action === "rebuild_intelligence") {
      const result =
        await HistoricalEvidenceQuality44Service.rebuildHistoricalIntelligence(operator);
      LoggerService.audit("heq44.rebuild", { operator });
      return NextResponse.json({ ok: result.ok, result });
    }

    if (body.action === "review" && body.eventId && body.reviewAction) {
      const result = await HistoricalEvidenceQuality44Service.reviewOne({
        eventId: body.eventId,
        action: body.reviewAction,
        field: body.field,
        operator,
        reason: body.reason,
        reviewId: body.reviewId,
      });
      return NextResponse.json({ ok: result.ok, result });
    }

    return NextResponse.json(
      { ok: false, error: "Unknown action or missing parameters" },
      { status: 400 },
    );
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unauthorized" },
      { status: 401 },
    );
  }
}
