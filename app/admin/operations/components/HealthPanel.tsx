const services: Array<[string, boolean]> = [
  ["Database", true],
  ["Supabase Storage", true],
  ["Import Engine", true],
  ["Merge Engine", true],
  ["Image Pipeline", true],
  ["Scheduler", true],
];

export default function HealthPanel() {
  return (
    <div className="rounded-2xl bg-white p-6 shadow">

      <h2 className="mb-5 text-xl font-bold">
        System Health
      </h2>

      <div className="space-y-4">

        {services.map(([name, ok]) => (

          <div
            key={name}
            className="flex items-center justify-between"
          >

            <span>{name}</span>

            <span
              className={`rounded-full px-3 py-1 text-sm font-semibold ${
                ok
                  ? "bg-green-100 text-green-700"
                  : "bg-red-100 text-red-700"
              }`}
            >
              {ok ? "Online" : "Offline"}
            </span>

          </div>

        ))}

      </div>

    </div>
  );
}
