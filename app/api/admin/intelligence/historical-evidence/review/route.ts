import { NextRequest, NextResponse } from "next/server";
import { PermissionService } from "@/lib/auth";
import { SessionService } from "@/lib/auth/SessionService";
import { HistoricalIntelligence42Service } from "@/lib/services/HistoricalIntelligence42Service";
import { HistoricalEnrichmentRepository } from "@/lib/repositories/HistoricalEnrichmentRepository";
import { LoggerService } from "@/lib/logger";
import type { AdminResolutionAction } from "@/lib/intelligence/historicalResolution/types";

export async function POST(request: NextRequest) {
  try {
    await PermissionService.requireAdmin();
    const user = await SessionService.currentUser();
    const operator = user?.email ?? user?.id ?? "admin";
    const body = (await request.json()) as {
      eventId?: string;
      reviewId?: string;
      reviewStatus?: string;
      resolutionAction?: AdminResolutionAction;
      resolutionNote?: string;
    };

    if (body.reviewId && body.reviewStatus) {
      const row = await HistoricalEnrichmentRepository.resolveReview(body.reviewId, {
        status: body.reviewStatus,
        reviewedBy: operator,
        resolutionNote: body.resolutionNote,
      });
      LoggerService.audit("historical.evidence43.review", {
        reviewId: body.reviewId,
        status: body.reviewStatus,
        operator,
      });
      return NextResponse.json({ ok: Boolean(row), review: row });
    }

    if (!body.eventId || !body.resolutionAction) {
      return NextResponse.json(
        { ok: false, error: "eventId and resolutionAction required" },
        { status: 400 },
      );
    }

    const result = await HistoricalIntelligence42Service.resolveOne({
      eventId: body.eventId,
      action: body.resolutionAction,
      operator,
      note: body.resolutionNote,
    });
    LoggerService.audit("historical.evidence43.resolve", {
      eventId: body.eventId,
      action: body.resolutionAction,
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
