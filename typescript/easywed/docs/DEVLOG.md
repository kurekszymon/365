# easywed. - Development Log

<!-- wrangler picks up HEAD by default, running `git rev-parse --short HEAD` gives last commit hash for DEPLOY MARKING -->

### 22.08

- venue menus, part one: the catalogue. `menu_packages` → `menu_courses` → `menu_options` at `/crm/menus`, and nothing else in the app moves - no couple can read a byte of it yet, which is what keeps this migration a no-op for every existing user. the whole reason it exists is that a venue's product *is* its menu, and until now the only food-shaped field in the app was `guests.dietary`
- the denormalised `tenant_id` on courses and options is held correct by composite foreign keys against `unique (tenant_id, id)` on the parent, not by a scope trigger. same guarantee `20260816000001` needed a definer trigger for, with nothing to execute and nothing to keep in step - and it is what lets all twelve policies be one `is_tenant_staff(tenant_id)` call with no join
- one boolean instead of two data models: `menu_courses.per_guest_choice`. off is a buffet, on is `MENU SERWOWANE` - the couple narrows six mains to three and each guest is then assigned one of the three. the per-guest half lands in the third migration of the stack; the flag is in the first because the shape is what everything after it reads
- `archived_at`, not a soft delete, and the distinction is real: retiring last year's offer must not blank the choices of a couple who already ordered from it. hard delete stays reachable behind a two-click confirm, because typos happen before anyone has ordered
- the two reorder rpcs are **invoker-rights**, not definer. staff already hold update through rls, so a cross-tenant id filters to nothing rather than needing hand-written authorization - which also means a "successful" call can be a silent no-op, so `menuRls.test.ts` re-reads the positions rather than trusting `error === null`. two functions instead of one with a `p_kind text` switch: a text parameter that selects a table is one refactor from dynamic sql
- `parsePriceInput` is hand-written because `Math.round(4.055 * 100)` is 405 - `4.055 * 100` is `405.49999999999994`. it strips U+00A0 as well as spaces, so a price copied out of the ui in polish (`435,50 zł`, no-break spaces and all) pastes back in and round-trips
- `formatMoney`'s try/catch turned out to guard the *locale*, not the currency: `^[A-Z]{3}$` is exactly Intl's own well-formedness rule, so a stored `ZZZ` formats as `405,00 ZZZ` rather than throwing. the tag from i18next's browser detector is the one that raises `RangeError`. the test says so, since the plan said otherwise
- 17 assertions in `menuRls.test.ts`, isolation asserted **per table** rather than once - three tables, three policies, and a missing one on `menu_options` would leave the other two green

### 21.08

- signing in on a venue host sent staff to the apex. `redirectAuthedAwayFromLogin` defaulted to `/home`, `/home` is in `APEX_ONLY_PREFIXES`, so the root guard replaced the origin - and sessions are per-origin, so the sign-in that had just succeeded ended on the signed-out landing. every auth terminus had its own hardcoded `/home`: the login and signup guards, the oauth callback, both exits from the terms gate
- one `authLandingPath(next)` now answers for all four. `next` first, since that is somebody's interrupted destination; then `/crm` on a tenant host; then `/home`. the tenant branch deliberately does not read the role - it is a round trip away, and the crm shell already renders a named 403 for a `customer` who arrives there, with a link back to the apex
- the apex has no hostname to read, so it arms a one-shot marker and `/home` spends it on one `fetchMyStaffTenant` lookup. a marker rather than a check on every render, and the second reason is the load-bearing one: an unconditional check would bounce the venue owner who also plans a wedding of their own off their list every single time they reached it, with no way to say "not this time"
- the hop is `window.location.replace` to `tenantOrigin(slug)/crm` and lands on that host's `/login?next=/crm`, because sessions are per-origin and a token handed across origins in a url is not a trade worth making. still better than the wedding list, which for a venue account is either empty or - via the `venue` role on `weddings` select - a list of couples whose planner it cannot open
- `fetchMyStaffTenant` filters `role in ('owner','staff')` and embeds the slug. a `my_tenant_id()`-shaped lookup would answer for any membership, which is exactly wrong here: a venue's `customer` is a couple, and forwarding them to the crm would take someone who signed in to plan their wedding and drop them in a 403 at their own venue. four assertions in `staffTenant.test.ts` against the running database, plus `authLanding.test.ts` for the host split

### 20.08

- venue invitations, which is the thing that made invitation-only venues usable at all. `open_linking` defaults false, the invitation-only branch of `link_wedding_to_venue` looks for a `tenant_members` row with role `customer`, and `20260817000001` removed the only policy that could write one - correctly, but it left the default configuration with **no couple able to link to it**. hand-inserted rows were the workaround
- `tenant_invitations` + `claim_tenant_invitation` mirror `wedding_invitations` + `claim_wedding_invitation` field for field, and the three properties that make that shape safe are why: the row names nobody until claimed, the *recipient* spends it with their own session, and invitees get no select on the table because the definer function reads it. `tenant_members` still has no insert policy and must not grow one
- two asymmetries with the wedding side, both deliberate. any staff member may invite a `customer`; only the owner may invite `staff` - a customer row buys the ability to link one wedding, a staff row is a key to the whole crm including every granted seat map. that is the *opposite* asymmetry to the existing delete policy, where any staff may remove any non-owner: removal subtracts access and is undoable, creation is neither
- `PT409` for "this account already belongs to another venue". `tenant_members_one_per_user` allows one membership per account, so retrying cannot fix it and the generic "something went wrong" would send someone in a circle. checked before the insert and caught as a `unique_violation` around it, since the pre-check races and the unique index is not the one `on conflict (tenant_id, user_id)` absorbs
- `"members can leave their tenant"` ships in the same migration rather than the original one, and belongs there: until a couple could join by consent nobody was stuck, and a membership with no exit would have barred them from every other venue permanently. leaving touches no wedding - membership and `venue_access` are separate decisions with separate rpcs
- claim page at `/venue/invite/$token`, filed as `venue_.invite.$token` so it does not nest under the anonymous entry page. the shared `/invite/` segment is load-bearing: `scrubInviteTokens` matches that substring anywhere, so both token routes are redacted out of posthog by one pattern instead of two that can drift. `robots.txt` cannot share it - disallow is a prefix match from the root - so it gets its own line
- it ends on a card rather than a redirect, unlike the wedding claim. joining is not the end of the flow: a `customer` row only makes linking *possible*, and the disclosure decision is still a separate grant. redirecting to `/home` would leave someone who did the right thing looking at an unchanged wedding list
- `apexOrigin()` / `tenantOrigin(slug)` build the invite url for whoever it is for - the apex for a couple, the venue's host for staff. sessions are per-origin, so the wrong one is a sign-in screen for no reason, and `SITE_ORIGIN` is a constant that would have broken `pnpm dev` entirely
- `/crm/roster` is the venue's side: issue a link, revoke an unclaimed one, see who joined, remove them. expired invitations stay listed rather than vanishing - one that disappears reads as "i never sent it" and gets sent again
- 20 assertions in `tenantInvitations.test.ts` against the running database, and the sharp one is that a venue still cannot insert a `tenant_members` row or read a stranger's `display_name`. re-adding that insert policy would make the whole feature "work" and turn several of them red

