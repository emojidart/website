import { NextRequest, NextResponse } from "next/server"
import { checkPassword, configured, COOKIE, newToken } from "@/lib/face-labor-auth"
export const runtime = "nodejs"
export async function POST(req: NextRequest) {
  if (!configured()) return NextResponse.json({ error: "Testbereich noch nicht eingerichtet." }, { status: 503 })
  const origin = req.headers.get("origin")
  if (origin && new URL(origin).host !== req.nextUrl.host) return NextResponse.json({ error: "Nicht erlaubt." }, { status: 403 })
  const data = await req.json().catch(() => ({}))
  if (typeof data.password !== "string" || !checkPassword(data.password)) return NextResponse.json({ error: "Testpasswort ist nicht korrekt." }, { status: 401 })
  const response = NextResponse.json({ ok: true })
  response.cookies.set(COOKIE, newToken(), { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/", maxAge: 8*60*60 })
  return response
}
