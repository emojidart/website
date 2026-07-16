"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createBrowserClient } from "@supabase/ssr"
import { AlertTriangle, CheckCircle2, Clock3, Edit3, Eye, Loader2, Package, Plus, RotateCcw, Search, Trash2, X } from "lucide-react"

import { Header } from "@/components/header"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

const supabase=createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
type Status="draft"|"pending"|"approved"|"reserved"|"sold"|"rejected"
type Listing={id:string;title:string;price:number|null;price_type:string;city:string;country_code:string;status:Status;rejection_reason:string|null;created_at:string;image_url?:string|null}
const cfg:Record<Status,{label:string,cls:string}>={draft:{label:"Entwurf",cls:"bg-slate-100 text-slate-700"},pending:{label:"In Prüfung",cls:"bg-amber-100 text-amber-800"},approved:{label:"Online",cls:"bg-green-100 text-green-800"},reserved:{label:"Reserviert",cls:"bg-blue-100 text-blue-800"},sold:{label:"Verkauft",cls:"bg-slate-900 text-white"},rejected:{label:"Änderung nötig",cls:"bg-red-100 text-red-800"}}
export default function MeineDartboersePage(){
 const router=useRouter()
 const[items,setItems]=useState<Listing[]>([])
 const[loading,setLoading]=useState(true)
 const[query,setQuery]=useState("")
 const[busy,setBusy]=useState<string|null>(null)
 const[message,setMessage]=useState("")
 const[deleteTarget,setDeleteTarget]=useState<Listing|null>(null)
 async function load(){setLoading(true);const{data:auth}=await supabase.auth.getUser();if(!auth.user){router.push("/guest-login");return}const{data,error}=await supabase.from("dart_marketplace_listings").select("id,title,price,price_type,city,country_code,status,rejection_reason,created_at").eq("created_by",auth.user.id).order("created_at",{ascending:false});if(error){setMessage(error.message);setLoading(false);return}const rows=(data||[])as Listing[];const ids=rows.map(x=>x.id);const{data:imgs}=ids.length?await supabase.from("dart_marketplace_images").select("listing_id,image_url,sort_order").in("listing_id",ids).order("sort_order"):{data:[]as any[]};const map=new Map<string,string>();for(const img of imgs||[])if(!map.has(img.listing_id))map.set(img.listing_id,img.image_url);setItems(rows.map(x=>({...x,image_url:map.get(x.id)||null})));setLoading(false)}
 useEffect(()=>{void load()},[])
 const filtered=useMemo(()=>{const q=query.toLowerCase().trim();return items.filter(x=>!q||`${x.title} ${x.city} ${cfg[x.status].label}`.toLowerCase().includes(q))},[items,query])
 async function setStatus(id:string,status:Status){setBusy(id);setMessage("");const update:any={status};if(status==="reserved")update.reserved_at=new Date().toISOString();if(status==="sold")update.sold_at=new Date().toISOString();if(status==="approved"){update.reserved_at=null;update.sold_at=null}const{error}=await supabase.from("dart_marketplace_listings").update(update).eq("id",id);if(error)setMessage(error.message);else await load();setBusy(null)}
 async function remove(){
  if(!deleteTarget)return
  const id=deleteTarget.id
  setBusy(id)
  setMessage("")
  const{error}=await supabase.from("dart_marketplace_listings").delete().eq("id",id)
  if(error){
   setMessage(error.message)
  }else{
   setDeleteTarget(null)
   await load()
  }
  setBusy(null)
 }
 return <div className="min-h-screen bg-slate-50 pb-24"><Header/><main className="mx-auto max-w-6xl px-4 pt-20"><section className="rounded-[2rem] bg-gradient-to-br from-slate-950 to-orange-950 p-6 text-white shadow-2xl sm:p-8"><div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><div className="text-sm font-black uppercase tracking-[.18em] text-orange-300">Dartbörse</div><h1 className="mt-2 text-3xl font-black">Meine Angebote</h1><p className="mt-2 text-slate-300">Status verwalten, reservieren, verkaufen oder bearbeiten.</p></div><Button asChild className="rounded-2xl bg-orange-600"><Link href="/dartboerse/neu"><Plus className="mr-2 h-4 w-4"/>Neues Inserat</Link></Button></div></section>
 <div className="mt-5 relative"><Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"/><Input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Angebote durchsuchen …" className="h-12 rounded-2xl bg-white pl-12"/></div>
 {message?<div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">{message}</div>:null}
 {loading?<div className="py-20 text-center"><Loader2 className="mx-auto h-9 w-9 animate-spin text-orange-600"/></div>:filtered.length===0?<Card className="mt-5 rounded-3xl"><CardContent className="p-12 text-center"><Package className="mx-auto h-12 w-12 text-slate-300"/><h2 className="mt-4 text-xl font-black">Noch keine Angebote</h2></CardContent></Card>:<div className="mt-5 grid gap-4 lg:grid-cols-2">{filtered.map(item=><Card key={item.id} className="overflow-hidden rounded-3xl"><CardContent className="p-0"><div className="flex"><div className="h-40 w-32 shrink-0 bg-slate-100">{item.image_url?<img src={item.image_url} alt="" className="h-full w-full object-cover"/>:<div className="flex h-full items-center justify-center"><Package className="h-8 w-8 text-slate-300"/></div>}</div><div className="min-w-0 flex-1 p-4"><span className={`rounded-full px-3 py-1 text-xs font-black ${cfg[item.status].cls}`}>{cfg[item.status].label}</span><h2 className="mt-3 truncate text-lg font-black">{item.title}</h2><div className="mt-2 text-sm text-slate-500">{item.city} · {item.country_code}</div><div className="mt-2 text-xl font-black">{item.price_type==="free"?"Zu verschenken":item.price!=null?item.price.toLocaleString("de-AT",{style:"currency",currency:"EUR"}):"Preis offen"}</div>{item.status==="rejected"&&item.rejection_reason?<div className="mt-3 rounded-xl bg-red-50 p-3 text-xs font-bold text-red-700">{item.rejection_reason}</div>:null}</div></div><div className="flex flex-wrap gap-2 border-t bg-slate-50 p-3">{["approved","reserved","sold"].includes(item.status)?<Button asChild size="sm" variant="outline" className="rounded-xl"><Link href={`/dartboerse/${item.id}`}><Eye className="mr-1 h-4 w-4"/>Ansehen</Link></Button>:null}<Button asChild size="sm" variant="outline" className="rounded-xl"><Link href={`/dartboerse/${item.id}/bearbeiten`}><Edit3 className="mr-1 h-4 w-4"/>Bearbeiten</Link></Button>{item.status==="approved"?<Button size="sm" variant="outline" disabled={busy===item.id} onClick={()=>void setStatus(item.id,"reserved")} className="rounded-xl"><Clock3 className="mr-1 h-4 w-4"/>Reservieren</Button>:null}{item.status==="reserved"?<><Button size="sm" disabled={busy===item.id} onClick={()=>void setStatus(item.id,"sold")} className="rounded-xl bg-green-600"><CheckCircle2 className="mr-1 h-4 w-4"/>Verkauft</Button><Button size="sm" variant="outline" onClick={()=>void setStatus(item.id,"approved")} className="rounded-xl"><RotateCcw className="mr-1 h-4 w-4"/>Freigeben</Button></>:null}{item.status==="sold"?<Button size="sm" variant="outline" onClick={()=>void setStatus(item.id,"approved")} className="rounded-xl"><RotateCcw className="mr-1 h-4 w-4"/>Wieder aktiv</Button>:null}<Button size="sm" variant="ghost" disabled={busy===item.id} onClick={()=>setDeleteTarget(item)} className="rounded-xl text-red-600"><Trash2 className="mr-1 h-4 w-4"/>Löschen</Button></div></CardContent></Card>)}</div>}
 </main>

 <AlertDialog
  open={Boolean(deleteTarget)}
  onOpenChange={(open)=>{
   if(!open&&busy!==deleteTarget?.id)setDeleteTarget(null)
  }}
 >
  <AlertDialogContent className="overflow-hidden rounded-[2rem] border-0 p-0 shadow-2xl sm:max-w-md">
   <div className="h-2 bg-gradient-to-r from-red-600 via-red-500 to-orange-500"/>

   <div className="p-6 sm:p-7">
    <AlertDialogHeader className="text-left">
     <div className="flex items-start gap-4">
      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-red-200 bg-red-50 text-red-600">
       <AlertTriangle className="h-7 w-7"/>
      </div>

      <div className="min-w-0">
       <AlertDialogTitle className="text-xl font-black text-slate-950">
        Inserat dauerhaft löschen?
       </AlertDialogTitle>

       <AlertDialogDescription className="mt-2 text-sm leading-6 text-slate-600">
        Diese Aktion kann nicht rückgängig gemacht werden. Das Inserat wird
        vollständig aus der Dartbörse entfernt.
       </AlertDialogDescription>
      </div>
     </div>
    </AlertDialogHeader>

    {deleteTarget?(
     <div className="mt-5 rounded-2xl border border-red-100 bg-red-50 p-4">
      <div className="text-xs font-black uppercase tracking-wider text-red-500">
       Wird gelöscht
      </div>
      <div className="mt-1 break-words font-black text-red-900">
       {deleteTarget.title}
      </div>
      <div className="mt-1 text-sm font-semibold text-red-700">
       {deleteTarget.city} · {deleteTarget.country_code}
      </div>
     </div>
    ):null}

    <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold leading-6 text-amber-900">
     Auch zugehörige Bilder, Nachrichten oder Preisangebote können danach
     nicht mehr über dieses Inserat aufgerufen werden.
    </div>

    <AlertDialogFooter className="mt-6 grid grid-cols-1 gap-2 sm:grid-cols-2">
     <AlertDialogCancel
      disabled={Boolean(deleteTarget&&busy===deleteTarget.id)}
      className="mt-0 h-11 rounded-xl border-slate-200 font-black"
     >
      Abbrechen
     </AlertDialogCancel>

     <AlertDialogAction
      disabled={Boolean(deleteTarget&&busy===deleteTarget.id)}
      onClick={(event)=>{
       event.preventDefault()
       void remove()
      }}
      className="h-11 rounded-xl bg-red-600 font-black text-white hover:bg-red-700"
     >
      {deleteTarget&&busy===deleteTarget.id?(
       <Loader2 className="mr-2 h-4 w-4 animate-spin"/>
      ):(
       <Trash2 className="mr-2 h-4 w-4"/>
      )}
      Dauerhaft löschen
     </AlertDialogAction>
    </AlertDialogFooter>
   </div>
  </AlertDialogContent>
 </AlertDialog>

 <MobileBottomNav/>
 </div>
}
