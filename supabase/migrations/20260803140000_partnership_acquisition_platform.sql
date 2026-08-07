-- DATA ACQUISITION & PARTNERSHIP PLATFORM 1.0
-- Partners contribute Auction Events; platform owns verification/identity/quality.

create table if not exists public.acquisition_partners (
  id uuid primary key default gen_random_uuid(),
  partner_code text not null unique,
  partner_name text not null,
  partner_type text not null default 'auctioneer',
  -- auctioneer | sheriff | bank | broker | data_provider | other
  company text,
  contact_person text,
  email text,
  telephone text,
  website text,
  contract_status text not null default 'draft',
  -- draft | pending | active | suspended | terminated
  licence_status text not null default 'none',
  -- none | pending | active | expired | revoked
  data_agreement boolean not null default false,
  api_available boolean not null default false,
  csv_available boolean not null default true,
  manual_upload boolean not null default true,
  import_frequency text default 'manual',
  -- hourly | daily | weekly | manual | webhook
  status text not null default 'onboarding',
  -- onboarding | active | paused | inactive
  notes text,
  supported_regions text[] default '{}',
  supported_property_types text[] default '{}',
  partner_health text not null default 'unknown',
  -- healthy | degraded | failing | unknown | awaiting_license
  last_successful_import_at timestamptz,
  last_failed_import_at timestamptz,
  success_rate numeric(5,2),
  verification_rate numeric(5,2),
  connector_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists acquisition_partners_status_idx
  on public.acquisition_partners (status);
create index if not exists acquisition_partners_connector_idx
  on public.acquisition_partners (connector_id);

-- Runtime connector registry (code plugins register into this table)
create table if not exists public.connector_registry (
  id uuid primary key default gen_random_uuid(),
  connector_id text not null unique,
  version text not null,
  owner_partner_id uuid references public.acquisition_partners (id) on delete set null,
  status text not null default 'registered',
  -- registered | enabled | disabled | deprecated
  environment text not null default 'production',
  -- production | staging | development
  supported_import_types text[] not null default '{licensed_feed,csv,manual}',
  supported_fields jsonb not null default '[]'::jsonb,
  schema_version text not null default '1.0.0',
  validation_rules jsonb not null default '{}'::jsonb,
  retry_strategy jsonb not null default '{"maxAttempts":3,"backoffMs":5000}'::jsonb,
  health_status text not null default 'unknown',
  performance_stats jsonb not null default '{}'::jsonb,
  error_history jsonb not null default '[]'::jsonb,
  last_successful_run_at timestamptz,
  last_failed_run_at timestamptz,
  capabilities jsonb not null default '{}'::jsonb,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists connector_registry_status_idx
  on public.connector_registry (status);
create index if not exists connector_registry_health_idx
  on public.connector_registry (health_status);

-- Centralized import runs (orchestration)
create table if not exists public.acquisition_import_runs (
  id uuid primary key default gen_random_uuid(),
  import_code text not null unique,
  partner_id uuid references public.acquisition_partners (id) on delete set null,
  connector_id text,
  import_method text not null,
  -- api | csv | excel | json | xml | secure_upload | sftp | manual | scheduled | webhook
  status text not null default 'started',
  -- started | running | completed | failed | cancelled
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  duration_ms integer,
  rows_received integer not null default 0,
  rows_accepted integer not null default 0,
  rows_rejected integer not null default 0,
  duplicates integer not null default 0,
  updated_properties integer not null default 0,
  new_properties integer not null default 0,
  auction_events_created integer not null default 0,
  property_masters_matched integer not null default 0,
  errors jsonb not null default '[]'::jsonb,
  warnings jsonb not null default '[]'::jsonb,
  audit_trail jsonb not null default '[]'::jsonb,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists acquisition_import_runs_partner_idx
  on public.acquisition_import_runs (partner_id, started_at desc);
create index if not exists acquisition_import_runs_connector_idx
  on public.acquisition_import_runs (connector_id, started_at desc);
create index if not exists acquisition_import_runs_status_idx
  on public.acquisition_import_runs (status);

-- Field mapping versions (partner schema → platform schema)
create table if not exists public.partner_field_mappings (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.acquisition_partners (id) on delete cascade,
  connector_id text,
  mapping_version text not null default '1.0.0',
  is_active boolean not null default true,
  mappings jsonb not null default '[]'::jsonb,
  -- [{sourceField, targetField, required, optional, transform, validation}]
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists partner_field_mappings_partner_idx
  on public.partner_field_mappings (partner_id, is_active);

-- Licensing & compliance
create table if not exists public.partner_licences (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.acquisition_partners (id) on delete cascade,
  licence_label text not null,
  licence_expiry date,
  data_usage_rights text,
  copyright_restrictions text,
  attribution_rules text,
  public_display_permission boolean not null default false,
  image_usage_rights boolean not null default false,
  document_usage_rights boolean not null default false,
  import_restrictions text,
  status text not null default 'draft',
  -- draft | active | expired | revoked
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists partner_licences_partner_idx
  on public.partner_licences (partner_id);
create index if not exists partner_licences_expiry_idx
  on public.partner_licences (licence_expiry);

-- Acquisition alerts
create table if not exists public.acquisition_alerts (
  id uuid primary key default gen_random_uuid(),
  alert_type text not null,
  severity text not null default 'medium',
  -- low | medium | high | critical
  partner_id uuid references public.acquisition_partners (id) on delete set null,
  connector_id text,
  import_run_id uuid references public.acquisition_import_runs (id) on delete set null,
  title text not null,
  detail text,
  delivery_channels text[] not null default '{operations_centre}',
  -- email | operations_centre | push
  acknowledged boolean not null default false,
  acknowledged_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists acquisition_alerts_open_idx
  on public.acquisition_alerts (acknowledged, created_at desc);
create index if not exists acquisition_alerts_type_idx
  on public.acquisition_alerts (alert_type);
