-- Local development seed. Runs automatically at the end of `supabase db reset`.
--
-- To re-seed without a full reset:
--   docker exec -i supabase_db_easywed psql -U postgres -d postgres < supabase/seed.sql
--
-- NEVER run this against remote. It writes directly to auth.users with known
-- passwords and bypasses RLS entirely (it runs as postgres) - the point is to
-- get realistic multi-user state without clicking through signup four times.
--
-- Everything is keyed off the @easywed.test email domain, and the first
-- statement deletes those users. auth.users cascades to profiles, weddings,
-- memberships, halls, tables, guests, reminders and invitations, so running
-- this twice replaces the fixture rather than duplicating it.
--
-- Accounts (password is `password123` for all four):
--
--   owner@easywed.test   Anna Kowalska      owner  of "Anna & Piotr", the shared one
--   editor@easywed.test  Piotr Nowak        editor of "Anna & Piotr"
--   viewer@easywed.test  Maria Wisniewska   viewer of "Anna & Piotr" (joined via invite)
--   solo@easywed.test    Tomasz Zielinski   owner of "Tomasz & Kasia", nobody else on it
--   venue@easywed.test   Sala Bagatelka     owner  of the `bagatelka` tenant
--   venue2@easywed.test  Dworek pod Debem   owner  of the `dworek` tenant
--
-- The solo account is the one to use for delete-account: the owner account is
-- deliberately blocked by `delete_own_account` because its wedding is shared.
--
-- The two venue accounts exist so the tenant surfaces have something to render
-- at bagatelka.localhost:3000 and dworek.localhost:3000, and so the RLS matrix
-- test (src/lib/sync/venueRls.test.ts) has a second tenant to prove isolation
-- against. "Anna & Piotr" is linked to `bagatelka` and granted; "Tomasz &
-- Kasia" is linked to nothing.

begin;

-- ---------------------------------------------------------------------------
-- Grants: make local match hosted
-- ---------------------------------------------------------------------------
-- Without this the seeded data is invisible to the app. A local `supabase db
-- reset` leaves `anon` and `authenticated` with `Dxtm` and no `arwd` on public
-- tables - hosted Supabase grants those through default privileges, and nothing
-- in migrations/ does. Every query then fails with `42501 permission denied for
-- table weddings` *before* RLS is consulted, which looks nothing like an RLS
-- problem and sends you hunting through policies that are fine.
--
-- Granting here is also what makes local RLS testing mean anything: with no
-- grants at all, a policy that would leak on remote still "passes" locally
-- because the query never gets far enough to be evaluated. See the "Local vs
-- remote gotcha" section in docs/supabase.md.
grant select, insert, update, delete on all tables in schema public to anon, authenticated;

delete from auth.users where email like '%@easywed.test';

-- ---------------------------------------------------------------------------
-- Accounts
-- ---------------------------------------------------------------------------
-- `email_confirmed_at` is set even though local config has
-- enable_confirmations = false, so the users look the same as production ones
-- and nothing in the UI renders an "unconfirmed" state.
--
-- The auth.identities row is what makes signInWithPassword work: GoTrue looks
-- the user up by identity, not by auth.users.email alone. provider_id must be
-- the user id for the `email` provider.
--
-- The four empty-string token columns are load-bearing, and the failure they
-- prevent is deeply unhelpful. GoTrue scans `confirmation_token`,
-- `recovery_token`, `email_change_token_new` and `email_change` into
-- non-nullable Go strings, and those four are the ones with no DB default. Leave
-- them NULL and every login dies with a 500 "Database error querying schema",
-- while the real error only appears in the auth container's log:
--   Scan error on column index 3, name "confirmation_token":
--   converting NULL to string is unsupported
insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  confirmation_token, recovery_token, email_change_token_new, email_change,
  created_at, updated_at
)
values
  ('10000000-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'owner@easywed.test',
   crypt('password123', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}', '{}',
   '', '', '', '', now(), now()),
  ('10000000-0000-4000-8000-000000000002', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'editor@easywed.test',
   crypt('password123', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}', '{}',
   '', '', '', '', now(), now()),
  ('10000000-0000-4000-8000-000000000003', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'viewer@easywed.test',
   crypt('password123', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}', '{}',
   '', '', '', '', now(), now()),
  ('10000000-0000-4000-8000-000000000004', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'solo@easywed.test',
   crypt('password123', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}', '{}',
   '', '', '', '', now(), now()),
  ('10000000-0000-4000-8000-000000000005', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'venue@easywed.test',
   crypt('password123', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}', '{}',
   '', '', '', '', now(), now()),
  ('10000000-0000-4000-8000-000000000006', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'venue2@easywed.test',
   crypt('password123', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}', '{}',
   '', '', '', '', now(), now());

insert into auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
select
  u.id::text,
  u.id,
  jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true, 'phone_verified', false),
  'email',
  now(), now(), now()
from auth.users u
where u.email like '%@easywed.test';

-- profiles rows already exist - handle_new_user created one per insert above.
-- One display name is deliberately left null so the "falls back to the role"
-- path in the members dialog and avatar stack has something to render.
update public.profiles set display_name = 'Anna Kowalska'    where id = '10000000-0000-4000-8000-000000000001';
update public.profiles set display_name = 'Piotr Nowak'      where id = '10000000-0000-4000-8000-000000000002';
update public.profiles set display_name = null               where id = '10000000-0000-4000-8000-000000000003';
update public.profiles set display_name = 'Tomasz Zielinski' where id = '10000000-0000-4000-8000-000000000004';
update public.profiles set display_name = 'Sala Bagatelka'   where id = '10000000-0000-4000-8000-000000000005';
update public.profiles set display_name = 'Dworek pod Debem' where id = '10000000-0000-4000-8000-000000000006';

