# Venue / tenant side - current state

Snapshot as of **2026-10-12**, `main` at `1b5f0a4` (v1.3.1 plus the merged `easywed/invites-*` stack: invitation preview, accept-and-link, membership-based linking, roster labels and history).

It covers everything a venue ("tenant") touches:

- slugs and hosts;
- provisioning and roles;
- linking a couple's wedding, and invitation links;
- the CRM, menus and layout presets;
- what is still missing.

**Provenance.** Every statement is checked against migrations, `src/`, `scripts/`, `supabase/seed.sql` or `supabase/config.toml`, and cites the file. The few that come only from the operational runbook (`docs/outreach/venue-demo.md`) are marked **[runbook]**, because nothing in the repo can confirm them (Cloudflare, the hosted Supabase dashboard).

---

## 1. Summary

| Area | Status | Where |
|---|---|---|
| Tenant table, slug, branding columns | Done | `20260817000001_tenants.sql` |
| Host → tenant resolution | Done | `src/lib/tenant/host.ts` |
| Provisioning a venue | psql only | `scripts/provision-venue.sql` |
| Staff roles (owner / staff) and couple role (customer) | Done | `tenant_members` |
| Couple links a wedding to its venue | Done, invitation-based (no slug field) | `accept_customer_invitation`, `link_wedding_to_venue`, `VenueLinkStep` |
| Couple grants or revokes the venue's read access | Done | `set_venue_access`, `VenueAccessDialog` |
| Invitation links (staff and couple) | Done: preview first, explicit Join / Accept, labels, accepted history | `tenant_invitations`, `/crm/roster`, `/venue/invite/$token` |
| CRM: wedding list, pseudonymised seat-map peek, diet and dish counts, kitchen print | Done, read-only | `routes/crm/*` |
| CRM: menu catalogue editor | Done | `/crm/menus` |
| Couple's Menu tab (package, dishes, dish per guest) | Done | `components/planner/Menu/` |
| Layout presets | Done, but saved from the **apex planner**, not the CRM | `layout_presets`, `LayoutPreset*` |
| Self-service venue signup, settings, branding editor | Missing | - |
| Notifications, email, realtime, billing | Missing | - |

---

## 2. Slugs and hosts

### The slug (`20260817000001_tenants.sql`)

- `tenants.slug` is unique and must match `^[a-z0-9][a-z0-9-]{1,30}[a-z0-9]$`.
- The `tenants_slug_not_reserved` CHECK refuses 56 reserved labels, including:
  - `demo`, `www`, `app`, `admin`;
  - `crm`, `venue`, `venues`, `wedding`, `weddings`, `easywed`.
- `RESERVED_SUBDOMAINS` in `lib/tenant/host.ts` mirrors the list by hand. The comment there says the database is the guarantee and the client copy only saves an RPC.
- The `enforce_tenant_immutable_columns` trigger blocks `authenticated` and `anon` from changing `slug` or `status`.

### Host → tenant (`lib/tenant/host.ts`)

| Host | `tenantSlugFromHost` returns |
|---|---|
| `easywed.app`, `www.easywed.app`, `localhost`, `127.0.0.1`, `[::1]`, `0.0.0.0` | `null` (apex) |
| `<slug>.easywed.app` | `<slug>` |
| `<slug>.localhost` (any port) | `<slug>` |
| `*.pages.dev` with `?tenant=<slug>` | `<slug>`. The param is honoured **only** on `.pages.dev` |
| Nested labels, reserved values, or a malformed slug | `null` |

Helpers in the same file:

- `isTenantHost()`
- `apexOrigin()`: keeps the scheme and port, drops the slug label.
- `tenantUrl(slug, path)`: on previews it appends `?tenant=`, and it strips `www`.

The sign-in landing hop is `tenantUrl(slug, "/crm")` in `hooks/useVenueStaffLanding.ts`.

Other routing pieces:

- `lib/tenant/apexRedirect.ts` → `redirectApexOnlyPathToApex`, called first in the root `beforeLoad` (`routes/__root.tsx`). On a tenant host, `/home` and `/wedding/*` go to `apexOrigin()` via `location.replace`, with `?tenant=` stripped.
- `routes/index.tsx` `beforeLoad`: on a tenant host, `/` redirects to `/venue`.

### Runtime resolution

**`components/tenant/TenantGate.tsx`** is mounted as `<AuthGate><TenantGate>` in `__root.tsx`. It never redirects. Its two effects:

