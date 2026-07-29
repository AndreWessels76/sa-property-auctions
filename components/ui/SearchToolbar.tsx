import type { ReactNode } from "react";

export default function SearchToolbar({
  search,
  filters,
  actions,
}: {
  search?: ReactNode;
  filters?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

      <div className="flex flex-1 gap-3">
        {search}
        {filters}
      </div>

      {actions && (
        <div className="flex gap-3">
          {actions}
        </div>
      )}

    </div>
  );
}
