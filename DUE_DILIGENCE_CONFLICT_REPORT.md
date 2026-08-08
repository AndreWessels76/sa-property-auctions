# DUE DILIGENCE CONFLICT REPORT

**Date:** 2026-08-08  
**Engine:** Due Diligence Extraction 1.0

---

## Policy

When two sources disagree on the same field:

1. **Do not** silently choose a blended value.
2. Create a conflict record (`FieldConflict`).
3. Display: “Conflicting source information”.
4. Mark field `pending_verification`.
5. Prefer stronger source for *display candidate* only (priority table), while keeping conflict visible.

## Priority (strongest → weakest)

1. Official partner structured feed  
2. Official auction page (deterministic text)  
3. Official auction document  
4. Property information pack  
5. Trusted geocoder  
6. Other approved source  

## Fixture run

Acceptance fixtures (`DUE_DILIGENCE_EXTRACTION_EVIDENCE.json`): **0 conflicts**.

Unit selftest includes an intentional 4.164 Ha vs 4.21 Ha conflict → detected as `"Conflicting source information"`.

## Ops impact

Conflicts increment `due_diligence_extraction_runs.conflicts` and appear on the Operations Centre extraction table. Resolution remains a human verification action — never automated.
