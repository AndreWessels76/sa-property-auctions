import { NextRequest, NextResponse } from "next/server";
import { PermissionService } from "@/lib/auth";
import { SessionService } from "@/lib/auth/SessionService";
import { HistoricalIntelligence42Service } from "@/lib/services/HistoricalIntelligence42Service";
import { LoggerService } from "@/lib/logger";

export async function GET(request: NextRequest) {
  try {
    await PermissionService.requireAdmin();
    const url = new URL(request.url);
    const eventId = url.searchParams.get("eventId");
    if (eventId) {
      const review = await HistoricalIntelligence42Service.reviewForEvent(eventId);
      if (!review) {
        return NextResponse.json({ ok: false, error: "Event not found" }, { status: 404 });
      }
      return NextResponse.json({ ok: true, review });
    }
    const dashboard = await HistoricalIntelligence42Service.adminDashboard();
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
      action?: "resolve_one" | "resolve_batch" | "rebuild";
      eventId?: string;
      resolutionAction?:
        | "confirm_sold"
        | "confirm_not_sold"
        | "confirm_sale_price"
        | "reject_evidence"
        | "rerun_extraction";
      limit?: number;
      note?: string;
    };

    if (body.action === "rebuild") {
      const result = await HistoricalIntelligence42Service.rebuild(operator);
      LoggerService.audit("hi42.rebuild", { operator });
      return NextResponse.json({ ok: result.ok, result });
    }

    if (body.action === "resolve_batch") {
      const result = await HistoricalIntelligence42Service.resolveBatch({
        limit: body.limit,
        operator,
        action: body.resolutionAction ?? "resolve_one",
      });
      return NextResponse.json({ ok: result.ok, result });
    }

    if (!body.eventId) {
      return NextResponse.json({ ok: false, error: "eventId required" }, { status: 400 });
    }

    const result = await HistoricalIntelligence42Service.resolveOne({
      eventId: body.eventId,
      action: body.resolutionAction ?? "resolve_one",
      operator,
      note: body.note,
    });
    return NextResponse.json({ ok: result.ok, result });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unauthorized" },
      { status: 401 },
    );
  }
}
