"use client";

import { SelectHTMLAttributes } from "react";

type Option = {
  label: string;
  value: string;
};

type Props = SelectHTMLAttributes<HTMLSelectElement> & {
  options: Option[];
  error?: string;
};

export default function Select({
  options,
  error,
  className = "",
  ...props
}: Props) {
  return (
    <div>

      <select
        {...props}
        className={`
          w-full
          rounded-xl
          border
          border-slate-300
          bg-white
          px-4
          py-3
          outline-none
          transition
          focus:border-blue-500
          focus:ring-2
          focus:ring-blue-200
          ${className}
        `}
      >
        {options.map(option => (
          <option
            key={option.value}
            value={option.value}
          >
            {option.label}
          </option>
        ))}
      </select>

      {error && (
        <p className="mt-2 text-sm text-red-600">
          {error}
        </p>
      )}

    </div>
  );
}