1. **Host → slug → branding.** It calls `tenant_public(slug)` (definer, granted to `anon`) and sets `status` to `none | resolved | not_found`.
2. **Session → role.** It reads `tenant_members.role` for the current user. `tenantRole` is `undefined` while resolving and `null` for a non-member, and it is reset on every session change.

After each one it calls `router.invalidate()`.

**`stores/tenant.store.ts`** is plain `create`, not persisted. `selectIsTenantStaff` is true only for `owner` and `staff`.

**Branding (`components/tenant/TenantBranding.tsx`):**

- `tenantStyle()` sets `--tenant-primary` and `--tenant-accent` on the wrapper.
- `--tenant-primary` is read **only** by `TenantWordmark`, to colour the venue name when there is no logo.
- **`--tenant-accent` is read nowhere.** A grep of `src/` finds no consumer outside `TenantBranding.tsx`.
- So `accent_color` is stored and emitted but has no visible effect.

**`tenants.locale`** is stored, but `tenant_public()` does not return it and no client code reads it.

**`tenants.currency`** (`20260822000001`, default `PLN`) is read by `lib/sync/menuCatalogue.ts` for price formatting.

### Infra

| Item | Status |
|---|---|
| Per-slug Cloudflare Pages custom domain | **[runbook]** Required for each slug. There is no wrangler config in the repo; deploy is `wrangler pages deploy` (`package.json`) |
| Hosted Supabase redirect URL `https://*.easywed.app/**` | **[runbook]** Must exist |
| Local Supabase (`supabase/config.toml`) | `additional_redirect_urls` lists `http://bagatelka.localhost:3000/**` and `http://dworek.localhost:3000/**`, one line per seeded tenant (`dworek` was added on 2026-10-11) |
| Prerendered tenant routes | `vite.config.ts` `APP_ROUTES` contains `/venue`, `/crm`, `/crm/roster`, `/crm/menus` |
| `robots.txt` | Disallows `/venue/invite/` and `/crm/wedding/` |

---

## 3. Provisioning a venue

There is no INSERT policy on `tenants` or `tenant_members`, and no tenant DELETE policy either. The only path is `scripts/provision-venue.sql`, run as `postgres`:

```bash
psql "$DB_URL" -v slug=palacwiosna -v name='Pałac Wiosna' -v owner_email='owner@…' \
  [-v open_linking=true] [-v tagline='…'] [-v primary_color='#…'] [-v accent_color='#…'] \
  [-v logo_url='https://…'] [-v locale=en] -f scripts/provision-venue.sql
```

- It runs in one transaction.
- It raises if no `auth.users` row matches the email, or if that user already has a `tenant_members` row.
- It inserts the tenant, then `tenant_members(role='owner')`.
- Re-running for an existing slug fails on the unique constraint.

**Changes afterwards** are hand-written SQL: branding through `update public.tenants`, and ownership handover through delete-plus-insert on `tenant_members` (runbook §E).

### Seed (`supabase/seed.sql`)

| Tenant | Owner | `open_linking` | Colours |
|---|---|---|---|
| `bagatelka` | `venue@easywed.test` | false | yes |
| `dworek` | `venue2@easywed.test` | **true** | yes |
| `stodola` | none | false | yes, **`status = 'suspended'`** - exists so the PT410 paths are testable |

- "Anna & Piotr" is linked to `bagatelka` and granted.
- "Tomasz & Kasia" is unlinked.
- Accounts in no venue: `solo@`, `editor@`, `viewer@`. `owner@` is a bagatelka `customer`.
- Hand-typeable invitation tokens (live customer x2, live staff, claimed, expired, suspended) are listed in the `tenant_invitations` block of `seed.sql` and in `docs/testing/venue-invites.md`.

---

## 4. Roles

### `tenant_members(tenant_id, user_id, role)`

| Role | How it is created | What it reaches |
|---|---|---|
| `owner` | `provision-venue.sql` only. `tenant_invitations.role` cannot be `owner` | CRM. Can invite `staff` and `customer`. RLS lets the owner UPDATE `tenants`, **but no client code issues that update** |
| `staff` | Claiming an owner's staff invite | CRM. Can invite `customer` only (policy `staff create invitations`) |
| `customer` | Claiming a customer invite | **Not the CRM**: `crm.tsx` renders the 403 because `selectIsTenantStaff` is false. It only satisfies the invitation-only check in `link_wedding_to_venue` |

