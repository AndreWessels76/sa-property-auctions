-- Harden profiles INSERT so clients cannot self-assign role / billing fields.
-- Apply after 20260728210000_profiles_billing.sql.

drop policy if exists "Profiles: users can insert own row" on public.profiles;
create policy "Profiles: users can insert own row"
  on public.profiles
  for insert
  to authenticated
  with check (
    auth.uid() = id
    and coalesce(role, 'free') = 'free'
    and coalesce(subscription_status, 'inactive') = 'inactive'
    and coalesce(subscription_plan, 'free') = 'free'
    and stripe_customer_id is null
    and stripe_subscription_id is null
  );
