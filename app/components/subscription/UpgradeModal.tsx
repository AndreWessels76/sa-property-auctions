"use client";

import Dialog from "@/components/ui/Dialog";
import Button from "@/components/ui/Button";
import { startCheckout } from "@/lib/billing/startCheckout";

type Props = {
  open: boolean;
  onClose: () => void;
  onMonthly?: () => void;
  onYearly?: () => void;
};

export default function UpgradeModal({
  open,
  onClose,
  onMonthly = () => startCheckout("monthly"),
  onYearly = () => startCheckout("yearly"),
}: Props) {
  return (
    <Dialog
      open={open}
      title="Upgrade to Premium"
      onClose={onClose}
      size="lg"
    >
      <div className="space-y-6">

        <div className="rounded-xl border p-6">

          <h3 className="text-xl font-semibold">
            Premium Monthly
          </h3>

          <p className="mt-2 text-slate-500">
            Unlimited access billed monthly.
          </p>

          <Button
            className="mt-5 w-full"
            onClick={onMonthly}
          >
            Choose Monthly
          </Button>

        </div>

        <div className="rounded-xl border border-blue-500 bg-blue-50 p-6">

          <h3 className="text-xl font-semibold">
            Premium Yearly
          </h3>

          <p className="mt-2 text-slate-500">
            Save with annual billing.
          </p>

          <Button
            className="mt-5 w-full"
            onClick={onYearly}
          >
            Choose Yearly
          </Button>

        </div>

      </div>
    </Dialog>
  );
}
