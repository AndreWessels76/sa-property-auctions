import { NextRequest } from "next/server";
import { jsonError, jsonOk } from "@/lib/api/http";
import { clientIp, rateLimit } from "@/lib/api/rateLimit";
import { HistoricalIntelligenceService } from "@/lib/services/HistoricalIntelligenceService";
import { OutcomeIntelligenceService } from "@/lib/services/OutcomeIntelligenceService";

export async function GET(request: NextRequest) {
  try {
    const limited = rateLimit({
      key: `market:${clientIp(request)}`,
      limit: 40,
      windowMs: 60_000,
    });
    if (limited) return limited;

    const window = HistoricalIntelligenceService.parseWindow(
      new URL(request.url).searchParams.get("window"),
    );
    const data = await OutcomeIntelligenceService.marketOverview(window);
    return jsonOk(data);
  } catch (error) {
    return jsonError(error, "Market intelligence failed");
  }
}
