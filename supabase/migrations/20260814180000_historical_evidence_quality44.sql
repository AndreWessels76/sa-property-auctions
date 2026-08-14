-- Historical Evidence Quality & Review 4.4 — quality review audit trail.

create table if not exists public.historical_evidence_quality_audit (
  id uuid primary key default gen_random_uuid(),
  auction_event_id uuid references public.auction_events (id) on delete set null,
  property_master_id uuid references public.property_masters (id) on delete set null,
  listing_property_id uuid references public.properties (id) on delete set null,
  review_id uuid references public.historical_enrichment_reviews (id) on delete set null,
  field text,
  old_state text,
  new_state text not null,
  decision text not null,
  reason text,
  source text,
  actor text,
  quality_version text not null,
  evidence jsonb,
  idempotency_key text,
  created_at timestamptz not null default now()
);

create unique index if not exists historical_evidence_quality_audit_idempotency_idx
  on public.historical_evidence_quality_audit (idempotency_key)
  where idempotency_key is not null;

create index if not exists historical_evidence_quality_audit_event_idx
  on public.historical_evidence_quality_audit (auction_event_id, created_at desc);

alter table public.historical_evidence_quality_audit enable row level security;

drop policy if exists historical_evidence_quality_audit_admin_all on public.historical_evidence_quality_audit;
create policy historical_evidence_quality_audit_admin_all on public.historical_evidence_quality_audit
  for all using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );
