import { NextRequest, NextResponse } from "next/server";
import { PermissionService } from "@/lib/auth";
import { SessionService } from "@/lib/auth/SessionService";
import { OutcomeIntelligenceService } from "@/lib/services/OutcomeIntelligenceService";

export async function POST(request: NextRequest) {
  try {
    await PermissionService.requireAdmin();
    const user = await SessionService.currentUser();
    const operator = user?.email ?? user?.id ?? "admin";
    const body = (await request.json()) as {
      conflictId?: string;
      action?: "confirm_a" | "confirm_b" | "reject" | "resolve";
      note?: string;
    };
    if (!body.conflictId || !body.action) {
      return NextResponse.json(
        { ok: false, error: "conflictId and action required" },
        { status: 400 },
      );
    }
    const result = await OutcomeIntelligenceService.reviewConflict({
      conflictId: body.conflictId,
      action: body.action,
      operator,
      note: body.note,
    });
    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 404 });
    }
    return NextResponse.json({ ok: true, conflict: result.conflict });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unauthorized" },
      { status: 401 },
    );
  }
}
