import { NextResponse } from "next/server";

import type { PropertySearchDTO } from "@/lib/dto/PropertySearchDTO";
import { SessionService } from "@/lib/auth/SessionService";
import { SavedSearchRepository } from "@/lib/repositories/SavedSearchRepository";
import { SavedSearchService } from "@/lib/services/SavedSearchService";
import { jsonError, jsonOk } from "@/lib/api/http";
import { clientIp, rateLimit } from "@/lib/api/rateLimit";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  try {
    await SessionService.requireUser();

    const limited = rateLimit({
      key: `saved-searches:get:${clientIp(request)}`,
      limit: 60,
      windowMs: 60_000,
    });

    if (limited) {
      return limited;
    }

    const { id } = await context.params;
    const search = await SavedSearchRepository.findById(id);

    if (!search) {
      return NextResponse.json(
        { error: "Saved search not found" },
        { status: 404 },
      );
    }

    return jsonOk(search);
  } catch (error) {
    return jsonError(error, "Failed to load saved search");
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    await SessionService.requireUser();

    const limited = rateLimit({
      key: `saved-searches:patch:${clientIp(request)}`,
      limit: 30,
      windowMs: 60_000,
    });

    if (limited) {
      return limited;
    }

    const { id } = await context.params;
    const body = (await request.json()) as {
      name?: string;
      active?: boolean;
      filters?: PropertySearchDTO;
    };

    if (body.name != null && body.active == null && body.filters == null) {
      await SavedSearchService.rename(id, body.name);
    } else if (body.active != null && body.name == null && body.filters == null) {
      await SavedSearchService.setActive(id, body.active);
    } else {
      const search = await SavedSearchRepository.update(id, body);
      return jsonOk(search);
    }

    const search = await SavedSearchRepository.findById(id);

    if (!search) {
      return NextResponse.json(
        { error: "Saved search not found" },
        { status: 404 },
      );
    }

    return jsonOk(search);
  } catch (error) {
    return jsonError(error, "Failed to update saved search");
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    await SessionService.requireUser();

    const limited = rateLimit({
      key: `saved-searches:delete:${clientIp(request)}`,
      limit: 30,
      windowMs: 60_000,
    });

    if (limited) {
      return limited;
    }

    const { id } = await context.params;

    await SavedSearchService.delete(id);

    return jsonOk({ success: true });
  } catch (error) {
    return jsonError(error, "Failed to delete saved search");
  }
}
