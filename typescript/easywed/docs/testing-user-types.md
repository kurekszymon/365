# Testing the User Types Feature Locally

This guide walks through every scenario introduced by the user types feature (couple / venue / planner) using only the local Supabase instance. No remote changes needed.

---

## 1. Switch to local Supabase

In `.env.local`, comment out the remote keys and uncomment the local ones:

```dotenv
# remote — comment these out
# VITE_SUPABASE_URL=https://iteuwqbqrulwdwyjohtx.supabase.co
# VITE_SUPABASE_KEY=sb_publishable_jWsYCYTABN6655rKYR4pCg_KPYDdcaK

# local — uncomment these
VITE_SUPABASE_KEY=sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH
VITE_SUPABASE_URL=http://127.0.0.1:54321
```

Then make sure your local stack is running and migrations are applied:

```bash
supabase start        # if not already running
supabase db reset     # re-runs all migrations; wipes local data
bun dev               # http://localhost:3000
```

> **Remember to revert `.env.local` when you're done testing.**

---

## 2. Create test users

Easiest via **Supabase Studio** → http://127.0.0.1:54323 → **Authentication → Users → Add user**.

Create three users (email + password, auto-confirm enabled in local config):

| Email             | Password   | Will become |
| ----------------- | ---------- | ----------- |
| `couple@test.com` | `test1234` | Couple      |
| `planner@test.com`| `test1234` | Planner     |
| `venue@test.com`  | `test1234` | Venue       |

The `handle_new_user` trigger auto-creates a `profiles` row with `user_type = null` for each one.

Alternatively, create them via the CLI:

```bash
supabase auth admin create-user --email couple@test.com --password test1234 --email-confirm
supabase auth admin create-user --email planner@test.com --password test1234 --email-confirm
supabase auth admin create-user --email venue@test.com --password test1234 --email-confirm
```

---

## 3. Scenario A — Onboarding flow (all users)

All three roles flow `/onboarding` → `/upgrade` → `/`.

1. Sign in at http://localhost:3000/login as `couple@test.com`. Since `profiles.user_type` is `null`, the app redirects to `/onboarding`.
2. ✅ Lands on `/onboarding`.
3. Select **"We're a couple"** and click Continue.
4. ✅ Lands on `/upgrade` showing "You're all set" + a Confirm button.
5. Click **Confirm**. ✅ Lands on `/` (no wedding yet → shows create prompt).
6. Repeat for `planner@test.com` → select "Wedding planner" → lands on `/upgrade` showing "Beta access" → click **Start beta** → lands on `/` (multi-wedding list).
7. Repeat for `venue@test.com` → select "Venue provider" → lands on `/upgrade` showing "Beta access" → click **Start beta** → lands on `/` (multi-wedding list — same as planner).

To reset any user back to pre-onboarding, clear `user_type` and the active subscription via Studio (column-level revoke means the UPDATE has to be run as service-role / from Studio, not from the app):

```sql
-- Studio → SQL editor (service role bypass)
UPDATE public.profiles SET user_type = null WHERE id = '<user-uuid>';
DELETE FROM public.subscriptions WHERE user_id = '<user-uuid>';
```

---

## 4. Scenario B — Couple flow

Signed in as `couple@test.com` (user_type = 'couple').

### B1. No wedding yet

- Landing page shows "You don't have a wedding yet." with a single **Create your wedding** button.
- ✅ Only one Create button; no wedding list.

### B2. Create a wedding

- Click **Create your wedding**, fill in a name, submit.
- ✅ App auto-redirects directly to `/wedding/<id>` (the planner).
- Navigating back to `/` should redirect again — no list shown.
- ✅ The Create button on `/` disappears once the couple owns a wedding.

### B3. Members button is hidden

- While in the planner as the wedding owner, check the header.
- ✅ The **UserPlus / Members** button is **not visible**, even though this user is the owner.

### B4. Multiple weddings edge case

To test the fallback list view, manually insert a second wedding via Studio (the BEFORE INSERT trigger on `weddings` blocks couples with an existing wedding — the new `enforce_couple_one_wedding` trigger; insert through service-role with a **different** owner first, then transfer would also be blocked, so the only way to set this state up is to reset triggers temporarily — see Scenario H).

---

## 5. Scenario C — Venue flow

Signed in as `venue@test.com` (user_type = 'venue').

### C1. Landing shows multi-wedding list

- Visiting `/` shows the multi-wedding list (same UX as planner) — **not** `/venue/templates`.
- ✅ Templates are still managed under `/venue/templates`.

### C2. Create a template

- Navigate to `/venue/templates`.
- Click **New template**. Fill in: Name = "Grand Ballroom", Width = 25, Height = 15, Shape = Rectangle, Visibility = Public. Click **Create**.
- ✅ Template appears in the list showing "0 tables · Public".

### C3. Verify in the DB

```sql
SELECT id, name, hall_preset, width, height, is_public, creator_id
FROM public.hall_templates;
```

