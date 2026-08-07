import type { PropertyDTO } from "@/lib/dto/PropertyDTO";

/**
 * Smart Auction Alerts — deterministic rule matching.
 * No fabricated triggers.
 */

export type SmartAlertRule = {
  id?: string;
  user_id?: string;
  name: string;
  is_active?: boolean;
  province?: string | null;
  town?: string | null;
  agency?: string | null;
  property_type?: string | null;
  max_price?: number | null;
  days_until_auction?: number | null;
  channels?: string[];
};

export type SmartAlertMatch = {
  ruleName: string;
  propertyId: string;
  title: string;
  reasons: string[];
};

function daysUntil(auctionDate: string | null | undefined, now: Date): number | null {
  if (!auctionDate) return null;
  const d = new Date(auctionDate);
  if (Number.isNaN(d.getTime())) return null;
  const a = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const b = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return Math.round((a - b) / (24 * 60 * 60 * 1000));
}

export function matchSmartAlertRule(
  property: PropertyDTO,
  rule: SmartAlertRule,
  now = new Date(),
): SmartAlertMatch | null {
  if (rule.is_active === false) return null;
  const reasons: string[] = [];

  if (rule.province?.trim()) {
    if ((property.province || "").toLowerCase() !== rule.province.trim().toLowerCase()) {
      return null;
    }
    reasons.push(`Province: ${rule.province}`);
  }
  if (rule.town?.trim()) {
    if ((property.town || "").toLowerCase() !== rule.town.trim().toLowerCase()) {
      return null;
    }
    reasons.push(`Town: ${rule.town}`);
  }
  if (rule.agency?.trim()) {
    const agency = `${property.auction_agency || ""} ${property.source_name || ""}`.toLowerCase();
    if (!agency.includes(rule.agency.trim().toLowerCase())) return null;
    reasons.push(`Agency matches ${rule.agency}`);
  }
  if (rule.property_type?.trim()) {
    const t = (property.property_type || "").toLowerCase();
    if (!t.includes(rule.property_type.trim().toLowerCase())) return null;
    reasons.push(`Type: ${rule.property_type}`);
  }
  if (typeof rule.max_price === "number" && rule.max_price > 0) {
    const price = property.auction_price ?? property.reserve_price;
    if (typeof price !== "number" || price <= 0 || price > rule.max_price) return null;
    reasons.push(`Price ≤ R${rule.max_price.toLocaleString("en-ZA")}`);
  }
  if (typeof rule.days_until_auction === "number" && rule.days_until_auction >= 0) {
    const days = daysUntil(property.auction_date, now);
    if (days == null || days < 0 || days > rule.days_until_auction) return null;
    reasons.push(`Auction within ${rule.days_until_auction} days`);
  }

  if (reasons.length === 0) {
    // Empty rule would match everything — reject to avoid noise
    return null;
  }

  return {
    ruleName: rule.name,
    propertyId: property.id,
    title: property.title || "Auction property",
    reasons,
  };
}

export function evaluateSmartAlertRules(
  property: PropertyDTO,
  rules: SmartAlertRule[],
  now = new Date(),
): SmartAlertMatch[] {
  return rules
    .map((r) => matchSmartAlertRule(property, r, now))
    .filter((m): m is SmartAlertMatch => Boolean(m));
}
