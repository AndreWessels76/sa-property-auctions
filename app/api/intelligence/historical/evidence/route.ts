import { NextRequest } from "next/server";
import { jsonError, jsonOk } from "@/lib/api/http";
import { clientIp, rateLimit } from "@/lib/api/rateLimit";
import { HistoricalIntelligence40Service } from "@/lib/services/HistoricalIntelligence40Service";

export async function GET(request: NextRequest) {
  try {
    const limited = rateLimit({
      key: `hi40-evidence:${clientIp(request)}`,
      limit: 40,
      windowMs: 60_000,
    });
    if (limited) return limited;

    const url = new URL(request.url);
    const propertyId = url.searchParams.get("propertyId");
    if (propertyId) {
      const data = await HistoricalIntelligence40Service.evidenceForProperty(propertyId);
      return jsonOk(data);
    }
    const data = await HistoricalIntelligence40Service.evidenceOverview();
    return jsonOk(data);
  } catch (error) {
    return jsonError(error, "Historical evidence intelligence failed");
  }
}
