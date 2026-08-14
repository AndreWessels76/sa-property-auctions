-- Historical Intelligence 4.2 — resolution audit trail.

create table if not exists public.historical_resolution_audit (
  id uuid primary key default gen_random_uuid(),
  auction_event_id uuid references public.auction_events (id) on delete set null,
  property_master_id uuid references public.property_masters (id) on delete set null,
  listing_property_id uuid references public.properties (id) on delete set null,
  outcome_observation_id uuid references public.auction_outcome_observations (id) on delete set null,
  snapshot_id uuid references public.source_snapshots (id) on delete set null,
  old_state text,
  new_state text not null,
  resolution_label text,
  evidence jsonb,
  conflict_state text,
  actor text,
  resolver_version text not null,
  reason text,
  idempotency_key text,
  created_at timestamptz not null default now()
);

create unique index if not exists historical_resolution_audit_idempotency_idx
  on public.historical_resolution_audit (idempotency_key)
  where idempotency_key is not null;

create index if not exists historical_resolution_audit_event_idx
  on public.historical_resolution_audit (auction_event_id, created_at desc);

create index if not exists historical_resolution_audit_property_idx
  on public.historical_resolution_audit (listing_property_id, created_at desc);

alter table public.historical_resolution_audit enable row level security;

drop policy if exists historical_resolution_audit_admin_all on public.historical_resolution_audit;
create policy historical_resolution_audit_admin_all on public.historical_resolution_audit
  for all using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );
