import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 🔒 Nur diese Bereiche sind geschützt:
  const PROTECTED_PREFIXES = ["/admin", "/member-dashboard"]

  const isProtected = PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"))

  // ✅ Alles andere ist öffentlich
  if (!isProtected) {
    return NextResponse.next()
  }

  // Ab hier: protected -> Session prüfen
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          // sync request cookie (for downstream)
          request.cookies.set({ name, value, ...options })

          // rebuild response so Next has updated request headers
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })

          // sync response cookie
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: any) {
          request.cookies.set({ name, value: "", ...options })

          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })

          response.cookies.set({ name, value: "", ...options })
        },
      },
    }
  )

  const {
    data: { session },
  } = await supabase.auth.getSession()

  // 🚪 Keine Session -> Login
  if (!session) {
    const url = request.nextUrl.clone()
    url.pathname = "/member-login"
    return NextResponse.redirect(url)
  }

  // Optional: refresh user (keeps cookies fresh)
  await supabase.auth.getUser()

  return response
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
}
