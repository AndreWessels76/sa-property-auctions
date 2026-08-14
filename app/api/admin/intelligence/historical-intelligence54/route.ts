import { NextRequest, NextResponse } from "next/server";
import { PermissionService } from "@/lib/auth";
import { SessionService } from "@/lib/auth/SessionService";
import { HistoricalIntelligence54Service } from "@/lib/services/HistoricalIntelligence54Service";
import { LoggerService } from "@/lib/logger";

type Hi54Action =
  | "refresh"
  | "dry_run_p1"
  | "acquire_p1"
  | "retry_failed"
  | "retry_network_failures"
  | "extract_existing_snapshots"
  | "resolve_evidence"
  | "quality_audit"
  | "rebuild";

function normalizeAction(action?: string): Hi54Action | null {
  if (!action) return "refresh";
  const aliases: Record<string, Hi54Action> = {
    dry_run: "dry_run_p1",
    acquire: "acquire_p1",
    extract: "extract_existing_snapshots",
    extract_snapshots: "extract_existing_snapshots",
    rebuild_intelligence: "rebuild",
    retry_network: "retry_network_failures",
  };
  const normalized = (aliases[action] ?? action) as Hi54Action;
  const allowed: Hi54Action[] = [
    "refresh",
    "dry_run_p1",
    "acquire_p1",
    "retry_failed",
    "retry_network_failures",
    "extract_existing_snapshots",
    "resolve_evidence",
    "quality_audit",
    "rebuild",
  ];
  return allowed.includes(normalized) ? normalized : null;
}

export async function GET() {
  try {
    await PermissionService.requireAdmin();
    const dashboard = await HistoricalIntelligence54Service.adminDashboard();
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
    const body = (await request.json()) as { action?: string; limit?: number };
    const action = normalizeAction(body.action);
    if (!action) {
      return NextResponse.json({ ok: false, error: "Unknown action" }, { status: 400 });
    }

    const limit = body.limit ? Math.min(Math.max(body.limit, 1), 5) : undefined;

    if (action === "refresh") {
      const report = await HistoricalIntelligence54Service.buildReport();
      return NextResponse.json({ ok: true, report });
    }

    if (action === "dry_run_p1") {
      const result = await HistoricalIntelligence54Service.dryRunP1({ operator, limit });
      return NextResponse.json({ ok: result.ok, result });
    }

    if (action === "acquire_p1") {
      const result = await HistoricalIntelligence54Service.acquireP1Batch({
        operator,
        limit,
        dryRun: false,
      });
      LoggerService.audit("hi54.admin.acquire_p1", { operator, limit });
      return NextResponse.json({ ok: result.ok, result });
    }

    if (action === "retry_failed") {
      const result = await HistoricalIntelligence54Service.retryFailedBatch({
        operator,
        limit,
        dryRun: false,
      });
      return NextResponse.json({ ok: result.ok, result });
    }

    if (action === "retry_network_failures") {
      const result = await HistoricalIntelligence54Service.retryNetworkFailuresBatch({
        operator,
        limit,
        dryRun: false,
      });
      return NextResponse.json({ ok: result.ok, result });
    }

    if (action === "extract_existing_snapshots") {
      const result = await HistoricalIntelligence54Service.extractSnapshotsBatch({
        operator,
        limit,
        dryRun: false,
      });
      return NextResponse.json({ ok: result.ok, result });
    }

    if (action === "resolve_evidence") {
      const result = await HistoricalIntelligence54Service.resolveEvidence({ operator, limit });
      return NextResponse.json({ ok: result.ok, result });
    }

    if (action === "quality_audit") {
      const result = await HistoricalIntelligence54Service.runQualityAudit({ operator });
      return NextResponse.json({ ok: result.ok, result });
    }

    if (action === "rebuild") {
      const result = await HistoricalIntelligence54Service.rebuildIntelligence(operator);
      return NextResponse.json({ ok: result.ok !== false, result });
    }

    return NextResponse.json({ ok: false, error: "Unknown action" }, { status: 400 });
  } catch (error) {
    LoggerService.error("hi54.intelligence failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Failed" },
      { status: 500 },
    );
  }
}
