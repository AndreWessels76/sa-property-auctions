import type { ReactNode } from "react";

export default function Grid({
  children,
  columns = 3,
}: {
  children: ReactNode;
  columns?: 2 | 3 | 4;
}) {
  const map = {
    2: "md:grid-cols-2",
    3: "lg:grid-cols-3",
    4: "xl:grid-cols-4",
  };

  return (
    <div
      className={`grid gap-6 ${map[columns]}`}
    >
      {children}
    </div>
  );
}
