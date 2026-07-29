import { NextRequest } from "next/server";
import { PropertyService } from "@/lib/services";
import {
  hasPropertySearchFilters,
  parsePropertySearchParams,
} from "@/lib/properties/parsePropertySearchParams";
import { jsonError, jsonOk } from "@/lib/api/http";
import { clientIp, rateLimit } from "@/lib/api/rateLimit";

export async function GET(request: NextRequest) {
  try {
    const limited = rateLimit({
      key: `properties:list:${clientIp(request)}`,
      limit: 120,
      windowMs: 60_000,
    });

    if (limited) {
      return limited;
    }

    const filters = parsePropertySearchParams(request.nextUrl.searchParams);

    const properties = hasPropertySearchFilters(filters)
      ? await PropertyService.search(filters)
      : await PropertyService.getProperties();

    return jsonOk(properties);
  } catch (error) {
    return jsonError(error, "Failed to load properties");
  }
}
