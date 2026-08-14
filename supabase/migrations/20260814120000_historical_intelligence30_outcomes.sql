-- Historical Intelligence 3.0 — outcome observations & conflict audit.
-- Append-only outcome evidence; admin review for conflicts.

create table if not exists public.auction_outcome_observations (
  id uuid primary key default gen_random_uuid(),
  property_master_id uuid references public.property_masters (id) on delete set null,
  auction_event_id uuid references public.auction_events (id) on delete set null,
  listing_property_id uuid references public.properties (id) on delete set null,
  outcome text not null,
  -- SOLD | WITHDRAWN | CANCELLED | EXPIRED | UNSOLD | POSTPONED | UNKNOWN
  confidence text not null default 'medium',
  evidence_types jsonb,
  source_url text,
  source_snapshot_id uuid references public.source_snapshots (id) on delete set null,
  source_timestamp timestamptz,
  evidence_text text,
  extraction_method text,
  sale_price numeric,
  sale_price_source text,
  sale_price_observed_at timestamptz,
  sale_price_confidence text,
  calculation_version text not null default 'historical-intelligence-3.0.0',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists auction_outcome_observations_master_idx
  on public.auction_outcome_observations (property_master_id, created_at desc);

create index if not exists auction_outcome_observations_event_idx
  on public.auction_outcome_observations (auction_event_id);

create table if not exists public.historical_outcome_conflicts (
  id uuid primary key default gen_random_uuid(),
  property_master_id uuid references public.property_masters (id) on delete set null,
  auction_event_id uuid references public.auction_events (id) on delete set null,
  source_a text,
  source_b text,
  claim_a text not null,
  claim_b text not null,
  evidence_a text,
  evidence_b text,
  status text not null default 'open',
  -- open | confirmed_a | confirmed_b | rejected | resolved
  reviewed_by text,
  reviewed_at timestamptz,
  resolution_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists historical_outcome_conflicts_status_idx
  on public.historical_outcome_conflicts (status, created_at desc);

create index if not exists historical_outcome_conflicts_event_idx
  on public.historical_outcome_conflicts (auction_event_id);

alter table public.auction_outcome_observations enable row level security;
alter table public.historical_outcome_conflicts enable row level security;

drop policy if exists auction_outcome_observations_admin_all on public.auction_outcome_observations;
create policy auction_outcome_observations_admin_all on public.auction_outcome_observations
  for all using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

drop policy if exists historical_outcome_conflicts_admin_all on public.historical_outcome_conflicts;
create policy historical_outcome_conflicts_admin_all on public.historical_outcome_conflicts
  for all using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );
