import { NextRequest, NextResponse } from "next/server";
import { PermissionService } from "@/lib/auth";
import { AciCommandCentreService } from "@/lib/services/AciCommandCentreService";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    await PermissionService.requireAdmin();
    const ids = request.nextUrl.searchParams.getAll("id");
    const csv = request.nextUrl.searchParams.get("ids");
    const all = [
      ...ids,
      ...(csv ? csv.split(",") : []),
    ];
    const compare = await AciCommandCentreService.compare(all);
    return NextResponse.json(compare);
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unauthorized" },
      { status: 401 },
    );
  }
}
