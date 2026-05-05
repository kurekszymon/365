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

| Email | Password | Will become |
|---|---|---|
| `couple@test.com` | `test1234` | Couple |
| `planner@test.com` | `test1234` | Planner |
| `venue@test.com` | `test1234` | Venue |

The `handle_new_user` trigger auto-creates a `profiles` row with `user_type = null` for each one.

Alternatively, create them via the CLI:

```bash
supabase auth admin create-user --email couple@test.com --password test1234 --email-confirm
supabase auth admin create-user --email planner@test.com --password test1234 --email-confirm
supabase auth admin create-user --email venue@test.com --password test1234 --email-confirm
```

---

## 3. Scenario A — Onboarding flow (all users)

Sign in as any of the three users. Since `profiles.user_type` is `null`, the app redirects to `/onboarding`.

1. Sign in at http://localhost:3000/login as `couple@test.com`.
2. ✅ You should land on `/onboarding` instead of `/`.
3. Select **"We're a couple"** and click Continue.
4. ✅ You should land on `/` (no wedding yet → shows create prompt).
5. Repeat for `planner@test.com` → select "Wedding planner" → lands on `/upgrade` → click "Continue for free" → lands on `/` (multi-wedding list).
6. Repeat for `venue@test.com` → select "Venue provider" → lands on `/upgrade` → click "Continue for free" → lands on `/venue/templates`.

To reset any user back to pre-onboarding, clear `user_type` via Studio:

```sql
-- Studio → SQL editor
UPDATE public.profiles SET user_type = null WHERE id = '<user-uuid>';
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

### B3. Members button is hidden

- While in the planner as the wedding owner, check the header.
- ✅ The **UserPlus / Members** button is **not visible**, even though this user is the owner.

### B4. Multiple weddings edge case

To test the fallback list view, manually insert a second wedding via Studio:

```sql
-- Studio → SQL editor
INSERT INTO public.weddings (owner_id, name)
VALUES (
  (SELECT id FROM auth.users WHERE email = 'couple@test.com'),
  'Second wedding'
);
-- The trigger will auto-insert the owner into wedding_members.
```

- Reload `/`.
- ✅ Landing page shows "You have multiple weddings. Choose one or delete extras." with both listed.
- Delete one via the **Delete** button.
- ✅ Only one remains; refresh auto-redirects.

---

## 5. Scenario C — Venue flow

Signed in as `venue@test.com` (user_type = 'venue').

### C1. Landing redirects to template library

- Visiting `/` should immediately redirect to `/venue/templates`.
- ✅ Template library page loads (empty).

### C2. Create a template

- Click **New template**.
- Fill in: Name = "Grand Ballroom", Width = 25, Height = 15, Shape = Rectangle, Visibility = Public.
- Click **Create**.
- ✅ Template appears in the list showing "0 tables · Public".

### C3. Verify in the DB

```sql
-- Studio → SQL editor
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
6. Click **Apply preset** → confirmation dialog appears.
7. Confirm.
8. ✅ Hall dimensions update to 25 × 15 m and the hall preset switches to "Rectangle".

---

## 7. Scenario E — Planner creates a wedding for a couple

Signed in as `planner@test.com` (user_type = 'planner').

### E1. Create a wedding on behalf of a couple

- Click **Create** on the landing page.
- Name it "Smith & Jones Wedding", submit.
- ✅ Lands on the planner. The **Members button is visible** (planner is owner, not couple).

### E2. Invite the couple as editor

- Click the **UserPlus** button to open the Members dialog.
- Role = **Editor**, click **Create invite link**, copy the link.
- Paste it in a new incognito window and sign in as `couple@test.com`.
- ✅ Couple joins the wedding as editor.

Now `couple@test.com` has **two** weddings (their own from Scenario B + this one). The landing page shows the "multiple weddings" view.

### E3. Transfer ownership to the couple

- Back as `planner@test.com` in the Members dialog, the couple's row now shows a **Transfer** (share icon) button.
- Click it → confirmation dialog: "This person already has a wedding. They'll receive this one as an additional wedding. Continue?"
- ✅ Click **Transfer ownership**.

Verify in Studio:

```sql
SELECT wm.user_id, wm.role, u.email, w.owner_id
FROM public.wedding_members wm
JOIN auth.users u ON u.id = wm.user_id
JOIN public.weddings w ON w.id = wm.wedding_id
WHERE w.name = 'Smith & Jones Wedding';
```

Expected: couple is now `owner`, planner is `editor`.

- ✅ As `couple@test.com`, the Members button is **not visible** even though they are now the owner.

---

## 8. Scenario F — Upgrade stub

- Sign out.
- Sign up a brand-new user (e.g. `newvenue@test.com`).
- On `/onboarding`, select **Venue provider**, click Continue.
- ✅ Lands on `/upgrade` showing "Payments aren't set up yet — you're in for free during beta."
- Click **Continue for free**.
- ✅ Lands on `/venue/templates`.
- Verify `profiles` row was set:

```sql
SELECT id, user_type FROM public.profiles
WHERE id = (SELECT id FROM auth.users WHERE email = 'newvenue@test.com');
```

---

## 9. Reverting to remote

When done, restore `.env.local`:

```dotenv
VITE_SUPABASE_URL=https://iteuwqbqrulwdwyjohtx.supabase.co
VITE_SUPABASE_KEY=sb_publishable_jWsYCYTABN6655rKYR4pCg_KPYDdcaK

# VITE_SUPABASE_KEY=sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH
# VITE_SUPABASE_URL=http://127.0.0.1:54321
```
