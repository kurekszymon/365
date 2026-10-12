# Venue invitations - manual test plan

Covers the stacked branches `easywed/invites-*`. Automated coverage lives in
`src/lib/sync/tenantInvitations.test.ts` (DB) and `src/lib/tenant/inviteOrigin.test.ts`.

## Stack

| # | Branch | Based on | Status |
|---|---|---|---|
| 1 | `easywed/invites-1-db` | `main` | committed |
| 2 | `easywed/invites-2-claim-page` | 1 | committed |
| 3 | `easywed/invites-3-couple-dialog` | 2 | committed |
| 4 | `easywed/invites-4-crm-roster` | 3 | committed |
| 5 | `easywed/invites-5-docs` | 4 | ready to commit (below) |

### Phase 5 commit

```bash
git switch -c easywed/invites-5-docs
git add -A
git commit -F - <<'EOF'
easywed: document invitation flow; /venue invite hint, apexOrigin links

- /venue: hint under "Plan your wedding" that the venue sends an
  invitation link; signup CTA and the CRM 403 link use apexOrigin() so
  pnpm dev stays local (VenueMessage footer keeps SITE_ORIGIN - prerendered)
- current-state.md: invitation functions and refusals, roster, invitation
  page, VenueLinkStep, analytics, tests, gaps 11.3/11.4/11.6/11.7, file map
- CLAUDE.md: invite route is preview-first; never claim on page load
- docs/testing: Phase 5 checks

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

## Setup

```bash
supabase db reset        # restores every seed token; re-run between passes
pnpm dev                 # :3000
```

- Apex: `http://localhost:3000`
- Venue hosts: `http://bagatelka.localhost:3000`, `http://dworek.localhost:3000`
- Mail (sign-up confirmation): `http://127.0.0.1:54324`
- Password for every seed account: `password123`

| Account | Role in seed |
|---|---|
| `owner@easywed.test` | owns "Anna & Piotr" (granted to bagatelka); bagatelka **customer** |
| `editor@easywed.test` | editor of "Anna & Piotr"; in no venue |
| `viewer@easywed.test` | viewer of "Anna & Piotr"; in no venue |
| `solo@easywed.test` | owns "Tomasz & Kasia" (unlinked); in no venue |
| `venue@easywed.test` | owner of `bagatelka` |
| `venue2@easywed.test` | owner of `dworek` |

| Seed token (`/venue/invite/<token>`) | State |
|---|---|
| `seed-live-customer-invite` | live, customer, bagatelka |
| `seed-live-customer-invite-2` | live, customer, bagatelka |
| `seed-live-staff-invite` | live, staff, bagatelka |
| `seed-expired-customer-invite` | expired |
| `seed-claimed-customer-invite` | already claimed |
| `seed-suspended-customer-invite` | live, but `stodola` is suspended |

## Automated

```bash
pnpm typecheck && pnpm lint && pnpm test
```

All green. DB suites skip (not fail) when the local stack is down - check the
count is ~720, not ~500.

## Phase 2 - invitation page

Use a private window per account so sessions don't mix.

