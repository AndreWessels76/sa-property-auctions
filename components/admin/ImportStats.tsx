export default function ImportStats() {
  const stats = [
    { label: "Total Properties", value: "0" },
    { label: "Sources Connected", value: "4" },
    { label: "Last Import", value: "Never" },
    { label: "Failed Imports", value: "0" },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="rounded-2xl border border-slate-200 bg-white p-6"
        >
          <p className="text-sm font-medium text-slate-500">{stat.label}</p>
          <p className="mt-2 text-3xl font-extrabold text-navy-900">
            {stat.value}
          </p>
        </div>
      ))}
    </div>
  );
}
