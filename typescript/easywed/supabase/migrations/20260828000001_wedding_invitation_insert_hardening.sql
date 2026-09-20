-- Pin the forgeable columns on `wedding_invitations` INSERT.
--
-- The same hardening 20260820000001 carries for `tenant_invitations`, applied to
-- the table it was modelled on. It is a separate migration for one reason:
-- 20260422000001 has been applied on remote since 2026-04-22, and an applied
-- migration is never edited.
--
-- ## What was forgeable
--
-- `"owners create invites"` constrained `invited_by` and the wedding's
-- ownership. Every other column of the row is client-supplied on INSERT -
-- defaults are defaults, not guarantees - so a wedding owner could also write:
--
--   * `claimed_at` / `claimed_by`, minting an audit record of a join that never
--     happened. `InvitationManager` renders claimed rows as accepted, so this
--     is a row that reads, in the couple's own records, as a named account
--     having accepted an invitation they never saw. `claimed_by` is a real
--     `auth.users` FK, so the uuid has to name a real account: the forger picks
--     whose acceptance to fabricate.
--   * `expires_at` arbitrarily far out, turning a 14-day link into a standing
--     credential for the wedding.
--   * `token`, replacing 64 hex characters of `gen_random_uuid` output with
--     something guessable. A token is a bearer credential; its entire security
--     is that nobody who was not sent it can guess it.
--
-- None of this is an escalation *for the owner*, who can already add members.
-- What it closes is an owner manufacturing a record about somebody else, and a
-- link outliving the intent behind it. Both are cheap to close.
--
-- ## Two things about the shape of this migration
--
-- **The policy is replaced, not added to.** Two INSERT policies on one table are
-- OR-ed, so a second permissive policy would widen the door rather than narrow
-- it. The old one is dropped and the whole predicate restated - `invited_by` and
-- the ownership check included - so it still reads as one complete statement of
-- who may insert what.
--
-- **The token shape is a policy clause, not a CHECK on the column.** A CHECK
-- would also bind psql and any future definer function, and it is tempting for
-- that reason. It is not what ships, for two: the forgery being closed is
-- specifically "a client supplies a column instead of taking its default", and
-- a CHECK would outlaw `supabase/seed.sql`'s deliberately hand-typeable fixtures
-- (`seed-live-editor-invite`), which exist so `/invite/$token` can be reached by
-- typing it during development. A CHECK would also have to validate against
-- every row already on remote at push time. What this does not cover: an RPC
-- added later that mints tokens itself - `claim_wedding_invitation` does not
-- write this column, and one that did would need its own discipline.
--
-- Considered and rejected: moving minting into a definer
-- `create_wedding_invitation(p_wedding_id, p_role)`. `useWeddingMembers` inserts
-- directly today, and the policy below already pins every column such an RPC
-- would have written. It is the right shape if this table ever grows a value the
-- client cannot legitimately know.

drop policy "owners create invites" on public.wedding_invitations;

create policy "owners create invites" on public.wedding_invitations
  for insert
  with check (
    invited_by = auth.uid()
    and exists (
      select 1 from public.weddings w
      where w.id = wedding_id and w.owner_id = auth.uid()
    )
    -- An invitation is born unclaimed. Burning it is
    -- `claim_wedding_invitation`'s job and nobody else's.
    and claimed_at is null
    and claimed_by is null
    -- Not already expired (a link that never worked, with no message saying
    -- why), and not valid indefinitely. An outer bound rather than an equality
    -- against the 14-day default, so that default can be tuned without
    -- revisiting this policy.
    and expires_at > now()
    and expires_at <= now() + interval '30 days'
    and token ~ '^[0-9a-f]{64}$'
  );
