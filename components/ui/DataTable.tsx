import type { ReactNode } from "react";

export default function DataTable({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">

      <div className="overflow-x-auto">

        <table className="min-w-full">
          {children}
        </table>

      </div>

    </div>
  );
}
