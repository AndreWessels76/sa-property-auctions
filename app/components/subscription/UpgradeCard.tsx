"use client";

import { Button, Card } from "@/components/ui";

type Props = {
  title?: string;
  description?: string;
  onUpgrade?: () => void;
};

export default function UpgradeCard({
  title = "Premium Feature",
  description = "Upgrade to Premium to unlock this feature.",
  onUpgrade,
}: Props) {
  return (
    <Card className="text-center">

      <div className="text-6xl">
        🔒
      </div>

      <h2 className="mt-5 text-2xl font-bold">
        {title}
      </h2>

      <p className="mt-3 text-slate-500">
        {description}
      </p>

      <Button
        className="mt-8"
        onClick={onUpgrade}
      >
        Upgrade to Premium
      </Button>

    </Card>
  );
}
