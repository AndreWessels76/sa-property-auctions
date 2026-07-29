interface LiveStatCardProps {
    title: string;
    value: string | number;
    change?: string;
    color?: "green" | "blue" | "yellow" | "red";
  }
  
  const colors = {
    green: "border-green-500",
    blue: "border-blue-500",
    yellow: "border-yellow-500",
    red: "border-red-500",
  };
  
  export default function LiveStatCard({
    title,
    value,
    change,
    color = "blue",
  }: LiveStatCardProps) {
    return (
      <div
        className={`rounded-2xl border-l-4 ${colors[color]} bg-white p-6 shadow`}
      >
        <p className="text-sm text-slate-500">{title}</p>
  
        <h2 className="mt-3 text-4xl font-bold">
          {value}
        </h2>
  
        {change && (
          <p className="mt-2 text-sm text-green-600">
            {change}
          </p>
        )}
      </div>
    );
  }