import { NextResponse } from "next/server";

import { SessionService } from "@/lib/auth/SessionService";
import { SavedSearchService } from "@/lib/services/SavedSearchService";
import type { SavedSearchDTO } from "@/lib/dto/SavedSearchDTO";
import { ApiError, jsonError, jsonOk } from "@/lib/api/http";
import { clientIp, rateLimit } from "@/lib/api/rateLimit";

export async function GET(request: Request) {
  try {
    const user = await SessionService.requireUser();

    const limited = rateLimit({
      key: `saved-searches:list:${user.id}:${clientIp(request)}`,
      limit: 60,
      windowMs: 60_000,
    });

    if (limited) {
      return limited;
    }

    const searches = await SavedSearchService.getUserSearches(user.id);

    return jsonOk(searches);
  } catch (error) {
    return jsonError(error, "Failed to load saved searches");
  }
}

export async function POST(request: Request) {
  try {
    const user = await SessionService.requireUser();

    const limited = rateLimit({
      key: `saved-searches:create:${user.id}:${clientIp(request)}`,
      limit: 20,
      windowMs: 60_000,
    });

    if (limited) {
      return limited;
    }

    const body = (await request.json()) as Omit<
      SavedSearchDTO,
      "id" | "createdAt" | "userId"
    >;

    if (!body.name?.trim()) {
      return NextResponse.json(
        { error: "Search name is required" },
        { status: 400 },
      );
    }

    try {
      const search = await SavedSearchService.createSearch({
        userId: user.id,
        name: body.name,
        filters: body.filters,
        active: body.active,
      });

      return jsonOk(search, { status: 201 });
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === "This search already exists."
      ) {
        throw new ApiError(409, "This search already exists.");
      }

      throw error;
    }
  } catch (error) {
    return jsonError(error, "Failed to create saved search");
  }
}
