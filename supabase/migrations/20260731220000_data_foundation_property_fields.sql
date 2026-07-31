-- DATA FOUNDATION 1.0 — production property provenance & auction metadata
-- Additive / nullable. Safe to re-run (IF NOT EXISTS patterns).

alter table public.properties
  add column if not exists street_address text,
  add column if not exists country text default 'South Africa',
  add column if not exists municipality text,
  add column if not exists region text,
  add column if not exists reserve_price numeric,
  add column if not exists auction_time text,
  add column if not exists auction_venue text,
  add column if not exists auction_agency text,
  add column if not exists agency_contact text,
  add column if not exists agency_website text,
  add column if not exists source_name text,
  add column if not exists source_url text,
  add column if not exists external_listing_id text,
  add column if not exists imported_at timestamptz,
  add column if not exists last_verified_at timestamptz,
  add column if not exists listing_status text,
  add column if not exists data_classification text,
  add column if not exists data_quality_score integer,
  add column if not exists registration_required boolean,
  add column if not exists deposit_required boolean,
  add column if not exists terms_link text,
  add column if not exists brochure_link text,
  add column if not exists catalogue_link text,
  add column if not exists address_display_mode text,
  add column if not exists provenance_notes text;

comment on column public.properties.data_classification is
  'production | needs_verification | seed | demo';
comment on column public.properties.address_display_mode is
  'full | suburb_only | withheld';
comment on column public.properties.listing_status is
  'Canonical status: upcoming | live | sold | withdrawn | cancelled | completed';

create index if not exists properties_data_classification_idx
  on public.properties (data_classification);

create index if not exists properties_external_listing_id_idx
  on public.properties (external_listing_id);

create index if not exists properties_source_name_idx
  on public.properties (source_name);

create index if not exists properties_imported_at_idx
  on public.properties (imported_at);
