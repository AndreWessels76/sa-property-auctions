/**
 * Import Orchestration — centralized import run records.
 * Does not auto-publish; verification pipeline remains required.
 */

export type ImportMethod =
  | "api"
  | "csv"
  | "excel"
  | "json"
  | "xml"
  | "secure_upload"
  | "sftp"
  | "manual"
  | "scheduled"
  | "webhook";

export type ImportRunStatus =
  | "started"
  | "running"
  | "completed"
  | "failed"
  | "cancelled";

export type AcquisitionImportRun = {
  id?: string;
  import_code: string;
  partner_id?: string | null;
  connector_id?: string | null;
  import_method: ImportMethod;
  status: ImportRunStatus;
  started_at: string;
  completed_at?: string | null;
  duration_ms?: number | null;
  rows_received: number;
  rows_accepted: number;
  rows_rejected: number;
  duplicates: number;
  updated_properties: number;
  new_properties: number;
  auction_events_created: number;
  property_masters_matched: number;
  errors: string[];
  warnings: string[];
  audit_trail: Array<{ at: string; stage: string; detail: string }>;
  meta?: Record<string, unknown>;
};

export function createImportRunDraft(input: {
  partnerId?: string | null;
  connectorId?: string | null;
  importMethod: ImportMethod;
}): AcquisitionImportRun {
  const now = new Date();
  const code = `imp_${now.toISOString().slice(0, 10).replace(/-/g, "")}_${Math.random().toString(36).slice(2, 8)}`;
  return {
    import_code: code,
    partner_id: input.partnerId ?? null,
    connector_id: input.connectorId ?? null,
    import_method: input.importMethod,
    status: "started",
    started_at: now.toISOString(),
    completed_at: null,
    duration_ms: null,
    rows_received: 0,
    rows_accepted: 0,
    rows_rejected: 0,
    duplicates: 0,
    updated_properties: 0,
    new_properties: 0,
    auction_events_created: 0,
    property_masters_matched: 0,
    errors: [],
    warnings: [],
    audit_trail: [
      {
        at: now.toISOString(),
        stage: "started",
        detail: `Import ${code} started via ${input.importMethod}`,
      },
    ],
    meta: {},
  };
}

export function appendAudit(
  run: AcquisitionImportRun,
  stage: string,
  detail: string,
): AcquisitionImportRun {
  return {
    ...run,
    audit_trail: [
      ...run.audit_trail,
      { at: new Date().toISOString(), stage, detail },
    ],
  };
}

export function completeImportRun(
  run: AcquisitionImportRun,
  status: "completed" | "failed" | "cancelled",
): AcquisitionImportRun {
  const completed_at = new Date().toISOString();
  const duration_ms = Math.max(
    0,
    new Date(completed_at).getTime() - new Date(run.started_at).getTime(),
  );
  return appendAudit(
    {
      ...run,
      status,
      completed_at,
      duration_ms,
    },
    status,
    `Import ${status} in ${duration_ms}ms`,
  );
}
