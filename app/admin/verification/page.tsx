import VerificationDashboardClient from "./components/VerificationDashboardClient";

export default function AdminVerificationPage() {
  return (
    <div>
      <h1 className="mb-2 text-4xl font-bold">Verification</h1>
      <p className="mb-8 text-slate-600">
        Admin-only workflow for listing verification, duplicates, import
        audit, and quality statistics.
      </p>
      <VerificationDashboardClient />
    </div>
  );
}
