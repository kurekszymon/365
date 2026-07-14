// Edge Function: send / schedule / reschedule / cancel a reminder email via
// Resend. Runs in the Deno edge runtime so the RESEND_API_KEY never reaches the
// browser. Scheduling is delegated to Resend's `scheduledAt` (no pg_cron): we
// store the returned email id so we can reschedule or cancel it later.
//
// The caller's JWT is forwarded, so all DB reads/writes go through RLS — a
// non-member cannot touch another wedding's reminders, and only editors/owners
// can update the row (matching the reminders table policies).

import { createClient } from "npm:@supabase/supabase-js@2"
import { Resend } from "npm:resend@4.0.0"
import { renderAsync } from "npm:@react-email/components@0.0.22"
import * as React from "npm:react@18.3.1"
import { ReminderEmail } from "./_templates/reminder.tsx"
import type { ReminderLocale } from "./_templates/reminder.tsx"

type Action = "send" | "schedule" | "reschedule" | "cancel"

interface RequestBody {
  reminderId: string
  action: Action
  locale?: ReminderLocale
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  })

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")
const resend = new Resend(RESEND_API_KEY)
// Falls back to Resend's always-verified test sender so local setup works with
// no domain configured (matches README).
const FROM = Deno.env.get("RESEND_FROM") ?? "onboarding@resend.dev"

const subjectFor = (text: string, locale: ReminderLocale): string => {
  const firstLine = text.split("\n")[0].trim()
  const snippet =
    firstLine.length > 60 ? `${firstLine.slice(0, 57)}…` : firstLine
  const prefix = locale === "en" ? "Reminder" : "Przypomnienie"
  return snippet ? `${prefix}: ${snippet}` : prefix
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  if (!RESEND_API_KEY) {
    return json(
      { error: "Email service is not configured (RESEND_API_KEY is unset)" },
      500
    )
  }

  const authHeader = req.headers.get("Authorization")
  if (!authHeader) return json({ error: "Missing Authorization header" }, 401)

  let body: RequestBody
  try {
    body = (await req.json()) as RequestBody
  } catch {
    return json({ error: "Invalid JSON body" }, 400)
  }

  const { reminderId, action } = body
  const locale: ReminderLocale = body.locale === "en" ? "en" : "pl"
  if (!reminderId || !action) {
    return json({ error: "reminderId and action are required" }, 400)
  }

  // Client scoped to the caller's JWT — all reads/writes go through RLS.
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  )

  const { data: reminder, error: readError } = await supabase
    .from("reminders")
    .select("id, text, due, recipient_email, scheduled_email_id, email_status")
    .eq("id", reminderId)
    .single()

  if (readError || !reminder) {
    return json({ error: "Reminder not found or not accessible" }, 404)
  }

  const needsRecipient = action !== "cancel"
  if (needsRecipient && !reminder.recipient_email) {
    return json({ error: "Reminder has no recipient email" }, 400)
  }
  if ((action === "schedule" || action === "reschedule") && !reminder.due) {
    return json({ error: "Reminder has no due date to schedule" }, 400)
  }

  const patch: Record<string, unknown> = {}

  try {
    if (action === "cancel") {
      if (reminder.scheduled_email_id) {
        const { error } = await resend.emails.cancel(reminder.scheduled_email_id)
        // Surface the failure instead of marking the reminder canceled while the
        // scheduled email is still live in Resend (would fire later).
        if (error) throw error
      }
      patch.email_status = "canceled"
      patch.scheduled_email_id = null
    } else if (action === "reschedule" && reminder.scheduled_email_id) {
      const { error } = await resend.emails.update({
        id: reminder.scheduled_email_id,
        scheduledAt: reminder.due!,
      })
      if (error) throw error
      patch.email_status = "scheduled"
    } else if (action === "schedule" || action === "reschedule") {
      // No existing scheduled email (or first-time schedule): create one.
      const { data, error } = await resend.emails.send({
        from: FROM,
        to: reminder.recipient_email!,
        subject: subjectFor(reminder.text, locale),
        html: await renderAsync(
          React.createElement(ReminderEmail, {
            text: reminder.text,
            due: reminder.due,
            locale,
          })
        ),
        scheduledAt: reminder.due!,
      })
      if (error) throw error
      patch.scheduled_email_id = data?.id ?? null
      patch.email_status = "scheduled"
    } else {
      // action === "send": deliver now; drop any pending scheduled copy first.
      // Fail if the cancel doesn't succeed — otherwise the scheduled copy could
      // still fire later and the recipient gets the reminder twice.
      if (reminder.scheduled_email_id) {
        const { error } = await resend.emails.cancel(reminder.scheduled_email_id)
        if (error) throw error
      }
      const { data, error } = await resend.emails.send({
        from: FROM,
        to: reminder.recipient_email!,
        subject: subjectFor(reminder.text, locale),
        html: await renderAsync(
          React.createElement(ReminderEmail, {
            text: reminder.text,
            due: reminder.due,
            locale,
          })
        ),
      })
      if (error) throw error
      patch.email_status = "sent"
      patch.sent_at = new Date().toISOString()
      patch.scheduled_email_id = null
      void data
    }
  } catch (err) {
    // Best-effort: mark the reminder as failed so the UI can surface it.
    await supabase
      .from("reminders")
      .update({ email_status: "failed" })
      .eq("id", reminderId)
    const message = err instanceof Error ? err.message : String(err)
    return json({ error: `Resend request failed: ${message}` }, 502)
  }

  const { data: updated, error: writeError } = await supabase
    .from("reminders")
    .update(patch)
    .eq("id", reminderId)
    .select("id, email_status, scheduled_email_id, sent_at")
    .single()

  if (writeError) {
    return json(
      { error: `Failed to persist status: ${writeError.message}` },
      500
    )
  }

  return json({ reminder: updated })
})
