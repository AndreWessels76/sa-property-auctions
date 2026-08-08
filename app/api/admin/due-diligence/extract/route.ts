import { NextResponse } from "next/server";
import { PermissionService } from "@/lib/auth/PermissionService";
import { DueDiligenceExtractionService } from "@/lib/services/DueDiligenceExtractionService";
import { jsonError, jsonOk } from "@/lib/api/http";
import { clientIp, rateLimit } from "@/lib/api/rateLimit";

export async function GET(request: Request) {
  try {
    await PermissionService.requireAdmin();
    const limited = rateLimit({
      key: `admin:dd-extract:get:${clientIp(request)}`,
      limit: 30,
      windowMs: 60_000,
    });
    if (limited) return limited;

    const runs = await DueDiligenceExtractionService.listRecentRuns(50);
    return jsonOk({ runs });
  } catch (error) {
    return jsonError(error, "Failed to load extraction runs.");
  }
}

export async function POST(request: Request) {
  try {
    await PermissionService.requireAdmin();
    const limited = rateLimit({
      key: `admin:dd-extract:post:${clientIp(request)}`,
      limit: 10,
      windowMs: 60_000,
    });
    if (limited) return limited;

    const body = (await request.json()) as {
      action?: "run_one" | "run_batch";
      propertyId?: string;
      limit?: number;
    };

    if (body.action === "run_one") {
      if (!body.propertyId) {
        return NextResponse.json({ error: "propertyId required" }, { status: 400 });
      }
      const result = await DueDiligenceExtractionService.runForProperty(
        body.propertyId,
        "admin",
      );
      return jsonOk(result);
    }

    if (body.action === "run_batch") {
      const report = await DueDiligenceExtractionService.runBatch({
        limit: body.limit ?? 25,
        operator: "admin",
      });
      return jsonOk(report);
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    return jsonError(error, "Extraction failed.");
  }
}
