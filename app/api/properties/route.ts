import { NextRequest } from "next/server";
import { PropertyService } from "@/lib/services";
import { parsePropertySearchParams } from "@/lib/properties/parsePropertySearchParams";
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

    const params = request.nextUrl.searchParams;
    const idsParam = params.get("ids")?.trim();

    if (idsParam) {
      const ids = idsParam
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean)
        .slice(0, 200);

      const page = Math.max(1, Number(params.get("page") ?? 1) || 1);
      const pageSize = Math.min(
        100,
        Math.max(
          1,
          Number(params.get("pageSize") ?? PropertyService.DEFAULT_PAGE_SIZE) ||
            PropertyService.DEFAULT_PAGE_SIZE,
        ),
      );

      const result = await PropertyService.getByIds(ids, page, pageSize);
      return jsonOk(result);
    }

    const filters = parsePropertySearchParams(params);
    const result = await PropertyService.search({
      ...filters,
      page: filters.page ?? 1,
      pageSize: filters.pageSize ?? PropertyService.DEFAULT_PAGE_SIZE,
      sort: filters.sort ?? "auction",
    });

    return jsonOk(result);
  } catch (error) {
    return jsonError(error, "Failed to load properties");
  }
}
