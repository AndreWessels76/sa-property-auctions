import { NextRequest } from "next/server";
import { jsonError, jsonOk } from "@/lib/api/http";
import { clientIp, rateLimit } from "@/lib/api/rateLimit";
import { AuctionPriceIntelligenceService } from "@/lib/services/AuctionPriceIntelligenceService";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const limited = rateLimit({
      key: `pricing-intel:${clientIp(_request)}`,
      limit: 60,
      windowMs: 60_000,
    });
    if (limited) return limited;

    const { id } = await context.params;
    if (!id?.trim()) {
      return jsonOk({ error: "Property id required" }, { status: 400 });
    }

    const result = await AuctionPriceIntelligenceService.forPublicProperty(id);
    if (!result.ok) {
      return jsonOk({ error: result.error }, { status: result.status });
    }

    return jsonOk({
      intelligence: result.intelligence,
      premium: result.intelligence.premium,
    });
  } catch (error) {
    return jsonError(error, "Auction price intelligence failed");
  }
}
