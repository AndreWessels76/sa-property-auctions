import { NextRequest } from "next/server";
import { jsonError, jsonOk } from "@/lib/api/http";
import { clientIp, rateLimit } from "@/lib/api/rateLimit";
import { HistoricalIntelligence42Service } from "@/lib/services/HistoricalIntelligence42Service";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const limited = rateLimit({
      key: `hi42-evidence:${clientIp(request)}`,
      limit: 40,
      windowMs: 60_000,
    });
    if (limited) return limited;

    const { id } = await context.params;
    const data = await HistoricalIntelligence42Service.evidenceById(id);
    if (!data) {
      return jsonError(new Error("Evidence not found"), "Not found");
    }
    return jsonOk(data);
  } catch (error) {
    return jsonError(error, "Historical evidence resolution failed");
  }
}
