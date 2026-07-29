"use client";

import type { ButtonHTMLAttributes } from "react";

export default function IconButton({
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className="
      flex
      h-10
      w-10
      items-center
      justify-center
      rounded-xl
      transition
      hover:bg-slate-100
      "
    >
      {children}
    </button>
  );
}