- `tenant_members_one_per_user` is a unique index on `user_id`: one venue per account, whatever the role.
- `staff_can_view_profile` lets owner and staff read `profiles` (display name) of every co-member, customers included.
- `my_tenant_id()` exists but has no caller in SQL or TS.

### Derived wedding role `venue` (`20260817000003`)

`wedding_role()` falls back to `'venue'` when all of these hold:

- the caller has no `wedding_members` row;
- `venue_access = 'granted'`;
- `tenant_id` is set;
- `is_tenant_staff(tenant_id)` is true.

| `venue` can SELECT | `venue` cannot SELECT |
|---|---|
| `weddings`, `halls`, `tables`, `fixtures`, `wedding_menu_selections`, `wedding_seatmap` (`id, wedding_id, table_id, seat_id, dietary, age_group, menu_option_id`) | `guests`, `reminders`, `wedding_members` |

`venueRls.test.ts` asserts that the venue role cannot update a table, insert a hall, or grant itself access.

`routes/wedding.$id.tsx` forwards a loaded `venue` role to `/crm/wedding/$id`. On the apex, `requireTenantMember` then sends the user on to `/home` (the comment there says this is intended).

---

## 5. Linking a venue to a wedding

### State on `weddings` (`20260817000002`)

- `tenant_id`: `on delete set null`.
- `venue_access`: `none | pending | granted`.
- `enforce_wedding_tenant_columns` blocks client writes to both, on INSERT and UPDATE.

```
            link_wedding_to_venue(w, slug)           set_venue_access(w, true)  [owner only]
 no venue ─────────────────────────────────► pending ───────────────────────────────────► granted
                                               ▲  ◄──── set_venue_access(w, false) ──────── │
                                               │        owner OR venue staff  → 'none'     │
                                               └──── link to a DIFFERENT slug ◄────────────┘
                                                     (→ pending, menu_package_id = null)
```

Once linked, `tenant_id` can never be cleared from the client. There is no unlink RPC, only a switch to another venue.

### `link_wedding_to_venue` (final version in `20260822000002`)

1. Requires `auth.uid()`, and the caller must be `weddings.owner_id`.
2. Then checks, in order:

| Check | Refusal |
|---|---|
| Slug exists | `PT404` |
| `status = 'active'` | `PT410` |
| `open_linking` is true, **or** the caller is a member of that tenant in any role | `PT403` |

3. Linking to the same tenant again returns early with no change, so `granted` stays.
4. A different tenant sets `pending` and nulls `menu_package_id`. That fires `reset_wedding_menu_on_package_change`, which clears the selections and every guest's `menu_option_id`.

### `set_venue_access`

- **The owner** can set `granted` or `none`. A wedding with no venue raises.
- **Staff of the linked tenant** can set `none` only. `true` raises.
- Anyone else gets the same 42501.

### Couple UI

**`components/planner/Header/VenueButton.tsx`**

- Rendered only when `role === "owner"` and the wedding is not local.
- Shows a status dot for `pending` and `granted`.

**`components/dialogs/weddings/VenueAccessDialog.tsx`** picks its step from `venue` and `venueAccess`:

| Step | What it does |
|---|---|
| `VenueLinkStep` | **No slug field.** Reads the account's venue membership (`fetchMyVenueMembership`) and offers "Link to <venue>". No membership: explains the invitation link. "Change venue" when the membership *is* the linked venue: points at the new venue's invitation link. A failed read shows a retry, not the "ask for an invitation" text. Shows the "replacing X" warning when switching venue |
| `VenueStatusStep` | Revoke when `granted`, otherwise "grant". Also "change venue" |
| `VenueGrantStep` | The consent screen: what is shared and what is hidden, the art. 9 wording, a policy link |

**`lib/sync/venue.ts`** does not use `run()`. After linking it re-reads `tenants` and `venue_access`, and calls `useMenuStore.clearForVenueChange()` when the tenant changed.

**Who sees the Menu tab and the preset picker:** they show whenever `global.store.venue !== null`, which includes `pending` (`MobileTabBar.tsx`, `SidebarRail.tsx`, `HallsPanelContent.tsx`).

**Menus:** the menu RLS lets any `is_wedding_member` of a linked wedding read the venue's menus, whatever its `venue_access`.

---

## 6. Invitation links (`20260820000001`)

### `tenant_invitations`

