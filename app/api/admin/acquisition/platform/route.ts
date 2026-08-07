import { NextResponse } from "next/server";
import { PermissionService } from "@/lib/auth";
import { PartnershipPlatformService } from "@/lib/services/PartnershipPlatformService";

export async function GET() {
  try {
    await PermissionService.requireAdmin();
    const reports = await PartnershipPlatformService.buildExecutiveCsv();
    return NextResponse.json({
      ok: true,
      generatedAt: new Date().toISOString(),
      reports,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unauthorized",
      },
      { status: 401 },
    );
  }
}

export async function POST(request: Request) {
  try {
    await PermissionService.requireAdmin();
    const body = (await request.json()) as {
      action?: string;
      partnerId?: string;
      connectorId?: string;
      importMethod?: string;
    };

    if (body.action === "sync_registry") {
      const result = await PartnershipPlatformService.syncRegistryFromPlugins();
      return NextResponse.json({ ok: true, result });
    }

    if (body.action === "begin_import") {
      const started = await PartnershipPlatformService.beginImport({
        partnerId: body.partnerId,
        connectorId: body.connectorId,
        importMethod: (body.importMethod as "manual") || "manual",
      });
      return NextResponse.json({ ok: true, ...started });
    }

    if (body.action === "licence_alerts") {
      const count = await PartnershipPlatformService.raiseLicenceAlerts();
      return NextResponse.json({ ok: true, alertsCreated: count });
    }

    return NextResponse.json({ ok: false, error: "Unknown action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unauthorized",
      },
      { status: 401 },
    );
  }
}