### 19.08

- add password reset email template

### 18.08

- harden crm implementation

### 17.08

- prerender flat html for better google search console indexing
- the venue role and the peek. a couple links their wedding to a venue (`weddings.tenant_id`) and then, separately, grants it access (`venue_access`: `none` / `pending` / `granted`). `wedding_role()` derives `'venue'` from those two plus `is_tenant_staff`, so revoking is one column write and takes effect on the next policy evaluation - no cache, no job
- the two columns are not client-writable at all. `enforce_wedding_tenant_columns` covers **insert** as well as update, which is the half that matters: the weddings insert policy only checks `owner_id = auth.uid()`, so without it anyone could post a wedding that arrives pre-linked and pre-granted, straight past `open_linking`
- policies narrowed before the role widened, in that order and in that file. `guests`, `reminders` and `wedding_members` select now name `('owner','editor','viewer')` literally instead of leaning on `is_wedding_member` - which was only equivalent because `wedding_role`'s first branch happens to read the same table. that equivalence is exactly what the second branch breaks, and the failure mode is silent: the venue just starts receiving guest names. the reasoning is written in the migration, `docs/supabase.md` and CLAUDE.md
- what the venue reads instead is `wedding_seatmap`, a `security_barrier` view running as its owner with no `name` and no `note` column in it. `venueRls.test.ts` asserts **key absence** on the response objects, not `toBeUndefined()` - a view returning `name: null` would pass the latter while the column sat there one projection change from being filled
- `set_venue_access` lets the owner grant or revoke and lets venue staff **only revoke**. granting is the art. 9 ust. 2 lit. a consent, and the recipient of special-category data cannot supply the data subject's consent for them
- the grant dialog is the in-product half of that, and is not optional: `privacy.venue.optin` already says "aplikacja pokazuje dokładnie tę listę i prosi o potwierdzenie", so shipping the grant without it would make a published document false. it mirrors `privacy.venue.shared`/`hidden` item for item, and repeats the honest limit - `dietary` and `age_group` are free text, so a name typed into a diet tag reaches the venue
- `loadWeddingForVenue` labels seats `venue.anonymous_guest` at the load boundary, so the canvas, guest list and `PlannerPrintView` all work unchanged and none of them has to know a venue exists. the kitchen report is that same print view with `fields: ["dietary"]` - no second print component
- role now comes from a `my_wedding_role` rpc rather than the member rows, because a venue reads zero of those and "no row" reads identically to "no access"
- measured before/after: 50 full planner loads on a 435-guest wedding went 1.96 → 2.87 ms as the owner. the venue's own peek is the expensive side at ~25 ms for the same rows, since the view evaluates the role per guest row and always falls through to the second branch
- seed.sql grows two tenants (`bagatelka`, `dworek`) and their owner accounts, replacing the hand-provisioned row that every `db reset` was wiping

### 16.08

- enforce wedding scope on guests.table_id and wedding_id

### 15.08

- set version in package.json to 1.0.0
- check legal verification
- dropped seven dependencies nothing imported - `lz-string`, both spare `@dnd-kit` packages, two fontsource families the css never loads, `@tanstack/react-router-ssr-query`, `web-vitals`. only the fonts were reaching the bundle, the rest were lockfile weight
- sitemap `x-default` points at `/pl` for the landing too, not `/`. `/` canonicals into `/pl` and is excluded from the sitemap, and an hreflang cluster aimed at a non-canonical url gets its annotations dropped wholesale
- supabase auth errors translated (`lib/auth/authErrors.ts`). supabase answers in english only, so "Invalid login credentials" was greeting polish users on the busiest screen we have. branches on `error.code`, never the message text - those are explicitly not stable - and an unmapped code falls back to a generic key rather than leaking english through
- first-run checklist on the canvas. keyed per wedding so a second one still gets its own run, dismissible, and it retires itself on mount when the plan already looks done - an existing wedding must not be greeted with a "plan ready" card. own store on plain localStorage, not the local-gated storage: it holds no plan content, only a per-device flag
- each step opens what it names instead of pointing at a list - `addDialog` lifted out of `EntityListContent` local state into `entityList.store`, and the seat step highlights the guest row through a nonce so the hint still fires when the panel is already open on guests
- new weddings start with a hall rather than an empty grid. `seedDefaultHall` is the one write in `mutations/` deliberately outside `run()` - it fires from the wedding list before global.store has switched over, where `run()` would read a stale role, fail closed and drop it silently. failure is non-fatal, the canvas empty state still offers the same hall
- explicit seat button on guest rows. seating is the row's primary action but the row was its only trigger, and next to a pencil and a bin a bare row reads as "open details"
- "for free" in the couples landing copy
- add sign up link to landing page
- a failed weddings read no longer renders as "no weddings yet". the `.then` logged the error and carried on into `(data ?? [])`, so a network blip or an rls hiccup put a returning user in front of the empty state - indistinguishable from having lost the lot. list has its own error branch now, with a retry that re-runs the effect, plus a toast
- and the create button is no longer a dead click on failure - it just re-enabled itself and said nothing. same `toast.error` pattern as `run()` in `mutations/shared.ts`
- `launchReviewed: true` - read the filled-in legal config end to end, so `legal:check` stops failing and the docs are live as binding

