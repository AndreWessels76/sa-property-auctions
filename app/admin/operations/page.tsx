import LiveStatCard from "./components/LiveStatCard";
import HealthPanel from "./components/HealthPanel";
import ActivityFeed from "./components/ActivityFeed";
import QuickActions from "./components/QuickActions";
import ImportStatus from "./components/ImportStatus";
import InvestorOpsPanels from "./components/InvestorOpsPanels";
import DueDiligenceExtractionPanel from "./components/DueDiligenceExtractionPanel";
import SourceRefreshQueue from "./components/SourceRefreshQueue";
import PricingAcquisitionPanel from "./components/PricingAcquisitionPanel";

export default function OperationsPage() {
  return (
    <div>

      <h1 className="mb-8 text-4xl font-bold">
        Live Operations Centre
      </h1>

      <div className="mb-8 grid gap-6 md:grid-cols-2 xl:grid-cols-4">

        <LiveStatCard
          title="Properties"
          value="18,432"
          change="+245 Today"
          color="green"
        />

        <LiveStatCard
          title="Images"
          value="57,892"
          change="+612 Today"
        />

        <LiveStatCard
          title="Merged Records"
          value="842"
          color="yellow"
        />

        <LiveStatCard
          title="Failed Imports"
          value="3"
          color="red"
        />

      </div>

      <div className="grid gap-6 lg:grid-cols-3">

        <div className="space-y-6 lg:col-span-2">

          <ImportStatus />

          <ActivityFeed />

        </div>

        <div className="space-y-6">

          <HealthPanel />

          <QuickActions />

        </div>

      </div>

      <InvestorOpsPanels />

      <SourceRefreshQueue />

      <PricingAcquisitionPanel />

      <DueDiligenceExtractionPanel />

    </div>
  );
}

