export type BillingInterval = "monthly" | "yearly";

export type CheckoutRequest = {
  userId: string;
  email: string;
  interval: BillingInterval;
};

export type CheckoutResponse = {
  url: string;
};

export type BillingPortalResponse = {
  url: string;
};
