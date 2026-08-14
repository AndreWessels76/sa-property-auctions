import LiveOperationsMetrics from "./components/LiveOperationsMetrics";
import HealthPanel from "./components/HealthPanel";
import ActivityFeed from "./components/ActivityFeed";
import QuickActions from "./components/QuickActions";
import InvestorOpsPanels from "./components/InvestorOpsPanels";
import DueDiligenceExtractionPanel from "./components/DueDiligenceExtractionPanel";
import SourceRefreshQueue from "./components/SourceRefreshQueue";
import PricingAcquisitionPanel from "./components/PricingAcquisitionPanel";
import HistoricalIntelligencePanel from "./components/HistoricalIntelligencePanel";
import HistoricalOutcomeAuditPanel from "./components/HistoricalOutcomeAuditPanel";
import HistoricalDataAcquisition40Panel from "./components/HistoricalDataAcquisition40Panel";
import HistoricalIntelligence40Panel from "./components/HistoricalIntelligence40Panel";
import HistoricalResolution42Panel from "./components/HistoricalResolution42Panel";
import HistoricalEvidenceAcquisition43Panel from "./components/HistoricalEvidenceAcquisition43Panel";
import HistoricalEvidenceQuality44Panel from "./components/HistoricalEvidenceQuality44Panel";
import InvestorIntelligence46Panel from "./components/InvestorIntelligence46Panel";
import InvestorIntelligence47Panel from "./components/InvestorIntelligence47Panel";
import HistoricalSourceCoverage48Panel from "./components/HistoricalSourceCoverage48Panel";
import HistoricalSourceAcquisition49Panel from "./components/HistoricalSourceAcquisition49Panel";
import HistoricalIntelligence50Panel from "./components/HistoricalIntelligence50Panel";
import HistoricalIntelligence51Panel from "./components/HistoricalIntelligence51Panel";
import HistoricalIntelligence52Panel from "./components/HistoricalIntelligence52Panel";
import PropertyHistoryBackfillPanel from "./components/PropertyHistoryBackfillPanel";

export default function OperationsPage() {
  return (
    <div>

      <h1 className="mb-8 text-4xl font-bold">
        Live Operations Centre
      </h1>

      <LiveOperationsMetrics />

      <div className="grid gap-6 lg:grid-cols-3">

        <div className="space-y-6 lg:col-span-2">

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

      <HistoricalIntelligencePanel />

      <HistoricalOutcomeAuditPanel />

      <HistoricalDataAcquisition40Panel />

      <HistoricalIntelligence40Panel />

      <HistoricalResolution42Panel />

      <HistoricalEvidenceAcquisition43Panel />

      <HistoricalEvidenceQuality44Panel />

      <InvestorIntelligence46Panel />

      <InvestorIntelligence47Panel />

      <HistoricalSourceCoverage48Panel />

      <HistoricalSourceAcquisition49Panel />

      <HistoricalIntelligence50Panel />

      <HistoricalIntelligence51Panel />

      <HistoricalIntelligence52Panel />

      <PropertyHistoryBackfillPanel />

      <DueDiligenceExtractionPanel />

    </div>
  );
}
