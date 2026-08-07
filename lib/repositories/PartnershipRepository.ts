import { BaseRepository } from "./BaseRepository";
import type { AcquisitionImportRun } from "@/lib/acquisition/orchestration";
import type { PartnerLicenceRecord } from "@/lib/acquisition/licensing";
import type { FieldMappingRule } from "@/lib/acquisition/fieldMapping";

function missingRelation(error: { message?: string; code?: string } | null): boolean {
  if (!error) return false;
  const msg = (error.message ?? "").toLowerCase();
  return (
    error.code === "42P01" ||
    msg.includes("does not exist") ||
    msg.includes("schema cache") ||
    msg.includes("could not find the table")
  );
}

export type AcquisitionPartnerRow = {
  id: string;
  partner_code: string;
  partner_name: string;
  partner_type: string;
  company: string | null;
  contact_person: string | null;
  email: string | null;
  telephone: string | null;
  website: string | null;
  contract_status: string;
  licence_status: string;
  data_agreement: boolean;
  api_available: boolean;
  csv_available: boolean;
  manual_upload: boolean;
  import_frequency: string | null;
  status: string;
  notes: string | null;
  supported_regions: string[] | null;
  supported_property_types: string[] | null;
  partner_health: string;
  last_successful_import_at: string | null;
  last_failed_import_at: string | null;
  success_rate: number | null;
  verification_rate: number | null;
  connector_id: string | null;
  created_at: string;
  updated_at: string;
};

export class PartnershipRepository extends BaseRepository {
  static async listPartners(): Promise<AcquisitionPartnerRow[]> {
    const db = this.adminDb();
    const { data, error } = await db
      .from("acquisition_partners")
      .select("*")
      .order("partner_name");
    if (error) {
      if (missingRelation(error)) return [];
      this.handleError("PartnershipRepository.listPartners", error);
    }
    return (data as AcquisitionPartnerRow[]) ?? [];
  }

  static async upsertPartner(
    row: Partial<AcquisitionPartnerRow> & {
      partner_code: string;
      partner_name: string;
    },
  ): Promise<AcquisitionPartnerRow | null> {
    const db = this.adminDb();
    const { data, error } = await db
      .from("acquisition_partners")
      .upsert(
        {
          ...row,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "partner_code" },
      )
      .select("*")
      .maybeSingle();
    if (error) {
      if (missingRelation(error)) return null;
      this.handleError("PartnershipRepository.upsertPartner", error);
    }
    return data as AcquisitionPartnerRow | null;
  }

  static async getPartnerByCode(
    partnerCode: string,
  ): Promise<AcquisitionPartnerRow | null> {
    const db = this.adminDb();
    const { data, error } = await db
      .from("acquisition_partners")
      .select("*")
      .eq("partner_code", partnerCode)
      .maybeSingle();
    if (error) {
      if (missingRelation(error)) return null;
      this.handleError("PartnershipRepository.getPartnerByCode", error);
    }
    return data as AcquisitionPartnerRow | null;
  }
}

export class ConnectorRegistryRepository extends BaseRepository {
  static async list(): Promise<Record<string, unknown>[]> {
    const db = this.adminDb();
    const { data, error } = await db
      .from("connector_registry")
      .select("*")
      .order("connector_id");
    if (error) {
      if (missingRelation(error)) return [];
      this.handleError("ConnectorRegistryRepository.list", error);
    }
    return (data as Record<string, unknown>[]) ?? [];
  }

  static async upsertFromPlugin(input: {
    connectorId: string;
    version: string;
    healthStatus: string;
    capabilities: Record<string, unknown>;
    supportedImportTypes: string[];
    notes?: string;
    ownerPartnerId?: string | null;
  }): Promise<boolean> {
    const db = this.adminDb();
    const { error } = await db.from("connector_registry").upsert(
      {
        connector_id: input.connectorId,
        version: input.version,
        health_status: input.healthStatus,
        capabilities: input.capabilities,
        supported_import_types: input.supportedImportTypes,
        notes: input.notes ?? null,
        owner_partner_id: input.ownerPartnerId ?? null,
        status: "registered",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "connector_id" },
    );
    if (error) {
      if (missingRelation(error)) return false;
      this.handleError("ConnectorRegistryRepository.upsertFromPlugin", error);
    }
    return true;
  }
}

