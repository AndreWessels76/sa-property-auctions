-- Pricing Data Acquisition & Normalisation 1.0
-- Append-only pricing observations with provenance.
-- Never auto-verify. Never silently overwrite verified listing fields.

create table if not exists public.pricing_observations (
  id uuid primary key default gen_random_uuid(),
  property_id uuid references public.properties (id) on delete set null,
  property_master_id uuid references public.property_masters (id) on delete set null,
  auction_event_id uuid references public.auction_events (id) on delete set null,
  source_id text,
  source_snapshot_id uuid references public.source_snapshots (id) on delete set null,
  extraction_run_id uuid,
  field_name text not null,
  raw_value text,
  normalized_value numeric,
  currency text,
  is_approximate boolean not null default false,
  is_range boolean not null default false,
  min_value numeric,
  max_value numeric,
  status text not null default 'extracted',
  -- extracted | source_confirmed | verified | not_supplied | needs_verification
  -- pending | conflict | anomaly | unsupported_currency | rejected | calculated
  evidence_text text,
  source_name text,
  source_url text,
  parser_version text not null default 'pricing-parser-1.0.0',
  extraction_method text,
  conversion_method text,
  content_hash text,
  -- Deterministic retry key: property|field|hash|parser|value|min|max
  idempotency_key text,
  notes text,
  extracted_at timestamptz not null default now(),
  verified_at timestamptz,
  verified_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Safe if a prior partial apply created the table without this column
alter table public.pricing_observations
  add column if not exists idempotency_key text;

create unique index if not exists pricing_observations_idempotent_idx
  on public.pricing_observations (idempotency_key)
  where idempotency_key is not null;

create index if not exists pricing_observations_property_idx
  on public.pricing_observations (property_id, extracted_at desc);

create index if not exists pricing_observations_master_idx
  on public.pricing_observations (property_master_id, extracted_at desc);

create index if not exists pricing_observations_event_idx
  on public.pricing_observations (auction_event_id);

create index if not exists pricing_observations_status_idx
  on public.pricing_observations (status, field_name);

create index if not exists pricing_observations_snapshot_idx
  on public.pricing_observations (source_snapshot_id);

create table if not exists public.pricing_conflicts (
  id uuid primary key default gen_random_uuid(),
  property_id uuid references public.properties (id) on delete cascade,
  field_name text not null,
  old_observation_id uuid references public.pricing_observations (id) on delete set null,
  new_observation_id uuid references public.pricing_observations (id) on delete set null,
  old_value numeric,
  new_value numeric,
  old_source text,
  new_source text,
  old_evidence text,
  new_evidence text,
  status text not null default 'open',
  -- open | approved_new | kept_existing | rejected | resolved
  resolution_note text,
  resolved_by text,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists pricing_conflicts_property_idx
  on public.pricing_conflicts (property_id, status, created_at desc);

create index if not exists pricing_conflicts_open_idx
  on public.pricing_conflicts (status)
  where status = 'open';

alter table public.pricing_observations enable row level security;
alter table public.pricing_conflicts enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'pricing_observations'
      and policyname = 'pricing_observations_admin_all'
  ) then
    create policy pricing_observations_admin_all
      on public.pricing_observations for all to authenticated
      using (
        exists (
          select 1 from public.profiles p
          where p.id = auth.uid() and p.role = 'admin'
        )
      )
      with check (
        exists (
          select 1 from public.profiles p
          where p.id = auth.uid() and p.role = 'admin'
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'pricing_conflicts'
      and policyname = 'pricing_conflicts_admin_all'
  ) then
    create policy pricing_conflicts_admin_all
      on public.pricing_conflicts for all to authenticated
      using (
        exists (
          select 1 from public.profiles p
          where p.id = auth.uid() and p.role = 'admin'
        )
      )
      with check (
        exists (
          select 1 from public.profiles p
          where p.id = auth.uid() and p.role = 'admin'
        )
      );
  end if;
end $$;
