export type SubscriptionPlan =
  | "free"
  | "premium_monthly"
  | "premium_yearly";

export type SubscriptionStatus =
  | "inactive"
  | "trial"
  | "active"
  | "past_due"
  | "cancelled"
  | "expired";

export interface UserSubscription {
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  expiresAt?: string | null;
  customerId?: string | null;
  subscriptionId?: string | null;
}

export const SUBSCRIPTIONS = {
  ACTIVE: "active",
  INACTIVE: "inactive",
  TRIAL: "trial",
  PAST_DUE: "past_due",
  CANCELLED: "cancelled",
  EXPIRED: "expired",
} as const satisfies Record<string, SubscriptionStatus>;

export function normalizeSubscription(raw: unknown): SubscriptionStatus {
  const value =
    typeof raw === "string" ? raw.trim().toLowerCase() : undefined;

  switch (value) {
    case "active":
      return SUBSCRIPTIONS.ACTIVE;
    case "trial":
    case "trialing":
      return SUBSCRIPTIONS.TRIAL;
    case "past_due":
      return SUBSCRIPTIONS.PAST_DUE;
    case "expired":
      return SUBSCRIPTIONS.EXPIRED;
    case "cancelled":
    case "canceled":
      return SUBSCRIPTIONS.CANCELLED;
    case "inactive":
    default:
      return SUBSCRIPTIONS.INACTIVE;
  }
}

export function isPremiumStatus(status: SubscriptionStatus | null | undefined) {
  return status === SUBSCRIPTIONS.ACTIVE || status === SUBSCRIPTIONS.TRIAL;
}
