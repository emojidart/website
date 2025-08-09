import { createServerClient, createBrowserClient } from "@supabase/ssr"
import type { ReadonlyRequestCookies } from "next/dist/server/web/spec-extension/adapters/request-cookies"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables")
}

// Client-side Supabase client
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Verwenden Sie cookieOptions, um Supabase anzuweisen, die Sitzung in Cookies zu speichern.
    // Dies handhabt die Logik für das Setzen/Lesen/Entfernen von Cookies intern und korrekt.
    cookieOptions: {
      name: "sb-session", // Ein generischer Name für das Sitzungscookie
      lifetime: 60 * 60 * 8, // 8 Stunden Lebensdauer
      maxAge: 60 * 60 * 8, // 8 Stunden maximale Lebensdauer
      path: "/", // Cookie ist für die gesamte Anwendung verfügbar
      sameSite: "lax", // Schutz vor CSRF-Angriffen
      secure: process.env.NODE_ENV === "production", // Nur HTTPS in Produktion
    },
  },
})

// Server-side Supabase client creator for Server Components/Actions
export function createServerSupabaseClient(cookies: ReadonlyRequestCookies) {
  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookies.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookies.set(name, value, options))
        } catch {
          // The `setAll` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing
          // user sessions.
        }
      },
    },
  })
}
