import { NextResponse } from "next/server";
import { PermissionService } from "@/lib/auth";
import { AciCommandCentreService } from "@/lib/services/AciCommandCentreService";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await PermissionService.requireAdmin();
    const { id } = await context.params;
    const research = await AciCommandCentreService.research(id);
    if (!research.ok) {
      return NextResponse.json(research, { status: research.status });
    }
    return NextResponse.json(research);
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unauthorized" },
      { status: 401 },
    );
  }
}
