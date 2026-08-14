import { NextRequest } from "next/server";
import { jsonError, jsonOk } from "@/lib/api/http";
import { clientIp, rateLimit } from "@/lib/api/rateLimit";
import { HistoricalIntelligenceService } from "@/lib/services/HistoricalIntelligenceService";

type RouteContext = {
  params: Promise<{ town: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const limited = rateLimit({
      key: `hist-area:${clientIp(request)}`,
      limit: 40,
      windowMs: 60_000,
    });
    if (limited) return limited;

    const { town } = await context.params;
    const decoded = decodeURIComponent(town ?? "").trim();
    if (!decoded) {
      return jsonOk({ error: "Town required" }, { status: 400 });
    }
    const window = HistoricalIntelligenceService.parseWindow(
      new URL(request.url).searchParams.get("window"),
    );
    const data = await HistoricalIntelligenceService.forArea(decoded, window);
    return jsonOk(data);
  } catch (error) {
    return jsonError(error, "Area historical intelligence failed");
  }
}
