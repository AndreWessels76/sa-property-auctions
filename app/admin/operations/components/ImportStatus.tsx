type Props = {
  percentage: number;
  label: string;
  total: number;
  completed: number;
  failed: number;
};

export default function ImportStatus({
  percentage,
  label,
  total,
  completed,
  failed,
}: Props) {
  const width = total === 0 ? 0 : Math.min(100, Math.max(0, percentage));

  return (
    <div className="rounded-2xl bg-white p-6 shadow">
      <h2 className="mb-5 text-xl font-bold">Import Queue</h2>

      <div className="mb-4 h-4 overflow-hidden rounded-full bg-slate-200">
        <div
          className={`h-full transition-all ${failed > 0 && completed === 0 ? "bg-red-500" : "bg-green-500"}`}
          style={{ width: `${width}%` }}
        />
      </div>

      <p className="text-slate-600">{label}</p>

      {total > 0 ? (
        <p className="mt-2 text-xs text-slate-400">
          {completed} completed · {failed} failed · {total} total
        </p>
      ) : null}
    </div>
  );
}
