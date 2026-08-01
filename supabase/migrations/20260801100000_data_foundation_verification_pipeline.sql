-- DATA FOUNDATION 2.0 — verification pipeline columns
alter table public.properties
  add column if not exists verification_state text,
  add column if not exists status_changed_at timestamptz,
  add column if not exists status_change_reason text,
  add column if not exists status_source_event text,
  add column if not exists address_unavailability_reason text,
  add column if not exists connector_id text,
  add column if not exists connector_version text,
  add column if not exists source_version text,
  add column if not exists import_method text,
  add column if not exists completeness_score integer,
  add column if not exists verification_score integer,
  add column if not exists image_score integer,
  add column if not exists address_score integer,
  add column if not exists auction_score integer,
  add column if not exists source_trust_score integer;

comment on column public.properties.verification_state is
  'seed | pending_verification | verified | expired | withdrawn | sold | archived';

create index if not exists properties_verification_state_idx
  on public.properties (verification_state);

create table if not exists public.import_pipeline_events (
  id uuid primary key default gen_random_uuid(),
  job_id text,
  property_id uuid,
  connector_id text,
  stage text not null,
  status text not null,
  message text,
  meta jsonb,
  created_at timestamptz not null default now()
);

create index if not exists import_pipeline_events_job_idx
  on public.import_pipeline_events (job_id);

create index if not exists import_pipeline_events_created_idx
  on public.import_pipeline_events (created_at desc);
