/**
 * Public display pricing — amounts match Stripe Price objects:
 * STRIPE_PRICE_MONTHLY = R99.00 (9900 ZAR cents)
 * STRIPE_PRICE_YEARLY  = R990.00 (99000 ZAR cents)
 *
 * Keep in sync when Stripe prices change.
 */
export const PUBLIC_PRICING = {
  currency: "ZAR",
  monthly: {
    amountZar: 99,
    intervalLabel: "month",
    display: "R99",
    displayPer: "R99 / month",
  },
  yearly: {
    amountZar: 990,
    intervalLabel: "year",
    display: "R990",
    displayPer: "R990 / year",
  },
} as const;

export function yearlySavingsZar(): number {
  return PUBLIC_PRICING.monthly.amountZar * 12 - PUBLIC_PRICING.yearly.amountZar;
}

export function formatZar(amount: number): string {
  return new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export const PREMIUM_FEATURES = [
  "AI-powered natural-language search",
  "AI property insights and analytics",
  "Unlimited property browsing within plan rules",
  "Unlimited alerts and saved searches",
  "Priority access to new catalogue features",
] as const;

export const FREE_FEATURES = [
  "Browse the auction catalogue",
  "Basic keyword and filter search",
  "Limited alerts and saved searches",
  "Favourites on this device",
] as const;
