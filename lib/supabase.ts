import { createBrowserClient, createServerClient } from "@supabase/ssr"
import type { ReadonlyRequestCookies } from "next/dist/server/web/spec-extension/adapters/request-cookies"
import { Preferences } from "@capacitor/preferences"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables")
}

// ✅ Capacitor Storage Adapter (statt localStorage)
const capacitorStorage = {
  async getItem(key: string) {
    const { value } = await Preferences.get({ key })
    return value ?? null
  },
  async setItem(key: string, value: string) {
    await Preferences.set({ key, value })
  },
  async removeItem(key: string) {
    await Preferences.remove({ key })
  },
}

/**
 * ============================
 * Browser Client (Client Components)
 * ============================
 */
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: capacitorStorage, // ✅ WICHTIGSTER FIX
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
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