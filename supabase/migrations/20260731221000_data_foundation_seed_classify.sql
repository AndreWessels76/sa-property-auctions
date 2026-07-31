-- DATA FOUNDATION 1.0 — apply in Supabase SQL Editor (one shot)
-- 1) Schema
-- 2) Classify existing Launch seed rows honestly

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

create index if not exists properties_data_classification_idx
  on public.properties (data_classification);

-- Mark all current catalogue rows as SEED until a licensed feed verifies them.
update public.properties
set
  data_classification = 'seed',
  listing_status = lower(coalesce(nullif(listing_status, ''), nullif(status, ''), 'upcoming')),
  imported_at = coalesce(imported_at, created_at, now()),
  last_verified_at = null,
  country = coalesce(country, 'South Africa'),
  address_display_mode = coalesce(address_display_mode, 'full'),
  street_address = coalesce(street_address, address),
  provenance_notes = coalesce(
    provenance_notes,
    'Launch catalogue seed — illustrative auction-style record. Not a verified live notice. Replace via licensed import.'
  ),
  auction_agency = coalesce(
    auction_agency,
    nullif(trim(split_part(replace(coalesce(source, ''), ' · ', '|'), '|', 1)), '')
  ),
  agency_website = coalesce(
    agency_website,
    case
      when coalesce(source, '') ~* 'https?://' then substring(source from 'https?://[^ ·]+')
      else null
    end
  ),
  source_name = coalesce(
    source_name,
    nullif(trim(split_part(replace(coalesce(source, ''), ' · ', '|'), '|', 1)), ''),
    'Seed catalogue'
  ),
  source_url = coalesce(
    source_url,
    case
      when coalesce(source, '') ~* 'https?://' then substring(source from 'https?://[^ ·]+')
      else null
    end
  ),
  source = case
    when upper(coalesce(source, '')) like '%SEED DATA%' then source
    else 'SEED DATA · ' || coalesce(source, 'Unspecified seed source')
  end,
  updated_at = now()
where coalesce(data_classification, '') not in ('production');
