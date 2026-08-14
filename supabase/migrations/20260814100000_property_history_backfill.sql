-- Property History Backfill & Auction Event Reconstruction 1.0
-- Audit runs, per-record items, and admin review queue.

create table if not exists public.property_history_backfill_runs (
  id uuid primary key default gen_random_uuid(),
  run_kind text not null default 'backfill',
  -- preview | backfill | retry
  dry_run boolean not null default true,
  status text not null default 'running',
  -- running | completed | failed
  batch_limit integer not null default 100,
  records_scanned integer not null default 0,
  masters_created integer not null default 0,
  masters_matched integer not null default 0,
  master_review integer not null default 0,
  master_skipped integer not null default 0,
  events_created integer not null default 0,
  events_matched integer not null default 0,
  event_review integer not null default 0,
  event_skipped integer not null default 0,
  duplicates_skipped integer not null default 0,
  identity_conflicts integer not null default 0,
  insufficient_evidence integer not null default 0,
  pricing_linked integer not null default 0,
  location_review integer not null default 0,
  meta jsonb,
  error_message text,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists property_history_backfill_runs_status_idx
  on public.property_history_backfill_runs (status, started_at desc);

create table if not exists public.property_history_backfill_items (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.property_history_backfill_runs (id) on delete cascade,
  listing_property_id uuid not null references public.properties (id) on delete cascade,
  property_master_id uuid references public.property_masters (id) on delete set null,
  auction_event_id uuid references public.auction_events (id) on delete set null,
  identity_decision text,
  event_decision text,
  audit_status text not null,
  -- MASTER_CREATED | MASTER_MATCHED | MASTER_REVIEW | MASTER_SKIPPED
  -- EVENT_CREATED | EVENT_MATCHED | EVENT_REVIEW | EVENT_SKIPPED
  -- DUPLICATE_EVENT | IDENTITY_CONFLICT | INSUFFICIENT_EVIDENCE | LOCATION_DATA_REVIEW
  confidence numeric(5,2),
  event_fingerprint text,
  matching_signals jsonb,
  evidence jsonb,
  source_name text,
  source_url text,
  created_at timestamptz not null default now()
);

create index if not exists property_history_backfill_items_run_idx
  on public.property_history_backfill_items (run_id, created_at desc);
create index if not exists property_history_backfill_items_listing_idx
  on public.property_history_backfill_items (listing_property_id);
create index if not exists property_history_backfill_items_status_idx
  on public.property_history_backfill_items (audit_status);

create table if not exists public.property_history_backfill_reviews (
  id uuid primary key default gen_random_uuid(),
  run_id uuid references public.property_history_backfill_runs (id) on delete set null,
  listing_property_id uuid not null references public.properties (id) on delete cascade,
  review_kind text not null,
  -- identity | event
  status text not null default 'pending',
  -- pending | approved | rejected | new_master
  proposed_master_id uuid references public.property_masters (id) on delete set null,
  proposed_event_fingerprint text,
  identity_decision text,
  confidence numeric(5,2),
  matching_signals jsonb,
  conflict_reason text,
  evidence jsonb,
  resolved_by text,
  resolved_at timestamptz,
  resolution_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists property_history_backfill_reviews_status_idx
  on public.property_history_backfill_reviews (status, created_at desc);
create index if not exists property_history_backfill_reviews_listing_idx
  on public.property_history_backfill_reviews (listing_property_id);

alter table public.property_history_backfill_runs enable row level security;
alter table public.property_history_backfill_items enable row level security;
alter table public.property_history_backfill_reviews enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'property_history_backfill_runs'
      and policyname = 'property_history_backfill_runs_admin_all'
  ) then
    create policy property_history_backfill_runs_admin_all
      on public.property_history_backfill_runs for all to authenticated
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
      and tablename = 'property_history_backfill_items'
      and policyname = 'property_history_backfill_items_admin_all'
  ) then
    create policy property_history_backfill_items_admin_all
      on public.property_history_backfill_items for all to authenticated
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
      and tablename = 'property_history_backfill_reviews'
      and policyname = 'property_history_backfill_reviews_admin_all'
  ) then
    create policy property_history_backfill_reviews_admin_all
      on public.property_history_backfill_reviews for all to authenticated
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