export class AcquisitionImportRepository extends BaseRepository {
  static async insertRun(run: AcquisitionImportRun): Promise<string | null> {
    const db = this.adminDb();
    const { data, error } = await db
      .from("acquisition_import_runs")
      .insert({
        import_code: run.import_code,
        partner_id: run.partner_id,
        connector_id: run.connector_id,
        import_method: run.import_method,
        status: run.status,
        started_at: run.started_at,
        completed_at: run.completed_at,
        duration_ms: run.duration_ms,
        rows_received: run.rows_received,
        rows_accepted: run.rows_accepted,
        rows_rejected: run.rows_rejected,
        duplicates: run.duplicates,
        updated_properties: run.updated_properties,
        new_properties: run.new_properties,
        auction_events_created: run.auction_events_created,
        property_masters_matched: run.property_masters_matched,
        errors: run.errors,
        warnings: run.warnings,
        audit_trail: run.audit_trail,
        meta: run.meta ?? {},
      })
      .select("id")
      .maybeSingle();
    if (error) {
      if (missingRelation(error)) return null;
      this.handleError("AcquisitionImportRepository.insertRun", error);
    }
    return (data as { id: string } | null)?.id ?? null;
  }

  static async listRecent(limit = 50): Promise<Record<string, unknown>[]> {
    const db = this.adminDb();
    const { data, error } = await db
      .from("acquisition_import_runs")
      .select("*")
      .order("started_at", { ascending: false })
      .limit(limit);
    if (error) {
      if (missingRelation(error)) return [];
      this.handleError("AcquisitionImportRepository.listRecent", error);
    }
    return (data as Record<string, unknown>[]) ?? [];
  }
}

export class PartnerLicenceRepository extends BaseRepository {
  static async listByPartner(partnerId: string): Promise<PartnerLicenceRecord[]> {
    const db = this.adminDb();
    const { data, error } = await db
      .from("partner_licences")
      .select("*")
      .eq("partner_id", partnerId)
      .order("created_at", { ascending: false });
    if (error) {
      if (missingRelation(error)) return [];
      this.handleError("PartnerLicenceRepository.listByPartner", error);
    }
    return (data as PartnerLicenceRecord[]) ?? [];
  }

  static async listExpiring(withinDays = 30): Promise<PartnerLicenceRecord[]> {
    const db = this.adminDb();
    const until = new Date();
    until.setDate(until.getDate() + withinDays);
    const { data, error } = await db
      .from("partner_licences")
      .select("*")
      .eq("status", "active")
      .lte("licence_expiry", until.toISOString().slice(0, 10));
    if (error) {
      if (missingRelation(error)) return [];
      this.handleError("PartnerLicenceRepository.listExpiring", error);
    }
    return (data as PartnerLicenceRecord[]) ?? [];
  }
}

export class PartnerFieldMappingRepository extends BaseRepository {
  static async getActiveMapping(partnerId: string): Promise<{
    mapping_version: string;
    mappings: FieldMappingRule[];
  } | null> {
    const db = this.adminDb();
    const { data, error } = await db
      .from("partner_field_mappings")
      .select("mapping_version,mappings")
      .eq("partner_id", partnerId)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) {
      if (missingRelation(error)) return null;
      this.handleError("PartnerFieldMappingRepository.getActiveMapping", error);
    }
    if (!data) return null;
    return {
      mapping_version: data.mapping_version as string,
      mappings: (data.mappings as FieldMappingRule[]) ?? [],
    };
  }
}

export class AcquisitionAlertRepository extends BaseRepository {
  static async insertAlert(input: {
    alertType: string;
    severity: string;
    title: string;
    detail?: string;
    partnerId?: string | null;
    connectorId?: string | null;
    importRunId?: string | null;
    channels?: string[];
  }): Promise<boolean> {
    const db = this.adminDb();
    const { error } = await db.from("acquisition_alerts").insert({
      alert_type: input.alertType,
      severity: input.severity,
      title: input.title,
      detail: input.detail ?? null,
      partner_id: input.partnerId ?? null,
      connector_id: input.connectorId ?? null,
      import_run_id: input.importRunId ?? null,
      delivery_channels: input.channels ?? ["operations_centre"],
    });
    if (error) {
      if (missingRelation(error)) return false;
      this.handleError("AcquisitionAlertRepository.insertAlert", error);
    }
    return true;
  }

  static async listOpen(limit = 50): Promise<Record<string, unknown>[]> {
    const db = this.adminDb();
    const { data, error } = await db
      .from("acquisition_alerts")
      .select("*")
      .eq("acknowledged", false)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) {
      if (missingRelation(error)) return [];
      this.handleError("AcquisitionAlertRepository.listOpen", error);
    }
    return (data as Record<string, unknown>[]) ?? [];
  }
}
