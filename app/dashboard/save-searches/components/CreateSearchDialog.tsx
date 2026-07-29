"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { createSavedSearch } from "../actions";
import { useAuth } from "@/app/components/auth/AuthProvider";
import type { PropertySearchDTO } from "@/lib/dto/PropertySearchDTO";

type Props = {
  open: boolean;
  onClose: () => void;
  filters: PropertySearchDTO;
  onSaved?: () => void;
};

export default function CreateSearchDialog({
  open,
  onClose,
  filters,
  onSaved,
}: Props) {
  const { user } = useAuth();

  const [name, setName] = useState("");
  const [pending, startTransition] = useTransition();

  if (!open) {
    return null;
  }

  function save() {
    if (!user || !name.trim()) {
      return;
    }

    startTransition(async () => {
      try {
        await createSavedSearch(user.id, name.trim(), filters);
        toast.success("Search saved.");
        onSaved?.();
        onClose();
        setName("");
      } catch {
        toast.error("Could not save search.");
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-lg rounded-2xl bg-white p-8 shadow-xl">
        <h2 className="text-2xl font-bold">Save Search</h2>

        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Pretoria Family Homes"
          className="mt-6 w-full rounded-xl border p-3"
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
            onClick={save}
            className="rounded-xl bg-black px-5 py-2 text-white disabled:opacity-50"
          >
            {pending ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
