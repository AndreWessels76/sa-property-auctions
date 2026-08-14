import { NextRequest } from "next/server";
import { jsonError, jsonOk } from "@/lib/api/http";
import { clientIp, rateLimit } from "@/lib/api/rateLimit";
import { OutcomeIntelligenceService } from "@/lib/services/OutcomeIntelligenceService";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const limited = rateLimit({
      key: `outcome-id:${clientIp(request)}`,
      limit: 60,
      windowMs: 60_000,
    });
    if (limited) return limited;

    const { id } = await context.params;
    if (!id?.trim()) {
      return jsonOk({ error: "Id required" }, { status: 400 });
    }
    const result = await OutcomeIntelligenceService.forEventOrProperty(id);
    if (!result.ok) {
      return jsonOk({ error: result.error }, { status: result.status });
    }
    return jsonOk(result);
  } catch (error) {
    return jsonError(error, "Outcome detail failed");
  }
}
