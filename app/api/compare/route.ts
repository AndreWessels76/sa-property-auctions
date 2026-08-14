import { NextRequest } from "next/server";
import { PropertyService } from "@/lib/services";
import { jsonError, jsonOk } from "@/lib/api/http";
import { clientIp, rateLimit } from "@/lib/api/rateLimit";
import { SubscriptionService } from "@/lib/subscription/SubscriptionService";
import { parseCompareIds } from "@/lib/compare/compareSelection";
import { applyCompareAccess, compareLimit } from "@/lib/intelligence/compareAccess";
import { buildPropertyComparison } from "@/lib/intelligence/propertyComparison";

export async function GET(request: NextRequest) {
  try {
    const limited = rateLimit({
      key: `compare:${clientIp(request)}`,
      limit: 60,
      windowMs: 60_000,
    });
    if (limited) return limited;

    const ids = parseCompareIds(request.nextUrl.searchParams.get("ids"));
    const premium = await SubscriptionService.premium();
    const allowed = applyCompareAccess(ids, premium);
    const loaded = await PropertyService.getByIds(allowed, 1, allowed.length);
    const comparison = buildPropertyComparison(loaded.data, {
      premium,
      limit: compareLimit(premium),
    });

    return jsonOk({
      premium,
      requested: ids.length,
      comparison,
    });
  } catch (error) {
    return jsonError(error, "Comparison failed");
  }
}
