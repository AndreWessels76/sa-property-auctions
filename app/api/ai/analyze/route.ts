import { NextResponse } from "next/server";
import { SessionService } from "@/lib/auth/SessionService";
import { PermissionService } from "@/lib/auth/PermissionService";
import { AIPropertyAnalysisService } from "@/lib/services/AIPropertyAnalysisService";
import { jsonError, jsonOk } from "@/lib/api/http";
import { clientIp, rateLimit } from "@/lib/api/rateLimit";

export async function POST(request: Request) {
  try {
    const user = await SessionService.requireUser();
    await PermissionService.requirePremium();

    const limited = rateLimit({
      key: `ai:analyze:${user.id}:${clientIp(request)}`,
      limit: 20,
      windowMs: 60_000,
    });

    if (limited) {
      return limited;
    }

    const body = (await request.json()) as { propertyId?: string };
    const propertyId = body.propertyId?.trim();

    if (!propertyId) {
      return NextResponse.json(
        { error: "Missing propertyId" },
        { status: 400 },
      );
    }

    const analysis = await AIPropertyAnalysisService.getAnalysis(propertyId);

    if (!analysis) {
      return NextResponse.json(
        { error: "Property not found" },
        { status: 404 },
      );
    }

    return jsonOk({
      propertyId,
      analysis,
    });
  } catch (error) {
    return jsonError(error, "AI analysis failed.");
  }
}
