import { NextRequest, NextResponse } from "next/server";
import { PermissionService } from "@/lib/auth";
import { SessionService } from "@/lib/auth/SessionService";
import { HistoricalIntelligence55Service } from "@/lib/services/HistoricalIntelligence55Service";
import { rejectHi55UnlimitedLimit } from "@/lib/intelligence/historicalIntelligence55";
import { LoggerService } from "@/lib/logger";

type Hi55Action =
  | "refresh"
  | "dry_run_p1"
  | "acquire_p1"
  | "extract_snapshots"
  | "retry_legacy"
  | "resolve"
  | "quality_audit"
  | "rebuild";

function normalizeAction(action?: string): Hi55Action | null {
  if (!action) return "refresh";
  const aliases: Record<string, Hi55Action> = {
    dry_run: "dry_run_p1",
    acquire: "acquire_p1",
    extract: "extract_snapshots",
    extract_existing_snapshots: "extract_snapshots",
    retry_failed: "retry_legacy",
    retry_legacy_failures: "retry_legacy",
    resolve_evidence: "resolve",
    rebuild_intelligence: "rebuild",
  };
  const normalized = (aliases[action] ?? action) as Hi55Action;
  const allowed: Hi55Action[] = [
    "refresh",
    "dry_run_p1",
    "acquire_p1",
    "extract_snapshots",
    "retry_legacy",
    "resolve",
    "quality_audit",
    "rebuild",
  ];
  return allowed.includes(normalized) ? normalized : null;
}

export async function GET() {
  try {
    await PermissionService.requireAdmin();
    const dashboard = await HistoricalIntelligence55Service.adminDashboard();
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

    const limitCheck = rejectHi55UnlimitedLimit(body.limit);
    if (!limitCheck.ok && body.limit != null) {
      return NextResponse.json(
        { ok: false, error: limitCheck.error ?? "Invalid limit" },
        { status: 400 },
      );
    }
    const limit = limitCheck.limit;

    if (action === "refresh") {
      const report = await HistoricalIntelligence55Service.buildReport();
      return NextResponse.json({ ok: true, report });
    }

    if (action === "dry_run_p1") {
      const result = await HistoricalIntelligence55Service.dryRunP1({ operator, limit });
      return NextResponse.json({ ok: result.ok, result });
    }

    if (action === "acquire_p1") {
      const result = await HistoricalIntelligence55Service.acquireP1Batch({
        operator,
        limit,
        dryRun: false,
      });
      LoggerService.audit("hi55.admin.acquire_p1", { operator, limit });
      return NextResponse.json({ ok: result.ok, result });
    }

    if (action === "extract_snapshots") {
      const result = await HistoricalIntelligence55Service.extractSnapshotsBatch({
        operator,
        limit,
        dryRun: false,
      });
      return NextResponse.json({ ok: result.ok, result });
    }

    if (action === "retry_legacy") {
      const result = await HistoricalIntelligence55Service.retryLegacyFailures({
        operator,
        limit,
        dryRun: false,
      });
      return NextResponse.json({ ok: result.ok, result });
    }

    if (action === "resolve") {
      const result = await HistoricalIntelligence55Service.resolveEvidence({
        operator,
        limit,
      });
      return NextResponse.json({ ok: result.ok, result });
    }

    if (action === "quality_audit") {
      const result = await HistoricalIntelligence55Service.runQualityAudit({
        operator,
        limit,
      });
      return NextResponse.json({ ok: result.ok, result });
    }

    if (action === "rebuild") {
      const result = await HistoricalIntelligence55Service.rebuildIntelligence(operator);
      return NextResponse.json({ ok: result.ok !== false, result });
    }

    return NextResponse.json({ ok: false, error: "Unknown action" }, { status: 400 });
  } catch (error) {
    LoggerService.error("hi55.intelligence failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Failed" },
      { status: 500 },
    );
  }
}
