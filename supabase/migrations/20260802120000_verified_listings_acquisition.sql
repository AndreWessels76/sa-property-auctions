-- VERIFIED LISTINGS 1.0 — acquisition audit tables
create table if not exists public.import_rejections (
  id uuid primary key default gen_random_uuid(),
  connector_id text not null,
  external_listing_id text,
  source_url text,
  reason text not null,
  payload jsonb,
  job_id text,
  created_at timestamptz not null default now()
);

create index if not exists import_rejections_created_idx
  on public.import_rejections (created_at desc);

create index if not exists import_rejections_connector_idx
  on public.import_rejections (connector_id);

create table if not exists public.listing_change_events (
  id uuid primary key default gen_random_uuid(),
  property_id uuid,
  connector_id text,
  external_listing_id text,
  change_type text not null,
  field_name text,
  old_value text,
  new_value text,
  job_id text,
  created_at timestamptz not null default now()
);

create index if not exists listing_change_events_property_idx
  on public.listing_change_events (property_id);

create index if not exists listing_change_events_created_idx
  on public.listing_change_events (created_at desc);

create table if not exists public.acquisition_import_reports (
  id uuid primary key default gen_random_uuid(),
  connector_id text not null,
  job_id text not null,
  imported integer not null default 0,
  updated integer not null default 0,
  rejected integer not null default 0,
  archived integer not null default 0,
  duplicates integer not null default 0,
  duration_ms integer,
  meta jsonb,
  created_at timestamptz not null default now()
);

alter table public.properties
  add column if not exists features text,
  add column if not exists viewing_information text,
  add column if not exists deposit_requirements text,
  add column if not exists registration_link text,
  add column if not exists source_content_hash text,
  add column if not exists rejection_reason text;