### C4. Delete a template

- Click the trash icon next to a template.
- ✅ Template disappears immediately (optimistic removal + DB delete).

---

## 6. Scenario D — Template picker (couple browses venue presets)

With the venue template created in Scenario C:

1. Sign in as `couple@test.com` and navigate to the planner.
2. If no hall is configured, click **+ Add / Configure → Configure Hall** in the header to open the hall panel.
3. ✅ At the top of the hall panel there is a **"Browse venue presets"** button.
4. Click it → Template Picker dialog opens.
5. ✅ The "Grand Ballroom" template created by the venue appears.
6. Click **Apply preset** → confirmation dialog appears, confirm.
7. ✅ Hall dimensions update to 25 × 15 m and the hall preset switches to "Rectangle".

---

## 7. Scenario E — Planner / Venue creates a wedding for a couple

Signed in as `planner@test.com` (user_type = 'planner'). Same flow works for `venue@test.com`.

### E1. Create a wedding on behalf of a couple

- Click **Create** on the landing page. Name it "Smith & Jones Wedding", submit.
- ✅ Lands on the planner. The **Members button is visible** (planner is owner, not couple).

### E2. Invite the couple as editor

- Click the **UserPlus** button to open the Members dialog.
- Role = **Editor**, click **Create invite link**, copy the link.
- Paste it in a new incognito window and sign in as `couple@test.com` (must have completed onboarding + upgrade first).
- ✅ Couple joins the wedding as editor.

### E3. Transfer ownership to a couple **without** a wedding

If `couple@test.com` does NOT already own a wedding:

- Back as `planner@test.com` in the Members dialog, the couple's row shows a **Transfer** (share icon) button.
- Click it → confirmation dialog: "Transfer ownership to this member? You'll become an editor."
- ✅ Click **Transfer ownership**. Roles flip: couple is now `owner`, planner is `editor`.
- ✅ As `couple@test.com`, the Members button is **not visible** even though they are the owner.

### E4. Transfer to a couple **with** a wedding is blocked

See Scenario J below.

---

## 8. Scenario F (safety) — Privilege escalation blocked

The `user_type` column has UPDATE revoked from `authenticated`, so users cannot self-promote.

As `couple@test.com` (or via PostgREST `PATCH /profiles?id=eq.<me>` body `{user_type:'venue'}` — same effect), in Studio's SQL editor switch role to authenticated:

```sql
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub = '<couple-uuid>';
UPDATE public.profiles SET user_type = 'venue' WHERE id = '<couple-uuid>';
```

Expect: `permission denied for column user_type`.

---

## 9. Scenario G (safety) — `set_user_type` is one-shot

After completing onboarding (so `user_type` is set), run:

```sql
SELECT public.set_user_type('venue');
```

Expect exception: `user_type already set or profile missing`.

---

## 10. Scenario H (safety) — Couple second-wedding blocked

Signed in as a couple who already owns a wedding. Try to insert a second one directly:

```sql
-- Studio → SQL editor (set role first to make this realistic)
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub = '<couple-uuid>';
INSERT INTO public.weddings (name, owner_id) VALUES ('Second', auth.uid());
```

Expect exception: `couple_already_owns_wedding`.

---

## 11. Scenario I (safety) — Insert without an active subscription is blocked

As a planner in Studio, expire the active subscription:

```sql
UPDATE public.subscriptions SET status = 'expired'
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'planner@test.com');
```

Then in the running app:

- Reload `/`. ✅ Route guard redirects to `/upgrade`.
- If you bypass the UI and try to INSERT a wedding via SQL with the same auth role, expect exception: `owner_no_active_subscription`.

Restore the sub when done:

```sql
UPDATE public.subscriptions SET status = 'active'
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'planner@test.com');
```

---

## 12. Scenario J (safety) — Transfer to couple-with-wedding blocked

Setup: planner owns Wedding A and has invited the couple as a member; the couple already owns their own Wedding B (from Scenario B).

- As `planner@test.com` in the Members dialog of Wedding A, click the **Transfer** icon next to the couple member.
- Confirm.
- ✅ UI surfaces a destructive toast/inline error: **"That couple already owns a wedding."**
- Roles do not change. Verify in Studio:

```sql
SELECT wm.user_id, wm.role, u.email, w.owner_id
FROM public.wedding_members wm
JOIN auth.users u ON u.id = wm.user_id
JOIN public.weddings w ON w.id = wm.wedding_id
WHERE w.name = 'Wedding A';
```

Expected: planner is still `owner`, couple is still `editor`.

---

## 13. Reverting to remote

When done, restore `.env.local`:

```dotenv
VITE_SUPABASE_URL=https://iteuwqbqrulwdwyjohtx.supabase.co
VITE_SUPABASE_KEY=sb_publishable_jWsYCYTABN6655rKYR4pCg_KPYDdcaK

# VITE_SUPABASE_KEY=sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH
# VITE_SUPABASE_URL=http://127.0.0.1:54321
```
