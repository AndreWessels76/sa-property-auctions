# ADMIN PUBLIC NAVIGATION REPORT

**Date:** 2026-08-03  
**Type:** UX enhancement (admin → public site)  
**Scope:** Operations Centre navigation only — no layout redesign

---

## Summary

Administrators can return to the public platform in one click from every Operations Centre screen.

---

## Changes

| Location | Change |
|----------|--------|
| `app/admin/components/AdminSidebar.tsx` | Permanent footer nav item **View Public Auctions** → `/auctions` |
| `app/admin/components/AdminHeader.tsx` | Header button **View Public Auctions** (desktop) / **Public Site** (mobile) → `/auctions` |
| `app/admin/verification/.../VerificationDashboardClient.tsx` | Optional **Open Public Listing** per queue row → `/properties/{id}` (new tab) |

---

## Behaviour

- Navigates to `/auctions` (or property page for the optional action)
- Does **not** log out, change session, or change role
- Visible in sidebar (all breakpoints where layout shows the sidebar) and header (including compact mobile label)

---

## Validation

| Check | Result |
|-------|--------|
| One-click Operations → Public | Yes — sidebar + header |
| Mobile header label | Yes — “Public Site” on small screens |
| Optional public listing from verification | Yes — “Open Public Listing” |
| `npm run typecheck` | PASS |
| `npm run build` | PASS |

---

## Verdict

**PASS**
