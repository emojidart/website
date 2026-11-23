"use server"

import { createClient } from "@supabase/supabase-js"

// Destructive account deletion requires a verified user session and superadmin rights.
// No service-role action is exposed to an unverified caller.
export async function deleteUserAccount(playerId: string, accessToken: string) {
  try {
    if (!playerId || !accessToken) return { success: false, error: "Nicht autorisiert" }
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !anonKey || !serviceKey) return { success: false, error: "Serverkonfiguration fehlt" }

    const verifier = createClient(url, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
    const { data: { user }, error: userError } = await verifier.auth.getUser(accessToken)
    if (userError || !user) return { success: false, error: "Nicht autorisiert" }

    const admin = createClient(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
    const { data: ownerRow, error: ownerError } = await admin
      .from("admin_superusers").select("user_id").eq("user_id", user.id).maybeSingle()
    if (ownerError || !ownerRow) return { success: false, error: "Nur Superadmins dürfen Accounts löschen" }

    const { data: profile, error: profileError } = await admin
      .from("user_profiles").select("user_id").eq("player_id", playerId).single()
    if (profileError || !profile?.user_id) return { success: false, error: "Benutzerprofil nicht gefunden" }

    const { data: protectedRow, error: protectedError } = await admin
      .from("admin_superusers").select("user_id").eq("user_id", profile.user_id).maybeSingle()
    if (protectedError || protectedRow) return { success: false, error: "Geschütztes Eigentümerkonto kann nicht gelöscht werden" }

    const { error: deleteError } = await admin.auth.admin.deleteUser(profile.user_id)
    if (deleteError) throw deleteError
    return { success: true }
  } catch (error) {
    console.error("Account deletion failed", error)
    return { success: false, error: "Account konnte nicht gelöscht werden" }
  }
}
