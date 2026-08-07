import { bootstrapConnectorPlugins } from "@/lib/acquisition/connectorPluginRegistry";
import {
  createImportRunDraft,
  completeImportRun,
  appendAudit,
  type ImportMethod,
} from "@/lib/acquisition/orchestration";
import { defaultBiddersChoiceMapping } from "@/lib/acquisition/fieldMapping";
import {
  daysUntilLicenceExpiry,
  evaluatePublicDisplayPermission,
  ONBOARDING_STEPS,
} from "@/lib/acquisition/licensing";
import { buildAcquisitionQualityMonitor } from "@/lib/acquisition/qualityMonitor";
import {
  buildGeographicCoverageReport,
  provinceCoveragePercent,
} from "@/lib/acquisition/coverage";
import { buildGovernanceReport } from "@/lib/platform/dataGovernance";
import { PropertyRepository } from "@/lib/repositories";
import {
  AcquisitionAlertRepository,
  AcquisitionImportRepository,
  ConnectorRegistryRepository,
  PartnerLicenceRepository,
  PartnershipRepository,
  type AcquisitionPartnerRow,
} from "@/lib/repositories/PartnershipRepository";
import { LoggerService } from "@/lib/logger";
import { toCsv } from "@/lib/platform/reportingEngine";
import { isPubliclyActiveListing } from "@/lib/data/publicListingPolicy";
import { normalizeVerificationState } from "@/lib/data/verificationStates";

export type AcquisitionCentreSnapshot = {
  generatedAt: string;
  schemaAvailable: boolean;
  partners: AcquisitionPartnerRow[];
  connectors: Array<{
    connectorId: string;
    name: string;
    version: string;
    health: string;
    registeredInCode: boolean;
    dbHealth: string | null;
  }>;
  recentImports: Record<string, unknown>[];
  openAlerts: Record<string, unknown>[];
  intelligence: {
    importsToday: number;
    importsThisWeek: number;
    verifiedInCorpus: number;
    activeCatalogue: number;
    pendingHint: string;
  };
  quality: ReturnType<typeof buildAcquisitionQualityMonitor>;
  coverage: ReturnType<typeof buildGeographicCoverageReport>;
  provinceCoveragePercent: number | null;
  governance: ReturnType<typeof buildGovernanceReport>;
  onboardingSteps: typeof ONBOARDING_STEPS;
  defaultFieldMapping: ReturnType<typeof defaultBiddersChoiceMapping>;
};

/**
 * Partnership + Acquisition Platform — does not auto-publish listings.
 */
export class PartnershipPlatformService {
  /** Seed partners + connector_registry from code plugins (idempotent). */
  static async syncRegistryFromPlugins(): Promise<{
    partners: number;
    connectors: number;
    schemaAvailable: boolean;
  }> {
    const plugins = bootstrapConnectorPlugins();
    let partners = 0;
    let connectors = 0;
    let schemaAvailable = false;

    for (const plugin of plugins) {
      const def = plugin.definition;
      const partner = await PartnershipRepository.upsertPartner({
        partner_code: def.id,
        partner_name: def.agencyName || def.name,
        partner_type: "auctioneer",
        company: def.agencyName,
        website: def.website ?? null,
        contract_status:
          def.health === "healthy" ? "active" : "pending",
        licence_status:
          def.health === "healthy" ? "active" : "pending",
        data_agreement: def.health === "healthy",
        api_available: def.importMethods.includes("api"),
        csv_available: def.importMethods.includes("csv"),
        manual_upload: def.importMethods.includes("manual"),
        import_frequency: def.health === "healthy" ? "daily" : "manual",
        status: def.health === "healthy" ? "active" : "onboarding",
        notes: def.notes,
        partner_health: def.health,
        connector_id: def.id,
        supported_regions: ["South Africa"],
        supported_property_types: [],
      });
      if (partner) {
        partners += 1;
        schemaAvailable = true;
        const ok = await ConnectorRegistryRepository.upsertFromPlugin({
          connectorId: def.id,
          version: def.version,
          healthStatus: def.health,
          capabilities: def.capabilities as unknown as Record<string, unknown>,
          supportedImportTypes: def.importMethods,
          notes: def.notes,
          ownerPartnerId: partner.id,
        });
        if (ok) connectors += 1;
      }
    }

    return { partners, connectors, schemaAvailable };
  }

