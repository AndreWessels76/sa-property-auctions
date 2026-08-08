-- Live Source Re-fetch & Enrichment Engine 1.0
-- Snapshots + fetch audit. Soft-fail in app if not applied.
-- Never auto-verify. Never auto-publish.

create table if not exists public.source_snapshots (
  id uuid primary key default gen_random_uuid(),
  property_id uuid references public.properties (id) on delete set null,
  partner_code text,
  connector_id text not null,
  source_url text not null,
  canonical_url text,
  http_status integer,
  fetched_at timestamptz not null default now(),
  content_type text,
  content_length integer,
  content_hash text not null,
  previous_hash text,
  source_title text,
  source_text text,
  -- Raw HTML only when store_raw_html policy allows; otherwise null
  raw_html text,
  store_raw_html boolean not null default false,
  extraction_version text,
  fetcher_version text not null default '1.0.0',
  change_class text,
  -- NO_CHANGE | CONTENT_CHANGED | SOURCE_UNAVAILABLE | ...
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists source_snapshots_property_idx
  on public.source_snapshots (property_id, fetched_at desc);
create index if not exists source_snapshots_hash_idx
  on public.source_snapshots (content_hash);
create index if not exists source_snapshots_connector_idx
  on public.source_snapshots (connector_id, fetched_at desc);

create table if not exists public.source_refetch_runs (
  id uuid primary key default gen_random_uuid(),
  run_code text not null unique,
  property_id uuid references public.properties (id) on delete set null,
  auction_event_id uuid,
  partner_code text,
  connector_id text,
  source_url text,
  operator text,
  status text not null default 'started',
  -- started | completed | failed | skipped_license | skipped_robots | skipped_rate | no_change | source_unavailable
  http_status integer,
  content_hash text,
  previous_hash text,
  changed boolean not null default false,
  change_classes text[] not null default '{}',
  fields_changed integer not null default 0,
  conflicts integer not null default 0,
  extraction_run_id uuid,
  error text,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  duration_ms integer,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists source_refetch_runs_property_idx
  on public.source_refetch_runs (property_id, started_at desc);
create index if not exists source_refetch_runs_status_idx
  on public.source_refetch_runs (status, started_at desc);

create table if not exists public.source_refetch_locks (
  lock_key text primary key,
  run_code text not null,
  locked_at timestamptz not null default now(),
  expires_at timestamptz not null
);

alter table public.source_snapshots enable row level security;
alter table public.source_refetch_runs enable row level security;
alter table public.source_refetch_locks enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'source_snapshots' and policyname = 'source_snapshots_admin_read'
  ) then
    create policy source_snapshots_admin_read
      on public.source_snapshots for select to authenticated
      using (
        exists (
          select 1 from public.profiles p
          where p.id = auth.uid() and p.role = 'admin'
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where tablename = 'source_refetch_runs' and policyname = 'source_refetch_runs_admin_read'
  ) then
    create policy source_refetch_runs_admin_read
      on public.source_refetch_runs for select to authenticated
      using (
        exists (
          select 1 from public.profiles p
          where p.id = auth.uid() and p.role = 'admin'
        )
      );
  end if;
end $$;