| # | As | Open | Expect |
|---|---|---|---|
| 1 | signed out | `localhost:3000/venue/invite/seed-live-customer-invite` | "Sala Bagatelka invites you to plan your wedding", **Create account** + **Sign in**. Nothing claimed yet. |
| 2 | solo@ | (continue 1) sign in | Back on the invite, plan picker. "Tomasz & Kasia" preselected, "Start a new plan" below. |
| 3 | solo@ | pick "Tomasz & Kasia" -> **Accept and link** | Lands on `/wedding/<id>/planner`, Venue dialog open on **pending**. URL has no `?venue=`. Reload: dialog does not reopen. |
| 4 | solo@ | reopen the same link | "This invitation is no longer valid". |
| 5 | venue@ | `bagatelka.localhost:3000/crm/roster` | Invite from step 1 gone from unused list; solo listed as a member. |
| 6 | editor@ | `localhost:3000/venue/invite/seed-live-customer-invite-2` | Only "Start a new plan" + the "plans shared with you... forward this link" note. Close without accepting. |
| 7 | venue@ | roster | `seed-live-customer-invite-2` still unused (editor didn't burn it). |
| 8 | venue2@ | `dworek.localhost:3000/crm/roster` -> create a **customer** invite -> copy | Link is an apex URL (`localhost:3000/venue/invite/...`). |
| 9 | owner@ | open the dworek link -> "Start a new plan" -> Accept | "Leave Sala Bagatelka?" prompt. **Cancel**: nothing changes, Accept button back. |
| 10 | owner@ | Accept again -> **Leave and continue** | Lands in the new plan (only one new plan created across 9-10). Venue dialog shows Dworek pod Debem, pending. |
| 11 | owner@ | open "Anna & Piotr" -> Venue button | Still Sala Bagatelka, **granted** (leaving a list doesn't unlink plans). |
| 12 | venue@ | bagatelka roster | owner@ (Anna) no longer listed. |
| 13 | signed out | `localhost:3000/venue/invite/seed-live-staff-invite` | Redirected to `bagatelka.localhost:3000/venue/invite/...` before anything else. "invites you to join the team". |
| 14 | new account | (continue 13) **Create account** on the venue host, confirm via Mailpit | Back on the invite, **Join the team** -> "You have joined", **Open the CRM** -> `/crm` works. |
| 15 | venue2@ | a fresh bagatelka **customer** invite (create as venue@) | "This account works for a venue, so it can't join another one as a couple". Token still unused. |
| 16 | any | `.../seed-expired-customer-invite`, `.../seed-claimed-customer-invite` | Invalid card, "Go to your weddings". |
| 17 | any | `.../seed-suspended-customer-invite` | Suspended card naming "Stodola pod Lasem", no action button. |
| 18 | solo@ | `bagatelka.localhost:3000/venue/invite/<live customer token>` | Redirected to the apex URL first. |
| 19 | owner@ | invite for a plan already linked to bagatelka ("Anna & Piotr") | Row says "Already linked to Sala Bagatelka"; Accept keeps it **granted**, token stays unused. |
| 20 | solo@ | pick a plan linked to another venue | "You are currently linked to X... clears the menu" warning under the picker. |
| 21 | any | repeat 1-3 at phone width (~375px), PL and EN | No horizontal scroll, no raw `venue_invite.*` keys. |
| 22 | any | PostHog debug / network tab on 1-3 | `tenant_invite_previewed {role}`, `wedding_created {source}`, `tenant_invite_claimed {role}`, `tenant_invite_accepted {wedding, switched_venue}`. No token, label or venue name in any payload. |

## Phase 3 - couple's Venue dialog

The Venue button is in the planner header, owner only. No step below should
show a text input for a venue address.

| # | As | Do | Expect |
|---|---|---|---|
| 1 | owner@ | `/home` -> create a wedding -> **Venue** | "You're on the list of couples at Sala Bagatelka..." + **Link to Sala Bagatelka**. |
| 2 | owner@ | click it | Status step: "linked to Sala Bagatelka, and the venue still sees nothing" + grant button. |
| 3 | owner@ | "Anna & Piotr" -> Venue -> **Change venue** | "Sala Bagatelka is the venue on your account. To move this plan... open the invitation link". **Cancel** returns to the granted status, nothing changed. |
| 4 | viewer@ | `/home` -> create a wedding -> Venue | "Plans are linked to a venue by invitation..." - no input, no link button. |
| 5 | venue@ | `/home` -> create a wedding -> Venue | **Link to Sala Bagatelka** (venue staff planning their own wedding may link to their own venue). |
| 6 | owner@ | after Phase 2 step 10 (now a dworek customer): "Anna & Piotr" -> Venue -> Change venue | **Link to Dworek pod Debem** + "You are currently linked to Sala Bagatelka... clears the menu" warning. Clicking moves it to dworek, pending. (Destructive to the seed - `supabase db reset` after.) |
| 7 | owner@ | DevTools -> Network -> Offline, then open Venue on an unlinked plan | "Couldn't check which venue you're with" + **Try again** (not the "ask for an invitation" text). Back online -> Try again -> link button. |
| 8 | any | 1-4 on phone width (dialog renders as a drawer), PL and EN | No raw `venue.link.*` keys; Polish copy has no gendered forms. |

## Phase 4 - CRM roster

As venue@ on `bagatelka.localhost:3000/crm/roster` after a fresh `supabase db reset`.

| # | Do | Expect |
|---|---|---|
| 1 | Load the page | Unclaimed list: "Zielinscy, 14.06", "Wisniewscy, 30.08", "Nowa kelnerka" (each with role · valid until), the expired seed row **last** with "Invitation expired" and no copy button. |
| 2 | Accepted section | "Kowalska i Nowak" - "Couple · Accepted by Anna Kowalska on <date>". |
| 3 | Customer help text under the role select | "Send it to the person who created the couple's wedding plan...". |
| 4 | Type "Testowi, 01.09" in **Who is it for** -> Create invitation link | New row at the top led by "Testowi, 01.09"; the label field clears; role resets to Couple. |
| 5 | Create one with the label empty | Row led by "Couple" (role), no "·" prefix. |
| 6 | Try typing more than 80 characters into the label | Input stops at 80. |
| 7 | Copy step 4's link, accept it as solo@ (Phase 2 flow), reload the roster | Row moves from Unclaimed to Accepted: "Testowi, 01.09 - Couple · Accepted by Tomasz Zielinski on <today>". solo also appears in The list. |
| 8 | Remove solo from The list, reload | Accepted row now reads "Accepted on <date> - this person is no longer on your list" (no name). |
| 9 | As solo@, open step 4's link again | Invalid card - the preview never reveals the label. |
| 10 | PostHog / network on step 4 | `tenant_invite_created { role }` only - the label is not in the payload. |
| 11 | Sign in as a staff member (claim `seed-live-staff-invite` with a fresh account) | Role select collapses to "Couple"; label field still offered. |
| 12 | Phone width, PL and EN | No horizontal scroll; Polish copy uses the plural "Wy" form like the rest of the CRM. |

## Phase 5 - /venue copy and links

| # | Do | Expect |
|---|---|---|
| 1 | Signed out, open `bagatelka.localhost:3000/venue` | Under **Plan your wedding**: "Booked here? Sala Bagatelka will send you an invitation link...". PL: "Wesele w tej sali? Sala Bagatelka wyśle Ci link...". |
| 2 | Hover / click **Plan your wedding** | Goes to `http://localhost:3000/signup` (not `https://easywed.app`). |
| 3 | As owner@ (a bagatelka customer, not staff) open `bagatelka.localhost:3000/crm` | 403 card; its button goes to `http://localhost:3000/home`. |
| 4 | Hard-reload `bagatelka.localhost:3000/venue` with the console open | No hydration mismatch warning. |
| 5 | Read `docs/current-state.md` §6 and §11 | Matches what Phases 2-4 do (spot-check against the steps above). |

## Suspended venue by hand (optional)

```bash
psql postgresql://postgres:postgres@127.0.0.1:54322/postgres \
  -c "update tenants set status='suspended' where slug='bagatelka'"
# open any live bagatelka invite -> suspended card; Join/Accept impossible
#
# Race variant (staff Join error interpolation): open seed-live-staff-invite on
# bagatelka.localhost signed in, run the suspend above *before* clicking
# "Join the team" -> inline error reads "Sala Bagatelka is not accepting new
# invitations...", with the name, not "{{name}}".
psql postgresql://postgres:postgres@127.0.0.1:54322/postgres \
  -c "update tenants set status='active' where slug='bagatelka'"
```
