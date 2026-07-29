"use client";

import type { ButtonHTMLAttributes } from "react";

type Variant =
  | "primary"
  | "secondary"
  | "danger"
  | "success"
  | "ghost";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
};

const styles: Record<Variant, string> = {
  primary:
    "bg-black text-white hover:bg-slate-800",

  secondary:
    "border border-slate-300 bg-white text-slate-900 hover:bg-slate-100",

  danger:
    "bg-red-600 text-white hover:bg-red-700",

  success:
    "bg-green-600 text-white hover:bg-green-700",

  ghost:
    "text-slate-700 hover:bg-slate-100",
};

export default function Button({
  children,
  className = "",
  variant = "primary",
  disabled,
  ...props
}: Props) {
  return (
    <button
      {...props}
      disabled={disabled}
      className={`
        inline-flex
        items-center
        justify-center
        rounded-xl
        px-5
        py-3
        font-medium
        transition
        duration-200
        disabled:opacity-50
        disabled:cursor-not-allowed
        ${styles[variant]}
        ${className}
      `}
    >
      {children}
    </button>
  );
}
