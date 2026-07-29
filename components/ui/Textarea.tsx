"use client";

import { forwardRef, TextareaHTMLAttributes } from "react";

type Props = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  error?: string;
};

const Textarea = forwardRef<
  HTMLTextAreaElement,
  Props
>(({ className = "", error, ...props }, ref) => {
  return (
    <div>

      <textarea
        ref={ref}
        {...props}
        className={`
          min-h-[120px]
          w-full
          rounded-xl
          border
          border-slate-300
          px-4
          py-3
          outline-none
          transition
          focus:border-blue-500
          focus:ring-2
          focus:ring-blue-200
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
});

Textarea.displayName = "Textarea";

export default Textarea;
