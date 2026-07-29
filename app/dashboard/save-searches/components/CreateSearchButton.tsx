"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import type { PropertySearchDTO } from "@/lib/dto/PropertySearchDTO";
import CreateSearchDialog from "./CreateSearchDialog";

type Props = {
  filters?: PropertySearchDTO;
  onSaved?: () => void;
  label?: string;
};

export default function CreateSearchButton({
  filters = {},
  onSaved,
  label = "+ New Search",
}: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>{label}</Button>

      <CreateSearchDialog
        open={open}
        onClose={() => setOpen(false)}
        filters={filters}
        onSaved={onSaved}
      />
    </>
  );
}
