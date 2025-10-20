"use server"

import { createClient } from "@supabase/supabase-js"

export async function listAuthUsers() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      return {
        success: false,
        error: "Supabase configuration missing",
        users: [],
      }
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    const { data, error } = await supabaseAdmin.auth.admin.listUsers()

    if (error) {
      console.error("[v0] Error listing users:", error)
      return {
        success: false,
        error: error.message,
        users: [],
      }
    }

    return {
      success: true,
      users: data.users,
    }
  } catch (error: any) {
    console.error("[v0] Error in listAuthUsers:", error)
    return {
      success: false,
      error: error.message,
      users: [],
    }
  }
}