| Column | Rule |
|---|---|
| `role` | `staff` or `customer` |
| `token` | Default: two uuids, dashes stripped (64 hex). The INSERT policy requires `^[0-9a-f]{64}$` |
| `expires_at` | Default now + 14 days. The policy caps it at 30 days |
| `claimed_at`, `claimed_by` | Must be null on insert |
| `label` | Optional staff note on who the link is for, 1-80 chars (CHECK). Staff-only via SELECT; never returned by the preview; never in analytics |

The INSERT policy also requires `invited_by = auth.uid()`, and `role = 'customer'` unless the inviter is the owner.

RLS:

| Action | Who |
|---|---|
| SELECT | Staff |
| DELETE | Staff |

Also added in this migration: a `tenant_members` DELETE policy "members can leave their tenant" (non-owners, own row).

### The three functions

| Function | Who | What |
|---|---|---|
| `tenant_invitation_preview(_token)` | `anon`, `authenticated` | Venue name, slug, logo, primary colour, status, invite role and expiry for a live token; no rows for unknown / claimed / expired. No label, no tenant id |
| `claim_tenant_invitation(_token)` | `authenticated` | Joins the caller in the invite's role. Used for **staff** links |
| `accept_customer_invitation(_token, _wedding_id, _leave_current)` | `authenticated` | Joins as `customer` **and** links one owned wedding (via `link_wedding_to_venue`) in one transaction. Used for **couple** links |

Refusals:

| Code | `claim` | `accept` |
|---|---|---|
| `PT404` | unknown, claimed or expired | same, plus any staff token |
| `PT410` | venue suspended | venue suspended |
| `PT409` | account belongs to another venue | account is **staff/owner** of another venue (whatever `_leave_current` says) |
| `PT412` | - | account is a **customer** of another venue; retry with `_leave_current => true` swaps the membership atomically |
| `42501` | no session | no session, or not `owner_id` of the wedding - checked **before** the token is burned |

- Joining a venue you already belong to is a no-op and does not burn the token (both functions).
- The accept's link step keeps `link_wedding_to_venue`'s behaviour: same venue -> no-op (a granted wedding stays granted); different venue -> `pending`, menu cleared.
- Leaving a venue through `_leave_current` does not touch weddings still linked to it.

### Copying the link (`components/crm/useTenantRoster.ts` `handleCopy`)

| Role | URL |
|---|---|
| `staff` | `tenantUrl(slug, "/venue/invite/<token>")` -> `https://<slug>.easywed.app/venue/invite/<token>` |
| `customer` | `${apexOrigin()}/venue/invite/<token>` -> `https://easywed.app/venue/invite/<token>` |

If the clipboard fails, the URL is shown in a read-only input.

### Roster (`/crm/roster`)

- **New invitation:** role (staff only for the owner) and an optional label ("Who is it for"). Customer help text says to send it to the person who created the plan.
- **Unclaimed invitations:** led by the label when set, role and expiry beneath. Expired rows stay listed (no copy button, revoke offered) but are **sorted below live ones**.
- **Accepted invitations:** label, who accepted and when. A claimer who has since left shows as "no longer on your list", not by name (the name reached the venue through membership). This is the venue's only signal that a couple said yes, since a `pending` wedding stays invisible to it.

### Invitation page (`routes/venue_.invite.$token.tsx`, `components/tenant/invite/*`)

1. **Preview** via `tenant_invitation_preview`, signed out or in. Nothing is spent by opening the link. Invalid -> "ask the venue for a new link"; suspended -> a suspended card naming the venue; transport failure -> "try again".
2. **Origin hop** (`lib/tenant/inviteOrigin.ts`): a customer invite moves to the apex, a staff invite to its venue's host, before anyone signs in - sessions are per-origin.
3. **Signed out:** the venue's name with "Create account" / "Sign in", both carrying `next` back to the invite (it survives email confirmation and `/accept-terms`). No `requireAuth` bounce.
4. **Staff:** an explicit "Join the team" -> `claim_tenant_invitation` -> link to `tenantUrl(slug, "/crm")`. An existing customer of the same venue keeps the customer role and is told so.
5. **Couple:** a picker of **owned** plans plus "Start a new plan" (created with `lib/sync/createWedding.ts`, reused across retries). Rows flag "already linked here" / "linked to X" (with the menu-wipe warning). Plans only shared with the account are not listed, with a note to forward the link to their owner. `PT412` asks "Leave X?" before retrying with `_leave_current`.
6. **After accepting:** `/wedding/$id/planner?venue=review`. `wedding.$id.tsx` opens the Venue dialog once the role settles as `owner` and strips the param. Granting access remains the separate `VenueGrantStep`.

