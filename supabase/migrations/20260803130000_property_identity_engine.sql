-- PROPERTY IDENTITY ENGINE — Property Master + Auction Events + History + Provenance
-- Verified Data Platform 2.0 foundation. Does not delete historical listing rows.

-- Permanent property identity (one physical property)
create table if not exists public.property_masters (
  id uuid primary key default gen_random_uuid(),
  fingerprint text not null,
  fingerprint_version integer not null default 1,
  identity_confidence numeric(5,2) not null default 0,
  identity_match_class text not null default 'new',
  -- same | likely_same | possible_duplicate | different | new
  lifecycle_state text not null default 'discovered',
  property_status text not null default 'active',
  property_version integer not null default 1,
  is_master boolean not null default true,
  -- Cadastral / address identity (never invent — null when unknown)
  title text,
  street_address text,
  suburb text,
  town text,
  province text,
  municipality text,
  ward text,
  postal_code text,
  region text,
  farm_name text,
  farm_number text,
  erf_number text,
  portion_number text,
  latitude double precision,
  longitude double precision,
  land_size_sqm numeric,
  combined_extent text,
  property_type text,
  classification_confidence numeric(5,2),
  primary_image_url text,
  primary_image_hash text,
  verification_state text,
  data_classification text default 'needs_verification',
  overall_data_quality numeric(5,2),
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint property_masters_fingerprint_unique unique (fingerprint)
);

create index if not exists property_masters_town_idx
  on public.property_masters (town);
create index if not exists property_masters_province_idx
  on public.property_masters (province);
create index if not exists property_masters_lifecycle_idx
  on public.property_masters (lifecycle_state);
create index if not exists property_masters_erf_idx
  on public.property_masters (erf_number);
create index if not exists property_masters_farm_idx
  on public.property_masters (farm_number, farm_name);

-- Auction events belonging to a property master
create table if not exists public.auction_events (
  id uuid primary key default gen_random_uuid(),
  property_master_id uuid not null references public.property_masters (id) on delete restrict,
  listing_property_id uuid references public.properties (id) on delete set null,
  external_listing_id text,
  agency text,
  auction_date timestamptz,
  auction_time text,
  venue text,
  auction_type text,
  reserve_price numeric,
  opening_bid numeric,
  winning_bid numeric,
  guide_price numeric,
  status text not null default 'scheduled',
  -- scheduled | live | closed | sold | withdrawn | cancelled | expired
  source_name text,
  source_url text,
  connector_id text,
  verification_state text,
  brochure_link text,
  terms_link text,
  catalogue_link text,
  documents jsonb,
  imported_at timestamptz not null default now(),
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists auction_events_master_idx
  on public.auction_events (property_master_id);
create index if not exists auction_events_listing_idx
  on public.auction_events (listing_property_id);
create index if not exists auction_events_date_idx
  on public.auction_events (auction_date);
create index if not exists auction_events_status_idx
  on public.auction_events (status);
create unique index if not exists auction_events_external_unique
  on public.auction_events (connector_id, external_listing_id)
  where external_listing_id is not null and connector_id is not null;

-- Append-only property history (never overwrite)
create table if not exists public.property_history_events (
  id uuid primary key default gen_random_uuid(),
  property_master_id uuid not null references public.property_masters (id) on delete restrict,
  auction_event_id uuid references public.auction_events (id) on delete set null,
  listing_property_id uuid references public.properties (id) on delete set null,
  category text not null,
  -- auction | agency | image | description | price | verification | document | status | identity
  field_name text,
  old_value text,
  new_value text,
  source_name text,
  confidence numeric(5,2),
  meta jsonb,
  created_at timestamptz not null default now()
);

create index if not exists property_history_master_idx
  on public.property_history_events (property_master_id, created_at desc);
create index if not exists property_history_category_idx
  on public.property_history_events (category);

-- Field-level provenance / single source of truth
create table if not exists public.property_field_provenance (
  id uuid primary key default gen_random_uuid(),
  property_master_id uuid not null references public.property_masters (id) on delete cascade,
  field_name text not null,
  field_value text,
  source_name text,
  source_url text,
  verification_date timestamptz,
  verifier text,
  confidence numeric(5,2),
  precedence integer not null default 0,
  last_updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint property_field_provenance_unique unique (property_master_id, field_name, source_name)
);

create index if not exists property_field_provenance_master_idx
  on public.property_field_provenance (property_master_id);

-- Link listing rows to permanent identity (nullable until backfilled)
alter table public.properties
  add column if not exists property_master_id uuid references public.property_masters (id) on delete set null;

create index if not exists properties_property_master_idx
  on public.properties (property_master_id);

-- Optional cadastral helpers on listing row (enrichment persistence)
alter table public.properties
  add column if not exists farm_name text,
  add column if not exists farm_number text,
  add column if not exists erf_number text,
  add column if not exists portion_number text;
