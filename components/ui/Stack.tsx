import type { ReactNode } from "react";

const gaps = {
  2: "space-y-2",
  4: "space-y-4",
  6: "space-y-6",
  8: "space-y-8",
  10: "space-y-10",
} as const;

export default function Stack({
  children,
  gap = 6,
}: {
  children: ReactNode;
  gap?: 2 | 4 | 6 | 8 | 10;
}) {
  return (
    <div className={gaps[gap]}>
      {children}
    </div>
  );
}
