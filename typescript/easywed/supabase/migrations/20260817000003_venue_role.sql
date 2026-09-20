-- The derived 'venue' role, and the exact slice of a wedding it can reach.
--
-- This is the migration that actually discloses something, and the only one in
-- v2 where a plausible-looking simplification is a personal-data breach. Read
-- section 1 before editing anything below it.
--
-- ===========================================================================
-- ORDER IS PART OF THE CORRECTNESS ARGUMENT
-- ===========================================================================
-- Section 1 narrows the policies that must NOT admit a venue. Section 2 widens
-- the ones that must. Section 3 is what creates the role in the first place.
--
-- That sequence is not stylistic. The three SELECT policies on guests,
-- reminders and wedding_members are written today in terms of
-- is_wedding_member(), which stays false for a venue - so they are *incidentally*
-- safe. Section 3 does not change that, but it makes the safety depend on a
-- distinction between two helpers rather than on anything written down. Section
-- 1 restates them in terms of the explicit member roles first, so that at no
-- point in this file - and at no point in a partial replay of it - does the
-- derived role exist while a policy's exclusion of it is implicit.
--
-- If you split this file, keep sections 1 and 2 ahead of section 3.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- 1. The narrowing. THE GUESTS POLICY IS THE ONE THAT MATTERS.
-- ---------------------------------------------------------------------------
-- `guests` holds every guest's full name and the couple's free-text notes
-- about them. Those are third parties who never agreed to anything and have no
-- relationship with us or with the venue, and privacy.venue.hidden promises
-- them in writing that a linked venue never receives either field: "czego sala
-- nie widzi nigdy: imion i nazwisk gosci, notatek o gosciach". The venue's
-- legitimate need - who sits where, and what they eat - is served by
-- wedding_seatmap in section 4, which has no name column and no note column to
-- leak.
--
-- So this policy names the three member roles literally. Do not "simplify" it
-- back to is_wedding_member(wedding_id), and do not add 'venue' to the list:
--
--   * is_wedding_member() is equivalent *today* only because wedding_role()'s
--     first branch is a lookup in the same table. The second branch added in
--     section 3 breaks that equivalence, and there is no reason to assume the
--     first stays a plain lookup forever. A policy that is safe because of how
--     a helper happens to be implemented is one refactor away from being a
--     breach, and the breach is silent - a venue would simply start receiving
--     names, with nothing failing anywhere.
--   * adding 'venue' would hand every guest name and note to the venue in one
--     word. There is no smaller version of that mistake.
--
-- The same reasoning is recorded in docs/supabase.md and in CLAUDE.md's RLS
-- section. Three copies on purpose: this comment protects the reader of the
-- migration, and the other two protect everyone who never opens it.
--
-- `reminders` and `wedding_members` are narrowed identically. Reminders are the
-- couple's private to-do list, and the member list is who else has access -
-- neither is any part of running a room. Narrowing wedding_members is also what
-- forces my_wedding_role() in section 5: the client used to read its own role
-- out of that table, and a venue no longer can.

drop policy "members can view guests" on public.guests;
create policy "members can view guests"
  on public.guests for select
  using (public.wedding_role(wedding_id) in ('owner', 'editor', 'viewer'));

drop policy "members can view reminders" on public.reminders;
create policy "members can view reminders"
  on public.reminders for select
  using (public.wedding_role(wedding_id) in ('owner', 'editor', 'viewer'));

drop policy "members can view co-members" on public.wedding_members;
create policy "members can view co-members"
  on public.wedding_members for select
  using (public.wedding_role(wedding_id) in ('owner', 'editor', 'viewer'));

