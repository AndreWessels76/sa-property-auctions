export default function ImportQueue() {
  return (
    <div className="rounded-2xl bg-white p-6 shadow">
      <h2 className="mb-5 text-xl font-bold">Import Queue</h2>

      <div className="h-5 overflow-hidden rounded-full bg-slate-200">
        <div className="h-full w-2/3 bg-green-500"></div>
      </div>

      <p className="mt-4 text-slate-600">
        Running
        <strong className="ml-2">65%</strong>
      </p>
    </div>
  );
}
