import { NextResponse } from "next/server";
import { SessionService } from "@/lib/auth/SessionService";
import { PermissionService } from "@/lib/auth/PermissionService";
import { AIPropertySearchService } from "@/lib/services/AIPropertySearchService";
import { PropertyService } from "@/lib/services";
import { jsonError, jsonOk } from "@/lib/api/http";
import { clientIp, rateLimit } from "@/lib/api/rateLimit";

export async function POST(request: Request) {
  try {
    const user = await SessionService.requireUser();
    await PermissionService.requirePremium();

    const limited = rateLimit({
      key: `ai:property-search:${user.id}:${clientIp(request)}`,
      limit: 30,
      windowMs: 60_000,
    });

    if (limited) {
      return limited;
    }

    const body = (await request.json()) as { query?: string };
    const query = body.query?.trim();

    if (!query) {
      return NextResponse.json(
        { error: "Missing query" },
        { status: 400 },
      );
    }

    if (query.length > 500) {
      return NextResponse.json(
        { error: "Query is too long" },
        { status: 400 },
      );
    }

    const ai = await AIPropertySearchService.parse(query);
    const results = await PropertyService.search(ai.filters);

    return jsonOk({
      ...results,
      ai,
    });
  } catch (error) {
    return jsonError(error, "AI search failed");
  }
}
