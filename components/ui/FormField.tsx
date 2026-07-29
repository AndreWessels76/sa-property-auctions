import type { ReactNode } from "react";

type Props = {
  label: string;
  required?: boolean;
  hint?: string;
  children: ReactNode;
};

export default function FormField({
  label,
  required,
  hint,
  children,
}: Props) {
  return (
    <div className="space-y-2">

      <label className="block text-sm font-semibold">

        {label}

        {required && (
          <span className="ml-1 text-red-500">
            *
          </span>
        )}

      </label>

      {children}

      {hint && (
        <p className="text-sm text-slate-500">
          {hint}
        </p>
      )}

    </div>
  );
}
