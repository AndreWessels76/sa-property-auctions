import { NextResponse } from "next/server";
import { PermissionService } from "@/lib/auth/PermissionService";
import { refreshPropertyCache } from "@/lib/services";
import { importers } from "@/lib/importers";
import { BiddersChoiceImporter } from "@/lib/importers/biddersChoice";
import { jsonError, jsonOk } from "@/lib/api/http";
import { clientIp, rateLimit } from "@/lib/api/rateLimit";
import { LoggerService } from "@/lib/logger";

export async function POST(request: Request) {
  try {
    await PermissionService.requireAdmin();

    const limited = rateLimit({
      key: `admin:imports:${clientIp(request)}`,
      limit: 5,
      windowMs: 60_000,
    });

    if (limited) {
      return limited;
    }

    const body = (await request.json()) as {
      source?: string;
      listingUrls?: string[];
      licensedRows?: Record<string, unknown>[];
      allowPublicFetch?: boolean;
      maxListings?: number;
    };
    const source = body.source?.trim();

    if (!source) {
      return NextResponse.json(
        { error: "Missing source" },
        { status: 400 },
      );
    }

    const importer = importers[source as keyof typeof importers];

    if (!importer) {
      return NextResponse.json(
        { error: "Importer not found." },
        { status: 404 },
      );
    }

    LoggerService.import("Admin import started", { source });

    let result;
    if (source === "BiddersChoice" && importer instanceof BiddersChoiceImporter) {
      result = await importer.sync({
        listingUrls: body.listingUrls,
        licensedRows: body.licensedRows,
        allowPublicFetch: body.allowPublicFetch === true,
        maxListings: body.maxListings,
      });
    } else {
      result = await importer.sync();
    }

    await refreshPropertyCache();

    LoggerService.import("Admin import completed", { source });

    return jsonOk(result);
  } catch (error) {
    return jsonError(error, "Import failed unexpectedly.");
  }
}
