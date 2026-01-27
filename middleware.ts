import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { createServerClient } from "@supabase/ssr"

const PUBLIC_PATHS = [
  "/member-login",
  "/member-account-request",
  "/member-set-password",
  "/auth/callback",
]

// Diese Pfade/Dateien darf die Middleware NIE anfassen/umleiten:
const PUBLIC_FILES = [
  "/manifest.json",
  "/site.webmanifest",
  "/robots.txt",
  "/sitemap.xml",
]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // ✅ NIE API blocken
  if (pathname.startsWith("/api")) return NextResponse.next()

  // ✅ NIE Public-Files blocken
  if (PUBLIC_FILES.includes(pathname)) return NextResponse.next()

  // ✅ NIE Next internals / static assets blocken
  if (
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico" ||
    pathname.match(/\.(svg|png|jpg|jpeg|gif|webp|css|js|map|ico|txt|xml|json)$/)
  ) {
    return NextResponse.next()
  }

  // ✅ Public pages allowed
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    // optional: session refreshen
    let response = NextResponse.next()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get: (name) => request.cookies.get(name)?.value,
          set: (name, value, options) => response.cookies.set({ name, value, ...options }),
          remove: (name, options) => response.cookies.set({ name, value: "", ...options, maxAge: 0 }),
        },
      }
    )
    await supabase.auth.getUser()
    return response
  }

  // 🔒 Protected pages: require session
  let response = NextResponse.next()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name) => request.cookies.get(name)?.value,
        set: (name, value, options) => response.cookies.set({ name, value, ...options }),
        remove: (name, options) => response.cookies.set({ name, value: "", ...options, maxAge: 0 }),
      },
    }
  )

  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    const url = request.nextUrl.clone()
    url.pathname = "/member-login"
    return NextResponse.redirect(url)
  }

  await supabase.auth.getUser()
  return response
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