-- ---------------------------------------------------------------------------
-- 2. The widening: the room, and nothing in it that names a person
-- ---------------------------------------------------------------------------
-- halls, tables and fixtures are the floor plan. They carry names the couple
-- typed ("Stol pary mlodej", "Sala glowna"), which is the venue's own furniture
-- described in the venue's own room - privacy.venue.shared lists exactly this.
--
-- `weddings` is here too, and it is not in the plan's list of three because it
-- reads as infrastructure rather than as data. It is data: the wedding's name
-- and date. Both are disclosed deliberately and both are named in
-- privacy.venue.shared ("nazwe i date wesela"). Without it the peek cannot
-- title itself, and the CRM cannot list which events it has access to.
--
-- Written as an explicit role list rather than `is_wedding_member(...) or
-- wedding_role(...) = 'venue'` so that all seven SELECT policies on the wedding
-- tree now read the same way and differ only in which roles they name. The
-- difference between section 1 and section 2 should be one word per policy, and
-- visible at a glance.
--
-- Nothing about writes changes. Every INSERT/UPDATE/DELETE policy in the tree
-- already demands ('owner', 'editor'), so the derived role is read-only by
-- construction rather than by a rule someone has to remember; selectCanEdit in
-- the client mirrors that same allowlist.

drop policy "members can view their weddings" on public.weddings;
create policy "members can view their weddings"
  on public.weddings for select
  using (public.wedding_role(id) in ('owner', 'editor', 'viewer', 'venue'));

drop policy "members can view halls" on public.halls;
create policy "members can view halls"
  on public.halls for select
  using (
    public.wedding_role(wedding_id) in ('owner', 'editor', 'viewer', 'venue')
  );

drop policy "members can view tables" on public.tables;
create policy "members can view tables"
  on public.tables for select
  using (
    public.wedding_role(wedding_id) in ('owner', 'editor', 'viewer', 'venue')
  );

drop policy "members can view fixtures" on public.fixtures;
create policy "members can view fixtures"
  on public.fixtures for select
  using (
    public.wedding_role(wedding_id) in ('owner', 'editor', 'viewer', 'venue')
  );

-- ---------------------------------------------------------------------------
-- 3. wedding_role() becomes tenant-aware
-- ---------------------------------------------------------------------------
-- 'venue' is *derived*. No wedding_members row ever carries it, and
-- wedding_members_role_check is deliberately NOT widened to allow one: the
-- coalesce below prefers an explicit membership row, so a hand-written 'venue'
-- row would win over this branch and could never be revoked by
-- set_venue_access. The CHECK refusing to store the value is what keeps the
-- derived branch the only source of it.
--
-- Three conditions, all required, and each one is somebody's promise:
--   * the wedding names a tenant                  - the couple linked it;
--   * venue_access = 'granted'                    - the couple consented, and
--                                                   revoking it here is what
--                                                   makes privacy.venue.revoke
--                                                   ("natychmiast i calkowicie")
--                                                   literally true;
--   * the caller is staff of that tenant          - is_tenant_staff excludes
--                                                   'customer', so a couple
--                                                   married at the venue gets
--                                                   nothing from being one of
--                                                   its tenant_members.
--
-- Cost, measured rather than reasoned about. This function is called from every
-- SELECT policy in the wedding tree and is `security definer`, so it cannot be
-- inlined - it is a real call per row. COALESCE evaluates left to right and
-- stops at the first non-null, so a member short-circuits on their own row and
-- the second branch costs them nothing; only a non-member pays for the weddings
-- lookup and is_tenant_staff, and both are single-row index hits.
--
-- On a local stack with a 435-guest, 48-table wedding, 50 full planner loads
-- (the seven parallel reads loadWedding issues) as the owner:
--
--   pre-v2 wedding_role + is_wedding_member policies   1.96 ms / load
--   this function + the explicit role lists            2.87 ms / load
--
-- ~0.9 ms of server time per wedding open, against a request that costs tens of
-- milliseconds in network before it arrives. Accepted.
--
-- The venue's own peek is the expensive side: wedding_seatmap evaluates this
-- per guest row and always falls through to the second branch, measuring
-- ~25 ms for those 435 rows against ~4 ms for the couple's equivalent `guests`
-- read. Still comfortably inside one frame, and it is one query on one screen
-- rather than something every user pays on every load - but it is the number to
-- re-measure first if the peek ever feels slow.
create or replace function public.wedding_role(_wedding_id uuid)
returns text
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(
    (
      select m.role
      from public.wedding_members m
      where m.wedding_id = _wedding_id and m.user_id = auth.uid()
    ),
    (
      -- Explicitly text: an unknown-type literal in a scalar subquery would
      -- leave coalesce()'s argument types to be resolved by inference.
      select 'venue'::text
      from public.weddings w
      where w.id = _wedding_id
        and w.venue_access = 'granted'
        and w.tenant_id is not null
        and public.is_tenant_staff(w.tenant_id)
    )
  );