### 14.08

- changelog linked from both landings, next to the existing footer links

### 13.08

- changelog page at `/pl/changelog` and `/en/changelog`, linked from the account menu, prerendered with the rest of the marketing pages and in the sitemap at 0.5. routes are `pl_.`/`en_.` - the locale landing has no `<Outlet />`, so they must not nest under it
- release notes live in their own `changelog` i18n namespace, one folder per release assembled by a glob, so a version's strings sit together in a small file with both languages side by side instead of growing the app's locale files by a block per release. `page/` contributes its keys unprefixed, being page chrome rather than a release
- `releases.ts` is the release table, kept apart from the component so `changelogKeys.test.ts` can check both locales against it - same split as `legalStructure.ts`. a missing key doesn't crash, i18next just prints it, and a public page ends up reading "v1.i3"

### 12.08

- security headers via `public/_headers` - hsts with preload, `X-Frame-Options: DENY`, nosniff, `strict-origin-when-cross-origin`, and a permissions-policy that turns camera/mic/geolocation off
- the csp is **report-only** on purpose: violations land in the console, nothing is blocked, and there's no report collector wired up. `script-src` still needs `unsafe-inline`, so enforcing it today would buy less than it looks like. read the notes above `connect-src` before renaming the header

### 11.08

- dropped `maximum-scale=1, user-scalable=no` from the viewport meta. blocking pinch-zoom is a wcag 1.4.4 failure and it was never the thing protecting the planner - the canvas claims its own two-finger gesture through `touch-action: none`. ios safari has ignored both directives since ios 10 anyway, so they only ever bound android chrome, where they cost zoom on the guest list, forms and dialogs for nothing

### 10.08

-- deploy

- prerender the marketing pages - `/`, `/pl`, `/en` and the six locale subpages build to real html now, sitemap generated from the same `pages` list. the whole site was one empty `index.html` served for every url, so there was nothing to index: 285 impressions, 7 clicks, and "easywed" ranking around 17 for its own name
- the spa shell was what overwrote it. the plugin appends the shell to `pages` keyed on `spa.maskPath`, so at the default `/` it collided with the homepage entry and won - `/` came out 4kB of scripts against `/pl`'s 28kB of content. shell moved to `app-shell.html`, and since `maskPath` has to resolve to a real 200 route there's a stub route for it
- head defaults to `noindex` and the marketing routes opt back in. robots.txt stops disallowing `/home`, `/login`, `/settings`, `/wedding/` - a blocked url is never fetched, so the noindex is never read and google keeps listing the bare url from inbound links. that's exactly how those got indexed with zero clicks
- `autoStaticPathsDiscovery` (on by default) and `crawlLinks` off - between them every static route was being prerendered _and_ published in the sitemap while its own html said noindex. homepage title is no longer the bare wordmark, and `/` canonicals to `/pl` since it serves the same bytes

---

- the `_redirects` wildcard had to go: pages evaluates `_redirects` _before_ static assets and ignores the `200` rewrite, 308ing to the extensionless path, which re-matches the wildcard. every url on the site - robots.txt and sitemap.xml included - was in a redirect loop
- shell emitted as `404.html` instead, the only hook a static pages deploy gives you for "serve this when no asset matches". left alone pages falls back to `index.html`, which is now a prerendered page - it dehydrates with the index route already matched, so hydrating it at `/wedding/$id` hands the router state for a route the url isn't on. the shell dehydrates with `__root__` alone, which is what makes it safe anywhere. the cost is dynamic deep links answering 404 while rendering fine, which is harmless for `/wedding/$id` and `/invite/$token` - private links nobody should be indexing
- app surfaces (`/home`, `/login`, `/signup`, `/settings`, `/accept-terms`, the password ones, `/wedding/local`) prerendered by hand and excluded from the sitemap. a crawler can only read a noindex off a page it can actually fetch, and without them the route falls through to the spa fallback and answers with indexable marketing copy
- `/wedding/` disallowed after all: wedding ids are dynamic, there's no prerendered html for them, and the fallback is the landing saying index,follow. better to block the crawl than serve marketing copy under a wedding url. `/wedding/local` is static, so it's allowed through to be read as noindex

### 09.08

- add reset password
- add forgot password, recovery tokens scrubbed from analytics alongside the invite ones

### 08.08

- posthog autocapture out, declared product events in (`lib/analytics/track.ts`) - imports, exports, seat assigns, assistant, print
- fill the legal config with the real company data

### 07.08

- proper tos and privacy policy, and the flow around them: a migration records _which_ version a user accepted, `/accept-terms` gates the app from the root route so it survives someone typing a path rather than following the sign-up, legal links in settings
- split sign-up out of the login route
- legal configuration extracted into one reviewed file, merged `t()` options memoized

### 06.08

- revoke `execute` on the `security definer` functions from `anon` - hosted supabase's default privileges hand out _explicit_ anon/authenticated grants on top of the implicit PUBLIC one, and `revoke ... from public` doesn't subtract an explicit role grant, so the rpcs stayed anon-callable on remote. looks fine locally because a fresh `db reset` never applies those default privileges. same class of mistake as `revoke update (owner_id)`
- the three policy helpers are deliberately left out of it: revoking anon's execute there doesn't 42501, it segfaults the backend and crashes again on the next such read

### 05.08

- move theme switcher to profile settings -- deploy

### 04.08

