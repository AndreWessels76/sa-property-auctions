"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { renameSavedSearch } from "../actions";

type Props = {
  id: string;
  currentName: string;
  open: boolean;
  onClose: () => void;
  onRenamed?: () => void;
};

export default function RenameSearchDialog({
  id,
  currentName,
  open,
  onClose,
  onRenamed,
}: Props) {
  const [name, setName] = useState(currentName);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (open) {
      setName(currentName);
    }
  }, [open, currentName]);

  if (!open) {
    return null;
  }

  function rename() {
    const trimmed = name.trim();

    if (!trimmed || trimmed === currentName) {
      onClose();
      return;
    }

    startTransition(async () => {
      try {
        await renameSavedSearch(id, trimmed);
        onRenamed?.();
        onClose();
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Failed to rename saved search.",
        );
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-lg rounded-2xl bg-white p-8">
        <h2 className="text-2xl font-bold">Rename Search</h2>

        <input
          className="mt-6 w-full rounded-xl border p-3"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />

        <div className="mt-8 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border px-5 py-2"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={pending || !name.trim()}
            onClick={rename}
            className="rounded-xl bg-black px-5 py-2 text-white disabled:opacity-50"
          >
            {pending ? "Renaming..." : "Rename"}
          </button>
        </div>
      </div>
    </div>
  );
}
