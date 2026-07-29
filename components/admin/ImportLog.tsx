export default function ImportLog() {

    return (
  
      <div className="rounded-2xl border bg-white p-6">
  
        <h2 className="text-2xl font-bold">
          Import Activity
        </h2>
  
        <div className="mt-6 space-y-3">
  
          <Log
            time="10:31"
            message="Import engine ready."
          />
  
        </div>
  
      </div>
  
    );
  
  }
  
  function Log({
    time,
    message,
  }: {
    time: string;
    message: string;
  }) {
  
    return (
  
      <div className="flex gap-4">
  
        <span className="font-bold">
          {time}
        </span>
  
        <span>
          {message}
        </span>
  
      </div>
  
    );
  
  }