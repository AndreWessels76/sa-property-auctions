-- VERIFIED LISTINGS 1.0.1 — optional agricultural extension (Farm only)
-- Nullable JSON profile; residential rows remain unaffected (NULL).

alter table public.properties
  add column if not exists agricultural_details jsonb;

comment on column public.properties.agricultural_details is
  'Optional farm/agricultural attributes. Only populated for Farm property types.';

create index if not exists properties_agricultural_details_gin
  on public.properties using gin (agricultural_details)
  where agricultural_details is not null;
