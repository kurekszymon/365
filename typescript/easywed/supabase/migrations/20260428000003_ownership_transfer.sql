-- transfer_wedding_ownership: lets the current owner hand off a wedding to an
-- existing member. Direct UPDATE on weddings.owner_id is blocked (migration
-- 20260418000002), so this security-definer function bypasses that restriction
-- safely — it validates ownership and membership before making any changes.
create function public.transfer_wedding_ownership(_wedding_id uuid, _to_user_id uuid)
returns void language plpgsql security definer as $$
begin
  if _to_user_id = auth.uid() then
    raise exception 'cannot transfer ownership to yourself';
  end if;

  if (select owner_id from public.weddings where id = _wedding_id) is distinct from auth.uid() then
    raise exception 'not the owner';
  end if;

  if not exists (
    select 1 from public.wedding_members
    where wedding_id = _wedding_id and user_id = _to_user_id
  ) then
    raise exception 'target is not a member';
  end if;

  update public.weddings
    set owner_id = _to_user_id
    where id = _wedding_id;

  update public.wedding_members
    set role = 'owner'
    where wedding_id = _wedding_id and user_id = _to_user_id;

  update public.wedding_members
    set role = 'editor'
    where wedding_id = _wedding_id and user_id = auth.uid();
end; $$;
