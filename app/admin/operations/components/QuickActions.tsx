export default function QuickActions() {
    return (
      <div className="rounded-2xl bg-white p-6 shadow">
  
        <h2 className="mb-5 text-xl font-bold">
          Quick Actions
        </h2>
  
        <div className="grid gap-3">
  
          <button className="rounded-xl bg-gold-500 py-3 font-semibold">
            Run All Imports
          </button>
  
          <button className="rounded-xl border py-3">
            Run Sheriff Import
          </button>
  
          <button className="rounded-xl border py-3">
            Open Sources
          </button>
  
          <button className="rounded-xl border py-3">
            View Analytics
          </button>
  
        </div>
  
      </div>
    );
  }