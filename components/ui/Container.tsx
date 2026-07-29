import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  size?: "sm" | "md" | "lg" | "xl" | "full";
  className?: string;
};

const sizes = {
  sm: "max-w-3xl",
  md: "max-w-5xl",
  lg: "max-w-7xl",
  xl: "max-w-screen-2xl",
  full: "max-w-full",
};

export default function Container({
  children,
  size = "lg",
  className = "",
}: Props) {
  return (
    <main
      className={`
        mx-auto
        w-full
        px-6
        py-8
        ${sizes[size]}
        ${className}
      `}
    >
      {children}
    </main>
  );
}