$$;

-- ---------------------------------------------------------------------------
-- 4. wedding_seatmap: the projection the venue actually reads
-- ---------------------------------------------------------------------------
-- Section 1 leaves `guests` unreachable for a venue. This view is what replaces
-- it: where each guest sits, what they eat, and which age bracket they are in.
-- No name column. No note column. The guarantee is structural - there is
-- nothing in the projection to redact, so no future call site can forget to.
--
-- `security_invoker` is left at its default (off), so the view runs as its
-- owner and the RLS on `guests` does not filter it. That is the point - the
-- underlying policy now excludes venues - and it means the WHERE clause here is
-- the *entire* access control for this view. It is therefore written against
-- wedding_role() rather than is_wedding_member(), the same predicate as section
-- 2, so revoking access revokes this too in the same instant.
--
-- `security_barrier` because of that: with invoker off, a caller-supplied
-- predicate could otherwise be pushed below the WHERE and see rows the view is
-- meant to filter. PostgREST lets callers supply predicates freely
-- (`?dietary=ilike.*`), so this is a reachable concern rather than a
-- theoretical one, and the planner cost is irrelevant at wedding scale.
--
-- Members are admitted as well as venues. Not needed by the couple's own
-- client, which reads `guests` directly, but it keeps the view's predicate
-- identical to the tables it projects - a view that only venues can read would
-- be a second, subtly different access rule to keep in sync.
--
-- HONEST LIMIT, and it is disclosed rather than engineered around:
-- `dietary` and `age_group` are free text the couple types (`Dietary = string`;
-- the CHECK constraints bound shape and length, not content). A couple who
-- types a guest's name into a diet tag sends that name to the venue. The
-- projection guarantees that *we* never disclose the name field; it cannot
-- guarantee what someone put in another field. privacy.venue.shared says so in
-- as many words, and the grant dialog repeats it.
create view public.wedding_seatmap
with (security_barrier = true) as
  select
    g.id,
    g.wedding_id,
    g.table_id,
    g.seat_id,
    g.dietary,
    g.age_group
  from public.guests g
  where g.deleted_at is null
    and public.wedding_role(g.wedding_id)
        in ('owner', 'editor', 'viewer', 'venue');

-- A read-only projection: no INSERT/UPDATE/DELETE grant, so it is not an
-- alternative write path into `guests`.
--
-- The revoke from anon is honest intent, not an enforced boundary locally:
-- seed.sql's blanket `grant select, insert, update, delete on all tables in
-- schema public to anon, authenticated` runs after every migration and covers
-- views, so a local `supabase db reset` re-grants anon on this view. Harmless -
-- the WHERE returns zero rows for a caller with no auth.uid() - but it means a
-- local assertion about this grant would pass for the wrong reason. Assert on
-- the rows, not on the grant.
revoke all on public.wedding_seatmap from anon;
grant select on public.wedding_seatmap to authenticated;

-- ---------------------------------------------------------------------------
-- 5. my_wedding_role: how the client learns it is a venue
-- ---------------------------------------------------------------------------
-- loadWedding used to derive the caller's role from the wedding_members rows it
-- had already fetched for the avatar stack. Section 1 makes that impossible for
-- a venue - it reads zero rows there - and "no row" is indistinguishable from
-- "no access", which is the state selectCanEdit fails closed on.
--
-- An RPC rather than a policy helper, so 20260806000001's rule applies in its
-- normal form and `anon` loses EXECUTE here. That is safe precisely because
-- nothing evaluates this inside a policy expression: the segfault documented in
-- that migration and in 20260817000001's header is about revoking EXECUTE on a
-- function an anonymous SELECT reaches *through a policy*. wedding_role itself
-- keeps its anon grant, untouched.
--
-- Discloses only the caller's own standing, and only for a wedding id they
-- already hold.
create function public.my_wedding_role(p_wedding_id uuid)
returns text
language sql
security definer
set search_path = public
stable
as $$
  select public.wedding_role(p_wedding_id);
$$;

revoke all on function public.my_wedding_role(uuid) from public, anon;
grant execute on function public.my_wedding_role(uuid) to authenticated;
