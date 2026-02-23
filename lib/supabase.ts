import { createBrowserClient, createServerClient } from "@supabase/ssr"
import type { ReadonlyRequestCookies } from "next/dist/server/web/spec-extension/adapters/request-cookies"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables")
}

/**
 * ============================
 * Browser Client (Client Components)
 * ============================
 */
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // In Hybrid/WebView Apps: Session in localStorage behalten
    persistSession: true,
    autoRefreshToken: true,

    // Für normale App-Logins brauchst du das meist NICHT.
    // (Invite/Recovery Links in der App sind selten)
    detectSessionInUrl: false,

    // optional, aber ok:
    flowType: "implicit",
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
