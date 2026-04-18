import { createClient } from "@supabase/supabase-js"
import type { Database } from "./supabase.types"

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_KEY

if (!url || !key) {
  throw new Error(
    "Missing VITE_SUPABASE_URL or VITE_SUPABASE_KEY. Check .env.local."
  )
}

export const supabase = createClient<Database>(url, key)