Analytics: `tenant_invite_previewed { role }`, `tenant_invite_claimed { role }`, `tenant_invite_accepted { wedding, switched_venue }`. `/invite/` in the path is covered by `scrubInviteTokens`.

### Members (`CrmRosterMembers.tsx`)

- Lists members with display names. Every non-owner row has a remove button.
- This removal and the swap inside `accept_customer_invitation` are the only `tenant_members` deletes reachable from the client. There is no standalone "leave venue" UI, even though the policy allows it.

---

## 7. Venue staff surfaces (tenant host)

### `/venue` (`routes/venue.tsx`)

- Branded front door: logo or name, plus the tagline or a default line.
- "Plan your wedding" → `${apexOrigin()}/signup`, with no venue carried - by design: a hint under it says the venue will send an invitation link, which is what carries the venue.
- "Staff" → `/crm`.
- Signed-in staff are forwarded to `/crm`.
- Handles not-found, suspended and the apex case.

### `/crm` layout (`routes/crm.tsx`)

- `requireTenantMember` (`lib/auth/guards.ts`):
  - on the apex → `authLandingPath()`;
  - no session → `/login?next=`.
- The layout renders not-found, loading and suspended states, then a **403** for non-staff, customers included.
- Otherwise it shows the branded header: nav (Overview, Roster, Menus), a role label and `AccountMenu`.

### `/crm` overview (`routes/crm/index.tsx` + `CrmWeddingList.tsx`)

- `select id, name, date from weddings where tenant_id = …`. RLS returns only `granted` weddings; pending ones are invisible.
- Each row shows name, date and an "open" link.
- `identifyTenantGroup(tenant.id, tenant.name)` → `posthog.group("tenant", id, { name })`. **The venue name is sent as a PostHog group property** (not an event property).

### `/crm/wedding/$id` (`routes/crm/wedding.$id.tsx`)

**What `loadWeddingForVenue` reads:**

- `weddings` (name, date, `venue_access`, `menu_package_id`, tenant);
- halls, tables and fixtures;
- `wedding_seatmap`.

Every seat becomes `venue.anonymous_guest` ("Gość N"). The function then calls `setOrder(menu_package_id, [])` and loads the catalogue.

**What the page shows:**

| Component | Content |
|---|---|
| `PlannerPrintView` | Print with `["name", "dietary", "dish"]`, sorted by seat |
| `VenuePeekSummary` | Seated count, dietary tag counts, and a "release" button (`setVenueAccess(false)`) when `granted` |
| `KitchenMenuTally` | Per-guest dish counts, grouped by course |

**What it does not show:** the CRM peek **does not show which package the couple ordered, nor their wedding-level dish selections**.

- `wedding_menu_selections` is never queried by any venue-side code (only `loadWedding.ts`, `menu.store.ts` and `mutations/menu.ts` touch it).
- RLS allows the venue to read it (`menuRls.test.ts`: "lets the granted venue read them and write none").

On unmount, `clearVenuePeek()` empties the stores.

### `/crm/roster`

See §6.

### `/crm/menus` (`routes/crm/menus.tsx`, `useTenantMenus.ts`, `CrmMenu*`)

- Edits packages (name, description, `price_per_person_minor`), courses (`choose_count`, `serving_note`, `per_guest_choice`) and options (name, note).
- Reorder via `reorder_menu_courses` / `reorder_menu_options`.
- Packages and options can be archived and restored.
- **Hard delete also exists**: `supabase.from(table).delete()`. The FKs (`on delete restrict` from `weddings.menu_package_id`, `wedding_menu_selections`, `guests.menu_option_id`) refuse to delete anything a couple has ordered; `23503` is mapped to an "in use" message (`menuRls.test.ts` "hard delete once a couple has ordered").
- It talks to `supabase` directly, not through `run()`.

### Sign-in landing for staff

- `authLandingPath` (`lib/auth/guards.ts`):
  - tenant host → `/crm`;
  - apex → `/home`, arming a sessionStorage marker (`lib/auth/venueLanding.ts`).
