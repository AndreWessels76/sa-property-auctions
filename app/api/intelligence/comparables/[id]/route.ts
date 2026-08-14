import { NextRequest } from "next/server";
import { jsonError, jsonOk } from "@/lib/api/http";
import { clientIp, rateLimit } from "@/lib/api/rateLimit";
import { ComparableIntelligenceService } from "@/lib/services/ComparableIntelligenceService";
import { presentComparables } from "@/lib/intelligence/investorIntelligence45";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const limited = rateLimit({
      key: `comparables:${clientIp(request)}`,
      limit: 40,
      windowMs: 60_000,
    });
    if (limited) return limited;

    const { id } = await context.params;
    if (!id?.trim()) {
      return jsonOk({ error: "Property id required" }, { status: 400 });
    }

    const result = await ComparableIntelligenceService.forProperty(id);
    if (!result.ok) {
      return jsonOk({ error: result.error }, { status: result.status });
    }

    return jsonOk({
      data: {
        comparables: result.comparables,
        marketEvidence: result.marketEvidence,
        masterHistory: result.masterHistory,
        timeline: result.timeline,
        investorIntelligence45: {
          presentations: presentComparables(result.comparables.comparables),
        },
      },
      confidence: result.comparables.confidence,
      sampleSize: result.comparables.sampleSize,
      limitations: result.limitations,
      premium: result.premium,
      provenance: {
        calculation_version: result.comparables.version,
        cache_key: result.comparables.cacheKey,
      },
    });
  } catch (error) {
    return jsonError(error, "Comparable intelligence failed");
  }
}
