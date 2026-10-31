import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
const allowed = new Set(["wilhelmer.jimmy@gmail.com", "jimmy091286@gmail.com"])
const cache = new Map<string, Uint8Array>()
const inflight = new Map<string, Promise<Uint8Array>>() 
const fail = (message: string, status: number) => NextResponse.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } })

export async function POST(request: Request) {
  const token = request.headers.get("authorization")?.match(/^Bearer (.+)$/i)?.[1]
  if (!token) return fail("Anmeldung erforderlich", 401)
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const key = process.env.ELEVENLABS_API_KEY
  const voiceId = process.env.ELEVENLABS_MARCUS_VOICE_ID
  if (!url || !anon || !key || !voiceId) return fail("VOLT nicht eingerichtet", 503)
  const client = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } })
  const { data: { user }, error } = await client.auth.getUser(token)
  if (error || !user || !allowed.has((user.email || "").toLowerCase())) return fail("Nicht berechtigt", 403)
  const body = await request.json().catch(() => ({}))
  const text = typeof body.text === "string" ? body.text.trim() : ""
  if (!text || text.length > 350 || !/^((Zweiter|Letzter) Aufruf[!.]\s*)?Auf Automat Nummer /i.test(text)) return fail("Ungültige Ansage", 400)
  const cacheKey = `${voiceId}:${text}`
  let bytes = cache.get(cacheKey)
  if (!bytes) {
    let task = inflight.get(cacheKey)
    if (!task) {
      task = (async () => {
        const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}`, {
          method: "POST", headers: { "xi-api-key": key, "Content-Type": "application/json", "Accept": "audio/mpeg" },
          body: JSON.stringify({ text, model_id: "eleven_flash_v2_5", voice_settings: { stability: 0.7, similarity_boost: 0.8, speed: 0.85 } }),
          signal: AbortSignal.timeout(20000),
        })
        if (!response.ok) throw new Error(`VOLT HTTP ${response.status}`)
        const result = new Uint8Array(await response.arrayBuffer())
        if (!result.byteLength || result.byteLength > 5_000_000) throw new Error("Ungültige Audiodatei")
        if (cache.size >= 200) cache.delete(cache.keys().next().value!)
        cache.set(cacheKey, result)
        return result
      })().finally(() => inflight.delete(cacheKey))
      inflight.set(cacheKey, task)
    }
    try { bytes = await task } catch { return fail("VOLT gerade nicht erreichbar", 502) }
  }
  return new Response(Buffer.from(bytes), { headers: { "Content-Type": "audio/mpeg", "Cache-Control": "private, no-store" } })
}
