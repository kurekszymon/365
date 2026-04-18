-- Let owners see their own wedding without depending on wedding_members.
-- Fixes `.insert().select()` where the handle_new_wedding trigger's
-- membership row isn't visible to the outer SELECT's snapshot yet.
create policy "owners can view their own weddings"
  on public.weddings for select
  using (owner_id = auth.uid());
