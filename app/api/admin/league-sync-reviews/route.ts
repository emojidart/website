import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
export const runtime = "nodejs"
export const dynamic = "force-dynamic"

async function verifiedAdmin(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error("Supabase-Serverkonfiguration fehlt")
  const db = createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}})
  const auth = request.headers.get("authorization") || ""
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : ""
  if (!token) return null
  const {data:{user},error} = await db.auth.getUser(token)
  if (error || !user) return null
  const {data:profile,error:profileError} = await db.from("user_profiles").select("is_admin").eq("user_id",user.id).maybeSingle()
  if (profileError || !profile?.is_admin) return null
  return {db,user}
}
export async function GET(request:Request) {
 try {
  const admin = await verifiedAdmin(request)
  if (!admin) return NextResponse.json({error:"Keine Adminberechtigung"},{status:403})
  const {data,error} = await admin.db.from("sportdarts_sync_reviews").select("id,match_id,team_id,sportdarts_game_id,status,reason,details,created_at,reviewed_at").order("created_at",{ascending:false}).limit(250)
  if(error) throw error
  const ids = [...new Set((data||[]).flatMap(r=>[r.team_id]).filter(Boolean))]
  const {data:teams,error:teamError} = ids.length ? await admin.db.from("teams").select("id,name").in("id",ids) : {data:[],error:null}
  if(teamError) throw teamError
  // Resolve external Sportdarts numbers against the existing player registry.
  // Do not alter the original review details, lineup, or eligibility status.
  const numbers = [...new Set((data || []).flatMap((review: any) =>
    Array.isArray(review.details?.issues)
      ? review.details.issues.map((issue: any) => String(issue.sportdarts_player_number || "").trim())
      : []
  ).filter(Boolean))]
  const resolvedPlayers: Record<string, { name: string; player_id: string | null; sportdarts_name: string | null }> = {}
  if (numbers.length) {
    const { data: registry, error: registryError } = await admin.db
      .from("spieldatenbank")
      .select("id,sportdarts_player_number,sportdarts_name")
      .in("sportdarts_player_number", numbers)
    if (registryError) throw registryError
    const registryIds = (registry || []).map((r: any) => r.id)
    const { data: players, error: playerError } = registryIds.length
      ? await admin.db.from("club_players").select("id,name,spieldatenbank_id").in("spieldatenbank_id", registryIds)
      : { data: [], error: null }
    if (playerError) throw playerError
    const byRegistryId = new Map((players || []).map((p: any) => [p.spieldatenbank_id, p]))
    for (const entry of registry || []) {
      const player = byRegistryId.get(entry.id) as { id: string; name: string } | undefined
      const key = String(entry.sportdarts_player_number || "").trim()
      if (key) resolvedPlayers[key] = {
        name: player?.name || entry.sportdarts_name || `Spielernummer ${key}`,
        player_id: player?.id || null,
        sportdarts_name: entry.sportdarts_name || null,
      }
    }
  }
  return NextResponse.json({cases:data||[],teams:teams||[],resolvedPlayers})
 }catch(error:any){return NextResponse.json({error:error?.message||"Prüffälle konnten nicht geladen werden"},{status:500})}
}
export async function PATCH(request:Request) {
 try {
  const admin=await verifiedAdmin(request)
  if(!admin) return NextResponse.json({error:"Keine Adminberechtigung"},{status:403})
  const body=await request.json().catch(()=>({}))
  if(typeof body.id!=="string" || !["approved","rejected"].includes(body.status)) return NextResponse.json({error:"Ungültiger Fallstatus"},{status:400})
  const {data,error}=await admin.db.from("sportdarts_sync_reviews").update({status:body.status,reviewed_by:admin.user.id,reviewed_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq("id",body.id).eq("status","review_required").select("id,status").maybeSingle()
  if(error) throw error
  if(!data) return NextResponse.json({error:"Fall nicht mehr offen; bitte aktualisieren"},{status:409})
  return NextResponse.json({case:data})
 }catch(error:any){return NextResponse.json({error:error?.message||"Speichern fehlgeschlagen"},{status:500})}
}
