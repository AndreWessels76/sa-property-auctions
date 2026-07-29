"use client";

import { Card, Badge, Button } from "@/components/ui";
import { openBillingPortal } from "@/lib/billing/startCheckout";

type Props = {
  plan: string;
  status: string;
  expiresAt?: string | null;
  onManage?: () => void;
};

export default function SubscriptionCard({
  plan,
  status,
  expiresAt,
  onManage = () => {
    void openBillingPortal();
  },
}: Props) {
  return (
    <Card>

      <div className="flex items-center justify-between">

        <div>

          <div className="text-sm text-slate-500">
            Current Plan
          </div>

          <div className="mt-1 text-3xl font-bold">
            {plan}
          </div>

        </div>

        <Badge
          variant={
            status === "active"
              ? "success"
              : "warning"
          }
        >
          {status}
        </Badge>

      </div>

      {expiresAt && (
        <p className="mt-4 text-sm text-slate-500">
          Renews on {expiresAt}
        </p>
      )}

      <Button
        variant="secondary"
        className="mt-6"
        onClick={onManage}
      >
        Manage Subscription
      </Button>

    </Card>
  );
}
