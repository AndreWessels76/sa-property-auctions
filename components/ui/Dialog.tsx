"use client";

import type { ReactNode } from "react";

type Props = {
  open: boolean;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  onClose: () => void;
  size?: "sm" | "md" | "lg" | "xl";
};

const sizes = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-2xl",
};

export default function Dialog({
  open,
  title,
  children,
  footer,
  onClose,
  size = "md",
}: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6">

      <div
        className={`w-full ${sizes[size]} rounded-2xl bg-white shadow-2xl`}
      >

        <div className="flex items-center justify-between border-b p-6">

          <h2 className="text-2xl font-semibold">
            {title}
          </h2>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 transition hover:bg-slate-100"
          >
            ✕
          </button>

        </div>

        <div className="p-6">
          {children}
        </div>

        {footer && (
          <div className="flex justify-end gap-3 border-t p-6">
            {footer}
          </div>
        )}

      </div>

    </div>
  );
}
