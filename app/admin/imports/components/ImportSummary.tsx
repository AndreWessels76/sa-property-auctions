import StatCard from "@/app/admin/components/StatCard";

export default function ImportSummary() {
  return (
    <div className="grid gap-6 md:grid-cols-4">
      <StatCard title="Imported Today" value="532" />

      <StatCard title="Merged" value="42" />

      <StatCard title="Images" value="187" />

      <StatCard title="Errors" value="3" />
    </div>
  );
}