  static async getAcquisitionCentreSnapshot(): Promise<AcquisitionCentreSnapshot> {
    const sync = await this.syncRegistryFromPlugins();
    const plugins = bootstrapConnectorPlugins();
    const [partners, dbConnectors, recentImports, openAlerts, corpus] =
      await Promise.all([
        PartnershipRepository.listPartners(),
        ConnectorRegistryRepository.list(),
        AcquisitionImportRepository.listRecent(40),
        AcquisitionAlertRepository.listOpen(40),
        PropertyRepository.getIntelligenceCorpus(1000),
      ]);

    const dbHealthById = new Map(
      dbConnectors.map((c) => [
        String(c.connector_id),
        String(c.health_status ?? "unknown"),
      ]),
    );

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(startOfDay);
    weekAgo.setDate(weekAgo.getDate() - 7);

    const importsToday = recentImports.filter((r) => {
      const s = r.started_at ? new Date(String(r.started_at)) : null;
      return s && s >= startOfDay;
    }).length;
    const importsThisWeek = recentImports.filter((r) => {
      const s = r.started_at ? new Date(String(r.started_at)) : null;
      return s && s >= weekAgo;
    }).length;

    const verifiedInCorpus = corpus.filter(
      (p) => normalizeVerificationState(p.verification_state) === "verified",
    ).length;
    const activeCatalogue = corpus.filter((p) =>
      isPubliclyActiveListing({
        verification_state: p.verification_state,
        data_classification: p.data_classification,
        listing_status: p.listing_status,
        status: p.status,
        auction_date: p.auction_date,
        now,
      }),
    ).length;

    const quality = buildAcquisitionQualityMonitor(corpus, { now });
    const coverage = buildGeographicCoverageReport(corpus, now);
    const governance = buildGovernanceReport(corpus, now);

    return {
      generatedAt: now.toISOString(),
      schemaAvailable: sync.schemaAvailable || partners.length > 0,
      partners,
      connectors: plugins.map((p) => ({
        connectorId: p.definition.id,
        name: p.definition.name,
        version: p.definition.version,
        health: p.definition.health,
        registeredInCode: true,
        dbHealth: dbHealthById.get(p.definition.id) ?? null,
      })),
      recentImports,
      openAlerts,
      intelligence: {
        importsToday,
        importsThisWeek,
        verifiedInCorpus,
        activeCatalogue,
        pendingHint:
          "Pending verification lives in Verification Centre — never auto-published",
      },
      quality,
      coverage,
      provinceCoveragePercent: provinceCoveragePercent(coverage),
      governance,
      onboardingSteps: ONBOARDING_STEPS,
      defaultFieldMapping: defaultBiddersChoiceMapping(),
    };
  }

  static async getPartnerDashboard(partnerCode: string) {
    const partner = await PartnershipRepository.getPartnerByCode(partnerCode);
    if (!partner) return null;
    const [licences, imports, corpus] = await Promise.all([
      PartnerLicenceRepository.listByPartner(partner.id),
      AcquisitionImportRepository.listRecent(100),
      PropertyRepository.getIntelligenceCorpus(1000),
    ]);

    const partnerImports = imports.filter(
      (r) =>
        r.partner_id === partner.id ||
        r.connector_id === partner.connector_id,
    );

    const listings = corpus.filter(
      (p) =>
        p.connector_id === partner.connector_id ||
        (p.source_name &&
          partner.partner_name &&
          p.source_name.toLowerCase().includes(partner.partner_name.toLowerCase().slice(0, 8))),
    );
    const verified = listings.filter(
      (p) => normalizeVerificationState(p.verification_state) === "verified",
    );
    const pending = listings.filter(
      (p) =>
        normalizeVerificationState(p.verification_state) ===
        "pending_verification",
    );

    const activeLicence = licences.find((l) => l.status === "active") ?? null;
    const displayGate = evaluatePublicDisplayPermission(activeLicence);

    return {
      partner,
      licences,
      displayGate,
      daysUntilLicenceExpiry: daysUntilLicenceExpiry(activeLicence),
      importHistory: partnerImports,
      stats: {
        currentListings: listings.length,
        verifiedListings: verified.length,
        pendingListings: pending.length,
        rejectedListings: null as number | null, // from import_rejections when scoped
        duplicateRate: null as number | null,
        averageVerificationTime: null as number | null,
        qualityScore:
          verified.length === 0
            ? null
            : Math.round(
                verified.reduce(
                  (s, p) => s + (p.data_quality_score ?? p.completeness_score ?? 0),
                  0,
                ) / verified.length,
              ),
      },
      recentErrors: partnerImports
        .flatMap((r) => (Array.isArray(r.errors) ? (r.errors as string[]) : []))
        .slice(0, 20),
    };
  }

