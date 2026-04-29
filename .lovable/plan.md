
## Part 1 — Delete a fund

**Where:** Put the delete action in **two places**:
1. **AuditDetail header** — primary location, a small "Delete audit" item inside a kebab/overflow menu on the detail page (so it's deliberate, not a one-click accident next to other actions).
2. **MyAudits row** — a hover-revealed kebab on each row with "Delete" so users can clean up abandoned `pending` rows without having to open them first. This is the main use case based on the duplicate bug below.

**Confirmation:** AlertDialog with the fund name typed back (or a clear "This will permanently delete the audit, all documents, RFIs and findings. This cannot be undone." + a destructive Confirm button). Given auditors care about records, require explicit confirmation; no soft-undo toast.

**What gets deleted (in order, in a single async handler):**
1. Storage files under `audit-documents/{auditId}/` — list then `remove()` the paths.
2. DB rows — `audits` row only. The related tables (`documents`, `rfis`, `rfi_messages`, `audit_notes`, `finding_reviews`) currently have **no FK cascade** (confirmed: `No foreign keys` on each table). So we must explicitly delete in this order before the audit row:
   - `rfi_messages` (joined via rfis.audit_id)
   - `rfis` where audit_id = X
   - `documents` where audit_id = X
   - `audit_notes` where audit_id = X
   - `finding_reviews` where audit_id = X
   - `audits` where id = X

   RLS already permits the owner to delete their own audit/documents/rfis/notes; `finding_reviews` has an open ALL policy so that's fine.

3. On success: toast "Audit deleted", navigate back to `/audits` (from detail page) or refresh the list.

**Permissions:** RLS already restricts to `auth.uid() = user_id`, so users can only delete their own. Admins reading other users' audits won't get a delete button (gate the UI on `audit.user_id === user.id`).

**Optional later (not in this plan):** a proper Postgres `on delete cascade` migration would simplify this, but adding FKs to existing data needs care. Doing it client-side first is safe and reversible.

## Part 2 — Duplicate "appeared twice as pending" bug

**Root cause confirmed from the DB.** Looking at recent audits, the pattern is consistent:

```
01:18  Gary Edward & Barbara Richards SF   pending / unpaid
01:22  Gary Edward & Barbara Richards SF   in_progress / paid   ← actual run
```

Same fund, same user, ~4 minutes apart. Three "Kleftus" rows show the same shape. The `pending` + `unpaid` rows are **orphaned creation attempts** — the audit row is inserted at the very start of `NewAuditModal.handleSubmit` (before file upload), so anything that goes wrong after the insert (file upload failure, user closes modal, network blip, user retrying) leaves a phantom `pending` audit behind. There is no retry/resume — the next submit creates a brand new row.

The user thinks they "uploaded once" because to them only the successful run counted; the failed first attempt silently left a row.

**Fix (in `NewAuditModal.handleSubmit`):**

1. **Roll back the audit row on file-upload failure.** Currently the code does `audits.insert(...)`, then loops over files; if any file upload or `documents.insert` throws, it sets an error and returns — leaving the audit row. Change the catch block to also `await supabase.from("audits").delete().eq("id", auditId)` before showing the error. Also remove any uploaded storage files that already succeeded for that audit.
2. **Strengthen the double-submit guard.** The button is `disabled={loading}` but `loading` is a state setter — a fast double-click can fire two handlers before React commits. Add a `useRef(false)` "submitting" latch checked synchronously at the top of `handleSubmit` to make it idempotent.
3. **One-time cleanup of existing orphans (optional but recommended).** A simple admin-side or one-off script deletes audits where `status='pending' AND payment_status='unpaid' AND created_at < now() - interval '1 hour' AND no documents exist`. We can do this as a manual SQL run rather than building UI for it — about 6 rows would be cleaned up across the project.

## Files to change

```text
src/pages/AuditDetail.tsx        Add delete action + AlertDialog in header
src/pages/MyAudits.tsx           Add per-row kebab with Delete + AlertDialog
src/components/NewAuditModal.tsx Rollback on failure + ref-based submit latch
src/lib/deleteAudit.ts           New helper: deletes storage + child rows + audit
```

(One shared helper keeps the deletion logic identical from both entry points.)

## Open questions

1. Confirmation style: typed fund-name confirmation (stricter) or a plain destructive AlertDialog (faster)?
2. Do you want the one-time cleanup of the ~5–6 orphan `pending/unpaid` rows in the DB right now, or leave them for users to delete via the new UI?
