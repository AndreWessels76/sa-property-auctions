export default function ImportStatus() {
    return (
      <div className="rounded-2xl bg-white p-6 shadow">
  
        <h2 className="mb-5 text-xl font-bold">
          Import Queue
        </h2>
  
        <div className="mb-4 h-4 overflow-hidden rounded-full bg-slate-200">
  
          <div className="h-full w-3/4 bg-green-500"></div>
  
        </div>
  
        <p className="text-slate-600">
          75% Complete
        </p>
  
      </div>
    );
  }