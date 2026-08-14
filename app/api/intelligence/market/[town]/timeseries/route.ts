import { NextRequest } from "next/server";
import { jsonError, jsonOk } from "@/lib/api/http";
import { clientIp, rateLimit } from "@/lib/api/rateLimit";
import { OutcomeIntelligenceService } from "@/lib/services/OutcomeIntelligenceService";
import { InvestorIntelligence45Service } from "@/lib/services/InvestorIntelligence45Service";

type RouteContext = {
  params: Promise<{ town: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const limited = rateLimit({
      key: `market-ts:${clientIp(request)}`,
      limit: 30,
      windowMs: 60_000,
    });
    if (limited) return limited;

    const { town } = await context.params;
    const decoded = decodeURIComponent(town ?? "").trim();
    if (!decoded) {
      return jsonOk({ error: "Town required" }, { status: 400 });
    }
    const data = await OutcomeIntelligenceService.timeSeriesForTown(decoded);
    const investor45 = await InvestorIntelligence45Service.forTownTimeSeries(decoded, "monthly");
    return jsonOk({ ...data, investorIntelligence45: investor45 });
  } catch (error) {
    return jsonError(error, "Town time series failed");
  }
}
