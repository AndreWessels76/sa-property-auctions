interface Props {

    title: string;
  
    value: number;
  
    color: string;
  
  }
  
  export default function QueueCard({
  
    title,
  
    value,
  
    color,
  
  }: Props) {
  
    return (
  
      <div
        className={`rounded-2xl border-l-4 ${color} bg-white p-6 shadow`}
      >
  
        <div className="text-sm text-slate-500">
  
          {title}
  
        </div>
  
        <div className="mt-2 text-4xl font-bold">
  
          {value}
  
        </div>
  
      </div>
  
    );
  
  }