import type { ReactNode } from "react";
import Card from "./Card";

type Props = {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: ReactNode;
  color?: "default" | "green" | "blue" | "yellow" | "red";
};

const colors = {
  default: "text-slate-900",
  green: "text-green-600",
  blue: "text-blue-600",
  yellow: "text-yellow-600",
  red: "text-red-600",
};

export default function StatCard({
  title,
  value,
  subtitle,
  icon,
  color = "default",
}: Props) {
  return (
    <Card className="transition-all hover:-translate-y-1">

      <div className="flex items-center justify-between">

        <span className="text-sm font-medium text-slate-500">
          {title}
        </span>

        {icon && (
          <div className="text-2xl">
            {icon}
          </div>
        )}

      </div>

      <div className={`mt-4 text-4xl font-bold ${colors[color]}`}>
        {value}
      </div>

      {subtitle && (
        <div className="mt-2 text-sm text-slate-500">
          {subtitle}
        </div>
      )}

    </Card>
  );
}
