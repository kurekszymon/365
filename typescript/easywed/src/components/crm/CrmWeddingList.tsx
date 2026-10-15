import { useEffect, useState } from "react"
import { Link } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"
import { supabase } from "@/lib/supabase"

type Row = { id: string; name: string; date: string | null }

/**
 * The weddings this venue can actually open.
 *
 * No `venue_access` filter in the query, and that is deliberate rather than an
 * oversight: RLS already answers it. `wedding_role()` derives 'venue' only for
 * a wedding whose access is 'granted', and the SELECT policy admits only that
 * role - so a pending or revoked wedding is not filtered out of this list, it
 * is invisible to the query. Adding a client-side filter would suggest the
 * client is what keeps it out.
 *
 * That is also what makes the list honest about the one thing venue staff
 * reliably get wrong: there is no way to switch access on from this side. A
 * pending request simply does not appear until the couple answers it.
 */
export const CrmWeddingList = ({ tenantId }: { tenantId: string }) => {
  const { t, i18n } = useTranslation()
  const [rows, setRows] = useState<Array<Row> | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const ctrl = new AbortController()

    void supabase
      .from("weddings")
      .select("id, name, date")
      .eq("tenant_id", tenantId)
      .order("date")
      .abortSignal(ctrl.signal)
      .then(({ data, error }) => {
        if (ctrl.signal.aborted) return
        if (error) {
          console.error("[crm] wedding list failed", error)
          setFailed(true)
          return
        }
        setRows(data)
      })

    return () => ctrl.abort()
  }, [tenantId])

  if (failed) {
    return (
      <p className="text-sm text-destructive">{t("crm.weddings.failed")}</p>
    )
  }

  if (rows === null) {
    return <p className="text-sm text-muted-foreground">{t("crm.loading")}</p>
  }

  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">{t("crm.weddings.empty")}</p>
    )
  }

  return (
    <ul className="flex flex-col gap-2">
      {rows.map((row) => (
        <li
          key={row.id}
          className="flex flex-wrap items-center justify-between gap-2 rounded-md border px-4 py-3"
        >
          <div className="flex min-w-0 flex-col">
            <span className="truncate font-medium">{row.name}</span>
            <span className="text-sm text-muted-foreground">
              {row.date
                ? new Date(row.date).toLocaleDateString(i18n.language)
                : t("crm.weddings.no_date")}
            </span>
          </div>
          <Link
            to="/crm/wedding/$id"
            params={{ id: row.id }}
            className="text-sm underline underline-offset-4"
          >
            {t("crm.weddings.open")}
          </Link>
        </li>
      ))}
    </ul>
  )
}
