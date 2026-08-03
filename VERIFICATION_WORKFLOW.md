# VERIFICATION WORKFLOW

1. Acquisition lands listing as **Pending Verification** (hidden from public).
2. Admin opens `/admin/verification`.
3. Checklist: address, images, agency, auction date, metadata, source, quality.
4. Actions:
   - **Approve** → Verified + public
   - **Reject** → Archived + rejection reason
   - **Archive** → Archived
   - **Merge** → keep one, archive duplicate
5. Provenance card on public pages shows Verified + source link + last verified.

Never approve without confirming the original source URL.