- `/home` runs `useVenueStaffLanding`: one `fetchMyStaffTenant`, then `location.replace(tenantUrl(slug, "/crm"))`.
- `auth.callback.tsx` uses the same `authLandingPath`.
- `login.tsx` and `signup.tsx` contain no tenant or venue references, so they are **unbranded** on a venue host.

---

## 8. Couple surfaces that depend on the venue (apex)

### Menu

Files: `components/planner/Menu/`, `stores/menu.store.ts`, `lib/sync/menuCatalogue.ts`, `lib/sync/mutations/menu.ts`, `components/dialogs/guests/GuestMenuChoiceField.tsx`.

- The couple chooses a live package and then dishes. Writes are gated by `selectCanEdit`; RLS lets owner and editor write, not viewer.
- DB triggers enforce:
  - the package belongs to the linked tenant;
  - picks are within the package and not archived;
  - per-guest dishes come only from `per_guest_choice` courses;
  - a package change wipes the picks.
- **`choose_count` is not enforced**, neither by the DB nor the UI (`MenuCourseSection.tsx` and `menu.store.ts` comments).
- **There is no total price.** The `MenuPackagePicker.tsx` comment says children's tiers and extras don't exist in the data.
- The per-guest dish can be set in the guest form or the Menu tab. It appears in the print view and as a CSV `dish` column (`lib/export/guestsCsv.ts`).

### Layout presets

Files: `20261007000001`, `lib/sync/layoutPresets.ts`, `components/dialogs/planner/LayoutPreset*`, `hooks/useStaffTenant.ts`.

**Where the button shows:** the Halls panel shows it when `canEdit && (linked non-local wedding || staffTenant)`.

**Save (staff):**

- Done in the **apex planner**, from any wedding they can edit. Staff need a "template" wedding of their own.
- The snapshot is halls, tables and fixtures. Per-table `seats` overrides are dropped (`snapshotLayout`).
- DB limits: 1-20 halls, ≤500 tables, ≤500 fixtures, ≤200 KB.

**Archive:** the UI has archive only. **No restore, rename, edit or delete** in the UI, even though RLS permits update and delete (`layoutPresetsRls.test.ts` "can archive and restore").

**Apply (couple):**

- `applyLayoutPreset` → `rekeyLayout` → `replace_planner_layout` through `run()`, then `loadWedding`.
- This hard-replaces the layout, so every guest is unseated - **except that it currently fails outright** when any guest is pinned to a seat (see §11.5).
- The inline confirmation states the table count and seated count.

---

## 9. Analytics events (`lib/analytics/track.ts`)

| Event | Emitted from |
|---|---|
| `venue_access_requested { source }` | `VenueLinkStep` and the invitation page's accept, with `source: "couple"` only. **`"venue"` is declared but never emitted** - even the venue-started customer invitation is recorded as `"couple"` when the couple accepts |
| `venue_access_granted` | `VenueGrantStep` |
| `venue_peek_opened` | `/crm/wedding/$id` |
| `layout_preset_saved`, `layout_preset_applied` | Preset dialog |
| `tenant_invite_created { role }`, `tenant_invite_claimed { role }` | Roster, invitation page |
| `tenant_invite_previewed { role }`, `tenant_invite_accepted { wedding, switched_venue }` | Invitation page |
| `wedding_created { source: "wedding_list" \| "venue_invite" }` | Wedding list, invitation page ("Start a new plan") |
| `menu_package_saved`, `menu_package_selected`, `menu_selection_completed`, `menu_guest_dish_assigned { source }` | Menu editor and Menu tab |

---

## 10. Tests (local stack; they skip when it is down)

