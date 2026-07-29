import type { ReactNode } from "react";

type Props = {
  title: string;
  description?: string;
  action?: ReactNode;
};

export default function PageHeader({
  title,
  description,
  action,
}: Props) {
  return (
    <div className="mb-10 flex flex-col gap-6 border-b border-slate-200 pb-6 md:flex-row md:items-center md:justify-between">

      <div>

        <h1 className="text-4xl font-bold tracking-tight text-slate-900">
          {title}
        </h1>

        {description && (
          <p className="mt-2 max-w-2xl text-base text-slate-500">
            {description}
          </p>
        )}

      </div>

      {action && (
        <div className="flex shrink-0 items-center">
          {action}
        </div>
      )}

    </div>
  );
}
