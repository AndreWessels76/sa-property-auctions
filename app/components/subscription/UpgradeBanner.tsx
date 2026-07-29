"use client";

import { Button } from "@/components/ui";

type Props = {
  onUpgrade?: () => void;
};

export default function UpgradeBanner({
  onUpgrade,
}: Props) {
  return (
    <div className="mb-8 overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-700 p-8 text-white shadow-lg">

      <h2 className="text-3xl font-bold">
        Unlock Premium
      </h2>

      <p className="mt-3 max-w-2xl text-blue-100">
        Unlimited saved searches, instant alerts,
        unlimited property access, AI insights and
        premium analytics.
      </p>

      <Button
        className="mt-6 bg-white text-blue-700 hover:bg-slate-100"
        onClick={onUpgrade}
      >
        Upgrade Now
      </Button>

    </div>
  );
}
