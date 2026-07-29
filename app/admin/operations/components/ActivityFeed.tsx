const activities = [
    "Sheriff Import Started",
    "245 Properties Imported",
    "18 Records Merged",
    "54 Images Downloaded",
    "ABSA Import Completed",
  ];
  
  export default function ActivityFeed() {
    return (
      <div className="rounded-2xl bg-white p-6 shadow">
  
        <h2 className="mb-5 text-xl font-bold">
          Live Activity
        </h2>
  
        <div className="space-y-4">
  
          {activities.map((item, i) => (
  
            <div
              key={i}
              className="border-l-2 border-gold-500 pl-4"
            >
  
              <p className="text-xs text-slate-500">
                {new Date().toLocaleTimeString()}
              </p>
  
              <p>{item}</p>
  
            </div>
  
          ))}
  
        </div>
  
      </div>
    );
  }