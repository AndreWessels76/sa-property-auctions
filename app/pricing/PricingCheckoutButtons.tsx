"use client";

import { Button } from "@/components/ui";
import { startCheckout } from "@/lib/billing/startCheckout";
import type { BillingInterval } from "@/lib/billing/BillingTypes";

export default function PricingCheckoutButtons({
  interval,
}: {
  interval: BillingInterval;
}) {
  return (
    <Button
      className="mt-6 w-full"
      onClick={() => startCheckout(interval)}
    >
      {interval === "monthly" ? "Choose Monthly" : "Choose Yearly"}
    </Button>
  );
}
