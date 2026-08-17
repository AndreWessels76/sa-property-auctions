import { NextResponse } from "next/server";
import { PermissionService } from "@/lib/auth";
import { AciCommandCentreService } from "@/lib/services/AciCommandCentreService";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await PermissionService.requireAdmin();
    const market = await AciCommandCentreService.market();
    return NextResponse.json(market);
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unauthorized" },
      { status: 401 },
    );
  }
}