| File | Covers |
|---|---|
| `lib/sync/venueRls.test.ts` | What a granted venue can and cannot read, read-only role, can't enrol members, isolation, uniform refusals from `set_venue_access`, revocation |
| `lib/sync/tenantInvitations.test.ts` | Token worth, claim and burn, PT404/PT409/PT410, customer unlocks linking but not staff, leave, who may invite whom, pinned columns; preview (anon, key set, invalid states, suspended); accept (happy path, editor partner doesn't burn, non-owner, staff token, same venue, granted stays granted, PT412 switch, staff never swapped); labels |
| `lib/sync/menuRls.test.ts` | Catalogue isolation, reorder RPCs, couple reads, package scoping, re-link clearing, selections, per-guest dish, archived dishes, hard-delete restrict |
| `lib/sync/layoutPresetsRls.test.ts`, `layoutPresets.test.ts` | Staff CRUD scope, payload checks, couple read-only, apply re-keying |
| `lib/sync/tenant.test.ts`, `tenantBranding.test.ts`, `staffTenant.test.ts` | Client helpers |
| `lib/tenant/host.test.ts`, `origins.test.ts`, `apexRedirect.test.ts`, `inviteOrigin.test.ts` | Host parsing, origins, apex redirect, which origin an invite belongs on |

Manual click-through for the whole invitation flow: `docs/testing/venue-invites.md`.

Test files run concurrently against one database; `staffTenant.test.ts` signs out with `scope: "local"` because the default global sign-out revoked the sibling suites' sessions.

The PT410 paths are tested against the seeded suspended `stodola`; nothing tests the rest of §11.2, because the rest is not enforced.

---

## 11. What's missing

### 11.1 Venue lifecycle and admin

1. **Self-service onboarding.** There is no signup or creation flow for a tenant. Provisioning is psql only (no INSERT policy). Each slug also needs a Cloudflare custom domain **[runbook]**.
2. **Settings and branding editor.**
   - Owners have the RLS UPDATE, but no client code writes `tenants`.
   - Name, tagline, colours, logo, `open_linking`, `currency` and `locale` are SQL-only.
   - There is no logo upload or storage: `logo_url` must be an external https URL.
3. **Ownership transfer.** There is no RPC; it is hand-written SQL.
4. **Owner account deletion orphans the venue.**
   - `tenant_members.user_id` cascades on `auth.users` delete.
   - `delete_own_account` was defined in `20260731000002` and never redefined after tenants existed.
   - Nothing stops an owner deleting their account, and afterwards nobody can invite staff.
5. **Billing.** None. Suspension can only be set in SQL (the immutable-columns trigger).

### 11.2 Suspension is enforced in the UI only

`tenants.status` is checked **only** in `link_wedding_to_venue`, `claim_tenant_invitation` and `accept_customer_invitation` - which stops the roster growing - and rendered by `venue.tsx` / `crm.tsx`. Specifically:

- `is_tenant_staff` and `wedding_role` ignore it.
- A suspended venue's staff therefore keep, at the API level:
  - their menus, invitations and presets;
  - the `venue` role on every granted wedding.
- Only the CRM shell hides it from them.

### 11.3 Linking-flow gaps

1. **The front door drops the venue - by design.** `/venue` -> `/signup` carries nothing; a hint says the venue sends an invitation link, and that link is what carries the venue.
2. **No unlink.** Once linked, a wedding can be revoked or relinked, but `tenant_id` can never return to null from the client.
3. **The venue can't see pending links.** RLS hides them, and there is no count or request flow. `venue_access_requested { source: "venue" }` is declared but not emitted. The roster's Accepted list is the only signal that a couple accepted.
4. **Switching venue works through the new venue's link; there is still no standalone "leave venue" UI.** A customer of venue A opening venue B's invite is asked "Leave A?" and swapped atomically. Staff of a venue still cannot become a couple elsewhere on the same account (`PT409`), and a couple who simply wants off A's list has no button for it.
5. **Open linking is unreachable from the UI.** The slug field is gone; `open_linking` still exists in the schema, the seed (`dworek`, used by `menuRls.test.ts`) and `provision-venue.sql`.

### 11.4 CRM gaps

1. **The CRM doesn't show the couple's chosen package or their wedding-level dish selections.** The venue is allowed to read them, but the peek never queries them. Only per-guest plated dishes are counted.
2. **No notifications.** There is no email anywhere in this flow. Invite links are copied by hand, and nothing tells a venue when access is granted or dishes change.
3. **No live updates.** Neither `channel(` nor `realtime` appears in `src/`, so the peek needs a reload.
4. **Presets can't be managed from the CRM.** They are saved only from the apex planner. There is no restore, rename or delete UI.
5. **Read-only toward the couple.** Staff cannot enter dishes, edit the layout, or annotate a wedding. There are no event-level fields (headcount confirmation, deadlines, notes).
6. **No export from the CRM.** The kitchen report is `window.print` via `triggerPdfExport`; there is no CSV of counts.
7. **Invite list hygiene - mostly done.** Labels, an Accepted history and expired-last sorting exist. Expired invites still linger until revoked (deliberately - a vanished link reads as "never sent"), and a label cannot be edited after creation (no UPDATE policy).
8. **Branding is mostly inert.** `accent_color` is unused, `primary_color` only tints the text wordmark, `locale` is unused, and the login and signup pages are unbranded.
9. **Menu rules.** `choose_count` is unenforced, and there are no totals or children's pricing.

### 11.5 Known bugs (found 2026-10-12)

1. **Applying a layout preset fails when any guest is seat-pinned.** `replace_planner_layout` hard-deletes `tables`; the FK's `on delete set null` clears `guests.table_id` but leaves `seat_id`, which trips `guests_seat_requires_table` and aborts the RPC. Reproduced with `psql`. Fix needs a new migration (clear `seat_id` for the wedding's guests before the delete).
2. **Seat overrides are dropped when a guest plan moves into an account.** `replace_planner_layout` never writes `tables.seats`, so custom seat positions from guest mode are lost on migration (and on preset apply, which is a fresh layout anyway).

