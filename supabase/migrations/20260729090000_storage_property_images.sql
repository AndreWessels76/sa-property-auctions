-- Production storage hardening for property images.
-- Apply in Supabase SQL editor after creating the `property-images` bucket.
-- Intent: public READ of objects; authenticated ADMIN-only WRITE/UPDATE/DELETE.
-- If you have no `profiles.role = 'admin'` rows, uploads must use the service role from server jobs.

-- Ensure bucket exists (Dashboard → Storage also works).
insert into storage.buckets (id, name, public)
values ('property-images', 'property-images', true)
on conflict (id) do update set public = true;

-- Wipe legacy open policies if present.
drop policy if exists "property-images public read" on storage.objects;
drop policy if exists "property-images public upload" on storage.objects;
drop policy if exists "property-images public update" on storage.objects;
drop policy if exists "property-images public delete" on storage.objects;
drop policy if exists "Property images: public read" on storage.objects;
drop policy if exists "Property images: anon upload" on storage.objects;

create policy "Property images: public read"
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'property-images');

create policy "Property images: admin insert"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'property-images'
    and exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
    )
  );

create policy "Property images: admin update"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'property-images'
    and exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
    )
  )
  with check (
    bucket_id = 'property-images'
    and exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
    )
  );

create policy "Property images: admin delete"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'property-images'
    and exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
    )
  );
