# PROPERTY COMPARISON 4.0 — REPORT

**Date:** 2026-08-13  
**Sprint:** 1 of Investor Intelligence 4.0  
**Routes:** `/compare`, `/api/compare`

---

## Implemented

- Compare tray on listing cards (up to 6 IDs in the browser).
- Server comparison uses `PropertyService.getByIds` (public catalogue: upcoming/live verified only).
- Free: 2 listings; basic property + auction fields.
- Premium/admin: 6 listings; land size, building size, registration, agricultural hectares/farm type, and pricing rows that exist.
- Pricing rows (`reserve`, `guide/auction price`, `estimated value`) appear only when **at least one** compared listing has that numeric field. Empty/zero prices are **Not supplied**.
- Reserve is never copied from estimated value or auction price.
- Methodology string is shown on the table. Language is decision support, not advice.

---

## Tested

Selftests: free limit 2, premium limit 6, no reserve row when both reserves are null, estimated value shown as supplied/not supplied per column, land size not supplied vs supplied.

API gates with `SubscriptionService.premium()` (admin included, Stripe does not overwrite admin).

Typecheck **PASS**. Build **PASS** (`/compare`, `/api/compare`).

---

## Unavailable

- Historical / expired listings cannot be compared on this public route (catalogue policy).
- Saved comparisons are device-local in workspace, not a database table.
- No price/m² or “difference vs reference” in this sprint (Sprint 2).
- No synthetic comparables.

---

## Data required

Structured fields on the listings being compared. Missing fields stay **Not supplied**.
