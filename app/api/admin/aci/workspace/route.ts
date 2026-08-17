import { NextRequest, NextResponse } from "next/server";
import { PermissionService } from "@/lib/auth";
import { AciCommandCentreService } from "@/lib/services/AciCommandCentreService";
import type { AciWorkspaceFilters } from "@/lib/aci/productLayer";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    await PermissionService.requireAdmin();
    const q = request.nextUrl.searchParams;
    const filters: AciWorkspaceFilters = {
      province: q.get("province"),
      town: q.get("town"),
      propertyType: q.get("propertyType"),
      evidenceState: q.get("evidenceState"),
      outcomeFilter: q.get("outcomeFilter") as AciWorkspaceFilters["outcomeFilter"],
      auctionDateFrom: q.get("auctionDateFrom"),
      auctionDateTo: q.get("auctionDateTo"),
    };
    const page = Number(q.get("page") ?? "1") || 1;
    const pageSize = Math.min(Number(q.get("pageSize") ?? "50") || 50, 100);
    const workspace = await AciCommandCentreService.workspace(filters, page, pageSize);
    return NextResponse.json(workspace);
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unauthorized" },
      { status: 401 },
    );
  }
}
