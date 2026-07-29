import type {
  SubscriptionPlan,
  SubscriptionStatus,
} from "@/lib/subscription/types";

export type SubscriptionDTO = {
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  expiresAt: string | null;
  customerId: string | null;
  subscriptionId: string | null;
  premium: boolean;
};
