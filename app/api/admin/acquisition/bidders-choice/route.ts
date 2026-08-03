import { NextResponse } from "next/server";
import { PermissionService } from "@/lib/auth/PermissionService";
import { PropertyAcquisitionEngine } from "@/lib/acquisition/PropertyAcquisitionEngine";
import { mapLicensedPayload } from "@/lib/connectors/biddersChoice/extractListing";
import { jsonError, jsonOk } from "@/lib/api/http";
import { clientIp, rateLimit } from "@/lib/api/rateLimit";

/**
 * Admin-only Bidders Choice acquisition run.
 * Body: { listingUrls?, licensedRows?, allowPublicFetch?, maxListings? }
 */
export async function POST(request: Request) {
  try {
    await PermissionService.requireAdmin();
    const limited = rateLimit({
      key: `admin:acquisition:${clientIp(request)}`,
      limit: 3,
      windowMs: 60_000,
    });
    if (limited) return limited;

    const body = (await request.json().catch(() => ({}))) as {
      listingUrls?: string[];
      licensedRows?: Record<string, unknown>[];
      allowPublicFetch?: boolean;
      maxListings?: number;
    };

    const licensedPayloads = body.licensedRows
      ?.map((row) => mapLicensedPayload(row))
      .filter((row): row is NonNullable<typeof row> => Boolean(row));

    if (
      !body.allowPublicFetch &&
      !(body.listingUrls && body.listingUrls.length) &&
      !(licensedPayloads && licensedPayloads.length)
    ) {
      return NextResponse.json(
        {
          error:
            "Provide listingUrls, licensedRows, or allowPublicFetch=true after robots/licence confirmation.",
        },
        { status: 400 },
      );
    }

    const engine = new PropertyAcquisitionEngine();
    const result = await engine.run({
      listingUrls: body.listingUrls,
      licensedPayloads,
      allowPublicFetch: body.allowPublicFetch === true,
      maxListings: body.maxListings ?? 40,
    });

    return jsonOk(result);
  } catch (error) {
    return jsonError(error, "Acquisition run failed.");
  }
}
