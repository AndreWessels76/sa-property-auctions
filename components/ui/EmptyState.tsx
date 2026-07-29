import type { ReactNode } from "react";

type Props = {
  icon?: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
};

export default function EmptyState({
  icon,
  title,
  description,
  action,
}: Props) {
  return (
    <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-10 py-20 text-center">

      <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-slate-100 text-4xl">

        {icon ?? "📭"}

      </div>

      <h2 className="mt-8 text-3xl font-bold">
        {title}
      </h2>

      <p className="mx-auto mt-4 max-w-xl text-slate-500">
        {description}
      </p>

      {action && (
        <div className="mt-10">
          {action}
        </div>
      )}

    </div>
  );
}
