-- Profiles billing columns + hardened RLS for Stripe sync.

alter table public.profiles
  add column if not exists subscription_plan text not null default 'free',
  add column if not exists stripe_customer_id text null,
  add column if not exists stripe_subscription_id text null,
  add column if not exists subscription_expires_at timestamptz null,
  add column if not exists updated_at timestamptz null default now();

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_subscription_plan_check'
  ) then
    alter table public.profiles
      add constraint profiles_subscription_plan_check
      check (
        subscription_plan in ('free', 'premium_monthly', 'premium_yearly')
      );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_subscription_status_check'
  ) then
    alter table public.profiles
      add constraint profiles_subscription_status_check
      check (
        subscription_status in (
          'inactive',
          'trial',
          'active',
          'past_due',
          'cancelled',
          'expired'
        )
      );
  end if;
end $$;

create unique index if not exists profiles_stripe_customer_id_uidx
  on public.profiles (stripe_customer_id)
  where stripe_customer_id is not null;

create unique index if not exists profiles_stripe_subscription_id_uidx
  on public.profiles (stripe_subscription_id)
  where stripe_subscription_id is not null;

create index if not exists profiles_subscription_status_idx
  on public.profiles (subscription_status);

-- Prevent users from self-granting premium / Stripe fields.
drop policy if exists "Profiles: users can update own row" on public.profiles;
create policy "Profiles: users can update own row"
  on public.profiles
  for update
  to authenticated
  using (auth.uid() = id)
  with check (
    auth.uid() = id
    and role = (select p.role from public.profiles p where p.id = auth.uid())
    and coalesce(subscription_status, 'inactive') =
      (select coalesce(p.subscription_status, 'inactive') from public.profiles p where p.id = auth.uid())
    and coalesce(subscription_plan, 'free') =
      (select coalesce(p.subscription_plan, 'free') from public.profiles p where p.id = auth.uid())
    and stripe_customer_id is not distinct from
      (select p.stripe_customer_id from public.profiles p where p.id = auth.uid())
    and stripe_subscription_id is not distinct from
      (select p.stripe_subscription_id from public.profiles p where p.id = auth.uid())
    and subscription_expires_at is not distinct from
      (select p.subscription_expires_at from public.profiles p where p.id = auth.uid())
  );

-- Never trust client-supplied role metadata on signup.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, role, subscription_status, subscription_plan)
  values (new.id, 'free', 'inactive', 'free')
  on conflict (id) do nothing;

  return new;
end;
$$;

-- Lock down AI analysis writes (service role / server only).
drop policy if exists "Property AI analysis: public insert" on public.property_ai_analysis;
drop policy if exists "Property AI analysis: public update" on public.property_ai_analysis;
