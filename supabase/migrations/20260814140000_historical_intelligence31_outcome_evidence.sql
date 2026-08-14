-- Historical Intelligence 3.1 — outcome evidence enrichment audit & review queue.

alter table public.auction_outcome_observations
  add column if not exists idempotency_key text,
  add column if not exists source_hash text,
  add column if not exists evidence_type text,
  add column if not exists review_category text,
  add column if not exists enrichment_run_id uuid,
  add column if not exists observed_at timestamptz;

create unique index if not exists auction_outcome_observations_idempotency_idx
  on public.auction_outcome_observations (idempotency_key)
  where idempotency_key is not null;

create index if not exists auction_outcome_observations_hash_idx
  on public.auction_outcome_observations (source_hash, auction_event_id);

create table if not exists public.historical_enrichment_runs (
  id uuid primary key default gen_random_uuid(),
  run_id text not null,
  property_id uuid references public.properties (id) on delete set null,
  property_master_id uuid references public.property_masters (id) on delete set null,
  auction_event_id uuid references public.auction_events (id) on delete set null,
  source_url text,
  snapshot_id uuid references public.source_snapshots (id) on delete set null,
  source_hash text,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  status text not null,
  outcome text,
  sale_price numeric,
  conflicts integer not null default 0,
  review_required boolean not null default false,
  operator text,
  meta jsonb,
  created_at timestamptz not null default now()
);

create index if not exists historical_enrichment_runs_run_idx
  on public.historical_enrichment_runs (run_id, created_at desc);

create index if not exists historical_enrichment_runs_property_idx
  on public.historical_enrichment_runs (property_id, created_at desc);

create table if not exists public.historical_enrichment_reviews (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  property_id uuid references public.properties (id) on delete set null,
  property_master_id uuid references public.property_masters (id) on delete set null,
  auction_event_id uuid references public.auction_events (id) on delete set null,
  outcome_observation_id uuid references public.auction_outcome_observations (id) on delete set null,
  source_url text,
  snapshot_id uuid references public.source_snapshots (id) on delete set null,
  source_hash text,
  evidence_text text,
  extracted_value text,
  normalized_value text,
  confidence text,
  status text not null default 'open',
  reviewed_by text,
  reviewed_at timestamptz,
  resolution_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists historical_enrichment_reviews_status_idx
  on public.historical_enrichment_reviews (status, category, created_at desc);

alter table public.historical_enrichment_runs enable row level security;
alter table public.historical_enrichment_reviews enable row level security;

drop policy if exists historical_enrichment_runs_admin_all on public.historical_enrichment_runs;
create policy historical_enrichment_runs_admin_all on public.historical_enrichment_runs
  for all using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

drop policy if exists historical_enrichment_reviews_admin_all on public.historical_enrichment_reviews;
create policy historical_enrichment_reviews_admin_all on public.historical_enrichment_reviews
  for all using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );
