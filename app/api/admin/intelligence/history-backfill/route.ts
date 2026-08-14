import { NextResponse } from "next/server";
import { PermissionService } from "@/lib/auth";
import { PropertyHistoryBackfillService } from "@/lib/services/PropertyHistoryBackfillService";

export async function GET(request: Request) {
  try {
    await PermissionService.requireAdmin();
    const url = new URL(request.url);
    const runId = url.searchParams.get("runId") ?? undefined;
    const audit = await PropertyHistoryBackfillService.audit(runId);
    const reviews = await PropertyHistoryBackfillService.listReviews();
    const publicSafety = await PropertyHistoryBackfillService.publicCatalogueSafetyCheck();

    return NextResponse.json({
      ok: true,
      generatedAt: new Date().toISOString(),
      audit,
      reviews,
      publicSafety,
    });
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

export async function POST(request: Request) {
  try {
    await PermissionService.requireAdmin();
    const body = (await request.json()) as {
      action?: string;
      limit?: number;
      dryRun?: boolean;
      reviewId?: string;
      note?: string;
    };

    if (body.action === "preview") {
      const summary = await PropertyHistoryBackfillService.preview({
        limit: body.limit ?? 200,
      });
      return NextResponse.json({ ok: true, summary });
    }

    if (body.action === "backfill") {
      const summary = await PropertyHistoryBackfillService.backfill({
        limit: body.limit ?? 200,
        dryRun: body.dryRun ?? false,
      });
      return NextResponse.json({ ok: true, summary });
    }

    const reviewActions = [
      "approve_match",
      "reject_match",
      "create_new_master",
      "approve_event",
      "reject_event",
    ] as const;

    if (
      body.action &&
      reviewActions.includes(body.action as (typeof reviewActions)[number]) &&
      body.reviewId
    ) {
      const result = await PropertyHistoryBackfillService.approveReview({
        reviewId: body.reviewId,
        action: body.action as (typeof reviewActions)[number],
        operator: "admin",
        note: body.note,
      });
      return NextResponse.json(result);
    }

    if (body.action === "seed_shared_master_reviews") {
      const result = await PropertyHistoryBackfillService.seedSharedMasterReviews();
      return NextResponse.json(result);
    }

    return NextResponse.json({ ok: false, error: "Unknown action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Backfill failed",
      },
      { status: 500 },
    );
  }
}
