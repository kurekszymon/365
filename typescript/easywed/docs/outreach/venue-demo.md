# Venue demo - prep and script

The demo is 15 minutes, on site, following the one-pager (`easywed-pilot-sale.html`). Each prospect's prep doubles as their pilot setup, so a demo that converts needs no second build.

---

## A. Once, before the first outreach

1. **Production schema is current.**
   - `supabase migration list --linked`
   - Every local migration, including `20261007000001_layout_presets`, must show a remote version.
   - If one is missing: `supabase db push`.
2. **Production frontend is current.**
   - `pnpm run deploy:pages` from main.
   - Check the footer/changelog shows 1.3.1 or later.
3. **Auth accepts venue hosts.**
   - Supabase dashboard → Authentication → URL Configuration.
   - Redirect URLs must contain `https://*.easywed.app/**`.
   - Without it, Google sign-in and password reset fail on a venue host.
4. **Know the subdomain recipe.**
   - Cloudflare → Workers & Pages → the easywed Pages project → Custom domains → add `<slug>.easywed.app`.
   - The zone is on Cloudflare, so the CNAME is created for you.
   - Wait for "Active" (SSL can take a few minutes).
   - Nothing resolves today; `dig +short <anything>.easywed.app` is empty.
5. **Set up your own demo venue**, so the CRM can be shown before a prospect's own one exists.
   - Sign up on easywed.app with a separate staff address, e.g. `szymon+venue@…`. An account can belong to only one venue.
   - Run the script:
     ```bash
     psql "$DB_URL" -v slug=sala-pokazowa -v name='Sala Pokazowa' \
       -v owner_email='szymon+venue@…' -f scripts/provision-venue.sql
     ```
   - `demo` is a reserved slug and will be refused.
   - Add `sala-pokazowa.easywed.app` as a Pages custom domain (step 4).
6. **Prepare the couple account.** Sign up a separate address for it, e.g. `szymon+para@…`.
7. **Prepare a guest list.**
   - Make `demo-goscie.xlsx` with about 120 rows: Polish names with diacritics, a table column, about 10 diets (wege, bezglutenowa, bez laktozy) and about 8 children.
   - The import is part of the demo.
8. **Pack the kit.**
   - Phone: logged into `<slug>.easywed.app/crm` as staff.
   - Laptop or tablet: logged into easywed.app as the couple. On a phone the canvas toolbar isn't mounted, so the couple's side is hard to show there.
   - Mobile hotspot: the venue's Wi-Fi is not your problem to rely on.
   - 5 printed one-pagers.

---

## B. Per prospect, 2-3 days before the visit

1. **Collect material.**
   - Floor plan: from their website, Instagram, or a phone call ("macie rzut sali? zdjęcie wystarczy").
   - Their menu: usually a PDF on their site.
2. **Set up their venue under their real slug,** e.g. `palacwiosna`.
   - Use a fresh staff account you control: `szymon+palacwiosna@…`.
   - Ownership moves to them at handover (section E).
   - Pass their colours and logo if their site makes them obvious; otherwise skip branding.
   - Branding is thin today: the logo replaces the name in the header, and `primary_color` only tints the name when there is no logo. `accent_color` is stored but shown nowhere, and the login page is unbranded.
     ```bash
     psql "$DB_URL" -v slug=palacwiosna -v name='Pałac Wiosna' \
       -v owner_email='szymon+palacwiosna@…' -v primary_color='#…' \
       -f scripts/provision-venue.sql
     ```
