-- Due Diligence Data Extraction & Evidence Engine 1.0
-- Audit log for extraction runs. Soft-fail in app if not applied.

create table if not exists public.due_diligence_extraction_runs (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties (id) on delete cascade,
  auction_event_id uuid,
  partner text,
  source_url text,
  source_hash text not null,
  extraction_version text not null default '1.0.0',
  fields_found integer not null default 0,
  fields_updated integer not null default 0,
  fields_rejected integer not null default 0,
  conflicts integer not null default 0,
  documents_found integer not null default 0,
  errors integer not null default 0,
  completeness_before numeric,
  completeness_after numeric,
  operator text,
  result_json jsonb not null default '{}'::jsonb,
  started_at timestamptz not null default now(),
  completed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint due_diligence_extraction_runs_unique unique (property_id, source_hash)
);

create index if not exists due_diligence_extraction_runs_property_idx
  on public.due_diligence_extraction_runs (property_id, updated_at desc);

create index if not exists due_diligence_extraction_runs_partner_idx
  on public.due_diligence_extraction_runs (partner);

alter table public.due_diligence_extraction_runs enable row level security;

-- Admin/service role writes; authenticated admins may read via service layer.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'due_diligence_extraction_runs'
      and policyname = 'dd_extraction_admin_read'
  ) then
    create policy dd_extraction_admin_read
      on public.due_diligence_extraction_runs
      for select
      to authenticated
      using (
        exists (
          select 1 from public.profiles p
          where p.id = auth.uid() and p.role = 'admin'
        )
      );
  end if;
end $$;
