"use server"

import { createClient } from "@supabase/supabase-js"

export async function deleteUserAccount(playerId: string) {
  console.log("[v0] Server action: deleteUserAccount called for player:", playerId)

  try {
    // Create admin client with service role key
    const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    console.log("[v0] Finding user_profile for player_id:", playerId)

    // First, get the user_id from user_profiles
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("user_profiles")
      .select("user_id")
      .eq("player_id", playerId)
      .single()

    if (profileError) {
      console.log("[v0] Error finding profile:", profileError)
      throw new Error(`Profil nicht gefunden: ${profileError.message}`)
    }

    if (!profile) {
      throw new Error("Kein Benutzerprofil gefunden")
    }

    console.log("[v0] Found user_id:", profile.user_id)

    // Delete the auth user (this will cascade delete user_profiles due to foreign key)
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(profile.user_id)

    if (deleteError) {
      console.log("[v0] Error deleting auth user:", deleteError)
      throw new Error(`Fehler beim Löschen des Auth-Users: ${deleteError.message}`)
    }

    console.log("[v0] Successfully deleted auth user and profile")

    return { success: true }
  } catch (error: any) {
    console.log("[v0] Server action error:", error)
    return { success: false, error: error.message }
  }
}
