import { NextRequest } from "next/server";
import { jsonError, jsonOk } from "@/lib/api/http";
import { clientIp, rateLimit } from "@/lib/api/rateLimit";
import { HistoricalIntelligenceService } from "@/lib/services/HistoricalIntelligenceService";

export async function GET(request: NextRequest) {
  try {
    const limited = rateLimit({
      key: `hist-intel:${clientIp(request)}`,
      limit: 40,
      windowMs: 60_000,
    });
    if (limited) return limited;

    const url = new URL(request.url);
    const window = HistoricalIntelligenceService.parseWindow(
      url.searchParams.get("window"),
    );
    const data = await HistoricalIntelligenceService.marketReport({ window });
    return jsonOk(data);
  } catch (error) {
    return jsonError(error, "Historical intelligence failed");
  }
}
