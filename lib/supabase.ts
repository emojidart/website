// lib/supabase.ts
import { createClient } from "@supabase/supabase-js"
import { createServerClient } from "@supabase/ssr"
import type { ReadonlyRequestCookies } from "next/dist/server/web/spec-extension/adapters/request-cookies"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables")
}

/**
 * ============================
 * ✅ Browser Client (Client Components)
 * - Wichtig für Capacitor: Session in localStorage persistieren (NICHT Cookie erzwingen)
 * ============================
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,

    // ✅ PKCE ist der aktuelle Standard (stabiler als "implicit")
    flowType: "pkce",

    // ✅ in WebView/Capacitor stabil
    storageKey: "emd-supabase-auth",
  },
})

/**
 * ============================
 * Server Client (Server Components / Actions)
 * ============================
 */
export function createServerSupabaseClient(cookies: ReadonlyRequestCookies) {
  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookies.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookies.set(name, value, options)
          })
        } catch {
          // Wird in Server Components ignoriert
        }
      },
    },
  })
}
