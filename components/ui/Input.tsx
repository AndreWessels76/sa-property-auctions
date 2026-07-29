"use client";

import { forwardRef, InputHTMLAttributes } from "react";

type Props = InputHTMLAttributes<HTMLInputElement> & {
  error?: string;
};

const Input = forwardRef<HTMLInputElement, Props>(
  ({ className = "", error, ...props }, ref) => {
    return (
      <div className="w-full">
        <input
          ref={ref}
          {...props}
          className={`
            w-full
            rounded-xl
            border
            px-4
            py-3
            text-sm
            transition
            outline-none
            placeholder:text-slate-400
            focus:border-blue-500
            focus:ring-2
            focus:ring-blue-200
            ${
              error
                ? "border-red-500"
                : "border-slate-300"
            }
            ${className}
          `}
        />

        {error && (
          <p className="mt-2 text-sm text-red-600">
            {error}
          </p>
        )}
      </div>
    );
  },
);

Input.displayName = "Input";

export default Input;