3. **Add the subdomain** `palacwiosna.easywed.app` (section A step 4). Open it and confirm the venue's landing renders with their name.
4. **Enter their menu** at `/crm/menus`: their real packages, courses, dishes and prices.
5. **Draw their hall.**
   - In the planner on easywed.app, signed in as the staff account, create a wedding named "Szablon - Pałac Wiosna".
   - Draw the room to scale: walls (custom shape if it isn't a rectangle), tables with real capacities, dance floor, bar, stage, entrance.
6. **Save it as a layout.** In the halls panel choose "Zapisz jako układ sali" and name it e.g. "Sala główna, 140 osób".
7. **Create a couple invite for the couple account.**
   - At `/crm/roster`, create a "Para młoda" invite link.
   - This is the real invite-only path, rehearsed once.
8. **Build the couple's wedding.** As the couple, on easywed.app:
   1. Open the invite link, choose "Zacznij nowy plan" and "Akceptuj i powiąż". This joins the venue's list and links the new plan in one step, landing in the planner with the "Sala weselna" dialog open.
   2. Rename the wedding, e.g. "Ania i Tomek", and date it next June.
   3. Choose "Zacznij od układu: Pałac Wiosna" and apply the layout.
   4. Import `demo-goscie.xlsx` and seat most guests, leaving about 10 unseated for the live drag.
   5. In the Menu tab, pick a package and dishes, then assign dishes to guests.
   6. Choose "Udostępnij plan sali" and confirm.
9. **Dry run.**
   - Do the full script below once, on the same devices and network, with a timer.
   - Print the kitchen report to check it fits their table count.

---

## C. The demo script (15 min)

| min | what | device | point to land |
|---|---|---|---|
| 0-1 | **Ask first:** "Jak dziś dostajecie plan stołów i diety?" Let them describe the Excel file and the emails. | - | Everything after this answers it |
| 1-5 | **The couple's side:** their own hall to scale, the Excel import, drag an unseated guest, hit a table's seat limit, a diet tag, the Menu tab with their dishes | laptop | "This is your room and your menu, already in it" |
| 5-6 | **The consent dialog** (Sala weselna → status) | laptop | "Imion gości nie dostajecie w ogóle - nie ma czego pilnować" |
| 6-11 | **The CRM:** wedding list → open the plan with "Gość 12" seats → diets and dishes summary → print the kitchen report → the menu editor → create an invite link | phone | "Piątek przed weselem: jeden wydruk zamiast trzech maili" |
| 11-12 | **A change from the couple:** they change a guest's dish → staff reload → the counts change | both | Say "po odświeżeniu", not "na żywo" |
| 12-15 | **The offer:** free for the 2027 season, in return for feedback and a reference. Ask for the floor plan, the menu, and one spring-2027 couple. Set a handover date. | - | Leave the one-pager |

**Do not claim:**
- Live updates
- Email invitations or notifications
- That they can edit their own branding
- A generated PDF file (it's the print dialog)
- Staff entering menu choices for a couple
- That the CRM shows the couple's chosen package or their set-menu picks: it counts per-guest plated dishes only
- That the invite link alone shares the plan: accepting it links the wedding, but the couple still confirms sharing separately
- That suspension or ending the pilot cuts staff access: it only hides the CRM screens
- Any other venue as a customer

**Likely questions:**

| Question | Answer |
|---|---|
| "Co z RODO?" | The section in the consent dialog, plus the privacy policy's venue section. Venues hold no names. |
| "A jak para nie chce?" | Then it doesn't share. The venue sees nothing, and the couple can still plan on the venue's layout. |
| "Ile to kosztuje po pilotażu?" | Set individually per venue, never per event (the `/pl/venues` pricing section). Don't quote a number on site. |
| "Czy obsługa może mieć swoje konta?" | Yes: a staff invite from `/crm/roster`, issued by the owner. |

---

## D. Right after the visit

- Same day: send a thank-you with a link to `<slug>.easywed.app`.
- Note what they asked for that doesn't exist yet. That list drives the roadmap, as the one-pager promises.
- If they said yes: collect the owner's email and the floor plan corrections. Schedule the handover within a week.

---

## E. Handover (pilot start)

1. **The owner signs up** on easywed.app with their own email.
2. **Transfer ownership** in psql:
   ```sql
   begin;
   delete from public.tenant_members
   where user_id = (select id from auth.users where email = 'szymon+palacwiosna@…');
   insert into public.tenant_members (tenant_id, user_id, role)
   select t.id, u.id, 'owner'
   from public.tenants t, auth.users u
   where t.slug = 'palacwiosna' and lower(u.email) = lower('owner@their-venue.pl');
   commit;
   ```
   - Keep yourself out of their roster unless they ask for support access.
   - If they do, they invite you as staff, so it's their decision.
3. **Show them `/crm/roster`** and have them invite their own staff.
4. **The first real couple:**
   - The venue creates a "Para młoda" invite and sends it however they already talk to couples (SMS, WhatsApp, email).
   - Walk the first couple through it by phone.
5. **The demo wedding:**
   - Archive or delete the template wedding.
   - Keep the layout; it's a snapshot and doesn't depend on that wedding.
