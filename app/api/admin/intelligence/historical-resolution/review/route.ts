import { NextRequest, NextResponse } from "next/server";
import { PermissionService } from "@/lib/auth";
import { SessionService } from "@/lib/auth/SessionService";
import { HistoricalIntelligence42Service } from "@/lib/services/HistoricalIntelligence42Service";
import { LoggerService } from "@/lib/logger";

export async function POST(request: NextRequest) {
  try {
    await PermissionService.requireAdmin();
    const user = await SessionService.currentUser();
    const operator = user?.email ?? user?.id ?? "admin";
    const body = (await request.json()) as {
      eventId: string;
      action:
        | "confirm_sold"
        | "confirm_not_sold"
        | "confirm_sale_price"
        | "reject_evidence"
        | "rerun_extraction";
      note?: string;
    };

    if (!body.eventId || !body.action) {
      return NextResponse.json(
        { ok: false, error: "eventId and action required" },
        { status: 400 },
      );
    }

    const result = await HistoricalIntelligence42Service.resolveOne({
      eventId: body.eventId,
      action: body.action,
      operator,
      note: body.note,
    });
    LoggerService.audit("hi42.review", { operator, eventId: body.eventId, action: body.action });
    return NextResponse.json({ ok: result.ok, result });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unauthorized" },
      { status: 401 },
    );
  }
}
