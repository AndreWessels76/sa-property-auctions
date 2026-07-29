import type { ReactNode } from "react";

export default function TableHeader({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <thead className="bg-slate-50">

      <tr>{children}</tr>

    </thead>
  );
}
