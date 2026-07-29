import {
  SessionService,
  PermissionService,
} from "@/lib/auth";
import { getDashboardStats } from "@/lib/admin/dashboard";

export default async function Dashboard() {
  await SessionService.requireUser();
  await PermissionService.requireAdmin();

  const stats = await getDashboardStats();
  const averageQuality = Number(stats.averageQuality ?? 0);
  const health = systemHealth(averageQuality);

  return (
    <main className="mx-auto max-w-7xl p-10">
      <h1 className="mb-10 text-4xl font-bold">Data Quality Dashboard</h1>

      <div className="mb-8 rounded-2xl border bg-white p-8 shadow-sm">
        <div className="text-slate-500">System Health</div>
        <div className={`mt-3 text-3xl font-bold ${health.color}`}>
          {health.emoji} {health.label}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card title="Properties" value={stats.properties} />
        <Card title="Images" value={stats.images} />
        <Card title="Merged Records" value={stats.merges} />
        <Card
          title="Average Property Score"
          value={averageQuality}
        />
      </div>
    </main>
  );
}

function systemHealth(score: number) {
  if (score >= 90)
    return {
      label: "Excellent",
      emoji: "🟢",
      color: "text-green-600",
    };

  if (score >= 75)
    return {
      label: "Healthy",
      emoji: "🔵",
      color: "text-blue-600",
    };

  if (score >= 60)
    return {
      label: "Needs Attention",
      emoji: "🟡",
      color: "text-yellow-600",
    };

  return {
    label: "Critical",
    emoji: "🔴",
    color: "text-red-600",
  };
}

function Card({
  title,
  value,
}: {
  title: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border bg-white p-8 shadow-sm">
      <div className="text-slate-500">{title}</div>
      <div className="mt-3 text-4xl font-bold">
        {Number(value ?? 0).toLocaleString()}
      </div>
    </div>
  );
}
