import type { ReactNode } from "react";

export default function TableCell({
  children,
  header = false,
}: {
  children: ReactNode;
  header?: boolean;
}) {
  if (header) {
    return (
      <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">
        {children}
      </th>
    );
  }

  return (
    <td className="px-6 py-4 text-sm">
      {children}
    </td>
  );
}