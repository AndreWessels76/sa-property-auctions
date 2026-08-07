"use server";

import { SessionService } from "@/lib/auth/SessionService";
import {
  InvestorWorkspaceService,
  SmartAlertService,
} from "@/lib/services/InvestorWorkspaceService";
import { SubscriptionService } from "@/lib/subscription/SubscriptionService";

async function requirePremiumUser() {
  try {
    const user = await SessionService.requireUser();
    await SubscriptionService.requirePremium();
    return { ok: true as const, userId: user.id };
  } catch {
    return { ok: false as const, error: "Premium sign-in required" };
  }
}

export async function createWorkspaceNoteAction(input: {
  propertyId: string;
  body: string;
  title?: string;
}) {
  const auth = await requirePremiumUser();
  if (!auth.ok) return auth;
  if (!input.body.trim()) return { ok: false as const, error: "Note required" };

  const row = await InvestorWorkspaceService.createNote({
    userId: auth.userId,
    propertyId: input.propertyId,
    body: input.body.trim(),
    title: input.title ?? null,
  });
  if (!row) return { ok: false as const, error: "Workspace unavailable" };
  return { ok: true as const };
}

export async function upsertWorkspaceTrackerAction(input: {
  propertyId: string;
  viewingDate?: string | null;
  registrationStatus?: string | null;
  legalStatus?: string | null;
  settlementStatus?: string | null;
}) {
  const auth = await requirePremiumUser();
  if (!auth.ok) return auth;

  const row = await InvestorWorkspaceService.upsertTracker({
    userId: auth.userId,
    propertyId: input.propertyId,
    viewingDate: input.viewingDate,
    registrationStatus: input.registrationStatus,
    legalStatus: input.legalStatus,
    settlementStatus: input.settlementStatus,
  });
  if (!row) return { ok: false as const, error: "Workspace unavailable" };
  return { ok: true as const };
}

export async function createSmartAlertRuleAction(input: {
  name: string;
  province?: string;
  town?: string;
  agency?: string;
  propertyType?: string;
  maxPrice?: number;
  daysUntilAuction?: number;
}) {
  const auth = await requirePremiumUser();
  if (!auth.ok) return auth;
  if (!input.name.trim()) return { ok: false as const, error: "Name required" };

  const row = await SmartAlertService.createRule(auth.userId, {
    name: input.name.trim(),
    is_active: true,
    province: input.province || null,
    town: input.town || null,
    agency: input.agency || null,
    property_type: input.propertyType || null,
    max_price: input.maxPrice ?? null,
    days_until_auction: input.daysUntilAuction ?? null,
    channels: ["email"],
  });
  if (!row) return { ok: false as const, error: "Alerts unavailable" };
  return { ok: true as const };
}
