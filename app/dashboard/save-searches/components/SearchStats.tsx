import StatCard from "@/components/ui/StatCard";

type Props = {
  total: number;
  active: number;
  paused: number;
  thisWeek: number;
};

export default function SearchStats({
  total,
  active,
  paused,
  thisWeek,
}: Props) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard title="Saved Searches" value={total} />

      <StatCard title="Active" value={active} color="green" />

      <StatCard title="Paused" value={paused} color="yellow" />

      <StatCard title="Created This Week" value={thisWeek} color="blue" />
    </div>
  );
}
