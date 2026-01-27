import { createServerClient } from "@supabase/ssr"
import { createClient } from "@supabase/supabase-js"
import { cookies } from "next/headers"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  console.log("[v0] Auth callback triggered")
  const { searchParams, origin } = new URL(request.url)

  const error = searchParams.get("error")
  const errorCode = searchParams.get("error_code")
  const errorDescription = searchParams.get("error_description")

  if (error) {
    console.error("[v0] Supabase error in callback:", {
      error,
      errorCode,
      errorDescription,
    })
    return NextResponse.redirect(`${origin}/member-login?error=${encodeURIComponent(errorDescription || error)}`)
  }

  const code = searchParams.get("code")
  const next = searchParams.get("next") ?? "/member-login"

  console.log("[v0] Code from URL:", code)
  console.log("[v0] Next redirect:", next)

  if (code) {
    const cookieStore = await cookies()
    const response = NextResponse.redirect(`${origin}${next}?verified=true`)

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, options)
            })
          },
        },
      },
    )

    console.log("[v0] Attempting to exchange code for session...")
    const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

    if (exchangeError) {
      console.error("[v0] Error exchanging code:", exchangeError)
      return NextResponse.redirect(`${origin}/member-login?error=${encodeURIComponent(exchangeError.message)}`)
    }

    console.log("[v0] Code exchange successful, user:", data.user?.id)
    console.log("[v0] User email:", data.user?.email)
    console.log("[v0] User email_confirmed_at:", data.user?.email_confirmed_at)

    if (data.user) {
      console.log("[v0] Updating user profile email_confirmed for user:", data.user.id)

      const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
          },
        },
      )

      console.log("[v0] Updating email_confirmed to true...")
      const { data: updateData, error: updateProfileError } = await supabaseAdmin
        .from("user_profiles")
        .update({ email_confirmed: true })
        .eq("user_id", data.user.id)
        .select()

      console.log("[v0] Update result:", updateData)
      console.log("[v0] Update error:", updateProfileError)

      if (updateProfileError) {
        console.error("[v0] Error updating profile:", updateProfileError)
      } else {
        console.log("[v0] User profile updated successfully")
      }
    }

    console.log("[v0] Redirecting to:", `${origin}${next}`)
    return response
  }

  console.log("[v0] No code found in URL, redirecting to admin")
  return NextResponse.redirect(`${origin}/member-login?error=no_code`)
}