- moved ai assistant on mobile to bottom rail -- deploy
- drop `invitation_orders` and the `guest_names_valid()` it existed for - leftovers of the removed invitation designer, nothing read or wrote them
- local wedding migration is atomic: create -> layout -> guests + reminders, and any failure rolls the wedding back and leaves localstorage intact; the sequence moved out of the dialog into `migrateLocalWedding.ts` where it's testable. the guest list is the thing the snapshot uniquely holds, and it used to be dropped on exactly that path
- invite tokens out of analytics: posthog `before_send` scrubs `/invite/<token>` from urls, `$referrer` and the `$set`/`$set_once` person props (keyed on the value, not a list of property names - `$initial_current_url` is synthesized at runtime). robots.txt disallows `/invite/`, `/wedding/`, `/settings`, `/auth/`. session replay is NOT covered - exclude `/invite/*` in project settings if it's ever turned on
- read-only planner for viewers: `selectCanEdit` mirrors the RLS predicate, dnd-kit sensors withheld at the context, write dialogs / context-menu items / fabs / the assistant tab gone, edit forms render inside a disabled `fieldset` so a viewer can still read capacities and sizes. `run()` refuses any write that gets past the UI
- ...and the fix for what that gate broke: the migration set the new `weddingId` but no role, so a fail-closed `run()` blocked every write and rolled back a wedding that had just been created fine. only reachable after an oauth reload, where nothing has set a role yet and `partialize` doesn't persist one
- same pass: a panel view a viewer can't see (add hub, assistant) no longer opens the drawer/dialog chrome around an empty body - `useVisiblePanelView` resolves it and clears it from the store, since `panel.store` is a singleton nothing resets between weddings
- a table's capacity can no longer drop below the guests already seated at it: `enforce_table_capacity_floor` trigger, plus a `save_table` rpc so the whole edit (attributes, seat overrides, roster + pins) lands in one transaction. the two capacity triggers want opposite write orders - a shrink needs the departures written first, a growth needs the capacity first - so no client-side ordering satisfies both
- assistant: tool inputs screened before they reach the store - non-positive/NaN sizes and capacities refused by field name, fractional seats rounded, non-finite floors dropped, NaN positions fall back (±Infinity still clamps to the hall edge, which is the right answer)
- assistant: layout snapshot out of the system prompt and into a delimited user message. every name in it is user-supplied - typed by a co-editor or imported wholesale from a spreadsheet - so it doesn't belong in the same turn role as the rules. angle brackets json-escaped (`<`/`>`, same parsed value, no literal bracket left) so a table named `</layout-snapshot>` can't close the fence and make the rest read as the user talking

### 03.08

-- deploy

- lock `weddings.owner_id` with a trigger - the april `revoke update (owner_id)` never did anything (table grant on remote beats a column revoke), so any editor could set themselves as owner, kick the real owner out and delete the wedding
- `delete_own_account` raises `account_not_deleted` instead of reporting success on a 0-row delete
- neutral polish copy for leave/delete wedding
- add option to remove a reminder

### 02.08

- profiles: display name, `/settings` route, header avatar stack, account menu - emails and oauth metadata stay in `auth.users`
- account deletion: `delete_own_account()` rpc, refuses while you own a wedding someone else can reach; `claimed_by` fk to `on delete set null`, anyone who ever claimed an invite was undeletable
- delete (owner) / leave (member) wedding from the wedding row menu; `members can remove themselves` policy, and owners can no longer delete themselves out of their own wedding

### 01.08

- color tags for dietary and age groups
- aria states for tags and fields

### 31.07

- add easywed-video proj to render clips

### 30.07

- migrate reminders from local wedding to the remote one
- pass mobile class name prop to responsive-dialog so that drawers renders correctly on smaller screens
- fix themes (specifity order) -- deploy
- improve sidebar rail transition

### 29.07

- add filter preset for kids, automatically infer age from age group -- deploy
- dont render provider ch

### 28.07

- add age groups tags

### 27.07

- posthog: dont track user by cookie
- dont drop measurements in void
- drag measure instead of panning
- free-form dietary tags: drop halal/kosher presets, let guests add custom pills; DB CHECK relaxed from value allowlist to a shape rule (`dietary_tags_valid`)

### 26.07

- todo - share free plan check so it's derived from custom hook
- block member invites on the free plan (guest mode), show an upgrade notice instead
- document guest vs signed-in differences (`docs/guest-vs-account.md`)

### 25.07

- render tables in print in two columns -- deploy

### 24.07

- render guests in print in one column

### 23.07

- exercise portrait orientation, decided to just hint to use landscape -- deploy (90e0e1f)

### 22.07

- remove shadows around seats in print view -- deploy (d90a265)
- make same print width on mobile and desktop
- reduce supabase calls with bulk delete
- shift measurements before persisting new positions to db
- enforce hall_id belongs to the same wedding, let the FK report missing halls
- adopt tables/fixtures pointing at a missing hall on load
- wait for target hall insert before reassigning moved entities

### 21.07

- replace HORIZONTAL | VERTICAL with rotate 90 button

### 20.07

- harden hall geometry checks, check for isFinite, prevent infinite loops

### 19.07

- start working on custom hall geometry
- change tl key from _import_ to _import guests_

### 18.07

- TODO: add custom geometry for halls
- add multihall support (to be improved with further tests) - support adding more than one hall, drag objects between them, drag halls themselves, respect drag order
- remove dxf imports
- add custom objects geometry

### 17.07

- fix non negative values in inputs -- deploy (38c5eb7)
- add venues landing pages
- add banner for venue owners for better visibility
- replace emdashes across the repo

### 16.07

- fix mobile header title overlap -- deploy (d173343)
- mark past deployments
- move reminders to sidebar, remove empty route -- deploy (aa76ef8)
- let user choose sorting alphabetically/by table seats in exports

### 15.07

- change default theme
- sort exported table names by Intl.Collator (prevent sorting lexicographically or numerically) -- deploy (5e8f163)

--- started marking deploys for easy reference

### 14.07

- restore reminders preview, align for local wedding

### 13.07