  /** Record an orchestrated import shell (metrics only — does not publish). */
  static async beginImport(input: {
    partnerId?: string | null;
    connectorId?: string | null;
    importMethod: ImportMethod;
  }) {
    let run = createImportRunDraft(input);
    run = appendAudit(run, "orchestration", "Import registered — awaiting payload processing");
    const id = await AcquisitionImportRepository.insertRun(run);
    return { id, run };
  }

  static async finishImport(
    run: ReturnType<typeof createImportRunDraft>,
    outcome: {
      status: "completed" | "failed";
      rowsReceived?: number;
      rowsAccepted?: number;
      rowsRejected?: number;
      duplicates?: number;
      newProperties?: number;
      updatedProperties?: number;
      auctionEventsCreated?: number;
      propertyMastersMatched?: number;
      errors?: string[];
      warnings?: string[];
    },
  ) {
    const finished = completeImportRun(
      {
        ...run,
        rows_received: outcome.rowsReceived ?? run.rows_received,
        rows_accepted: outcome.rowsAccepted ?? run.rows_accepted,
        rows_rejected: outcome.rowsRejected ?? run.rows_rejected,
        duplicates: outcome.duplicates ?? run.duplicates,
        new_properties: outcome.newProperties ?? run.new_properties,
        updated_properties: outcome.updatedProperties ?? run.updated_properties,
        auction_events_created:
          outcome.auctionEventsCreated ?? run.auction_events_created,
        property_masters_matched:
          outcome.propertyMastersMatched ?? run.property_masters_matched,
        errors: outcome.errors ?? run.errors,
        warnings: outcome.warnings ?? run.warnings,
      },
      outcome.status,
    );
    await AcquisitionImportRepository.insertRun(finished);

    if (outcome.status === "failed") {
      await AcquisitionAlertRepository.insertAlert({
        alertType: "failed_import",
        severity: "high",
        title: `Import failed: ${finished.import_code}`,
        detail: (outcome.errors ?? []).join("; ").slice(0, 500),
        partnerId: finished.partner_id,
        connectorId: finished.connector_id,
        channels: ["operations_centre", "email"],
      });
    }

    LoggerService.audit("acquisition.import.finished", {
      importCode: finished.import_code,
      status: finished.status,
      accepted: finished.rows_accepted,
      rejected: finished.rows_rejected,
    });

    return finished;
  }

  static async raiseLicenceAlerts() {
    const expiring = await PartnerLicenceRepository.listExpiring(30);
    for (const lic of expiring) {
      await AcquisitionAlertRepository.insertAlert({
        alertType: "licence_expiring",
        severity: "medium",
        title: `Licence expiring: ${lic.licence_label}`,
        detail: `Expires ${lic.licence_expiry}`,
        partnerId: lic.partner_id,
        channels: ["operations_centre", "email"],
      });
    }
    return expiring.length;
  }

  static async buildExecutiveCsv() {
    const snap = await this.getAcquisitionCentreSnapshot();
    return {
      partnersCsv: toCsv(
        [
          "partner_code",
          "partner_name",
          "status",
          "licence_status",
          "health",
          "success_rate",
          "verification_rate",
        ],
        snap.partners.map((p) => [
          p.partner_code,
          p.partner_name,
          p.status,
          p.licence_status,
          p.partner_health,
          p.success_rate,
          p.verification_rate,
        ]),
      ),
      connectorsCsv: toCsv(
        ["connector_id", "name", "version", "health", "db_health"],
        snap.connectors.map((c) => [
          c.connectorId,
          c.name,
          c.version,
          c.health,
          c.dbHealth,
        ]),
      ),
      coverageCsv: toCsv(
        ["province", "total", "active"],
        snap.coverage.byProvince.map((c) => [c.label, c.total, c.active]),
      ),
    };
  }
}
