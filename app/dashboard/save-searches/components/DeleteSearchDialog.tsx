"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button, Dialog } from "@/components/ui";
import { deleteSavedSearch } from "../actions";

type Props = {
  id: string;
  name: string;
  open: boolean;
  onClose: () => void;
  onDeleted?: () => void;
};

export default function DeleteSearchDialog({
  id,
  name,
  open,
  onClose,
  onDeleted,
}: Props) {
  const [pending, startTransition] = useTransition();

  function remove() {
    startTransition(async () => {
      try {
        await deleteSavedSearch(id);
        toast.success("Search deleted.");
        onDeleted?.();
        onClose();
      } catch {
        toast.error("Could not delete search.");
      }
    });
  }

  return (
    <Dialog
      open={open}
      title="Delete Search"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={pending}>
            Cancel
          </Button>

          <Button variant="danger" onClick={remove} disabled={pending}>
            {pending ? "Deleting..." : "Delete"}
          </Button>
        </>
      }
    >
      <p className="text-slate-500">
        Delete &quot;{name}&quot; permanently?
      </p>
    </Dialog>
  );
}
