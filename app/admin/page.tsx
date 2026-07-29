import StatCard from "./components/StatCard";

export default function AdminPage() {
  return (
    <>
      <h1 className="mb-8 text-4xl font-bold">Dashboard</h1>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Properties" value="18,432" />

        <StatCard title="Images" value="57,892" />

        <StatCard title="Imports Today" value="642" />

        <StatCard title="System Health" value="Excellent" />
      </div>
    </>
  );
}
