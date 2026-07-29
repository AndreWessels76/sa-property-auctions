-- User property alerts (matches AlertRepository / AlertDTO)

create table if not exists public.alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  property_id uuid null references public.properties (id) on delete set null,
  alert_type text not null check (
    alert_type in ('NEW_MATCH', 'PRICE_DROP', 'HIDDEN_GEM', 'HIGH_SCORE')
  ),
  title text not null,
  message text null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists alerts_user_id_idx
  on public.alerts (user_id);

create index if not exists alerts_property_id_idx
  on public.alerts (property_id);

create index if not exists alerts_user_unread_idx
  on public.alerts (user_id, read)
  where read = false;

create unique index if not exists alerts_user_property_alert_type_key
  on public.alerts (user_id, property_id, alert_type)
  where property_id is not null;

alter table public.alerts enable row level security;

drop policy if exists "Alerts: users read own" on public.alerts;
create policy "Alerts: users read own"
  on public.alerts
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Alerts: users insert own" on public.alerts;
create policy "Alerts: users insert own"
  on public.alerts
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Alerts: users update own" on public.alerts;
create policy "Alerts: users update own"
  on public.alerts
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Alerts: users delete own" on public.alerts;
create policy "Alerts: users delete own"
  on public.alerts
  for delete
  to authenticated
  using (auth.uid() = user_id);
