import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Kind = "member" | "guest";
type Vector = number[];
const MAX_DIST = 0.43;
const MIN_GAP = 0.08;
const limits = new Map<string, { n: number; reset: number }>();
function reply(error: string, status = 400) { return NextResponse.json({ error }, { status, headers: {"Cache-Control": "no-store"} }); }
function db() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw Error("Face ID: SUPABASE_SERVICE_ROLE_KEY fehlt in der Serverumgebung.");
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}
function validVector(value: unknown): value is Vector {
  return Array.isArray(value) && value.length === 128 && value.every(x => typeof x === "number" && Number.isFinite(x) && Math.abs(x) < 10);
}
function rateLimit(req: NextRequest, expensive = false) {
  const ip = req.headers.get("x-real-ip") || req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const key = `${ip}:${expensive ? "match" : "manage"}`;
  const now = Date.now(); const v = limits.get(key);
  if (!v || v.reset < now) { limits.set(key, {n: 1,reset: now + 60_000}); return false; }
  if (v.n >= (expensive ? 24 : 15)) return true;
  v.n++; return false;
}
async function verifyPerson(client: ReturnType<typeof db>, body: any) {
  const kind: Kind = body.identity_kind;
  if (!["member", "guest"].includes(kind) || typeof body.identity_id !== "string" || body.identity_id.length > 120) throw Error("Ungültiges Profil.");
  if (!["pin", "pattern"].includes(body.auth_method) || typeof body.secret !== "string") throw Error("PIN/Muster fehlt.");
  const {data,error} = await client.rpc("terminal_verify_identity", {p_identity_kind:kind,p_identity_id:body.identity_id,p_method:body.auth_method,p_secret:body.secret});
  if (error || !Array.isArray(data) || !data.some((r:any) => r.identity_id === body.identity_id && r.identity_kind === kind)) throw Error("PIN/Muster nicht bestätigt.");
  return { kind, id: body.identity_id as string };
}
export async function GET(req: NextRequest) {
  // Only public display metadata, NEVER face vectors; do not return player identifiers.
  if (rateLimit(req)) return reply("Zu viele Anfragen.",429);
  try {
    const {data,error}=await db().from("emd_face_profiles").select("identity_kind,identity_id,name,created_at").order("name");
    if(error) throw error;
    return NextResponse.json({faces:(data||[]).map(r=>({identity_kind:r.identity_kind,identity_id:r.identity_id,name:r.name,createdAt:r.created_at,vector:[]}))}, {headers:{"Cache-Control":"no-store"}});
  } catch { return reply("Face-ID-Datenbank nicht verfügbar.",503); }
}
export async function POST(req: NextRequest) {
  // Netlify can expose an internal req.nextUrl.host that differs from the public site.
  // Permit only exact HTTPS site origins from trusted deployment configuration / request host.
  const originHeader = req.headers.get("origin");
  if (originHeader) {
    let origin: URL;
    try { origin = new URL(originHeader); } catch { return reply("Nicht erlaubt.", 403); }
    const allowedHosts = new Set<string>();
    const addHost = (value?: string | null) => {
      if (!value) return;
      try { allowedHosts.add(new URL(value).host.toLowerCase()); }
      catch { /* Ignore malformed deployment configuration. */ }
    };
    addHost(process.env.URL);
    addHost(process.env.DEPLOY_PRIME_URL);
    addHost(process.env.NEXT_PUBLIC_SITE_URL);
    addHost(process.env.NEXT_PUBLIC_APP_URL);
    // For requests served under a custom domain, Netlify forwards the external host.
    const host = req.headers.get("host")?.toLowerCase();
    if (host) allowedHosts.add(host);
    const forwardedHost = req.headers.get("x-forwarded-host")?.toLowerCase();
    if (forwardedHost && host === forwardedHost) allowedHosts.add(forwardedHost);
    if (origin.protocol !== "https:" && !(process.env.NODE_ENV !== "production" && origin.protocol === "http:")) return reply("Nicht erlaubt.",403);
    if (!allowedHosts.has(origin.host.toLowerCase())) return reply("Nicht erlaubt.",403);
  }
  const body = await req.json().catch(()=>null);
  if (!body || typeof body.action !== "string") return reply("Ungültige Anfrage.");
  if(rateLimit(req,body.action === "match")) return reply("Zu viele Versuche.",429);
  try {
    const client=db();
    if(body.action === "match") {
      if(!validVector(body.vector)) return reply("Ungültiger Gesichtsabdruck.");
      const {data,error}=await client.from("emd_face_profiles").select("identity_kind,identity_id,name,player_id,spieldatenbank_id,photo_url,vector");
      if(error) throw error;
      const ranked=(data||[]).filter(x=>validVector(x.vector)).map(x=>({record:x,d:Math.sqrt(x.vector.reduce((sum:number,v:number,i:number)=>sum+(v-body.vector[i])**2,0))})).sort((a,b)=>a.d-b.d);
      const first=ranked[0], second=ranked[1];
      const profile=first && first.d<=MAX_DIST && (!second || second.d-first.d>=MIN_GAP) ? first.record : null;
      if(!profile) return NextResponse.json({match:null},{headers:{"Cache-Control":"no-store"}});
      const {vector: _vector,...safe}=profile;
      return NextResponse.json({match:safe, distance:first.d},{headers:{"Cache-Control":"no-store"}});
    }
    if(!["enroll","delete"].includes(body.action)) return reply("Aktion unbekannt.");
    const person=await verifyPerson(client,body);
    if(body.action === "delete") {
      const {error}=await client.from("emd_face_profiles").delete().eq("identity_kind",person.kind).eq("identity_id",person.id);
      if(error)throw error;
      return NextResponse.json({ok:true});
    }
    if(body.consent !== true || !validVector(body.vector) || typeof body.name!=="string" || !body.name.trim()) return reply("Einwilligung oder Aufnahme fehlt.");
    const {data:other,error:checkError}=await client.from("emd_face_profiles").select("identity_kind,identity_id,vector");
    if(checkError) throw checkError;
    const conflict=(other||[]).some(x=>validVector(x.vector)&&!(x.identity_kind===person.kind&&x.identity_id===person.id)&&Math.sqrt(x.vector.reduce((s:number,v:number,i:number)=>s+(v-body.vector[i])**2,0))<MAX_DIST);
    if(conflict)return reply("Dieses Gesicht ist bereits einem anderen EMD-Profil zugeordnet.",409);
    const {error}=await client.from("emd_face_profiles").upsert({identity_kind:person.kind,identity_id:person.id,name:body.name.trim().slice(0,60),player_id:body.player_id||null,spieldatenbank_id:body.spieldatenbank_id||null,photo_url:body.photo_url||null,vector:body.vector,consented_at:new Date().toISOString()},{onConflict:"identity_kind,identity_id"});
    if(error)throw error;
    return NextResponse.json({ok:true});
  } catch (err) { const msg=err instanceof Error?err.message:"Fehler";return reply(msg.startsWith("PIN/")?msg:"Face-ID-Aktion fehlgeschlagen.",msg.startsWith("PIN/")?403:503); }
}