-- ---------------------------------------------------------------------------
-- Tenants
-- ---------------------------------------------------------------------------
-- Reachable at bagatelka.localhost:3000 and dworek.localhost:3000 - every
-- browser resolves *.localhost to loopback with no DNS and no hosts-file edit,
-- so these are complete local reproductions of a tenant host.
--
-- This replaces the hand-provisioned `bagatelka` row that used to live only in
-- the local database and was wiped by every `supabase db reset`.
--
-- Branding values are shaped by the CHECK regexes on the table (https:// logo,
-- #rrggbb colours) - those regexes are the CSS-injection guard for values that
-- end up in element.style, so anything failing them belongs nowhere near here.
--
-- `open_linking` differs between the two on purpose: bagatelka is
-- invitation-only (the default, and the interesting case - a couple can only
-- link once the venue has added them as a `customer`), dworek is open so the
-- open-linking branch of link_wedding_to_venue is exercisable by hand.
insert into public.tenants (id, slug, name, status, locale, logo_url, primary_color, accent_color, tagline, open_linking) values
  ('50000000-0000-4000-8000-000000000001', 'bagatelka', 'Sala Bagatelka', 'active', 'pl',
   null, '#7c3f58', '#e8c3b0', 'Wesela i przyjecia w sercu Mazowsza', false),
  ('50000000-0000-4000-8000-000000000002', 'dworek', 'Dworek pod Debem', 'active', 'pl',
   null, '#2f4f3e', '#c8d5c0', 'Kameralne przyjecia w zabytkowym dworku', true);

-- Each venue's own account, plus the couple of "Anna & Piotr" as one of
-- bagatelka's customers - which is what the invitation-only linking check in
-- link_wedding_to_venue looks for. tenant_members_one_per_user means every user
-- here belongs to at most one tenant.
insert into public.tenant_members (tenant_id, user_id, role) values
  ('50000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000005', 'owner'),
  ('50000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000006', 'owner'),
  ('50000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'customer');

-- One spent tenant invitation (how Anna became bagatelka's customer, as far as
-- the CRM roster is concerned) and one still live, so /crm/roster has both
-- states and the claim route is reachable:
--   http://localhost:3000/venue/invite/seed-live-customer-invite
--
-- The live one is claimable by solo@easywed.test, the only seeded account that
-- belongs to no tenant - every other one trips tenant_members_one_per_user,
-- which is itself the PT409 branch worth exercising by hand.
insert into public.tenant_invitations (tenant_id, token, role, invited_by, claimed_by, claimed_at, expires_at) values
  ('50000000-0000-4000-8000-000000000001', 'seed-claimed-customer-invite', 'customer',
   '10000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000001',
   now() - interval '5 days', now() + interval '9 days'),
  ('50000000-0000-4000-8000-000000000001', 'seed-live-customer-invite', 'customer',
   '10000000-0000-4000-8000-000000000005', null, null, now() + interval '14 days');

-- ---------------------------------------------------------------------------
-- Menus
-- ---------------------------------------------------------------------------
-- bagatelka's catalogue, shaped after a real "Oferta weselna": four packages,
-- each a list of courses, each course a "pick N of these" rule.
--
-- Ids are hand-assigned rather than generated, because later migrations' seed
-- blocks and the RLS suite reference specific dishes literally: 60... packages,
-- 61... courses, 62... options, with the course code carried inside the option
-- id so a dish is traceable to its course by eye.
--
-- The fixture is uneven on purpose. MENU II carries the full buffet course set
-- with real options, because it is what the CRM editor is looked at on. MENU
-- SERWOWANE carries the *plated* course (per_guest_choice, choose_count 3),
-- which is the one shape the rest of this phase is demonstrated on - the couple
-- narrows six mains to three, and each guest then gets one of those three. MENU
-- I and MENU III get a name, a price and two courses each: enough to render a
-- list of four packages without another two hundred lines here.
--
-- Prices are integer minor units - 40500 is 405,00 zl - denominated in
-- tenants.currency, which defaults to 'PLN'.
--
-- ASCII throughout, like the rest of this file. Real venue data is full of
-- diacritics and the columns hold them fine; the seed avoids them so a
-- mis-encoded terminal never turns a fixture into a puzzle.
insert into public.menu_packages (id, tenant_id, name, description, price_per_person_minor, position) values
  ('60000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000001',
   'MENU I', 'Klasyczne przyjecie: zupa, dania glowne, dodatki, deser, bufet zimny i kolacja.', 40500, 1),
  ('60000000-0000-4000-8000-000000000002', '50000000-0000-4000-8000-000000000001',
   'MENU II', 'Rozszerzony bufet i dwudaniowa kolacja.', 43500, 2),
  ('60000000-0000-4000-8000-000000000003', '50000000-0000-4000-8000-000000000001',
   'MENU III', 'Z przystawka i najbogatszym bufetem zimnym.', 48500, 3),
  ('60000000-0000-4000-8000-000000000004', '50000000-0000-4000-8000-000000000001',
   'MENU SERWOWANE', 'Danie glowne wybiera i dostaje kazdy gosc z osobna - do stolu, nie z bufetu.', 45500, 4),
  -- dworek's single package. Its whole job is to make "a venue sees only its
  -- own menus" a real assertion in menuRls.test.ts rather than a vacuous one.
  ('60000000-0000-4000-8000-000000000009', '50000000-0000-4000-8000-000000000002',
   'Menu Dworkowe', 'Kameralne przyjecie w zabytkowym dworku.', 39000, 1);

insert into public.menu_courses (id, tenant_id, menu_package_id, name, choose_count, serving_note, per_guest_choice, position) values
  -- MENU I
  ('61000000-0000-4000-8000-000000000101', '50000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-000000000001', 'Zupa',         1, null,                   false, 1),
  ('61000000-0000-4000-8000-000000000102', '50000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-000000000001', 'Danie glowne', 5, '3 porcje na osobe',    false, 2),
  -- MENU II - the full set
  ('61000000-0000-4000-8000-000000000201', '50000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-000000000002', 'Zupa',            1, null,                false, 1),
  ('61000000-0000-4000-8000-000000000202', '50000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-000000000002', 'Danie glowne',    6, '3 porcje na osobe', false, 2),
  ('61000000-0000-4000-8000-000000000203', '50000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-000000000002', 'Dodatki',         6, null,                false, 3),
  ('61000000-0000-4000-8000-000000000204', '50000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-000000000002', 'Deser',           1, null,                false, 4),
  ('61000000-0000-4000-8000-000000000205', '50000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-000000000002', 'Bufet zimny',     8, null,                false, 5),
  ('61000000-0000-4000-8000-000000000206', '50000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-000000000002', 'Kolacja - zupa',  1, null,                false, 6),
  ('61000000-0000-4000-8000-000000000207', '50000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-000000000002', 'Kolacja - dania', 3, null,                false, 7),
  -- MENU III
  ('61000000-0000-4000-8000-000000000301', '50000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-000000000003', 'Przystawka',   1, null,                    false, 1),
  ('61000000-0000-4000-8000-000000000302', '50000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-000000000003', 'Bufet zimny', 10, '4 porcje na osobe',     false, 2),
  -- MENU SERWOWANE. The third course is the plated one, and it is the fixture
  -- the rest of phase 4 is built on: the couple narrows six mains to three, and
  -- every guest is then assigned one of those three.
  ('61000000-0000-4000-8000-000000000401', '50000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-000000000004', 'Przystawka',   1, null, false, 1),
  ('61000000-0000-4000-8000-000000000402', '50000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-000000000004', 'Zupa',         1, null, false, 2),
  ('61000000-0000-4000-8000-000000000403', '50000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-000000000004', 'Danie glowne', 3, 'serwowane do stolu', true,  3),
  ('61000000-0000-4000-8000-000000000404', '50000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-000000000004', 'Deser',        1, null, false, 4),
  -- dworek
  ('61000000-0000-4000-8000-000000000901', '50000000-0000-4000-8000-000000000002', '60000000-0000-4000-8000-000000000009', 'Zupa',         1, null, false, 1);

insert into public.menu_options (id, tenant_id, menu_course_id, name, note, position, archived_at) values
  -- MENU I / Zupa
  ('62000000-0000-4000-8000-000000010101', '50000000-0000-4000-8000-000000000001', '61000000-0000-4000-8000-000000000101', 'Rosol z makaronem',                        null, 1, null),
  ('62000000-0000-4000-8000-000000010102', '50000000-0000-4000-8000-000000000001', '61000000-0000-4000-8000-000000000101', 'Krem z pieczonych pomidorow',              null, 2, null),
  -- MENU I / Danie glowne
  ('62000000-0000-4000-8000-000000010201', '50000000-0000-4000-8000-000000000001', '61000000-0000-4000-8000-000000000102', 'Kotlet schabowy panierowany',              null, 1, null),
  ('62000000-0000-4000-8000-000000010202', '50000000-0000-4000-8000-000000000001', '61000000-0000-4000-8000-000000000102', 'Roladki z kurczaka ze szpinakiem',         null, 2, null),
  ('62000000-0000-4000-8000-000000010203', '50000000-0000-4000-8000-000000000001', '61000000-0000-4000-8000-000000000102', 'Zrazy wolowe w sosie wlasnym',            null, 3, null),
  -- MENU II / Zupa
  ('62000000-0000-4000-8000-000000020101', '50000000-0000-4000-8000-000000000001', '61000000-0000-4000-8000-000000000201', 'Rosol z domowym makaronem',                null, 1, null),
  ('62000000-0000-4000-8000-000000020102', '50000000-0000-4000-8000-000000000001', '61000000-0000-4000-8000-000000000201', 'Krem z bialych warzyw z grzankami',        null, 2, null),
  ('62000000-0000-4000-8000-000000020103', '50000000-0000-4000-8000-000000000001', '61000000-0000-4000-8000-000000000201', 'Zurek staropolski z jajkiem i kielbasa',   null, 3, null),
  -- MENU II / Danie glowne
  ('62000000-0000-4000-8000-000000020201', '50000000-0000-4000-8000-000000000001', '61000000-0000-4000-8000-000000000202', 'Kotlet schabowy panierowany',              null, 1, null),
  ('62000000-0000-4000-8000-000000020202', '50000000-0000-4000-8000-000000000001', '61000000-0000-4000-8000-000000000202', 'Poledwiczki wieprzowe duszone w porach',   null, 2, null),
  ('62000000-0000-4000-8000-000000020203', '50000000-0000-4000-8000-000000000001', '61000000-0000-4000-8000-000000000202', 'Roladki drobiowe ze szpinakiem i feta',    null, 3, null),
  ('62000000-0000-4000-8000-000000020204', '50000000-0000-4000-8000-000000000001', '61000000-0000-4000-8000-000000000202', 'Zrazy wolowe w sosie z suszonych grzybow', null, 4, null),
  ('62000000-0000-4000-8000-000000020205', '50000000-0000-4000-8000-000000000001', '61000000-0000-4000-8000-000000000202', 'Pstrag pieczony w masle ziolowym',         null, 5, null),
  ('62000000-0000-4000-8000-000000020206', '50000000-0000-4000-8000-000000000001', '61000000-0000-4000-8000-000000000202', 'Placki z makaronu ryzowego z pesto',       null, 6, null),
  ('62000000-0000-4000-8000-000000020207', '50000000-0000-4000-8000-000000000001', '61000000-0000-4000-8000-000000000202', 'Udziec z gesi pieczony',                   null, 7, null),
  -- MENU II / Dodatki
  ('62000000-0000-4000-8000-000000020301', '50000000-0000-4000-8000-000000000001', '61000000-0000-4000-8000-000000000203', 'Ziemniaki z koperkiem',                    null, 1, null),
  ('62000000-0000-4000-8000-000000020302', '50000000-0000-4000-8000-000000000001', '61000000-0000-4000-8000-000000000203', 'Kluski slaskie',                           null, 2, null),
  ('62000000-0000-4000-8000-000000020303', '50000000-0000-4000-8000-000000000001', '61000000-0000-4000-8000-000000000203', 'Kopytka',                                  null, 3, null),
  ('62000000-0000-4000-8000-000000020304', '50000000-0000-4000-8000-000000000001', '61000000-0000-4000-8000-000000000203', 'Buraczki zasmazane',                       null, 4, null),
  ('62000000-0000-4000-8000-000000020305', '50000000-0000-4000-8000-000000000001', '61000000-0000-4000-8000-000000000203', 'Surowka z kapusty pekinskiej',             null, 5, null),
  ('62000000-0000-4000-8000-000000020306', '50000000-0000-4000-8000-000000000001', '61000000-0000-4000-8000-000000000203', 'Mizeria ze swiezym ogorkiem',              null, 6, null),
  -- MENU II / Deser
  ('62000000-0000-4000-8000-000000020401', '50000000-0000-4000-8000-000000000001', '61000000-0000-4000-8000-000000000204', 'Tiramisu w pucharku',                      null, 1, null),
  ('62000000-0000-4000-8000-000000020402', '50000000-0000-4000-8000-000000000001', '61000000-0000-4000-8000-000000000204', 'Panna cotta z sosem malinowym',            null, 2, null),
  -- MENU II / Bufet zimny. The note here is the "(maj, czerwiec)" case - a
  -- seasonal remark the venue types, shown verbatim beside the dish.
  ('62000000-0000-4000-8000-000000020501', '50000000-0000-4000-8000-000000000001', '61000000-0000-4000-8000-000000000205', 'Deska serow dojrzewajacych',               null, 1, null),
  ('62000000-0000-4000-8000-000000020502', '50000000-0000-4000-8000-000000000001', '61000000-0000-4000-8000-000000000205', 'Poledwica wolowa na zimno',                null, 2, null),
  ('62000000-0000-4000-8000-000000020503', '50000000-0000-4000-8000-000000000001', '61000000-0000-4000-8000-000000000205', 'Tatar wolowy',                             null, 3, null),
  ('62000000-0000-4000-8000-000000020504', '50000000-0000-4000-8000-000000000001', '61000000-0000-4000-8000-000000000205', 'Szparagi w szynce parmenskiej', '(maj, czerwiec)', 4, null),
  ('62000000-0000-4000-8000-000000020505', '50000000-0000-4000-8000-000000000001', '61000000-0000-4000-8000-000000000205', 'Sledz w oleju z cebula',                   null, 5, null),
  ('62000000-0000-4000-8000-000000020506', '50000000-0000-4000-8000-000000000001', '61000000-0000-4000-8000-000000000205', 'Roladki z lososia z serkiem',              null, 6, null),
  ('62000000-0000-4000-8000-000000020507', '50000000-0000-4000-8000-000000000001', '61000000-0000-4000-8000-000000000205', 'Salatka grecka',                           null, 7, null),
  ('62000000-0000-4000-8000-000000020508', '50000000-0000-4000-8000-000000000001', '61000000-0000-4000-8000-000000000205', 'Pasztet z zurawina',                       null, 8, null),
  -- An archived dish: last year's offer, kept so a couple who ordered it still
  -- has a named choice, hidden from every picker. This is the row that makes
  -- the `archived_at is null` filter a real branch rather than dead code.
  ('62000000-0000-4000-8000-000000020509', '50000000-0000-4000-8000-000000000001', '61000000-0000-4000-8000-000000000205', 'Galareta drobiowa',                        null, 9, now() - interval '60 days'),
  -- MENU II / Kolacja
  ('62000000-0000-4000-8000-000000020601', '50000000-0000-4000-8000-000000000001', '61000000-0000-4000-8000-000000000206', 'Barszcz czerwony z krokietem',             null, 1, null),
  ('62000000-0000-4000-8000-000000020602', '50000000-0000-4000-8000-000000000001', '61000000-0000-4000-8000-000000000206', 'Gulaszowa',                                null, 2, null),
  ('62000000-0000-4000-8000-000000020701', '50000000-0000-4000-8000-000000000001', '61000000-0000-4000-8000-000000000207', 'Bigos staropolski',                        null, 1, null),
  ('62000000-0000-4000-8000-000000020702', '50000000-0000-4000-8000-000000000001', '61000000-0000-4000-8000-000000000207', 'Strogonow z poledwicy',                    null, 2, null),
  ('62000000-0000-4000-8000-000000020703', '50000000-0000-4000-8000-000000000001', '61000000-0000-4000-8000-000000000207', 'Pierogi ruskie okraszane',                 null, 3, null),
  ('62000000-0000-4000-8000-000000020704', '50000000-0000-4000-8000-000000000001', '61000000-0000-4000-8000-000000000207', 'Zapiekanka ziemniaczana',                  null, 4, null),
  -- MENU III
  ('62000000-0000-4000-8000-000000030101', '50000000-0000-4000-8000-000000000001', '61000000-0000-4000-8000-000000000301', 'Carpaccio z poledwicy wolowej',            null, 1, null),
  ('62000000-0000-4000-8000-000000030102', '50000000-0000-4000-8000-000000000001', '61000000-0000-4000-8000-000000000301', 'Tatar z lososia z awokado',                null, 2, null),
  ('62000000-0000-4000-8000-000000030201', '50000000-0000-4000-8000-000000000001', '61000000-0000-4000-8000-000000000302', 'Deska wedlin dojrzewajacych',              null, 1, null),
  ('62000000-0000-4000-8000-000000030202', '50000000-0000-4000-8000-000000000001', '61000000-0000-4000-8000-000000000302', 'Krewetki w czosnku',                       null, 2, null),
  -- MENU SERWOWANE / Przystawka, Zupa, Deser
  ('62000000-0000-4000-8000-000000040101', '50000000-0000-4000-8000-000000000001', '61000000-0000-4000-8000-000000000401', 'Carpaccio z buraka z kozim serem',         null, 1, null),
  ('62000000-0000-4000-8000-000000040102', '50000000-0000-4000-8000-000000000001', '61000000-0000-4000-8000-000000000401', 'Tatar z lososia z awokado',                null, 2, null),
  ('62000000-0000-4000-8000-000000040201', '50000000-0000-4000-8000-000000000001', '61000000-0000-4000-8000-000000000402', 'Krem z borowikow',                         null, 1, null),
  ('62000000-0000-4000-8000-000000040202', '50000000-0000-4000-8000-000000000001', '61000000-0000-4000-8000-000000000402', 'Rosol z domowym makaronem',                null, 2, null),
  -- MENU SERWOWANE / Danie glowne - the six plated mains
  ('62000000-0000-4000-8000-000000040301', '50000000-0000-4000-8000-000000000001', '61000000-0000-4000-8000-000000000403', 'Poledwica wolowa z sosem z zielonego pieprzu', null, 1, null),
  ('62000000-0000-4000-8000-000000040302', '50000000-0000-4000-8000-000000000001', '61000000-0000-4000-8000-000000000403', 'Kaczka pieczona z jablkami',              null, 2, null),
  ('62000000-0000-4000-8000-000000040303', '50000000-0000-4000-8000-000000000001', '61000000-0000-4000-8000-000000000403', 'Poledwiczki wieprzowe duszone w porach',   null, 3, null),
  ('62000000-0000-4000-8000-000000040304', '50000000-0000-4000-8000-000000000001', '61000000-0000-4000-8000-000000000403', 'Filet z halibuta na szpinaku',            null, 4, null),
  ('62000000-0000-4000-8000-000000040305', '50000000-0000-4000-8000-000000000001', '61000000-0000-4000-8000-000000000403', 'Risotto z warzywami i parmezanem',        null, 5, null),
  ('62000000-0000-4000-8000-000000040306', '50000000-0000-4000-8000-000000000001', '61000000-0000-4000-8000-000000000403', 'Comber jagniecy z tymiankiem',            null, 6, null),
  ('62000000-0000-4000-8000-000000040401', '50000000-0000-4000-8000-000000000001', '61000000-0000-4000-8000-000000000404', 'Sernik na zimno z malinami',              null, 1, null),
  ('62000000-0000-4000-8000-000000040402', '50000000-0000-4000-8000-000000000001', '61000000-0000-4000-8000-000000000404', 'Suflet czekoladowy',                      null, 2, null),
  -- dworek
  ('62000000-0000-4000-8000-000000090101', '50000000-0000-4000-8000-000000000002', '61000000-0000-4000-8000-000000000901', 'Rosol z kury zagrodowej',                 null, 1, null),
  ('62000000-0000-4000-8000-000000090102', '50000000-0000-4000-8000-000000000002', '61000000-0000-4000-8000-000000000901', 'Krem z dyni',                             null, 2, null);

-- ---------------------------------------------------------------------------
-- Weddings
-- ---------------------------------------------------------------------------
-- on_wedding_created inserts the owner's own wedding_members row, so only the
-- editor and viewer are added by hand below.
--
-- tenant_id/venue_access are written directly here rather than through
-- link_wedding_to_venue + set_venue_access, which is fine and is not a way
-- around the guard: enforce_wedding_tenant_columns only blocks `authenticated`
-- and `anon`, and this file runs as postgres. "Anna & Piotr" is the granted
-- peek the RLS matrix test asserts against; "Tomasz & Kasia" stays unlinked, so
-- it doubles as the "a venue reaches nothing it was not given" case.
insert into public.weddings (id, owner_id, name, date, tenant_id, venue_access) values
  ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001',
   'Anna & Piotr', current_date + 120,
   '50000000-0000-4000-8000-000000000001', 'granted'),
  ('20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000004',
   'Tomasz & Kasia', current_date + 240, null, 'none');

-- "Anna & Piotr" orders MENU SERWOWANE - the package with the plated course,
-- so the planner's Menu tab, the per-guest picker and the kitchen tally all
-- have something real to render. Written directly rather than through an
-- UPDATE by the couple, for the same reason tenant_id is: this file runs as
-- postgres, and enforce_wedding_menu_package holds it to the same rule anyway
-- (the package belongs to bagatelka, which is what this wedding is linked to).
--
-- "Tomasz & Kasia" deliberately gets none. It is linked to no venue, so it is
-- also the "no Menu tab at all" case.
update public.weddings
set menu_package_id = '60000000-0000-4000-8000-000000000004'
where id = '20000000-0000-4000-8000-000000000001';

-- The served set: one dish per buffet course, and three of the six plated mains
-- (Danie glowne has choose_count 3, per_guest_choice true). The three survivors
-- are what guests get assigned in 20260822000003's seed.
insert into public.wedding_menu_selections (wedding_id, menu_option_id) values
  ('20000000-0000-4000-8000-000000000001', '62000000-0000-4000-8000-000000040101'),
  ('20000000-0000-4000-8000-000000000001', '62000000-0000-4000-8000-000000040201'),
  ('20000000-0000-4000-8000-000000000001', '62000000-0000-4000-8000-000000040301'),
  ('20000000-0000-4000-8000-000000000001', '62000000-0000-4000-8000-000000040302'),
  ('20000000-0000-4000-8000-000000000001', '62000000-0000-4000-8000-000000040303'),
  ('20000000-0000-4000-8000-000000000001', '62000000-0000-4000-8000-000000040401');

insert into public.wedding_members (wedding_id, user_id, role) values
  ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000002', 'editor'),
  ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000003', 'viewer');

-- One spent invitation (the viewer's way in) and one still live, so the owner's
-- invitation manager has both states and /invite/$token is reachable:
--   http://localhost:3000/invite/seed-live-editor-invite
insert into public.wedding_invitations (wedding_id, token, role, invited_by, claimed_by, claimed_at, expires_at) values
  ('20000000-0000-4000-8000-000000000001', 'seed-claimed-viewer-invite', 'viewer',
   '10000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000003',
   now() - interval '3 days', now() + interval '11 days'),
  ('20000000-0000-4000-8000-000000000001', 'seed-live-editor-invite', 'editor',
   '10000000-0000-4000-8000-000000000001', null, null, now() + interval '14 days');

-- ---------------------------------------------------------------------------
-- Halls - "Anna & Piotr"
-- ---------------------------------------------------------------------------
-- Positions follow nextHallPosition(): the second hall sits one HALL_GAP (3m)
-- to the right of the first. The annex is an l-shape so the polygon path (and
-- the halls_geometry_required_for_polygon CHECK) is exercised, not just
-- rectangles. Geometry vertices are hall-local, bbox-min at (0,0).
insert into public.halls (id, wedding_id, name, preset, width, height, pos_x, pos_y, floor, geometry) values
  ('30000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001',
   'Sala glowna', 'rectangle', 20, 14, 0, 0, 0, null),
  ('30000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000001',
   'Sala bankietowa', 'l-shape', 12, 10, 23, 0, 0,
   '{"vertices":[{"x":0,"y":0},{"x":12,"y":0},{"x":12,"y":6},{"x":7,"y":6},{"x":7,"y":10},{"x":0,"y":10}],"closed":true}'),
  ('30000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000002',
   'Sala', 'rectangle', 16, 10, 0, 0, null, null);

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
-- `seats` stays '[]' everywhere except the head table: only seats the user has
-- dragged are stored, so an empty array is the normal state and the two
-- overrides below cover the auto-layout-vs-override branch in seatLayout.
-- Round tables use `width` as the diameter; `height` is kept equal to it.
insert into public.tables (id, wedding_id, hall_id, name, shape, capacity, width, height, pos_x, pos_y, rotation, geometry, seats) values
  -- Sala glowna
  ('40000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001',
   'Stol 1', 'round', 8, 1.8, 1.8, 3, 3, 0, null, '[]'),
  ('40000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001',
   'Stol 2', 'round', 8, 1.8, 1.8, 8, 3, 0, null, '[]'),
  ('40000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001',
   'Stol 3', 'round', 8, 1.8, 1.8, 13, 3, 0, null, '[]'),
  ('40000000-0000-4000-8000-000000000004', '20000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001',
   'Stol pary mlodej', 'rectangular', 12, 4, 1.2, 3, 8, 0, null,
   '[{"id":"seat-0","x":0.6,"y":-0.35},{"id":"seat-1","x":1.4,"y":-0.35}]'),
  ('40000000-0000-4000-8000-000000000005', '20000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001',
   'Stol dzieci', 'rectangular', 6, 2.4, 1, 9.5, 8, 90, null, '[]'),
  ('40000000-0000-4000-8000-000000000006', '20000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001',
   'Stol 6', 'custom', 6, 2.2, 2, 14, 8, 0,
   '{"vertices":[{"x":0.55,"y":0},{"x":1.65,"y":0},{"x":2.2,"y":1},{"x":1.65,"y":2},{"x":0.55,"y":2},{"x":0,"y":1}],"closed":true}',
   '[]'),
  -- Sala bankietowa
  ('40000000-0000-4000-8000-000000000007', '20000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000002',
   'Stol A', 'round', 8, 1.8, 1.8, 2, 2, 0, null, '[]'),
  ('40000000-0000-4000-8000-000000000008', '20000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000002',
   'Stol B', 'round', 8, 1.8, 1.8, 2, 6.5, 0, null, '[]'),
  -- Tomasz & Kasia
  ('40000000-0000-4000-8000-000000000009', '20000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000003',
   'Stol glowny', 'rectangular', 10, 3.5, 1.2, 6, 2, 0, null, '[]'),
  ('40000000-0000-4000-8000-00000000000a', '20000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000003',
   'Stol 1', 'round', 8, 1.8, 1.8, 3, 6, 0, null, '[]'),
  ('40000000-0000-4000-8000-00000000000b', '20000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000003',
   'Stol 2', 'round', 8, 1.8, 1.8, 11, 6, 0, null, '[]');

-- ---------------------------------------------------------------------------
-- Fixtures
-- ---------------------------------------------------------------------------
-- One of each shape, so the renderer and the fixture form both have something
-- non-trivial to show. Ids are generated - nothing references fixtures.
insert into public.fixtures (id, wedding_id, hall_id, name, shape, width, height, pos_x, pos_y, rotation, geometry) values
  (gen_random_uuid(), '20000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001',
   'Scena', 'rectangle', 6, 2, 7, 0.5, 0, null),
  (gen_random_uuid(), '20000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001',
   'Parkiet', 'circle', 4.5, 4.5, 7.5, 11, 0, null),
  (gen_random_uuid(), '20000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001',
   'Bar', 'rounded', 3, 1, 16.5, 1, 0, null),
  (gen_random_uuid(), '20000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001',
   'Wejscie', 'polygon', 4, 3, 0.5, 11, 0,
   '{"vertices":[{"x":0,"y":0},{"x":4,"y":0},{"x":4,"y":1},{"x":1,"y":1},{"x":1,"y":3},{"x":0,"y":3}],"closed":true}'),
  (gen_random_uuid(), '20000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000002',
   'Bufet', 'rectangle', 4, 1, 1.5, 7.5, 0, null),
  (gen_random_uuid(), '20000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000003',
   'Scena', 'rectangle', 5, 2, 5.5, 0.5, 0, null),
  (gen_random_uuid(), '20000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000003',
   'Parkiet', 'circle', 4, 4, 6, 4.5, 0, null);

-- ---------------------------------------------------------------------------
-- Guests - "Anna & Piotr"
-- ---------------------------------------------------------------------------
-- Every table stays at or under capacity (guests_enforce_capacity would reject
-- it otherwise), and seat ids are `seat-N` with N < capacity, unique per table
-- (guests_unique_seat_per_table). Coverage on purpose: one full table, one
-- half-full, one with pinned seats, one with table but no seat (the "fill the
-- next free seat" case), and a batch with no table at all.
insert into public.guests (id, wedding_id, table_id, name, seat_id, dietary, age_group, note) values
  -- Stol pary mlodej (cap 12, 4 seated)
  (gen_random_uuid(), '20000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000004', 'Anna Kowalska',      'seat-0', '{}',                       null, 'Panna mloda'),
  (gen_random_uuid(), '20000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000004', 'Piotr Nowak',        'seat-1', '{}',                       null, 'Pan mlody'),
  (gen_random_uuid(), '20000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000004', 'Barbara Kowalska',   'seat-2', '{gluten-free}',            null, 'Mama panny mlodej'),
  (gen_random_uuid(), '20000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000004', 'Jerzy Kowalski',     'seat-3', '{}',                       null, null),
  -- Stol 1 (cap 8, 6 seated)
  (gen_random_uuid(), '20000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001', 'Maria Wisniewska',   'seat-0', '{vegetarian}',             null, null),
  (gen_random_uuid(), '20000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001', 'Adam Wisniewski',    'seat-1', '{}',                       null, null),
  (gen_random_uuid(), '20000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001', 'Katarzyna Lewandowska','seat-2', '{vegan,gluten-free}',    null, 'Alergia na orzechy'),
  (gen_random_uuid(), '20000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001', 'Michal Lewandowski', 'seat-3', '{}',                       null, null),
  (gen_random_uuid(), '20000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001', 'Zofia Dabrowska',    'seat-4', '{vegetarian}',             null, null),
  (gen_random_uuid(), '20000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001', 'Marek Dabrowski',    'seat-5', '{}',                       null, null),
  -- Stol 2 (cap 8, full)
  (gen_random_uuid(), '20000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000002', 'Agnieszka Kaminska', 'seat-0', '{}',                       null, null),
  (gen_random_uuid(), '20000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000002', 'Pawel Kaminski',     'seat-1', '{gluten-free}',            null, null),
  (gen_random_uuid(), '20000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000002', 'Ewa Szymanska',      'seat-2', '{}',                       null, null),
  (gen_random_uuid(), '20000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000002', 'Rafal Szymanski',    'seat-3', '{vegetarian}',             null, null),
  (gen_random_uuid(), '20000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000002', 'Julia Wojcik',       'seat-4', '{}',                       null, null),
  (gen_random_uuid(), '20000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000002', 'Tomasz Wojcik',      'seat-5', '{}',                       null, null),
  (gen_random_uuid(), '20000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000002', 'Hanna Mazur',        'seat-6', '{bez laktozy}',            null, 'Tag spoza presetow'),
  (gen_random_uuid(), '20000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000002', 'Krzysztof Mazur',    'seat-7', '{}',                       null, null),
  -- Stol 3 (cap 8, 3 seated, rest free)
  (gen_random_uuid(), '20000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000003', 'Natalia Krawczyk',   'seat-0', '{vegan}',                  null, null),
  (gen_random_uuid(), '20000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000003', 'Bartosz Krawczyk',   'seat-1', '{}',                       null, null),
  (gen_random_uuid(), '20000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000003', 'Iwona Pawlak',       null,     '{}',                       null, 'Przy stole, bez konkretnego miejsca'),
  -- Stol dzieci (cap 6, 4 seated) - the age-group filter preset has something to find
  (gen_random_uuid(), '20000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000005', 'Zuzia Nowak',        'seat-0', '{}',                       '3-6',  null),
  (gen_random_uuid(), '20000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000005', 'Antek Nowak',        'seat-1', '{}',                       '0-3',  'Krzeselko dla dziecka'),
  (gen_random_uuid(), '20000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000005', 'Lena Kaminska',      'seat-2', '{gluten-free}',            '6-12', 'Bracket spoza presetow'),
  (gen_random_uuid(), '20000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000005', 'Filip Mazur',        'seat-3', '{}',                       '3-6',  null),
  -- Stol 6 / custom (cap 6, 2 seated)
  (gen_random_uuid(), '20000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000006', 'Wanda Adamczyk',     'seat-0', '{}',                       null, null),
  (gen_random_uuid(), '20000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000006', 'Henryk Adamczyk',    'seat-1', '{}',                       null, null),
  -- Sala bankietowa, Stol B (Stol A left empty on purpose)
  (gen_random_uuid(), '20000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000008', 'Grazyna Jankowska',  'seat-0', '{vegetarian}',             null, null),
  (gen_random_uuid(), '20000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000008', 'Stefan Jankowski',   'seat-1', '{}',                       null, null),
  -- Unassigned: what the seating progress bar and the assign sheet work on
  (gen_random_uuid(), '20000000-0000-4000-8000-000000000001', null, 'Alicja Zajac',      null, '{}',            null,  null),
  (gen_random_uuid(), '20000000-0000-4000-8000-000000000001', null, 'Damian Zajac',      null, '{vegan}',       null,  null),
  (gen_random_uuid(), '20000000-0000-4000-8000-000000000001', null, 'Renata Sikora',     null, '{}',            null,  'Potwierdzi do konca miesiaca'),
  (gen_random_uuid(), '20000000-0000-4000-8000-000000000001', null, 'Oskar Sikora',      null, '{}',            '0-3', null),
  (gen_random_uuid(), '20000000-0000-4000-8000-000000000001', null, 'Beata Cieslak',     null, '{gluten-free}', null,  null),
  (gen_random_uuid(), '20000000-0000-4000-8000-000000000001', null, 'Waldemar Cieslak',  null, '{}',            null,  null);

-- Per-guest dishes, for the three plated mains the couple picked above.
--
-- Assigned by position rather than by name so the fixture survives an edit to
-- the guest list: seated guests are dealt the three mains round-robin, and the
-- last few are deliberately left unassigned so "N z M gosci ma przypisane
-- danie" has a real fraction to show and the kitchen tally has a remainder.
--
-- Only guests of *this* wedding, and only from the served set - the
-- guests_menu_option_scope trigger holds this file to the same rule as a
-- client, since it is a data-integrity invariant rather than a
-- client-writability one.
with seated as (
  select g.id, row_number() over (order by g.name) as n
  from public.guests g
  where g.wedding_id = '20000000-0000-4000-8000-000000000001'
    and g.table_id is not null
),
dish as (
  select * from (values
    (0, '62000000-0000-4000-8000-000000040301'::uuid),
    (1, '62000000-0000-4000-8000-000000040302'::uuid),
    (2, '62000000-0000-4000-8000-000000040303'::uuid)
  ) as t(slot, option_id)
)
update public.guests g
set menu_option_id = dish.option_id
from seated
join dish on dish.slot = seated.n % 3
where g.id = seated.id
  -- Four seated guests left without a dish, on purpose.
  and seated.n <= (select count(*) - 4 from seated);

-- Guests - "Tomasz & Kasia"
insert into public.guests (id, wedding_id, table_id, name, seat_id, dietary, age_group, note) values
  (gen_random_uuid(), '20000000-0000-4000-8000-000000000002', '40000000-0000-4000-8000-000000000009', 'Tomasz Zielinski', 'seat-0', '{}',           null,  'Pan mlody'),
  (gen_random_uuid(), '20000000-0000-4000-8000-000000000002', '40000000-0000-4000-8000-000000000009', 'Kasia Zielinska',  'seat-1', '{vegetarian}', null,  'Panna mloda'),
  (gen_random_uuid(), '20000000-0000-4000-8000-000000000002', '40000000-0000-4000-8000-000000000009', 'Halina Zielinska', 'seat-2', '{}',           null,  null),
  (gen_random_uuid(), '20000000-0000-4000-8000-000000000002', '40000000-0000-4000-8000-00000000000a', 'Robert Baran',     'seat-0', '{}',           null,  null),
  (gen_random_uuid(), '20000000-0000-4000-8000-000000000002', '40000000-0000-4000-8000-00000000000a', 'Monika Baran',     'seat-1', '{vegan}',      null,  null),
  (gen_random_uuid(), '20000000-0000-4000-8000-000000000002', '40000000-0000-4000-8000-00000000000a', 'Nikola Baran',     'seat-2', '{}',           '3-6', null),
  (gen_random_uuid(), '20000000-0000-4000-8000-000000000002', '40000000-0000-4000-8000-00000000000b', 'Artur Kubiak',     'seat-0', '{}',           null,  null),
  (gen_random_uuid(), '20000000-0000-4000-8000-000000000002', null, 'Sylwia Kubiak',    null, '{}',           null, null),
  (gen_random_uuid(), '20000000-0000-4000-8000-000000000002', null, 'Dawid Wrobel',     null, '{gluten-free}', null, null);

-- ---------------------------------------------------------------------------
-- Reminders
-- ---------------------------------------------------------------------------
-- Mixed statuses and one overdue item, so the list has an ordering to show.
insert into public.reminders (id, wedding_id, text, due, status) values
  (gen_random_uuid(), '20000000-0000-4000-8000-000000000001', 'Potwierdzic menu z restauracja', now() - interval '2 days', 'open'),
  (gen_random_uuid(), '20000000-0000-4000-8000-000000000001', 'Wyslac zaproszenia',            now() + interval '5 days', 'open'),
  (gen_random_uuid(), '20000000-0000-4000-8000-000000000001', 'Przymiarka sukni',              now() + interval '21 days', 'open'),
  (gen_random_uuid(), '20000000-0000-4000-8000-000000000001', 'Zaliczka dla zespolu',          null,                       'open'),
  (gen_random_uuid(), '20000000-0000-4000-8000-000000000001', 'Rezerwacja sali',               now() - interval '30 days', 'completed'),
  (gen_random_uuid(), '20000000-0000-4000-8000-000000000001', 'Wybor fotografa',               now() - interval '14 days', 'completed'),
  (gen_random_uuid(), '20000000-0000-4000-8000-000000000002', 'Umowic degustacje tortu',       now() + interval '10 days', 'open'),
  (gen_random_uuid(), '20000000-0000-4000-8000-000000000002', 'Ustalic liste gosci',           null,                       'open');

commit;

-- Summary, printed at the end of `supabase db reset`.
select
  w.name as wedding,
  coalesce(t.slug, '-') || ' / ' || w.venue_access as venue,
  (select count(*) from public.wedding_members m where m.wedding_id = w.id) as members,
  (select count(*) from public.halls h where h.wedding_id = w.id) as halls,
  (select count(*) from public.tables t where t.wedding_id = w.id) as tables,
  (select count(*) from public.fixtures f where f.wedding_id = w.id) as fixtures,
  (select count(*) from public.guests g where g.wedding_id = w.id) as guests,
  (select count(*) from public.guests g where g.wedding_id = w.id and g.table_id is not null) as seated,
  (select count(*) from public.reminders r where r.wedding_id = w.id) as reminders,
  coalesce(p.name, '-') as menu,
  (select count(*) from public.wedding_menu_selections s where s.wedding_id = w.id) as dishes
from public.weddings w
left join public.tenants t on t.id = w.tenant_id
left join public.menu_packages p on p.id = w.menu_package_id
order by w.name;
