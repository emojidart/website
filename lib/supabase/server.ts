import { createClient } from "@supabase/supabase-js"

// This service-role client is server-only and must not mix in user session cookies.
// Every caller must enforce access permissions before exposing protected data.
export const createServerClient = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )
