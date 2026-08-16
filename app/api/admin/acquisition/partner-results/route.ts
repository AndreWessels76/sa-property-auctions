import { NextResponse } from "next/server";
import { PermissionService } from "@/lib/auth";
import { AuctionPartnerResultsIngestionService } from "@/lib/services/AuctionPartnerResultsIngestionService";
import {
  rejectPartnerResultsUnlimitedLimit,
  type AuctionPartnerResultRecord,
} from "@/lib/partnerships/auctionPartnerResultsFeedContract";

export const dynamic = "force-dynamic";

/**
 * GET — Bidders Choice results-feed status (read-only).
 * POST — dry-run validate candidate records (default). execute requires explicit flag + authorisation.
 */
export async function GET() {
  try {
    await PermissionService.requireAdmin();
    const status = await AuctionPartnerResultsIngestionService.buildStatus(
      "bidders_choice",
    );
    return NextResponse.json({
      ok: true,
      partnerCode: "bidders_choice",
      contract: AuctionPartnerResultsIngestionService.getContract(),
      status,
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
    const body = (await request.json().catch(() => ({}))) as {
      action?: string;
      records?: AuctionPartnerResultRecord[];
      limit?: number;
      dryRun?: boolean;
      execute?: boolean;
    };

    if (body.action === "status") {
      const status = await AuctionPartnerResultsIngestionService.buildStatus(
        "bidders_choice",
      );
      return NextResponse.json({ ok: true, status });
    }

    const limitGate = rejectPartnerResultsUnlimitedLimit(body.limit);
    if (!limitGate.ok) {
      return NextResponse.json(
        { ok: false, error: limitGate.reason },
        { status: 400 },
      );
    }

    const records = Array.isArray(body.records) ? body.records : [];
    if (records.length === 0) {
      return NextResponse.json(
        { ok: false, error: "records array required for ingest/dry-run" },
        { status: 400 },
      );
    }

    const result = await AuctionPartnerResultsIngestionService.ingestBatch({
      records,
      limit: limitGate.limit,
      dryRun: body.execute === true ? false : body.dryRun !== false,
      execute: body.execute === true,
      operator: "admin-partner-results",
    });

    return NextResponse.json({
      ok: result.ok,
      dryRun: result.dryRun,
      contractVersion: result.contractVersion,
      limit: result.limit,
      processed: result.processed,
      results: result.results,
      productionWritesExecuted: result.productionWritesExecuted,
      blockedReason: result.blockedReason,
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
