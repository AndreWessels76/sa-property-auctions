import type { ReactNode } from "react";

export default function TableRow({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <tr className="border-t hover:bg-slate-50">
      {children}
    </tr>
  );
}
