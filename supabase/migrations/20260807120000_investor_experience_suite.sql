-- PROPERTY INTELLIGENCE PLATFORM 3.0 — Investor Experience Suite
-- Private workspace + smart alerts. Never public. Never auto-publish.

create table if not exists public.investor_workspace_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  property_id uuid references public.properties (id) on delete set null,
  property_master_id uuid references public.property_masters (id) on delete set null,
  title text,
  body text not null,
  note_type text not null default 'general',
  -- general | inspection | valuation | legal | viewing | settlement
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists investor_workspace_notes_user_idx
  on public.investor_workspace_notes (user_id, updated_at desc);
create index if not exists investor_workspace_notes_property_idx
  on public.investor_workspace_notes (property_id);

create table if not exists public.investor_workspace_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  property_id uuid references public.properties (id) on delete set null,
  property_master_id uuid references public.property_masters (id) on delete set null,
  label text not null,
  document_type text not null default 'other',
  -- inspection | valuation | legal | registration | other
  storage_path text,
  external_url text,
  mime_type text,
  bytes integer,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists investor_workspace_documents_user_idx
  on public.investor_workspace_documents (user_id, updated_at desc);

create table if not exists public.investor_workspace_trackers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  property_id uuid references public.properties (id) on delete cascade,
  viewing_date date,
  registration_status text,
  -- not_started | registered | confirmed
  legal_status text,
  settlement_status text,
  archived boolean not null default false,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint investor_workspace_trackers_unique unique (user_id, property_id)
);

create table if not exists public.smart_alert_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  is_active boolean not null default true,
  province text,
  town text,
  agency text,
  property_type text,
  max_price numeric,
  days_until_auction integer,
  channels text[] not null default '{email}',
  -- email | operations_centre | push
  last_triggered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists smart_alert_rules_user_idx
  on public.smart_alert_rules (user_id, is_active);

-- RLS: users own their workspace rows
alter table public.investor_workspace_notes enable row level security;
alter table public.investor_workspace_documents enable row level security;
alter table public.investor_workspace_trackers enable row level security;
alter table public.smart_alert_rules enable row level security;

do $$ begin
  create policy investor_notes_own on public.investor_workspace_notes
    for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy investor_docs_own on public.investor_workspace_documents
    for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy investor_trackers_own on public.investor_workspace_trackers
    for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy smart_alerts_own on public.smart_alert_rules
    for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
exception when duplicate_object then null;
end $$;
