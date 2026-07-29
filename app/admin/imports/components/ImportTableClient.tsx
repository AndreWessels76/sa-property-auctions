"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, Play, RotateCcw, Settings } from "lucide-react";

type Source = {
  id: string;
  name: string;
  status?: string | null;
  last_run?: string | null;
  next_run?: string | null;
};

type Props = {
  sources: Source[];
};

function formatTime(value: string | null | undefined) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ImportTableClient({ sources }: Props) {
  const router = useRouter();
  const [runningId, setRunningId] = useState<string | null>(null);

  async function runSource(source: Source) {
    setRunningId(source.id);

    try {
      const response = await fetch("/api/imports/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: source.name,
          sourceId: source.id,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error ?? "Import failed");
      }

      alert(
        `${result.source}\n\nImported: ${result.imported}\n\nUpdated: ${result.updated}`,
      );

      router.refresh();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Import failed.");
      router.refresh();
    } finally {
      setRunningId(null);
    }
  }

  return (
    <div className="rounded-2xl bg-white shadow">
      <table className="w-full">
        <thead>
          <tr className="border-b bg-slate-50">
            <th className="p-4 text-left">Source</th>
            <th>Status</th>
            <th>Last Run</th>
            <th>Next Run</th>
            <th>Actions</th>
          </tr>
        </thead>

        <tbody>
          {sources.map((item) => (
            <tr key={item.id} className="border-b">
              <td className="p-4 font-semibold">{item.name}</td>
              <td>{item.status ?? "Idle"}</td>
              <td>{formatTime(item.last_run)}</td>
              <td>{formatTime(item.next_run)}</td>
              <td>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => runSource(item)}
                    disabled={runningId === item.id}
                    aria-label={`Run ${item.name}`}
                  >
                    {runningId === item.id ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <Play size={18} />
                    )}
                  </button>
                  <button type="button" aria-label={`Retry ${item.name}`}>
                    <RotateCcw size={18} />
                  </button>
                  <button type="button" aria-label={`Settings ${item.name}`}>
                    <Settings size={18} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
