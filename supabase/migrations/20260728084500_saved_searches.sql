-- Saved searches (name + filters JSON + active flag)

create table if not exists public.saved_searches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  filters jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists saved_searches_user_id_idx
  on public.saved_searches (user_id);

create index if not exists saved_searches_active_idx
  on public.saved_searches (active)
  where active = true;

alter table public.saved_searches enable row level security;

drop policy if exists "Saved searches: users read own" on public.saved_searches;
create policy "Saved searches: users read own"
  on public.saved_searches
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Saved searches: users insert own" on public.saved_searches;
create policy "Saved searches: users insert own"
  on public.saved_searches
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Saved searches: users update own" on public.saved_searches;
create policy "Saved searches: users update own"
  on public.saved_searches
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Saved searches: users delete own" on public.saved_searches;
create policy "Saved searches: users delete own"
  on public.saved_searches
  for delete
  to authenticated
  using (auth.uid() = user_id);
