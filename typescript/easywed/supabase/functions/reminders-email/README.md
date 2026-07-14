# `reminders-email` edge function

Sends, schedules, reschedules, or cancels a reminder email through
[Resend](https://resend.com). Invoked from the client via
`supabase.functions.invoke("reminders-email", { body: { reminderId, action, locale } })`.

`action` is one of `send | schedule | reschedule | cancel`. Scheduling is delegated to
Resend's `scheduledAt`; the returned email id is stored on `reminders.scheduled_email_id`
so we can later reschedule (`resend.emails.update`) or cancel (`resend.emails.cancel`).

The caller's JWT is forwarded, so all DB access runs under RLS — no service-role key.

## Required secrets

| Secret | Description |
| --- | --- |
| `RESEND_API_KEY` | Resend API key. |
| `RESEND_FROM` | Verified sender, e.g. `"Wesele <reminders@your-domain.com>"`. Falls back to `onboarding@resend.dev` (Resend test sender) if unset. |

`SUPABASE_URL` and `SUPABASE_ANON_KEY` are injected automatically by the edge runtime.

## Local development

```bash
# supabase/functions/.env  (gitignored)
echo 'RESEND_API_KEY=re_...' >> supabase/functions/.env
echo 'RESEND_FROM=onboarding@resend.dev' >> supabase/functions/.env

supabase functions serve reminders-email --env-file supabase/functions/.env
```

## Deploy

```bash
supabase secrets set RESEND_API_KEY=re_... RESEND_FROM="Wesele <reminders@your-domain.com>"
supabase functions deploy reminders-email
```
