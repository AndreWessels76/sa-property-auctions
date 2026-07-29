import type { ReactNode } from "react";

type Props = {
  title?: string;
  description?: string;
  children: ReactNode;
};

export default function Section({
  title,
  description,
  children,
}: Props) {
  return (
    <section className="mb-10">

      {(title || description) && (
        <div className="mb-5">

          {title && (
            <h2 className="text-2xl font-semibold text-slate-900">
              {title}
            </h2>
          )}

          {description && (
            <p className="mt-1 text-slate-500">
              {description}
            </p>
          )}

        </div>
      )}

      {children}

    </section>
  );
}
