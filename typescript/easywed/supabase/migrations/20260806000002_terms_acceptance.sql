-- Evidence that a user accepted a specific version of the Regulamin.
--
-- The sign-up form has a blocking, unticked checkbox, but that is React state
-- and nothing else: once the request is gone there is no record that the box
-- was ever there, let alone which version of the document it pointed at. The
-- burden of proving the contract was concluded on those terms is the
-- Provider's (art. 6 kc), and § 16 lets the Terms change - so "accepted" is
-- only meaningful next to a version.
alter table public.profiles
  add column terms_version text check (
    terms_version is null
    or (
      terms_version = btrim(terms_version)
      and length(terms_version) between 1 and 40
    )
  ),
  add column terms_accepted_at timestamptz;

-- The timestamp is never client-supplied. A user can say *which* version they
-- accepted (the client sends it, and raw_user_meta_data is client-writable
-- anyway), but they cannot choose when: this stamps now() on every change and
-- otherwise carries the old value forward, so the column can't be backdated
-- through the profiles UPDATE policy.
create function public.stamp_terms_acceptance()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' and new.terms_version is not distinct from old.terms_version then
    new.terms_accepted_at := old.terms_accepted_at;
  elsif new.terms_version is null then
    new.terms_accepted_at := null;
  else
    new.terms_accepted_at := now();
  end if;

  return new;
end;
$$;

create trigger profiles_stamp_terms_acceptance
  before insert or update on public.profiles
  for each row execute function public.stamp_terms_acceptance();

-- Same treatment every other trigger function got in 20260806000001: hosted
-- Supabase's `alter default privileges ... grant all on functions to anon,
-- authenticated` means a function created here picks up explicit client grants,
-- and a plain `revoke from public` does not subtract them. Nothing can call
-- this meaningfully - PostgreSQL checks EXECUTE at CREATE TRIGGER time, not
-- when the trigger fires - but leaving the grant in place is the exact noise
-- 20260806000001 existed to clear. Not a policy helper, so the segfault caveat
-- in section 3 of that migration does not apply here.
revoke all on function public.stamp_terms_acceptance() from public, anon, authenticated;

-- Email sign-up carries the accepted version in the signUp() metadata, so the
-- acceptance is written server-side at the moment the user is created - before
-- they have a session, and without trusting a later client write.
--
-- OAuth has no equivalent: signInWithOAuth() takes no user metadata, so those
-- users arrive here with nothing and the client fills the column in on the
-- first authenticated render (see src/lib/sync/termsAcceptance.ts). Both paths
-- land on the same trigger above for the timestamp.
--
-- The metadata is client-controlled, so what arrives here is a claim, not a
-- fact, and it has to be treated as one. An over-long value would otherwise
-- violate the CHECK on terms_version and abort the transaction that inserts
-- into auth.users - meaning `signUp({ data: { terms_version: <41+ chars> } })`
-- breaks sign-up itself. Anything that would not satisfy the constraint is
-- dropped to null rather than clipped: a truncated string would be recorded as
-- if it were a real acceptance of a version nobody published, and null already
-- has a defined meaning here ("no evidence"), which sends the user through the
-- gate to accept properly. The predicate is spelled out rather than inferred
-- from the constraint, so this stays correct if the two ever drift.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  claimed_version text := nullif(
    btrim(coalesce(new.raw_user_meta_data ->> 'terms_version', '')),
    ''
  );
begin
  if claimed_version is not null and length(claimed_version) > 40 then
    claimed_version := null;
  end if;

  insert into public.profiles (id, terms_version)
  values (new.id, claimed_version)
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Accounts created before this migration accepted nothing that was recorded -
-- deliberately left null rather than backfilled with a guess. Null means "no
-- evidence", which is the true state, and § 16 ust. 2 (notify by email, 14 days
-- to object) is the mechanism for putting the current version in front of them.
comment on column public.profiles.terms_version is
  'Version of the Regulamin the user accepted (LEGAL_DATES.termsEffective). Null = signed up before acceptance was recorded, or accepted nothing.';
comment on column public.profiles.terms_accepted_at is
  'Server-stamped time of that acceptance. Never client-supplied - see stamp_terms_acceptance().';
