"use server"

import { createClient } from "@supabase/supabase-js"

export async function confirmUser(userId: string) {
  console.log("[v0] confirmUser called with userId:", userId)
  console.log("[v0] SUPABASE_SERVICE_ROLE_KEY exists:", !!process.env.SUPABASE_SERVICE_ROLE_KEY)

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error("[v0] SUPABASE_SERVICE_ROLE_KEY is missing!")
    return { success: false, error: "SUPABASE_SERVICE_ROLE_KEY is missing in environment variables" }
  }

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  console.log("[v0] Calling supabase.auth.admin.updateUserById...")
  const { data, error } = await supabase.auth.admin.updateUserById(userId, {
    email_confirm: true,
  })

  if (error) {
    console.error("[v0] Supabase error:", error)
    return {
      success: false,
      error: `Supabase error: ${error.message}`,
      errorCode: error.code,
      errorStatus: error.status,
      fullError: JSON.stringify(error),
    }
  }

  console.log("[v0] User confirmed successfully in auth.users")

  console.log("[v0] ===== NOW UPDATING USER_PROFILES =====")
  console.log("[v0] Updating email_confirmed for user_id:", userId)

  const { data: profileData, error: profileError } = await supabase
    .from("user_profiles")
    .update({ email_confirmed: true })
    .eq("user_id", userId)
    .select()

  if (profileError) {
    console.error("[v0] ERROR updating user_profiles:", profileError)
    return {
      success: false,
      error: `Error updating user_profiles: ${profileError.message}`,
    }
  }

  console.log("[v0] ===== USER_PROFILES UPDATED SUCCESSFULLY =====")
  console.log("[v0] Updated profile data:", profileData)

  return { success: true, data }
}
