export const SubscriptionPlans = {
  FREE: {
    id: "free",
    name: "Free",
    propertyLimit: 25,
    alerts: 3,
    savedSearches: 5,
    premium: false,
  },

  PREMIUM_MONTHLY: {
    id: "premium_monthly",
    name: "Premium Monthly",
    propertyLimit: Infinity,
    alerts: Infinity,
    savedSearches: Infinity,
    premium: true,
  },

  PREMIUM_YEARLY: {
    id: "premium_yearly",
    name: "Premium Yearly",
    propertyLimit: Infinity,
    alerts: Infinity,
    savedSearches: Infinity,
    premium: true,
  },
} as const;
