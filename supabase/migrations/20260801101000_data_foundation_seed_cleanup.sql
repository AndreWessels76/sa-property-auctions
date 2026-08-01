-- DATA FOUNDATION 2.0 — convert remaining seed into pending_verification or archived.
-- Never auto-verify. Never fabricate auction or address data.

update public.properties
set
  verification_state = 'pending_verification',
  data_classification = 'needs_verification',
  status_changed_at = coalesce(status_changed_at, now()),
  status_change_reason = coalesce(
    status_change_reason,
    'data_foundation_2_seed_cleanup'
  ),
  status_source_event = coalesce(
    status_source_event,
    'df2_seed_to_pending'
  ),
  provenance_notes = trim(
    both from concat_ws(
      ' ',
      nullif(provenance_notes, ''),
      'Converted from seed to Pending Verification (DATA FOUNDATION 2.0). Not a verified live notice.'
    )
  ),
  updated_at = now()
where
  coalesce(verification_state, '') in ('', 'seed')
  or coalesce(data_classification, '') in ('seed', 'demo')
  or source ilike '%SEED DATA%'
  or source ilike '%[SEED]%'
  or source ilike 'SEED ·%';

-- Soft-archive rows that are clearly non-production placeholders with no location.
update public.properties
set
  verification_state = 'archived',
  data_classification = 'demo',
  status = 'archived',
  listing_status = 'archived',
  status_changed_at = now(),
  status_change_reason = 'data_foundation_2_archive_empty_placeholder',
  status_source_event = 'df2_archive_placeholder',
  updated_at = now()
where
  (title ilike '%placeholder%' or title ilike '%demo%' or title ilike '%test listing%')
  and (address is null or trim(address) = '')
  and (suburb is null or trim(suburb) = '');
