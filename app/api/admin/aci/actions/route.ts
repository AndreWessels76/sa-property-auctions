import { NextRequest, NextResponse } from "next/server";
import { PermissionService } from "@/lib/auth";
import { SessionService } from "@/lib/auth/SessionService";
import { AciCommandCentreService } from "@/lib/services/AciCommandCentreService";
import type { AciActionName } from "@/lib/services/AciCommandCentreService";
import type { AuctionPartnerResultRecord } from "@/lib/partnerships/auctionPartnerResultsFeedContract";

export const dynamic = "force-dynamic";

const ALLOWED: AciActionName[] = [
  "resolve_evidence",
  "quality_audit",
  "dry_run_acquisition",
  "acquire",
  "retry",
  "extract_snapshots",
  "rebuild",
  "results_feed_dry_run",
  "results_feed_execute",
];

export async function POST(request: NextRequest) {
  try {
    await PermissionService.requireAdmin();
    const user = await SessionService.currentUser();
    const operator = user?.email ?? user?.id ?? "admin";
    const body = (await request.json()) as {
      action?: AciActionName;
      limit?: number;
      confirm?: boolean;
      records?: unknown[];
    };
    if (!body.action || !ALLOWED.includes(body.action)) {
      return NextResponse.json({ ok: false, error: "Unknown action" }, { status: 400 });
    }
    const result = await AciCommandCentreService.runAction({
      operator,
      action: body.action,
      limit: body.limit,
      confirm: body.confirm,
      records: Array.isArray(body.records)
        ? (body.records as AuctionPartnerResultRecord[])
        : [],
    });
    const status = "status" in result && typeof result.status === "number" ? result.status : 200;
    return NextResponse.json(result, { status });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unauthorized" },
      { status: 401 },
    );
  }
}
