import { NextResponse } from "next/server";
import { AuctionEvidenceDossierService } from "@/lib/services/AuctionEvidenceDossierService";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * Public property dossier API — wraps existing intelligence orchestration.
 * Catalogue safety inherited from PropertyService.getProperty.
 */
export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const result = await AuctionEvidenceDossierService.forProperty(id);
    if (!result.ok) {
      return NextResponse.json(
        { ok: false, error: result.error },
        { status: result.status },
      );
    }

    return NextResponse.json({
      ok: true,
      dossier: result.dossier,
      reportVersion: result.report.version,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Failed to load dossier",
        code: "LIVE_DATA_UNAVAILABLE",
      },
      { status: 503 },
    );
  }
}
