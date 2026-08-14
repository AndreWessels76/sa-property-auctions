import { NextRequest } from "next/server";
import { jsonError, jsonOk } from "@/lib/api/http";
import { clientIp, rateLimit } from "@/lib/api/rateLimit";
import { HistoricalIntelligenceService } from "@/lib/services/HistoricalIntelligenceService";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const limited = rateLimit({
      key: `hist-prop:${clientIp(request)}`,
      limit: 60,
      windowMs: 60_000,
    });
    if (limited) return limited;

    const { id } = await context.params;
    if (!id?.trim()) {
      return jsonOk({ error: "Property id required" }, { status: 400 });
    }
    const result = await HistoricalIntelligenceService.forProperty(id);
    if (!result.ok) {
      return jsonOk({ error: result.error }, { status: result.status });
    }
    return jsonOk(result);
  } catch (error) {
    return jsonError(error, "Property historical intelligence failed");
  }
}
