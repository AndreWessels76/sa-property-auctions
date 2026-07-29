export default function AdminHeader() {
  return (
    <header className="flex h-20 items-center justify-between border-b bg-white px-8">
      <div>
        <h2 className="text-2xl font-bold">Operations Centre</h2>
        <p className="text-slate-500">South Africa Property Auctions</p>
      </div>

      <div className="flex items-center gap-4">
        <div className="rounded-full bg-green-500 px-4 py-2 text-sm font-semibold text-white">
          System Healthy
        </div>
      </div>
    </header>
  );
}
