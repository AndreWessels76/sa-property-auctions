"use client";

import ImportButton from "./ImportButton";
import { useImportContext } from "./ImportContext";

type Props = {
  source: string;
};

export default function ImportCard({ source }: Props) {
  const { imports } = useImportContext();
  const state = imports[source];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold text-navy-900">{source}</h3>
          <p className="mt-1 text-sm text-slate-500">
            Status: {state?.status ?? "Ready"}
          </p>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
          {state?.properties ?? 0} properties
        </span>
      </div>

      <p className="mt-4 text-sm text-slate-600">
        Last run: {state?.lastRun ?? "Never"}
      </p>

      <ImportButton source={source} />
    </div>
  );
}