- center preview, make only right hand side of edit table scrollable (on desktop) -- deploy (6c8aab6)
- fix localization of dietary preferences in print
- add tooltip explaining guest assignment' -- deploy (2059e66)
- add table preview into table edit dialog
- display selected guest first in seat popover -- deploy (4234ea2)
- use wheel pan on canvas
- improve pan boundaries -- deploy (2c808c6)
- add pencil icon to indicate editability of inline-edit component
- remove GuestSeated component from header - it's in sidebar rail now

### 12.07

- add fuzzy search to GuestListContent -- deploy (1df22b8)

### 11.07

- rename /app -> /home -- deploy (960c99d)
- refine strings on landing page

### 10.07

- add dietary badges in sidebar/guest list -- deploy (379824c)
- open edit entity on double click
- add Go to the app when user is signed in on LocaleLanding -- deploy (923015e)

### 09.07

- fix overflow in guest assignment picker -- deploy (0df693c)
- add delete table/fixutre from canvas context menu
- add option to soft delete guests

### 08.07

- fix minimap geometry -- deploy (381c7bf, ac8af5b)
- fix clear seat -- deploy (26341ba)
- dont open edit table/fixture on click, but select
- add edit table/fixture in contextmenu -- deploy (1d66add)
- dont open hall configure on hall click
- redirect to /app after logging in -- deploy (69f764d)
- add option to login with enter -- deploy (a1b7ee9)

### 07.07

- add edit-guest dialog (name / dietary / note), reachable via a pencil on each guest row - shares fields with add-guest via `GuestFormFields`, persists through new `updateGuest` store action + `updateGuestDetails` mutation
- guest list: clear the search after seating a searched guest, add an `x` clear button to the search input -- deploy (77a0fba)

### 06.07

- use confirm icon button instead of X for dialogs acknowledgment -- deploy (8c12523)

### 05.07

- mobile: lift zoom controls + add-FAB above the bottom tab bar (were hidden under it), size planner with `dvh` so it respects the android url bar
- mobile: scroll the focused field into view when the android keyboard covers it in the entity drawer
- mobile: confirm entity edits with a checkmark instead of an `x` - same close, clearer intent when adding from the FAB
- send `/` to `/pl` or `/en` by detected language, move the wedding dashboard to `/app` -- deploy (99c2f55)

### 04.07

**seating planner redesign - cleanup**

- zoom & pan improvements, badge counts on sidebar rail, smoother open animation
- align dialog widths
- remove ai assistant from the top toolbar, use logo colors for seats
- fix assigned-guest state not persisting (+ typo / comment fixes)
- extract `CanvasToolbar`, drop dead code
- deduplicate badge counts + entity lists (shared `EntityListContent` / `TabBadgeIcon` / `tabs.ts`)
- merge `sidebar.store` + `mobilePanel.store` → `entityList.store`
- rename `PropertyPanel` → `EntityForms`, `GuestPanel` → `Guests`, panel index → `MobilePanelDrawer`

**landing pages**

- add proper `/pl` and `/en` landing (hero / features / steps / cta / planner preview) + privacy policy (`/pl/privacy`, `/en/privacy`)
- add landing page redirect
- fix planner preview colors
- update logos + favicon -- deploy (284f9f7, landing-pages merge)

### 03.07

- use `easywed.` name in login screen -- deploy (31f7a0c)

### 02.07

- fix gitignore excluding wedding.local route files from git
- fix local mutations reporting false failures on guest import/dxf
- fix local snapshot rehydrate clobbering existing local data
- validate local snapshot shape before migrating to cloud
- render landing page instantly for guests instead of blank screen -- deploy (4a08ba7)

### 01.07

- trim names provided by ai
- reclamp objects to hall after updating them -- deploy (7ea0c2d)
- add local-first guest mode: plan without login, data stays in browser
- migrate local wedding to a cloud wedding on sign in

### 30.06

- use structured tool result
- notify about unsafe http
- trim history sent to ai
- guard update table to limit guests number in the table
- dont show settings button if ai is not configured
- use queue for pending confirmations instead of single value -- deploy (c6c9407, ai-assistant merge)

### 29.06

- draft ai assistant

- track drag outside of canvas so it feels less snappy.

### 28.06

- better guards on mobile (use dndcontext instead of `isMobile` text)

### 27.06

- support clipboard for tables/fixtures (allow copy paste)

### 26.06

- fix canvas pan - allow dropping out of bounds and clamp hall
- make seats bigger when zoomed in
- added view controls - measure/seats/grid style/grid snap to canvas context menu

### 25.06

- unify dropzone compoonent, use it across import guests and import dxf

### 24.06

- add dropzone to import dxf dialogs

### 23.06

- added "show hall outline" switch in pdf export drawer
- prevent context menu when target != hall

### 22.06

- add fit to page / remove grid in pdf export

### 21.06

- capture pointer in TableSeats on pointer down to avoid bugs with miscalculated pointer position
- replace EZWED wwith easywed. in planner view

### 20.06

- improve seat assignment, drag follows table, doesn't go over specified margin.
- fix clearing seat
- group seat assignment popover - at this table / somewhere else / unassigned

### 19.06

- match server theme, single source of truth for themes

### 18.06

- add some basic themes to the app, use themes across.

### 17.06

- make add guest / import guests sticky positioned

### 16.06

- initial version of seat assignments
- clamp measurements to hall, don't allow out of bounds measurements

### 15.06

- fixing ui bugs - overflowing labels/controls
- dont drag when measuring
- fix drag in GuestDrawer

### 14.06

- use credenza pattern for dialogs (render drawer for mobile)

### 13.06

- remove rename wedding dialog
- add inline-edit component
- add status bar to inform about esc to exit for measurements
- add unified preview table component with show more button. use it across guests import
- add click through statusbar
- improve drag and touch interactions

### 12.06

- add xlsx / csv import

### 11.06

- add shareable `/pl` and `/en` landing routes
- `fallbackLng` -> `pl`
- derive `<html lang>` from path in root shell (was hardcoded `pl`),
- `e.` monogram for square icons

### 10.06

- navigate to guests panel when adding guest
- split components into hooks -> members dialog and HallSurface

### 09.06

- split mutations to smaller chunks, add `run` helper to localize error handling

