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
    /**
     * 🔑 DAS ist der entscheidende Fix:
     * - detectSessionInUrl: Supabase verarbeitet Recovery/Invite Links automatisch
     * - flowType: "implicit": verhindert PKCE code_verifier Fehler bei Reset-Links
     *
     * Sonst wird NICHTS geändert.
     */
    detectSessionInUrl: true,
    flowType: "implicit",

    persistSession: true,
    autoRefreshToken: true,

    // deine bestehende Cookie-Strategie bleibt erhalten
    cookieOptions: {
      name: "sb-session",
      lifetime: 60 * 60 * 8, // 8h
      maxAge: 60 * 60 * 8,
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    },
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
