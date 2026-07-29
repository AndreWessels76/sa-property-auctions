"use client";

type Props = {
  checked: boolean;
  label: string;
  onChange: (checked: boolean) => void;
};

export default function Checkbox({
  checked,
  label,
  onChange,
}: Props) {
  return (
    <label className="flex cursor-pointer items-center gap-3">

      <input
        type="checkbox"
        checked={checked}
        onChange={(e) =>
          onChange(e.target.checked)
        }
        className="h-5 w-5 rounded border-slate-300"
      />

      <span>{label}</span>

    </label>
  );
}