### 11.6 Marketing copy vs code (`venues.*` in `pl.json`)

| Promise | Code reality |
|---|---|
| "Para, jej planner i Twoja obsługa otwierają ten sam plan" | Staff see a pseudonymised, read-only copy, and only after the couple grants access |
| "Wyślij parze link do planowania w Twojej sali" | Close: the link adds the couple to the roster and links a chosen or new plan in one step. They still grant access separately, by design |
| "Digitalizujemy Twoją salę" / "Jeden szablon" | Done by hand: someone draws a template wedding in the apex planner and saves a preset |
| "Raporty… zestawienie diet" | True: the dietary counts and kitchen print exist |

---

## 12. File map

```
supabase/migrations/
  20260817000001_tenants.sql                tenants, tenant_members, helpers, tenant_public(), immutable slug/status
  20260817000002_wedding_tenant_link.sql    weddings.tenant_id / venue_access, link_wedding_to_venue, set_venue_access
  20260817000003_venue_role.sql             derived 'venue' role, narrowed SELECTs, wedding_seatmap, my_wedding_role
  20260820000001_tenant_invitations.sql     tenant_invitations (+label), claim, preview, accept_customer_invitation, leave policy
  20260822000001_venue_menus.sql            menu_packages / courses / options, reorder RPCs, tenants.currency
  20260822000002_wedding_menu_selection.sql weddings.menu_package_id, wedding_menu_selections, link_wedding_to_venue v2
  20260822000003_guest_menu_choice.sql      guests.menu_option_id, wedding_seatmap + menu_option_id
  20261007000001_layout_presets.sql         layout_presets
  (20260816000001, 20260828000001 are couple-side hardening, not venue features)
scripts/provision-venue.sql                 create tenant + owner (psql only)
supabase/seed.sql                           bagatelka (invite-only), dworek (open_linking), stodola (suspended), invite tokens
docs/testing/venue-invites.md               manual test plan for the invitation flow

src/lib/tenant/{host,apexRedirect}.ts       slug parsing, apexOrigin, tenantUrl, apex-only redirect
src/lib/tenant/inviteOrigin.ts              which origin an invitation belongs on
src/lib/sync/tenant.ts                      tenant_public, role, fetchMyStaffTenant, membership, claim, preview, accept
src/lib/sync/venue.ts                       couple: link + access
src/lib/sync/createWedding.ts               new cloud wedding + default hall (wedding list, invitation page)
src/lib/sync/loadWeddingForVenue.ts         CRM peek loader (pseudonymised)
src/lib/sync/{menuCatalogue.ts,mutations/menu.ts,layoutPresets.ts}
src/lib/auth/{guards,venueLanding}.ts       requireTenantMember, authLandingPath, landing marker
src/hooks/{useVenueStaffLanding,useStaffTenant}.ts
src/stores/{tenant,menu}.store.ts
src/components/tenant/{TenantGate,TenantBranding}.tsx
src/components/tenant/invite/*              invitation page states (card, sign-in, staff join, customer accept, picker, switch)
src/components/crm/*                        wedding list, peek summary, kitchen tally, roster (+ accepted history), menus
src/components/dialogs/weddings/Venue*.tsx  couple link / grant / revoke
src/components/dialogs/planner/LayoutPreset*
src/components/planner/Header/VenueButton.tsx, planner/Menu/*, dialogs/guests/GuestMenuChoiceField.tsx
src/components/landing/venues/*, routes/{pl,en}_.venues.tsx   marketing page
src/routes/{index,venue,venue_.invite.$token,crm}.tsx, routes/crm/*
```
