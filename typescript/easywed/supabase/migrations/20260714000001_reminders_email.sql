-- Reminder email delivery: give reminders an optional recipient + track the
-- state of the email we hand to Resend (immediately or scheduled at `due`).
-- No pg_cron here: scheduling is delegated to Resend's `scheduledAt`, and we
-- keep the returned email id so the edge function can reschedule/cancel it.

alter table public.reminders
  add column recipient_email text,
  add column email_status text not null default 'none'
    check (email_status in ('none', 'scheduled', 'sent', 'failed', 'canceled')),
  add column scheduled_email_id text,
  add column sent_at timestamptz;

-- Recipient hints for the reminder form. Members are bare auth.users references
-- (no profiles table), so a security-definer function is the only way for the
-- client to see co-members' emails — gated on membership so it can't be used to
-- enumerate arbitrary users' emails.
create function public.wedding_member_emails(_wedding_id uuid)
returns table (user_id uuid, email text, role text)
language sql
security definer
set search_path = public
stable
as $$
  select wm.user_id, au.email::text, wm.role
  from public.wedding_members wm
  join auth.users au on au.id = wm.user_id
  where wm.wedding_id = _wedding_id
    and public.is_wedding_member(_wedding_id);
$$;

revoke all on function public.wedding_member_emails(uuid) from public;
grant execute on function public.wedding_member_emails(uuid) to authenticated;
