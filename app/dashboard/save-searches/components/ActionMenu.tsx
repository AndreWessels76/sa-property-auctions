"use client";

import { useTransition } from "react";
import {
  activateSavedSearch,
  pauseSavedSearch,
} from "../actions";

type Props = {
  id: string;
  active: boolean;
  onToggled?: () => void;
};

export default function ActionMenu({ id, active, onToggled }: Props) {
  const [pending, startTransition] = useTransition();

  function toggle() {
    startTransition(async () => {
      try {
        if (active) {
          await pauseSavedSearch(id);
        } else {
          await activateSavedSearch(id);
        }

        onToggled?.();
      } catch (error) {
        alert(
          error instanceof Error
            ? error.message
            : "Failed to update saved search.",
        );
      }
    });
  }

  return (
    <button
      type="button"
      disabled={pending}
      onClick={toggle}
      className={`rounded-xl px-4 py-2 text-sm font-medium text-white transition disabled:opacity-50 ${
        active
          ? "bg-amber-500 hover:bg-amber-600"
          : "bg-green-600 hover:bg-green-700"
      }`}
    >
      {pending ? "Saving..." : active ? "Pause" : "Activate"}
    </button>
  );
}
