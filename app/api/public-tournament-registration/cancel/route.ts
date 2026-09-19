import { createHash } from "crypto"
import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

function hash(v:string){ return createHash("sha256").update(v).digest("hex") }
function client(){ return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth:{persistSession:false,autoRefreshToken:false} }) }

export async function POST(request:Request){
  const body = await request.json().catch(()=>null)
  const token = String(body?.token || "").trim()
  if(!token) return NextResponse.json({error:"Abmeldelink ungültig."},{status:400})
  const supabase=client()
  const {data:reg}=await supabase.from("public_event_registrations").select("id,event_id,status").eq("cancellation_token_hash",hash(token)).maybeSingle()
  if(!reg) return NextResponse.json({error:"Abmeldelink ungültig oder nicht mehr verfügbar."},{status:404})
  if(reg.status === "cancelled") return NextResponse.json({ok:true,alreadyCancelled:true})
  const {error}=await supabase.from("public_event_registrations").update({status:"cancelled",cancelled_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq("id",reg.id)
  if(error) return NextResponse.json({error:"Abmeldung konnte nicht gespeichert werden."},{status:500})
  return NextResponse.json({ok:true})
}
