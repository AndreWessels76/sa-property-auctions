-- Run this in the Supabase SQL editor (Dashboard → SQL → New query).

alter table public.profiles enable row level security;

drop policy if exists "Profiles: users can read own row" on public.profiles;
create policy "Profiles: users can read own row"
  on public.profiles
  for select
  to authenticated
  using (auth.uid() = id);

drop policy if exists "Profiles: users can insert own row" on public.profiles;
create policy "Profiles: users can insert own row"
  on public.profiles
  for insert
  to authenticated
  with check (auth.uid() = id);

drop policy if exists "Profiles: users can update own row" on public.profiles;
create policy "Profiles: users can update own row"
  on public.profiles
  for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Create a profile row automatically when a new auth user is created.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, role, subscription_status)
  values (
    new.id,
    coalesce(
      new.raw_app_meta_data ->> 'role',
      new.raw_user_meta_data ->> 'role',
      'free'
    ),
    'inactive'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();
