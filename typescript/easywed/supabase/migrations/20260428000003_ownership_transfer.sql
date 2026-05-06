-- transfer_wedding_ownership: lets the current owner hand off a wedding to an
-- existing member. Also blocks transferring to a couple who already owns a
-- different wedding (the 1-wedding-per-couple rule below would also catch
-- this, but checking here gives the UI a cleaner error code).
create function public.transfer_wedding_ownership(_wedding_id uuid, _to_user_id uuid)
returns void language plpgsql security definer
set search_path = public
as $$
declare _to_t text;
begin
  if _to_user_id = auth.uid() then
    raise exception 'cannot transfer ownership to yourself';
  end if;

  if (select owner_id from public.weddings where id = _wedding_id for update)
       is distinct from auth.uid() then
    raise exception 'not the owner';
  end if;

  if not exists (
    select 1 from public.wedding_members
    where wedding_id = _wedding_id and user_id = _to_user_id
  ) then
    raise exception 'target is not a member';
  end if;

  select user_type into _to_t from public.profiles where id = _to_user_id;
  if _to_t = 'couple' and exists (
    select 1 from public.weddings
    where owner_id = _to_user_id and id <> _wedding_id
  ) then
    raise exception 'recipient_couple_already_owns_wedding';
  end if;

  update public.weddings set owner_id = _to_user_id where id = _wedding_id;
  update public.wedding_members set role = 'owner'
    where wedding_id = _wedding_id and user_id = _to_user_id;
  update public.wedding_members set role = 'editor'
    where wedding_id = _wedding_id and user_id = auth.uid();
end; $$;

-- 1-wedding-per-couple, enforced for both INSERT and any owner_id change.
-- owner_id UPDATE only happens inside transfer_wedding_ownership (column
-- update is revoked from authenticated in 20260418000002); that function is
-- SECURITY DEFINER, so this trigger still fires under it.
create function public.enforce_couple_one_wedding()
returns trigger language plpgsql security definer
set search_path = public
as $$
declare _t text;
begin
  select user_type into _t from public.profiles where id = new.owner_id;
  if _t = 'couple' and exists (
    select 1 from public.weddings
    where owner_id = new.owner_id
      and id <> coalesce(new.id, '00000000-0000-0000-0000-000000000000'::uuid)
  ) then
    raise exception 'couple_already_owns_wedding' using errcode = 'check_violation';
  end if;
  return new;
end; $$;

create trigger weddings_enforce_couple_one_wedding
  before insert or update of owner_id on public.weddings
  for each row execute function public.enforce_couple_one_wedding();

-- Insert gate: owner must be onboarded AND have an active subscription.
create function public.enforce_wedding_insert_gate()
returns trigger language plpgsql security definer
set search_path = public
as $$
declare _t text;
begin
  select user_type into _t from public.profiles where id = new.owner_id;
  if _t is null then
    raise exception 'owner_not_onboarded' using errcode = 'check_violation';
  end if;
  if not public.has_active_subscription(new.owner_id) then
    raise exception 'owner_no_active_subscription' using errcode = 'check_violation';
  end if;
  return new;
end; $$;

create trigger weddings_enforce_insert_gate
  before insert on public.weddings
  for each row execute function public.enforce_wedding_insert_gate();
