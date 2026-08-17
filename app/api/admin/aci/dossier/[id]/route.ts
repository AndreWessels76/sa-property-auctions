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
    const dossier = await AciCommandCentreService.dossier(id);
    if (!dossier.ok) {
      return NextResponse.json(dossier, { status: dossier.status });
    }
    return NextResponse.json(dossier);
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unauthorized" },
      { status: 401 },
    );
  }
}
