# EasyWed — Product Requirements Document (AI Generated Content for reference)

**Version:** 0.1
**Date:** 2026-03-21
**Status:** Draft

---

## 1. Product Overview

EasyWed is a mobile-first web application for organizing weddings. It serves two primary audiences: couples planning their own wedding and professional wedding planners managing multiple events. The app consolidates guest management, seating, RSVP tracking, and event photography into one place.

The product is built with a privacy-first mindset — guest data can be fully anonymized on the server, with the real name mapping stored only on the organizer's device.

---

## 2. Target Users

| Role             | Description                                                                                                                  |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| **Organizer**    | One of the couple, or a wedding planner. Creates and owns the wedding event. Has a full account.                             |
| **Co-organizer** | Second member of the couple (or a planner's assistant). Invited by organizer. Full access to the event.                      |
| **Guest**        | Invited via email/phone/QR. No account required. Accesses the app via a signed token link. Can optionally create an account. |

---

## 3. User Roles & Permissions

| Permission              | Organizer | Co-organizer | Guest              |
| ----------------------- | --------- | ------------ | ------------------ |
| Create/delete wedding   | ✅        | ❌           | ❌                 |
| Edit wedding details    | ✅        | ✅           | ❌                 |
| Invite guests           | ✅        | ✅           | ❌                 |
| Manage RSVPs            | ✅        | ✅           | Own only           |
| Table planner (edit)    | ✅        | ✅           | ❌                 |
| Table planner (view)    | ✅        | ✅           | If allowed         |
| Toggle anonymization    | ✅        | ✅           | ❌                 |
| Opt-in to anonymization | ❌        | ❌           | If allowed by org. |
| Upload photos           | ✅        | ✅           | Within time window |
| Curate photo album      | ✅        | ✅           | ❌                 |
| View photo album        | ✅        | ✅           | If allowed         |

---

## 4. Core Features

### 4.1 Wedding Management

- Organizer creates a wedding with: name, date, venue name, venue address (used for map display in RSVP).
- One account can hold **multiple weddings** (essential for planner use case).
- Organizer invites a co-organizer via email — they receive an invite and must create/log in to an account.
- Wedding has a status: `draft` | `active` | `completed` | `archived`.

### 4.2 Invitations

Organizer can invite guests via:

- **Email** — built-in sending via [Resend](https://resend.com). Organizer writes a custom invitation message (with default template). Email contains a unique signed token link.
- **Phone number** — sends an SMS (provider TBD, e.g. Twilio) with a short link.
- **QR code** — generates a QR that encodes the signed token link. Can be printed or shared digitally.

Each invitation link is unique per guest and expires after the event.
Organizer can resend invitations and revoke access.

### 4.3 RSVP

Guest opens the link — no account required. They fill out:

1. **Name** (pre-filled if organizer added it)
2. **Dietary restrictions** (text field + common tags: vegetarian, vegan, gluten-free, halal, kosher, none)
3. **Venue map acknowledgment** — a map (Google Maps embed or Mapbox) shows the venue location. Guest can tap to open navigation. Their location is never captured.
4. **RSVP status**: Attending / Not attending / Maybe

Additional optional fields (organizer can enable/disable per wedding):

- +1 / number of accompanying guests
- Song request
- Message to the couple

Guests can update or cancel RSVP at any time via their original link. Organizers can override any RSVP from the dashboard.

### 4.4 Guest List

Organizer dashboard shows a table of guests with:

- Name (or anonymized ID)
- RSVP status (Attending / Declined / Pending / Maybe)
- Dietary restrictions
- Table assignment
- Invitation status (Sent / Opened / Not sent)

Filterable and sortable. Exportable to CSV (non-anonymized only, with explicit organizer action).

### 4.5 Table Planner

Two views, togglable:

**Visual View**

- Drag-and-drop canvas.
- Organizer adds tables: round or rectangular, with configurable capacity.
- Named tables (e.g. "Table 1", "Family", "Friends").
- Drag guests from a sidebar onto seats.
- Zoom and pan support.
- Printable layout via browser print dialog (Ctrl+P / Save as PDF) — no external library needed, handles all languages correctly.

**List View**

- Compact table showing: Table name → assigned guests.
- Quick reassignment via dropdown.

**Export & Restore**

- **Print / PDF**: browser print dialog renders a clean print-only layout (works with all languages/Unicode). Organizer can save as PDF or print physically.
- **Export JSON**: downloads a `.easywed.json` file containing the full planner state (tables, guests, assignments, positions). Can be emailed, backed up, or version-controlled.
- **Import JSON**: upload a previously exported file to restore the full state — useful for resuming work across devices or sharing with a co-organizer.
- State also auto-persists to `localStorage` on every change.

**Guest "Find Your Seat" View** (organizer opt-in per wedding):

- A separate shareable link / QR for guests.
- Guest types their name (or scans a code) and sees their table assignment.
- If anonymization is on, guests see their nickname only.

### 4.6 Anonymization

Designed for organizers who want to minimize personal data stored on the server (e.g. GDPR minimization or personal preference).

**How it works:**

- Organizer enables anonymization per wedding.
- The server replaces guest names with sequential IDs (`G001`, `G002`, ...).
- The real name → ID mapping is stored **only in the organizer's browser** (localStorage) and **never sent to the server**.
- Organizer can assign a **nickname** per guest (e.g. "Uncle from Warsaw", "Best man") — nicknames are stored on the server and are used for "Find Your Seat" without revealing real names.
- The local mapping can be **exported as a PDF** (printable cheat sheet) from the browser before clearing.
- If the organizer allows it, individual guests can opt in to anonymization (their name is replaced server-side too).
- If the organizer loses their local mapping, it cannot be recovered — a clear warning is shown before enabling.

**What the server stores in anonymized mode:**

- Guest IDs (G001, G002, ...)
- Dietary restrictions (linked to ID, not name)
- RSVP status
- Nicknames (optional)
- Table assignment

### 4.7 Photo Bucket

Guests can upload photos taken during the wedding.

**Upload window:** From event start time until **event end time + 24 hours**. Configurable by organizer.

**Limits:**

- Default: **30 photos per guest** per event.
- Organizer can increase this per event (paid add-on if over the plan limit).
- File types: JPEG, PNG, HEIC, WebP. Max 20 MB per photo.

**Storage:**

- AWS S3 (EU region — `eu-central-1` for GDPR compliance).
- S3 lifecycle policy: auto-delete all event photos **30 days after the event date**.
- Organizers are warned 7 days before deletion and can download the full album.
- Photos are served via CloudFront CDN.

**GDPR:**

- Each photo is linked to the uploader's guest token.
- Guests can request deletion of their photos (right to erasure) — available in their RSVP view.
- Organizer can delete any photo.

### 4.8 Photo Album

- After the event, organizers curate a **Photo Album** by selecting photos from the bucket.
- Unselected photos remain in the bucket (still accessible) but are not in the album.
- Album can be made **public** (shareable link, no auth), **guests-only** (requires invitation token), or **private** (organizers only).
- Album is a paginated grid with lightbox view.
- Guests can mark their favorite photos.
- Organizer can download the full album as a ZIP.

---

## 5. Tech Stack

| Layer         | Technology                                               |
| ------------- | -------------------------------------------------------- |
| Frontend      | TanStack Start + React 19 + TypeScript                   |
| Routing       | TanStack Router (file-based, built into TanStack Start)  |
| Data fetching | TanStack Query                                           |
| UI            | shadcn/ui + Tailwind CSS v4                              |
| Backend / DB  | Supabase (Postgres, Auth, Edge Functions, Realtime)      |
| Email         | Resend                                                   |
| SMS           | Twilio (MVP: can be deferred post-launch)                |
| Photo storage | AWS S3 (eu-central-1) + CloudFront                       |
| Photo upload  | Direct-to-S3 presigned URLs (via Supabase Edge Function) |
| Payments      | Stripe                                                   |
| i18n          | i18next (Polish primary, English secondary)              |
| Maps          | Google Maps Embed API (venue display only, no tracking)  |
| Deployment    | Vercel (frontend) + Supabase cloud                       |

---

## 6. Data Model (High Level)

```
users
  id, email, full_name, created_at

weddings
  id, organizer_id, name, date, venue_name, venue_address, venue_lat, venue_lng,
  status, anonymization_enabled, photo_upload_window_hours,
  photo_limit_per_guest, album_visibility, created_at

wedding_members           -- organizer + co-organizer
  wedding_id, user_id, role (organizer | co-organizer)

guests
  id, wedding_id, display_name (nickname or G00X), real_name (null if anonymized),
  email, phone, rsvp_status, dietary_restrictions, plus_one_count,
  song_request, message, invite_token, invite_sent_at, invite_opened_at

tables
  id, wedding_id, name, shape (round | rectangular), capacity, position_x, position_y

table_seats
  id, table_id, guest_id, seat_number

photos
  id, wedding_id, guest_id, s3_key, file_size, uploaded_at, in_album,
  favorite_count, deleted_at

subscriptions
  id, user_id, stripe_subscription_id, plan (per_wedding | planner_monthly | planner_yearly),
  wedding_id (null for planner plans), status, current_period_end
```

---

## 7. Monetization

### Plans

| Plan                | Price         | Who                   |
| ------------------- | ------------- | --------------------- |
| **Free (Freemium)** | €0            | Anyone trying the app |
| **Per Wedding**     | ~€29 one-time | Couples               |
| **Planner Monthly** | ~€49/mo       | Wedding planners      |
| **Planner Yearly**  | ~€399/yr      | Wedding planners      |

### Free Tier Includes

- Table planner (visual + list) for 1 wedding
- Up to 20 tables, unlimited seats
- No guest invitations
- No RSVP collection
- No photos
- No email sending

### Per Wedding Includes

- Everything in Free
- Up to 150 guests
- Invitations (email + QR)
- RSVP collection
- Photo bucket (30 photos/guest, 30-day retention)
- Photo album
- Anonymization
- "Find Your Seat" guest view

### Planner Plans Include

- Everything in Per Wedding
- Unlimited weddings (active simultaneously: up to 10 monthly / unlimited yearly)
- Up to 300 guests per wedding
- Priority email support

### Add-ons (all plans except Free)

- Extra photo storage: +100 photos/guest block — €5 per wedding
- Extended photo retention: +30 days — €10 per wedding
- SMS invitations: €0.10/SMS (passed through at cost)

### Payments

- Stripe Checkout + Stripe Billing for subscriptions.
- Webhook-driven access control via Supabase.

---

## 8. MVP Scope

**Goal:** Shippable product in ~8 weeks.

### In MVP

- [x] Auth (email/password + magic link via Supabase)
- [x] Create wedding, invite co-organizer
- [x] Add guests manually + invite via email + QR code
- [x] RSVP flow (no account required)
- [x] Guest list dashboard
- [x] Table planner (visual + list view)
- [x] Basic anonymization
- [x] Photo bucket + album (S3)
- [x] Photo album curation + sharing
- [x] Polish + English i18n
- [x] Stripe payments (Per Wedding plan)
- [x] Free tier enforcement

### Deferred Post-MVP

- [ ] SMS invitations (Twilio)
- [ ] Planner subscription plan
- [ ] "Find Your Seat" guest QR at venue
- [ ] Song request / message to couple RSVP fields
- [ ] Photo favorite by guests
- [ ] ZIP download of album
- [ ] CSV export of guest list
- [ ] Extended retention add-on
- [ ] Push notifications / reminders

---

## 9. Non-Functional Requirements

**Mobile-first:** All flows must be fully usable on a 390px wide screen (iPhone 14 baseline). Desktop is secondary but supported.

**GDPR:**

- Data stored in EU (Supabase EU region + AWS eu-central-1).
- Guest right to erasure: guests can delete their RSVP data and photos via their token link.
- Organizer right to erasure: full event data deletion available.
- Privacy policy and cookie notice required at launch.
- Photos auto-deleted 30 days post-event (S3 lifecycle rule — not a manual process).
- Anonymization mode explicitly designed to reduce PII on server.

**Performance:**

- First Contentful Paint < 1.5s on mobile (4G).
- Photo uploads use direct-to-S3 presigned URLs — no proxying through server.
- Lazy load photo grid.

**Security:**

- Invitation tokens are signed JWTs (short-lived, scoped to wedding + guest).
- Row Level Security (RLS) enforced in Supabase for all tables.
- Organizer-level operations require active subscription check server-side.
- No guest PII logged in server logs.

---

## 10. Open Questions / Future Decisions

| #   | Question                                                   | Notes                                        |
| --- | ---------------------------------------------------------- | -------------------------------------------- |
| 1   | Map provider: Google Maps Embed vs Mapbox?                 | Google is simpler; Mapbox more GDPR-friendly |
| 2   | HEIC photo conversion server-side or client-side?          | AWS Lambda on upload trigger is cleanest     |
| 3   | What happens to photos if subscription lapses?             | Grace period (7 days) then deletion warning  |
| 4   | Should guests get a receipt/confirmation email after RSVP? | Nice UX, needs Resend template               |
| 5   | Co-organizer — should they be able to delete the wedding?  | Probably organizer-only                      |
| 6   | Anonymization — allow bulk export of mapping as PDF?       | Yes, from browser only, no server call       |
| 7   | Should QR codes be dynamic (revocable)?                    | Yes — token in DB, revoke by invalidating    |
