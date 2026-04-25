import { createClient } from "jsr:@supabase/supabase-js@2"

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? ""
const OPERATOR_EMAIL = Deno.env.get("OPERATOR_EMAIL") ?? ""
const APP_URL = Deno.env.get("APP_URL") ?? "https://easywed.app"

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 })
  }

  const body = (await req.json()) as {
    designHash?: string
    contactEmail?: string
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  )

  // Fetch the most recent order from this email to include details
  const { data: order } = await supabase
    .from("invitation_orders")
    .select("*")
    .eq("contact_email", body.contactEmail ?? "")
    .order("created_at", { ascending: false })
    .limit(1)
    .single()

  const designUrl = body.designHash
    ? `${APP_URL}/invitations#${body.designHash}`
    : null

  const emailBody = `
Nowe zamówienie zaproszeń

Imię: ${order?.contact_name ?? "—"}
Email: ${order?.contact_email ?? "—"}
Telefon: ${order?.contact_phone ?? "—"}
Ilość: ${order?.quantity ?? "—"}
Uwagi: ${order?.notes ?? "—"}

${designUrl ? `Podgląd projektu: ${designUrl}` : ""}

Status zamówienia: ${order?.status ?? "new"}
ID zamówienia: ${order?.id ?? "—"}
Data złożenia: ${order?.created_at ? new Date(order.created_at).toLocaleString("pl-PL") : "—"}
  `.trim()

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "EasyWed <noreply@easywed.app>",
      to: [OPERATOR_EMAIL],
      subject: `Nowe zamówienie zaproszeń — ${order?.contact_name ?? "nieznany"}, ${order?.quantity ?? "?"} szt.`,
      text: emailBody,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    console.error("[notify-invitation-order] Resend error:", err)
    return new Response(JSON.stringify({ error: "Email send failed" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  })
})
