import type { PropertyDTO } from "@/lib/dto/PropertyDTO";
import { isPubliclyActiveListing } from "@/lib/data/publicListingPolicy";

export type WorkspaceTracker = {
  property_id?: string | null;
  registration_status?: string | null;
  legal_status?: string | null;
  settlement_status?: string | null;
  viewing_date?: string | null;
};

export type WorkspaceNote = {
  id?: string;
  property_id?: string | null;
  title?: string | null;
  body?: string | null;
  updated_at?: string | null;
};

export type WorkspaceAlert = {
  id: string;
  title: string;
  message: string | null;
  created_at: string;
  property_id: string | null;
  read: boolean;
};

export type InvestorDashboard = {
  watchlist: PropertyDTO[];
  upcoming: PropertyDTO[];
  thisWeek: PropertyDTO[];
  historicalRetained: PropertyDTO[];
  attention: Array<{
    propertyId: string;
    title: string;
    reasons: string[];
  }>;
  notes: WorkspaceNote[];
  alerts: WorkspaceAlert[];
  trackers: WorkspaceTracker[];
};

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function daysUntil(iso: string | null, now: Date): number | null {
  if (!iso) return null;
  const auction = new Date(iso);
  if (Number.isNaN(auction.getTime())) return null;
  return Math.round(
    (startOfDay(auction).getTime() - startOfDay(now).getTime()) /
      (24 * 60 * 60 * 1000),
  );
}

export function buildInvestorDashboard(input: {
  properties: PropertyDTO[];
  notes: WorkspaceNote[];
  trackers: WorkspaceTracker[];
  alerts: WorkspaceAlert[];
  now?: Date;
}): InvestorDashboard {
  const now = input.now ?? new Date();
  const upcoming = input.properties.filter((p) =>
    isPubliclyActiveListing({
      verification_state: p.verification_state,
      listing_status: p.listing_status,
      status: p.status,
      auction_date: p.auction_date,
      now,
    }),
  );
  const thisWeek = upcoming.filter((p) => {
    const days = daysUntil(p.auction_date, now);
    return days != null && days >= 0 && days <= 7;
  });
  const historicalRetained = input.properties.filter(
    (p) => !upcoming.some((u) => u.id === p.id),
  );

  const attention: InvestorDashboard["attention"] = [];
  for (const property of input.properties) {
    const tracker = input.trackers.find((t) => t.property_id === property.id);
    const reasons: string[] = [];
    const publicUpcoming = upcoming.some((u) => u.id === property.id);
    if (publicUpcoming && !tracker?.registration_status?.trim()) {
      reasons.push("Registration status not tracked");
    }
    if (publicUpcoming && !tracker?.legal_status?.trim()) {
      reasons.push("Legal / due diligence status not tracked");
    }
    if (reasons.length) {
      attention.push({
        propertyId: property.id,
        title: property.title,
        reasons,
      });
    }
  }

  return {
    watchlist: input.properties,
    upcoming,
    thisWeek,
    historicalRetained,
    attention,
    notes: input.notes.slice(0, 12),
    alerts: input.alerts.slice(0, 12),
    trackers: input.trackers,
  };
}
