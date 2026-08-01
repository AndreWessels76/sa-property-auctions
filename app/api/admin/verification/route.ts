import { NextResponse } from "next/server";
import { PermissionService } from "@/lib/auth/PermissionService";
import { VerificationService } from "@/lib/services/VerificationService";
import { jsonError, jsonOk } from "@/lib/api/http";
import { clientIp, rateLimit } from "@/lib/api/rateLimit";
import type { VerificationState } from "@/lib/data/verificationStates";

export async function GET(request: Request) {
  try {
    await PermissionService.requireAdmin();

    const limited = rateLimit({
      key: `admin:verification:get:${clientIp(request)}`,
      limit: 30,
      windowMs: 60_000,
    });
    if (limited) return limited;

    const dashboard = await VerificationService.getDashboard();
    return jsonOk(dashboard);
  } catch (error) {
    return jsonError(error, "Failed to load verification dashboard.");
  }
}

export async function POST(request: Request) {
  try {
    await PermissionService.requireAdmin();

    const limited = rateLimit({
      key: `admin:verification:post:${clientIp(request)}`,
      limit: 20,
      windowMs: 60_000,
    });
    if (limited) return limited;

    const body = (await request.json()) as {
      propertyId?: string;
      verificationState?: VerificationState;
      reason?: string;
    };

    if (!body.propertyId || !body.verificationState) {
      return NextResponse.json(
        { error: "propertyId and verificationState are required." },
        { status: 400 },
      );
    }

    const updated = await VerificationService.setVerificationState(
      body.propertyId,
      body.verificationState,
      body.reason?.trim() || "Admin verification action",
    );

    return jsonOk({ property: updated });
  } catch (error) {
    return jsonError(error, "Verification update failed.");
  }
}
