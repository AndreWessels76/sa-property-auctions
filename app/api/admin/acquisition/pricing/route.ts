import { NextResponse } from "next/server";
import { PermissionService } from "@/lib/auth";
import { buildPricingCoverageReport } from "@/lib/acquisition/pricing/pricingCoverage";
import {
  applyPricingAdminAction,
  persistPricingObservations,
} from "@/lib/acquisition/pricing/pricingService";
import type { AdminPricingAction } from "@/lib/acquisition/pricing";
import { PricingObservationRepository } from "@/lib/repositories/PricingObservationRepository";
import { PropertyService } from "@/lib/services/PropertyService";

export async function GET() {
  try {
    await PermissionService.requireAdmin();
    const coverage = await buildPricingCoverageReport();
    const conflicts = await PricingObservationRepository.listOpenConflicts(40);
    return NextResponse.json({
      ok: true,
      generatedAt: new Date().toISOString(),
      coverage,
      conflicts,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unauthorized",
      },
      { status: 401 },
    );
  }
}

export async function POST(request: Request) {
  try {
    await PermissionService.requireAdmin();
    const body = (await request.json()) as {
      action?: string;
      propertyId?: string;
      observationId?: string;
      conflictId?: string;
    };

    if (body.action === "extract" && body.propertyId) {
      const property = await PropertyService.getProperty(body.propertyId);
      if (!property) {
        return NextResponse.json(
          { ok: false, error: "Property not found" },
          { status: 404 },
        );
      }
      const result = await persistPricingObservations({
        propertyId: property.id,
        corpus: {
          ...property,
          agricultural_details: property.agricultural_details as Record<
            string,
            unknown
          > | null,
          auction_price: property.auction_price,
          reserve_price: property.reserve_price,
          estimated_value: property.estimated_value,
        },
      });
      return NextResponse.json({ ok: true, result });
    }

    const reviewActions: AdminPricingAction[] = [
      "approve",
      "reject",
      "keep_existing",
      "mark_conflict",
      "request_refetch",
    ];
    if (body.action && reviewActions.includes(body.action as AdminPricingAction)) {
      const result = await applyPricingAdminAction({
        action: body.action as AdminPricingAction,
        observationId: body.observationId,
        conflictId: body.conflictId,
        operator: "admin",
      });
      return NextResponse.json({ ...result, ok: true });
    }

    return NextResponse.json({ ok: false, error: "Unknown action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unauthorized",
      },
      { status: 401 },
    );
  }
}
