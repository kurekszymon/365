# Venue invitations - manual test plan

Covers the stacked branches `easywed/invites-*`. Automated coverage lives in
`src/lib/sync/tenantInvitations.test.ts` (DB) and `src/lib/tenant/inviteOrigin.test.ts`.

## Stack

| # | Branch | Based on | Status |
|---|---|---|---|
| 1 | `easywed/invites-1-db` | `main` | committed |
| 2 | `easywed/invites-2-claim-page` | 1 | committed |
| 3 | `easywed/invites-3-couple-dialog` | 2 | ready to commit (below) |
| 4 | `easywed/invites-4-crm-roster` | 3 | planned: invite label, accepted history, expired last, help copy |
| 5 | `easywed/invites-5-docs` | 4 | planned: `current-state.md`, `/venue` copy |

### Phase 3 commit

```bash
git switch -c easywed/invites-3-couple-dialog
git add -A
git commit -F - <<'EOF'
easywed: venue dialog links to the couple's own venue, no slug field

- VenueLinkStep reads the account's venue membership and offers
  "Link to <venue>"; with open linking off that is the only venue
  link_wedding_to_venue accepts (one membership per account)
- no membership -> explain the invitation link instead of a dead-end
  input; "change venue" to the same venue -> point at the new venue's
  invitation, which handles the switch
- fetchMyVenueMembership distinguishes a failed read from "no venue", so
  a dropped request shows a retry rather than "ask for an invitation"
- i18n: drop slug keys, add member/no-invite/change copy (en + pl,
  gender-neutral Polish)
- docs/testing: Phase 3 manual steps

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
