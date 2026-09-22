-- Soft-delete for inquiries: "Delete" moves a row to trash instead of
-- removing it outright, so a lead can't be lost to a misclick. Permanent
-- deletion is only allowed once an item has sat in trash for at least
-- TRASH_RETENTION_DAYS (15, enforced in permanentlyDeleteInquiry() —
-- see src/lib/trash.ts for the shared constant) — this is a minimum
-- retention window, not an auto-purge, so nothing is ever deleted without
-- an admin explicitly choosing to.
alter table inquiries add column if not exists deleted_at timestamptz;

create index if not exists inquiries_deleted_at_idx on inquiries (deleted_at);

-- A real DELETE (for the "permanently delete" action) wasn't previously
-- possible for admins at all — only insert/select/update existed.
drop policy if exists "admins delete inquiries" on inquiries;
create policy "admins delete inquiries"
  on inquiries for delete
  to authenticated
  using (exists (select 1 from admins where user_id = auth.uid()));