### 08.06

- move remote supabase key to .env.production
- gitignore .env\*
- add sonner for toasts

### 07.06

- rename app to `easywed.`
- created ig page and bought `easywed.app` domain
- small style fixees
- small translation changes from DXF to CAD (.dxf)
- setting up smtp for new domain
- remove redundant borders (box shadows) from custom shapes
- improve deselecting
  - check for Element instead of HTMLElement for deselct logic (didnt cover custom SVG elements)
  - improve panning lgic (detect offset so deselecting feels more natural)

### 06.06

- add option to create wedding from dxf file

### 05.06

- upsert hall on HallPanelContent cleanup
- upsert hall on dimension change
- dont upsert hall on blur

### 04.06

- make wedding creation frictionless: instant creation with auto-naming (Wedding 1, Wedding 2, etc.)
- remove wedding create dialog - unnecessary modal friction
- add pencil icon hint to wedding name to indicate inline rename capability

### 03.06

- removed draft invitation feature (5k lines)
  f08bfd0f0622ab9603afb12d06f9dc9507ab39fe, commit for ref
- for easywed only go with seatplanner with cad support

### 02.06

- omit hub, go straight to seat planner
- remove navigation to invitations

<!-- cleanup from ai starts here? -->

### 01.06

- extend dxf import for more cad shapes

### 31.05

- support custom shapes to support import from cad
- DXF import known limits: object rotation isn't recovered (every imported
  table/fixture lands at rotation 0, so a rect drawn rotated in CAD degrades to
  an uneditable custom/polygon shape); only the `seated/capacity` slash form in
  labels is parsed as capacity, bare trailing numbers stay part of the name

### 30.05

- add CAD export
- write DXF exporter

### 23.05

- migrate from bun to pnpm

### 22.05

- revert commits to serve easywed v1 (748f188c03303696151c866a6d4e4fe43f9b5aee)
- talking to prospects

### 07.05

- add undo/redo buttons in invitations creator

### 06.05

- save a rerender with not calling setPlannerStore before setting fixtures

### 05.05

- invitations: make duplicate actually duplicate, apply proper styles/fontsizes to duplicated field
- fix removing a field iwth escape by loosing check for focused element

### 04.05

- improve text field editing
- removed redundant files
- fixed InlineTextarea styles
- TODO: deslopify invitations

### 03.05

- in invitations editor add support for
  - inline text editing
  - separators
  - per field font size / formatting
  - undo/redo

### 02.05

- initial revamp invitations view
- improve ux for measurements, allow clicking outside when measurement is already started
- todo: generalize data-no-pan (disallow click or whatever)

### 01.05

- measurement label now follows dragged object
- measurement removes stale object id when object is deleted
- added proper padding so planner don't exceed the page on print
- add Esc listener to quit measuremnets
- measurement flips when user drags over object that is measured from (bad english, reword it)
- shift-lock for measure tool - holding Shift while placing the second measurement point constrains the line to the nearest horizontal or vertical axis
- all measures are now done in Canvas component, expose methods from hall surface with use imperative handle

### 29.04

- fix no button when adding fixtures
- dont include `next` in url params when landing on `/`
- init posthog
- TODO: add custom posthog events for wedding/fixture creation, etc

### 28.04

- add fixture type to represent columns/dj booth, etc
- comment out some strings to see what feels better
- group add / configure buttons under one dropdown
- comment out reminders for now (no content there)

### 27.04

- improve both sides invitation editor by free hand dragging
- clamp dragging to invitation preview
- show same design on drag
- TODO: handle seperators, further improve designer
- ~~TODO: handle dj booth/photo booth in planner~~
- TODO: stripe instead of db events for order invitations

### 26.04

- merged feat/invitations
- cleaning up implementation of invitation, potentially extendind templates
- todo: configure db webhook for placed orders (or do something related to accept the order)
- prototype both sides invitation editor

### 25.04

