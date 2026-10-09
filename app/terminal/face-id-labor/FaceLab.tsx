"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { createBrowserClient } from "@supabase/ssr"
import { ArrowLeft, Camera, CheckCircle2, Trash2 } from "lucide-react"
import TerminalIdentityAuth, { type TerminalIdentity, type VerifiedTerminalIdentity } from "@/app/terminal/_components/TerminalIdentityAuth"

const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
type Profile = {identity_kind: "member"|"guest"; identity_id: string; name: string}
type Context = { name: string; playerId: string|null; kind: "member"|"guest"; at: number }
async function call(body: Record<string, unknown>) {
  const res = await fetch("/api/face-id", {method:"POST", headers:{"Content-Type":"application/json"},body:JSON.stringify(body),cache:"no-store"})
  const data = await res.json(); if (!res.ok) throw new Error(data.error || "Das hat leider nicht funktioniert."); return data
}
export default function FaceLab() {
  const videoRef=useRef<HTMLVideoElement>(null)
  const streamRef=useRef<MediaStream|null>(null)
  const apiRef=useRef<typeof import("face-api.js")|null>(null)
  const [identity,setIdentity]=useState<TerminalIdentity|null>(null)
  const [loadingProfile,setLoadingProfile]=useState(true)
  const [registered,setRegistered]=useState(false)
  const [ready,setReady]=useState(false)
  const [busy,setBusy]=useState(false)
  const [confirm,setConfirm]=useState<"enroll"|"delete"|null>(null)
  const [consent,setConsent]=useState(false)
  const [message,setMessage]=useState("")
  const [count,setCount]=useState(0)
  const [camera,setCamera]=useState(false)
  const stop=useCallback(()=>{streamRef.current?.getTracks().forEach(t=>t.stop());streamRef.current=null;setCamera(false)},[])
  useEffect(()=>{
    let active=true
    async function init(){
      try {
        const raw=sessionStorage.getItem("emd_face_manage_self")
        const context:Context|null=raw?JSON.parse(raw):null
        if(!context?.name || !context.kind || Date.now()-context.at>10*60_000) throw Error("Bitte öffne Face ID direkt über dein persönliches „Mein EMD“.")
        const {data,error}=await supabase.rpc("terminal_search_identities",{p_query:context.name})
        if(error) throw error
        const candidates=(data||[]) as TerminalIdentity[]
        const exact=candidates.filter(x=>x.identity_kind===context.kind && x.has_terminal_auth && (context.kind==="member" ? x.player_id===context.playerId : x.name===context.name))
        if(exact.length!==1) throw Error("Dein Profil konnte nicht eindeutig zugeordnet werden. Bitte melde dich erneut in „Mein EMD“ an.")
        const chosen=exact[0]
        if(!active)return
        setIdentity(chosen)
        const response=await fetch("/api/face-id",{cache:"no-store"}); if(!response.ok)throw Error("Face ID ist momentan nicht verfügbar.")
        const payload=await response.json()
        if(active)setRegistered((payload.faces||[]).some((x:Profile)=>x.identity_kind===chosen.identity_kind&&x.identity_id===chosen.identity_id))
      }catch(error){if(active)setMessage(error instanceof Error?error.message:"Dein Profil konnte nicht geladen werden.")}
      finally{if(active)setLoadingProfile(false)}
    }
    void init()
    return()=>{active=false;streamRef.current?.getTracks().forEach(t=>t.stop())}
  },[])
  async function startCamera(){
    try {
      setBusy(true);setMessage("")
      const stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:"user",width:{ideal:1280}},audio:false})
      streamRef.current=stream
      if(videoRef.current){videoRef.current.srcObject=stream;await videoRef.current.play()}
      setCamera(true);setReady(true)
    }catch{setMessage("Die Kamera konnte nicht gestartet werden. Bitte Kamera-Zugriff erlauben.")}finally{setBusy(false)}
  }
  async function descriptor(){
    if(!apiRef.current){
      const api=await import("face-api.js")
      await Promise.all([api.nets.tinyFaceDetector.loadFromUri("/models"),api.nets.faceLandmark68Net.loadFromUri("/models"),api.nets.faceRecognitionNet.loadFromUri("/models")]);apiRef.current=api
    }
    const video=videoRef.current
    if(!video || video.readyState<2) throw Error("Die Kamera ist noch nicht bereit.")
    const faces=await apiRef.current.detectAllFaces(video,new apiRef.current.TinyFaceDetectorOptions({inputSize:416,scoreThreshold:0.55})).withFaceLandmarks().withFaceDescriptors()
    if(faces.length!==1)throw Error(faces.length===0?"Kein Gesicht erkannt. Bitte schau gerade in die Kamera.":"Bitte sei alleine vor der Kamera.")
    return faces[0].descriptor
  }
  async function finish(person:VerifiedTerminalIdentity){
    if(!identity || person.identity_id!==identity.identity_id||person.identity_kind!==identity.identity_kind){setMessage("Das ist nicht dein Profil.");return}
    const action=confirm;setConfirm(null);setBusy(true)
    try {
      if(action==="delete"){await call({action:"delete",identity_kind:person.identity_kind,identity_id:person.identity_id,auth_method:person.auth_method,secret:person.secret});setRegistered(false);setConsent(false);setMessage("Deine Face ID wurde gelöscht.")}
      else if(action==="enroll"){
        if(!camera||!consent)throw Error("Bitte starte die Kamera und bestätige deine Einwilligung.")
        const vectors:Float32Array[]=[]
        for(let i=0;i<5;i++){setCount(i+1);vectors.push(await descriptor());await new Promise(r=>setTimeout(r,500))}
        const vector=Array.from(vectors[0],(_,i)=>vectors.reduce((s,v)=>s+v[i],0)/vectors.length)
        await call({action:"enroll",...person,vector,consent:true})
        setRegistered(true);setConsent(false);setMessage("Deine Face ID ist jetzt eingerichtet.")
      }
    }catch(error){setMessage(error instanceof Error?error.message:"Das hat leider nicht funktioniert.")}finally{setBusy(false);setCount(0);stop()}
  }
  return <main className="min-h-screen bg-[#070b12] px-4 py-7 text-white"><div className="mx-auto max-w-xl space-y-5">
    <Link href="/terminal/mein-emd" className="inline-flex items-center gap-2 rounded-xl border border-white/20 px-4 py-3 font-bold"><ArrowLeft size={19}/> Zurück zu Mein EMD</Link>
    <header><h1 className="text-3xl font-black">Meine Face ID</h1><p className="mt-2 text-slate-300">Melde dich künftig einfach mit deinem Gesicht an.</p></header>
    {loadingProfile?<p>Dein Profil wird geladen …</p>:!identity?<div className="rounded-2xl border border-orange-500/30 bg-[#121a26] p-5"><p>{message||"Bitte öffne diese Seite über Mein EMD."}</p><Link href="/terminal/mein-emd" className="mt-4 inline-block font-bold text-orange-400">Zu Mein EMD</Link></div>:<>
      <section className="rounded-2xl border border-orange-500/30 bg-[#121a26] p-5 space-y-4">
        <div><p className="text-sm text-slate-400">Dein Spielerprofil</p><h2 className="text-2xl font-black">{identity.name}</h2></div>
        <div className="flex items-center gap-2 text-sm">{registered?<><CheckCircle2 className="text-green-400"/> Face ID eingerichtet</>:<><Camera className="text-orange-400"/> Noch nicht eingerichtet</>}</div>
        {!registered&&<><div className="relative aspect-video overflow-hidden rounded-xl bg-black"><video ref={videoRef} playsInline muted autoPlay className="h-full w-full object-cover scale-x-[-1]"/>{!camera&&<span className="absolute inset-0 flex items-center justify-center text-slate-400">Kamera ausgeschaltet</span>}</div>
          <button type="button" onClick={camera?stop:startCamera} disabled={busy} className="w-full rounded-xl border border-orange-500/60 px-4 py-3 font-bold">{camera?"Kamera ausschalten":"Kamera einschalten"}</button>
          <label className="flex gap-3 text-sm text-slate-300"><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)} className="accent-orange-500"/><span>Ich stimme freiwillig zu, dass mein Gesichtsabdruck zur Anmeldung gespeichert und auf meinen EMD-Geräten verwendet wird. Ich kann ihn jederzeit löschen.</span></label>
          <button type="button" onClick={()=>setConfirm("enroll")} disabled={!ready||!camera||!consent||busy} className="w-full rounded-xl bg-orange-600 px-5 py-4 font-black disabled:opacity-40">Face ID einrichten</button>
        </>}
        {registered&&<button type="button" onClick={()=>setConfirm("delete")} disabled={busy} className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-red-500/60 px-4 py-3 font-bold text-red-200"><Trash2 size={18}/> Meine Face ID löschen</button>}
        {busy&&<p className="text-sm text-orange-200">{count?`Gesichtsaufnahme ${count} von 5 …`:"Einen Moment bitte …"}</p>}
        {message&&<p role="status" className="rounded-xl bg-white/10 p-3 text-sm">{message}</p>}
      </section>
      {confirm&&<section className="rounded-2xl border border-orange-400/30 bg-[#121a26] p-4"><TerminalIdentityAuth key={`${identity.identity_id}:${confirm}`} initialIdentity={identity} lockIdentity allowedKinds={[identity.identity_kind]} title="Bestätige dein Profil" subtitle="Bitte bestätige mit deiner PIN oder deinem Muster." compact onVerified={finish} onCancel={()=>setConfirm(null)}/><button onClick={()=>setConfirm(null)} className="mt-4 w-full rounded-xl border border-white/20 p-3">Abbrechen</button></section>}
    </>}
  </div></main>
}
