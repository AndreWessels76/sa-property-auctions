import { PermissionService } from "@/lib/auth/PermissionService";
import { SessionService } from "@/lib/auth/SessionService";
import { jsonError, jsonOk } from "@/lib/api/http";
import { clientIp, rateLimit } from "@/lib/api/rateLimit";
import { SourceRefetchService } from "@/lib/services/SourceRefetchService";

type RefetchAction =
  | "refresh_property"
  | "refresh_batch"
  | "refresh_upcoming"
  | "property_status"
  | "queue"
  | "enrich_from_snapshot";

/**
 * Admin Source Re-fetch API.
 * Never bypasses license/robots. Never auto-verifies.
 */
export async function POST(request: Request) {
  try {
    await PermissionService.requireAdmin();

    const limited = rateLimit({
      key: `admin:source-refetch:${clientIp(request)}`,
      limit: 10,
      windowMs: 60_000,
    });
    if (limited) return limited;

    const body = (await request.json()) as {
      action?: RefetchAction;
      propertyId?: string;
      partnerCode?: string;
      connectorId?: string;
      scope?: "property" | "partner" | "connector" | "upcoming" | "all_eligible";
      limit?: number;
      force?: boolean;
      snapshotId?: string;
      refetchRunCode?: string;
    };

    const user = await SessionService.currentUser();
    const operator = user?.email ?? "admin";

    if (body.action === "refresh_property") {
      if (!body.propertyId) {
        return jsonOk({ error: "propertyId required" }, { status: 400 });
      }
      const result = await SourceRefetchService.refreshProperty({
        propertyId: body.propertyId,
        force: body.force === true,
        operator,
      });
      return jsonOk(result);
    }

    if (body.action === "refresh_upcoming" || body.action === "refresh_batch") {
      const scope =
        body.action === "refresh_upcoming"
          ? "upcoming"
          : (body.scope ?? "upcoming");
      const result = await SourceRefetchService.refreshBatch({
        scope,
        propertyId: body.propertyId,
        partnerCode: body.partnerCode,
        connectorId: body.connectorId,
        limit: body.limit,
        force: body.force === true,
        operator,
      });
      return jsonOk(result);
    }

    if (body.action === "property_status") {
      if (!body.propertyId) {
        return jsonOk({ error: "propertyId required" }, { status: 400 });
      }
      const status = await SourceRefetchService.propertyRefreshStatus(
        body.propertyId,
      );
      return jsonOk(status);
    }

    if (body.action === "queue") {
      const rows = await SourceRefetchService.queueRows(body.limit ?? 40);
      return jsonOk({ rows });
    }

    if (body.action === "enrich_from_snapshot") {
      if (!body.propertyId) {
        return jsonOk({ error: "propertyId required" }, { status: 400 });
      }
      const result = await SourceRefetchService.enrichFromSnapshot({
        propertyId: body.propertyId,
        snapshotId: body.snapshotId,
        refetchRunCode: body.refetchRunCode,
        operator,
      });
      return jsonOk(result);
    }

    return jsonOk({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    return jsonError(error, "Source refetch failed.");
  }
}

export async function GET(request: Request) {
  try {
    await PermissionService.requireAdmin();
    const url = new URL(request.url);
    const propertyId = url.searchParams.get("propertyId");
    if (propertyId) {
      const status = await SourceRefetchService.propertyRefreshStatus(propertyId);
      return jsonOk(status);
    }
    const rows = await SourceRefetchService.queueRows(40);
    return jsonOk({ rows });
  } catch (error) {
    return jsonError(error, "Source refetch queue failed.");
  }
}
