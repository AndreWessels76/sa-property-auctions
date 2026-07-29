-- Property AI analysis cache (one row per property).

create table if not exists public.property_ai_analysis (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties (id) on delete cascade,
  score numeric not null,
  confidence numeric not null,
  summary text not null,
  strengths text[] not null default '{}'::text[],
  risks text[] not null default '{}'::text[],
  buyer_profile text[] not null default '{}'::text[],
  estimated_discount numeric null,
  provider text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint property_ai_analysis_property_id_key unique (property_id)
);

create index if not exists property_ai_analysis_property_id_idx
  on public.property_ai_analysis (property_id);

alter table public.property_ai_analysis enable row level security;

drop policy if exists "Property AI analysis: public read"
  on public.property_ai_analysis;
create policy "Property AI analysis: public read"
  on public.property_ai_analysis
  for select
  to anon, authenticated
  using (true);

drop policy if exists "Property AI analysis: public insert"
  on public.property_ai_analysis;
create policy "Property AI analysis: public insert"
  on public.property_ai_analysis
  for insert
  to anon, authenticated
  with check (true);

drop policy if exists "Property AI analysis: public update"
  on public.property_ai_analysis;
create policy "Property AI analysis: public update"
  on public.property_ai_analysis
  for update
  to anon, authenticated
  using (true)
  with check (true);
