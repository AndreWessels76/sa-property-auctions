# Storage Deployment — SA Property Auctions

Property images are stored in Supabase Storage bucket **`property-images`**.

---

## Bucket configuration

| Setting | Value |
|---|---|
| Bucket ID | `property-images` |
| Public | **Yes** (public read via `getPublicUrl`) |
| File path pattern | `{propertyId}/{uuid}.{ext}` |

**Code references:**

- Upload: `lib/images/storage.ts` → `supabase.storage.from("property-images")`
- Next.js images: `next.config.ts` remote pattern for `*.supabase.co`

---

## Apply storage policies

Run migration:

```
supabase/migrations/20260729090000_storage_property_images.sql
```

In Supabase Dashboard → **SQL** → paste and execute.

### Policy summary

| Operation | Who | Policy |
|---|---|---|
| **SELECT (read)** | `anon`, `authenticated` | Public read on `property-images` bucket |
| **INSERT** | `authenticated` + `profiles.role = 'admin'` | Admin only |
| **UPDATE** | Admin only | Same |
| **DELETE** | Admin only | Same |

Anonymous and non-admin users **cannot upload**.

---

## Application-layer controls

| Control | Status |
|---|---|
| Public property page upload UI | **Removed** (RC2.2) |
| `ImageUpload` component | Admin-gated (returns null for non-admin) |
| Importer pipeline (`lib/importers/sheriff.ts`) | Uses service role server-side |

---

## Image URLs

- **Type:** Public URLs via `getPublicUrl()` — not signed URLs
- **Format:** `https://<project-ref>.supabase.co/storage/v1/object/public/property-images/<path>`
- **Next.js Image:** Hostname must be in `next.config.ts` `remotePatterns`

If you change Supabase project, update `next.config.ts`:

```ts
{
  protocol: "https",
  hostname: "<your-project-ref>.supabase.co",
}
```

---

## Signed URLs

**Not used** in current codebase. All gallery images use public URLs. If bucket is made private in future, update `lib/images/storage.ts` and gallery components to use signed URLs.

---

## Deployment checklist

- [ ] Bucket `property-images` exists (migration creates it)
- [ ] Migration `20260729090000_storage_property_images.sql` applied
- [ ] Verify anon **cannot** upload (Storage → Policies → test or API)
- [ ] Verify public **can** read existing objects
- [ ] `next.config.ts` includes correct Supabase hostname
- [ ] At least one admin user in `profiles` if manual uploads needed

---

## Verification commands

**Test read (browser):** Open a known `image_url` from `property_images` table.

**Test anon upload blocked:** Attempt upload with anon key — expect policy denial.

**Admin upload:** Sign in as admin → use admin-only upload path (importer or future admin UI).

---

## Troubleshooting

| Issue | Cause | Fix |
|---|---|---|
| Images 404 | Bucket missing or wrong path | Apply migration; check object path |
| Next/Image blocked | Host not in `remotePatterns` | Update `next.config.ts` |
| Upload fails for admin | Policy not applied or user not admin | Check `profiles.role` |
| Orphan files in storage | Deletes not implemented | Manual cleanup in Dashboard |
