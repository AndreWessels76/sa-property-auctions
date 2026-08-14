import { NextRequest } from "next/server";
import { jsonError, jsonOk } from "@/lib/api/http";
import { clientIp, rateLimit } from "@/lib/api/rateLimit";
import { InvestorIntelligence46Service } from "@/lib/services/InvestorIntelligence46Service";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const limited = rateLimit({
      key: `investor46:${clientIp(request)}`,
      limit: 40,
      windowMs: 60_000,
    });
    if (limited) return limited;

    const { id } = await context.params;
    if (!id?.trim()) {
      return jsonOk({ error: "Property id required" }, { status: 400 });
    }

    const result = await InvestorIntelligence46Service.forProperty(id);
    if (!result.ok) {
      return jsonOk({ error: result.error }, { status: result.status });
    }

    return jsonOk({
      data: result.result,
      provenance: {
        calculation_version: result.result.version46,
        calculation_version_45: result.result.version,
        cache_key: result.result.cacheKey46,
        cache_key_45: result.result.cacheKey,
        calculated_at: result.result.calculatedAt,
      },
    });
  } catch (error) {
    return jsonError(error, "Investor intelligence failed");
  }
}
