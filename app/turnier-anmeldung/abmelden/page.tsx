"use client"
import { Suspense, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { CheckCircle2, XCircle } from "lucide-react"
import { Header } from "@/components/header"
import { Button } from "@/components/ui/button"

export default function Page(){return <Suspense><Cancel/></Suspense>}
function Cancel(){const p=useSearchParams();const token=p.get("token");const [state,setState]=useState<"loading"|"ok"|"error">("loading");const [msg,setMsg]=useState("Abmeldung wird verarbeitet…");useEffect(()=>{async function go(){if(!token){setState("error");setMsg("Der Abmeldelink ist ungültig.");return}const r=await fetch("/api/public-tournament-registration/cancel",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({token})});const d=await r.json().catch(()=>null);if(r.ok){setState("ok");setMsg(d?.alreadyCancelled?"Du warst bereits abgemeldet.":"Du wurdest erfolgreich vom Turnier abgemeldet.")}else{setState("error");setMsg(d?.error||"Abmeldung fehlgeschlagen.")}}void go()},[token]);return <div className="min-h-screen bg-slate-50"><Header/><main className="mx-auto max-w-lg px-4 pt-28"><div className="rounded-3xl border bg-white p-8 text-center shadow-sm">{state==="ok"?<CheckCircle2 className="mx-auto h-14 w-14 text-emerald-500"/>:state==="error"?<XCircle className="mx-auto h-14 w-14 text-red-500"/>:<div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-orange-500 border-t-transparent"/>}<h1 className="mt-5 text-2xl font-black">Turnieranmeldung</h1><p className="mt-3 text-slate-600">{msg}</p><Button asChild className="mt-6 rounded-xl"><Link href="/dach-veranstaltungen">Zu den Turnieren</Link></Button></div></main></div>}
