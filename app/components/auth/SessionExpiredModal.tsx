"use client";

import Link from "next/link";

type SessionExpiredModalProps = {
  open: boolean;
  onClose?: () => void;
};

export default function SessionExpiredModal({
  open,
  onClose,
}: SessionExpiredModalProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-navy-950/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="text-xl font-bold text-navy-900">Session expired</h2>
        <p className="mt-2 text-sm text-slate-600">
          Please sign in again to continue.
        </p>

        <div className="mt-6 flex justify-end gap-3">
          {onClose ? (
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm text-slate-600 hover:bg-slate-100"
            >
              Dismiss
            </button>
          ) : null}
          <Link
            href="/login"
            className="rounded-lg bg-navy-900 px-4 py-2 text-sm font-medium text-white"
          >
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