- created app layout on /wedding/{id}
- add initial invitation designer, wire it up with router
- include invitation design and guests in hash
- create guest name picker that saves guests to db for authenticated users
- built initial version of freemium/premium invitation designer (it's the same designer)

### 24.04

- configure vite to build with SPA mode and output `index.html` for cloudflare pages
- limit db calls with persisting state on blur not on change
- fix no pan on hall

### 23.04

- fix google sign in by configuring proper redirect urls in supabase
- deploy site to `easywed.kurek.sh`
- guard routes with `beforeLoad`
- add option to coedit wedding with someone (and revoke this privilege) (invitation)
- todo: limit viewer to not edit anything
- add invite member dialog

### 22.04

- add export to pdf, extend csv export dialog
- use `guests` to calculate guests grouped by table
- extract TableVisual and HallBackground to seperate dumber component to support print
- remove batch add tables from header
- added sign in with google [supabase] (either pay for custom domain 10$/month or do handrolled..)

### 21.04

- add csv export, export grouped by table, export preview

### 20.04

- defined DEFAULT_TABLE
- add option to batch add tables
- add support to flipping table's rotation `0 | 90` deg

### 19.04

- show user friendly error on failed wedding fetch, only log error response
- dialog is now internationalized
- added tl key for failed wedding load
- add tooltip informing user that assigning already assigned user will have consequences (lol)
- show user if guest is already assigned at another table.

### 18.04

- create and save wedding to db, reuse existing Wedding.Create dialog and navigate to `/wedding/$id`
- migration to support owners querying for their weddings
- hydrate zustand stores on wedding load
- generate supabase types, adjust eslint files
- ~~todo: fix eslint, as i forgot to unignore it after migration from ai gen~~
- todo: current db updates are fire-and-forget. think how to handle it (function calls marked with `void` in `*.store.ts`)
- persist state to db with `src/lib/sync/mutations.ts`
- wrap up `feat/add-db` branch with working db connection. some improvements are needed to reduce roundtrips to db. as mentioned beforehand - need to think how to handle ui/db updates, to cancel db updates when local change fails, etc.

### 17.04

- setup login/signup with email on `feat/add-db` branch
- decouple view store from the hall (zoom pan, grid style, grid size, etc)
- table now correctly snaps to grid when added from context menu
- migrate supabase after decoupling view store from the hall

### 16.04

- start creating supabase connection on `feat/add-db` branch
- added duplicate and delete table from the canvas - should probably populate it to property panel
- don't close property panel on table delete or click outside the hall

### 15.04

- match grid style buttongroup order with NEXT_GRID_STYLE in Canvas
- move SnapStep/GridStyle/GridSpacing to `planner.store.ts` instead of local variables. all modifications from hall / canvas are going through the store now.
- add grid style controls to property panel
- centralized canvas click + context-menu routing in `Canvas.tsx` via `findCapturedElement` / `captured.kind`:
  - `CanvasContextMenu` refactored from per-action props (`onAddTable`, `onEditTable`, `onConfigureHall`) into a `renderItems({ position, inHall })` render prop - the component is now just a trigger + content shell, Canvas owns all action logic
  - `DraggableTable` dropped `onSelect` / `isSelected` props; reads its own selection state from `panel.store` and selection clicks are handled by the outer canvas `onClick` via `captured.kind === "table"`
  - `HallSurface` dropped `onTableClick` / `selectedTableId` pass-through
  - tightened `CapturedElement` into a discriminated union (`{ kind: "table"; id: string } | { kind: "hall" }`) so `captured.id` is narrowed by `kind` - dropped `captured.id!` / null guards
  - narrowed `DraggableTable` selection selector to a boolean (`(s) => selectSelectedTableId(s) === table.id`) so only the newly-/previously-selected tables re-render on selection change
  - extracted `CanvasContextMenuItem` (shared menu-item className + variants) into its own file
  - stripped "Edit table" and "Configure hall" items from the canvas context menu - both are reachable via the property panel on left-click, so the menu is now just "Add Table". `CanvasContextMenu` no longer tracks `capturedElement`.

### 14.04

- replaced table shape select in panel with a two-option `ButtonGroup` (rectangular / round) for quicker toggling
- changed canvas context menu "Add Table" to optimistic flow: creates a table immediately at click position and opens table edit view right away
- default table created from context menu uses: empty `name`, `rectangular` shape, `8` capacity, and `2x1` size
- made table name optional in table form validation (empty name is now valid)
- added fallback table label when name is empty: `guestsAssigned / capacity` (used on canvas table chip + aria-label)
- applied the same unnamed-table fallback in guests panel section labels for consistency

### 13.04

**Property panel (replaced dialogs)**

- replaced `ConfigureHallDialog`, `AddTableDialog`, `EditTableDialog` with a slide-in `PropertyPanel` on the right side of the canvas
- panel state managed by `panel.store` (view discriminated union); `selectedTableId` derived via selector instead of stored separately
- hall panel applies changes immediately to the store (no local state / save-cancel flow)
- table panel works in add/edit modes; edit mode auto-applies on every field change
- guests panel groups guests by table assignment with droppable sections
- moved table field components (`TableNameField`, `TableShapeField`, etc.) from `dialogs/tables/` to `PropertyPanel/fields/`
- deleted dead code: `ConfigureHallDialog`, `AddTableDialog`, `EditTableDialog`, `TableDialog`, `useTableForm`, `Preview.tsx`, empty barrel files
- merged `updateHall`/`updateHallProperties` into single `updateHall` store action (callers reset zoom/pan explicitly)

**Guest drag-and-drop**

- lifted `DndContext` to `Planner.tsx` so canvas and panel share one drag context
- `DraggableTable` is now also a droppable - shows blue ring when a guest hovers over it
- `isDraggingGuest` tracked once in `HallSurface` via `useDndMonitor`, passed down to tables
- fixed: panel section highlights firing during table drags - gated `onDragOver` to `type === "guest"`
- fixed: `DragOverlay` ghost moving because transform applied to source - suppressed on source when dragging
- fixed: `setRef` in `DraggableTable` unstable reference - stabilised with `useCallback`

### 12.04

- replaced canvas-based hall preview in `ConfigureHall` with a real `HallSurface` render - deleted `canvas-utils.ts` entirely
- added `GridSpacing` type to `HallSurface`, alongside `GridStyle` and `SnapStep`
- nice derives meters from `width / ppm` and picks the nearest interval
- `gridSpacing` stored in `planner.store` on `hall` object (default `1m`), passed through `updateHall`; canvas reads it from store
- added grid spacing picker to `ConfigureHall` dialog - options `1m … 50m` + `auto` at the end (best for large halls), filter down options fitting the hall
- to think about - should grid be configurable from canvas or hall - probably from canvas?
- removed `Canvas/consts` file and moved it contents into `useHallGeometry` hook as it was only used there
- add disabled state for `Tables` trigger in Header

### 11.04

- added option to change background between dots / grid or completely disabled.
- replaced named type imports from 'react' with i.e. React.ReactNode
- added tl keys for grid/off/dots
- added possibility to snap tables to grid
- fixed `grid position` in HallSurface to center drawn grid size
- added snap step controls
- align hall configure button in header to other layout elements (should i hide tables when there is no hall?)
- used div instead of buttons for `DraggableTable` component

### 10.04

- clean up after ai - use shadcn's context menu instead of radix
- add option to edit a table on Table's context menu
- use `data-canvas-element-kind` and `data-canvas-element-id` to distinguish what was clicked on the canvas
- added `EditTableDialog` dialog, that uses same base as `AddTableDialog` utilizing `useTableForm` hook - maybe renmae to `useTableDialog` will see.
- changed number input fields to use `number` instead of `string`
- simplified `tables` transation keys
- renamed dialog.meta's spawnPosition to `position`
- split `Canvas.tsx` to smaller bits and pieces (`useCanvasPan`, `useCanvasZom`, `useHallGeometry`, `useLongPress`), use PointerHandler instead of Mouse + Touch for Canvas.

### 09.04

- right-click (or long-press on mobile) on the hall canvas shows a context menu with two actions:
  - "Add Table" - disabled when clicking outside hall bounds; table spawns at the clicked position
  - "Configure Hall" - always available regardless of click position
  - long-press detected via 500ms touch timer; cancels on move or release; fires synthetic `contextmenu` event to reuse the same menu on mobile
  - click position converted from viewport → hall coordinates, passed as `spawnPosition` through `dialog.store` meta into `addTable()`

### 08.04

- remove presets other than rectangle from `ConfigureHallDialog
- match `Preview` style with `Planner`, render tables (verify and simpify the code)

### 07.04

- added Tables.Add dialog
- added tooltip from shadcn
  - problematic part i found is that it needs `asChild` prop to work properly, need to do some research as to why. because of that (platform limitation), disabled button doesn't emit hover events so need to manually check the constraints.
- added guest assignment picker
- assign guests to table with capacity aware assignment
- added EN/PL translations for new flow.
- make user first configure hall before adding tables (improve the flow, appear tables button group as disabled)

### 06.04

- made text on canvas preview less blurry ([ref](https://stackoverflow.com/questions/15661339/how-do-i-fix-blurry-text-in-my-html5-canvas)), will make a 365/util out of it

### 05.04

- removed hall padding so the tables can be now matched with walls
- display `table.capacity` instead of plus icon on tables (change colors when full?)
- created seperate file for Canvas component, only reexport in barrel
- added 1m x 1m grid for planner, so it's possible to arrange tables with specified positions. (allow for moving the grid left/right? - commented out part responsible for that)

---

- removed old ai-generated planner with refactored one, missing features
  - export/import planner
  - print
  - list view

consider:

- adding a toolbox to planner view - little popup with
  - edit hall
  - add table
  - add obstacle (dj booth, photobooth, etc.)

---

### 04.04

- added planner component with DnD Context.
- tables are now movable inside the wedding hall, cannot go out of bounds
- all calculations are limited to rectangle hall shape (for now, for initial implementation)
- added seperate components for `DimensionLabel` (show size of the rectangle side), `DraggableTable` as well as utils and consts for Canvas Component
- seperate hook for `useElementSize`
- mocked tables for testing (follow up with create table dialog)
- hall is now centered and rendered as a preview, it is zoomable (0.2-4x) and it is possible to pan around the preview. Zoom and pan is reset when hall dimensions changes
- everything is stored in meters and recalculated for canvas (to verify)
- reset zoom and pan on scale pill click

### 03.04

- improvement for calendar to close on chosen date
- add empty state for planner
- store hall locally in ConfigureHallDialog and propagate to store on save
- place icons on the left for button with icons
- rename Dialog files to navigate around the code easier (amended commit to check if gpg key is working)

### 02.04

- improved Guest.Add dialog, add polish translation, save guests to zustand
- improved styles for smaller screens (show only icons, without text <md)
- Added <ButtonGroup> for Guests in `Planner` component.

### 01.04

- added Guest.Add Dialog

### 31.03

- added new `Hall.Configure` dialog
- added preview component to visualize hall dimensions (canvas, only limited to rectangle now)
- hook up preview component to `planner.store.ts`
- added and used translation strings for both English and Polish

### 30.03

- styled `RemindersPreview` little bit better
- used omitted translation for DatePicker placeholder
- extender reminder model to include `status`, `updatedAt` and `uuid`
- automatically close `CreateReminder` popover
- split `RemindersPreview` to smaller, self-contained components

### 29.03

- tweaks around dev setup with eslint (added react hooks plugin) and file structure renaming (stores/dialog.ts => stores/dialog.store.ts) as well as deflattening the structure little bit to reexport as default base components for routes (is there a name for it?), as in - `planner/index.tsx` => `planner/Planner.tsx`, `planner/index.tsx`
- created `Reminders` route and added a link from `reminders preview`
- made header component composable to ensure similarity between 'apps'
- extracted RemindersPreview to own component (WIP)

### 28.03 - WIP

- Split Header to smaller components, further split needed, it would be preferable to keep these separated component in the same file so it doesn't clutter the filesystem for jumping between files, but then it would clutter `Header.tsx` - need to think what's the best option here.
- Added `button-group` and `textarea` from shadcn, extended `datepicker` with custom translation keys for prompt and hid label based on the props.
- Setup `store/reminders` - need to create proper route for it
- Setup preview reminders from planner, can extract this component to reuse it across diferent part of application.
- removed redundant comments from `Header.tsx`

- ~~when to fix mobile view, it needs to be done at some point~~
- ~~fix TODOs left in `Nav.header.tsx` as well as in other parts of code~~
- ~~didn't finish with code split and reminders work due to lack of time~~

## 27.03

I noticed that some vulnerabilities are reported when run `bun audit`, although not all are immediately fixable,
i.e. [h3 version pinned by tanstack router](https://github.com/TanStack/router/issues/7043).

### done

- Added a "Welcome" dialog that only appears at the "first configuration" or when wedding name is not set. It's not perfect and it _should_ rely on DB of sorts and not zustand.
- Added a `DialogManager` that renders a dialog at a time, based on `DialogStore.opened` property. This way I don't need to worry about stale state between DialogStore updates and local state of dialogs, as well as I don't trash DOM with every dialog existing in the app.
- formatted and linted refactored part of the app - part generated by ai was added to `ignores` field of @tanstack/eslint-config.

### consider

- add precommit hooks for formatting and linting

## 26.03

After building a prototype I am happy with, I started to clean up the code to the point I feel good about maintaining it.

Started with project / structure setup and making some assumptions about the project based off a prototype.
I want to keep it simple for as long as possible as well as ofcourse try some new things, like `zustand`.

### done

- Set up a `planner-refactor` route to build a planner with less code and more maintainability.
- Set up zustand and small stores for `global` values, `planner` tied to Planner route and a `dialog` store to centralize dialog controls (like I mentioned in the comment in dialog store - I don't know particular caveats of using dialogs like this, so wanted to pick up my poison of this taste)
- Set up i18next for English and Polish language. Translate strings in refactoring part.
- add `Canvas.tsx` empty state.
