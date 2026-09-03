"use client"

import type React from "react"
import { useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { createBrowserClient } from "@supabase/ssr"
import { ArrowLeft, ChevronLeft, ChevronRight, ImagePlus, Loader2, Save, ShieldAlert, Trash2, X } from "lucide-react"

import { Header } from "@/components/header"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
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
const categories={complete_darts:"Komplette Darts",barrels:"Barrels",shafts:"Schäfte",flights:"Flights",tips:"Spitzen",boards:"Dartscheiben",machines:"Dartautomaten",lighting:"Beleuchtung",surrounds:"Surrounds",mats:"Matten",cases:"Taschen & Cases",spare_parts:"Ersatzteile",other:"Sonstiges"}
type Form={title:string;category:string;description:string;condition:string;price:string;price_type:string;country_code:string;postal_code:string;city:string;shipping_available:boolean;pickup_available:boolean;seller_name:string;seller_email:string;seller_phone:string;status:string}

type SellerData={sellerName:string;sellerEmail:string;sellerPhone:string}
type ListingImage={id:string;image_url:string;sort_order:number}

async function loadSellerData(user:{id:string;email?:string|null}):Promise<SellerData>{
  const{data:profile,error:profileError}=await supabase
    .from("user_profiles")
    .select("is_guest,player_id")
    .eq("user_id",user.id)
    .maybeSingle()
  if(profileError)throw profileError
  if(!profile)throw new Error("Benutzerprofil wurde nicht gefunden.")

  if(profile.is_guest){
    const{data:guest,error:guestError}=await supabase
      .from("guest_requests")
      .select("full_name,player_name,email,phone")
      .eq("auth_user_id",user.id)
      .eq("status","approved")
      .maybeSingle()
    if(guestError)throw guestError
    if(!guest)throw new Error("Freigeschaltetes Gastprofil wurde nicht gefunden.")
    const fullName=guest.full_name?.trim()||"Gast"
    const playerName=guest.player_name?.trim()
    return{
      sellerName:playerName?`${fullName} (${playerName})`:fullName,
      sellerEmail:guest.email?.trim()||user.email?.trim()||"",
      sellerPhone:guest.phone?.trim()||"",
    }
  }

  if(!profile.player_id)throw new Error("Das Mitglied ist noch keinem Spieler zugeordnet.")
  const{data:member,error:memberError}=await supabase
    .from("club_players")
    .select("name,email")
    .eq("id",profile.player_id)
    .maybeSingle()
  if(memberError)throw memberError
  if(!member)throw new Error("Mitglied wurde nicht gefunden.")
  return{
    sellerName:member.name?.trim()||"Mitglied",
    sellerEmail:member.email?.trim()||user.email?.trim()||"",
    sellerPhone:"",
  }
}
export default function DartboerseBearbeitenPage(){
 const{id}=useParams<{id:string}>()
 const router=useRouter()
 const[form,setForm]=useState<Form|null>(null)
 const[loading,setLoading]=useState(true)
 const[saving,setSaving]=useState(false)
 const[message,setMessage]=useState("")
 const[existingImages,setExistingImages]=useState<ListingImage[]>([])
 const[newImages,setNewImages]=useState<File[]>([])
 const[deleteTarget,setDeleteTarget]=useState<ListingImage|null>(null)
 const[deletingImage,setDeletingImage]=useState(false)

 useEffect(()=>{
  void(async()=>{
   try{
    const{data:auth}=await supabase.auth.getUser()
    if(!auth.user){
     router.push("/guest-login")
     return
    }

    const[{data,error},seller,imagesResult]=await Promise.all([
     supabase
      .from("dart_marketplace_listings")
      .select("*")
      .eq("id",id)
      .eq("created_by",auth.user.id)
      .maybeSingle(),
     loadSellerData(auth.user),
     supabase
      .from("dart_marketplace_images")
      .select("id,image_url,sort_order")
      .eq("listing_id",id)
      .order("sort_order",{ascending:true}),
    ])

    if(error||!data){
     setMessage(error?.message||"Inserat nicht gefunden.")
     return
    }

    if(imagesResult.error)throw imagesResult.error

    setExistingImages((imagesResult.data||[])as ListingImage[])
    setForm({
     title:data.title||"",
     category:data.category||"other",
     description:data.description||"",
     condition:data.condition||"good",
     price:data.price?.toString()||"",
     price_type:data.price_type||"fixed",
     country_code:data.country_code||"AT",
     postal_code:data.postal_code||"",
     city:data.city||"",
     shipping_available:Boolean(data.shipping_available),
     pickup_available:Boolean(data.pickup_available),
     seller_name:seller.sellerName,
     seller_email:seller.sellerEmail,
     seller_phone:data.seller_phone||seller.sellerPhone||"",
     status:data.status,
    })
   }catch(err:any){
    setMessage(err?.message||"Inserat konnte nicht geladen werden.")
   }finally{
    setLoading(false)
   }
  })()
 },[id,router])
 const setField=(key:keyof Form,value:string|boolean)=>setForm(old=>old?({...old,[key]:value}):old)

 const totalImageCount=existingImages.length+newImages.length
 const newImagePreviews=useMemo(
  ()=>newImages.map((file)=>({file,url:URL.createObjectURL(file)})),
  [newImages],
 )

 useEffect(()=>{
  return()=>{
   newImagePreviews.forEach((preview)=>URL.revokeObjectURL(preview.url))
  }
 },[newImagePreviews])

 function addNewImages(files:FileList|null){
  const selected=Array.from(files||[])
  if(!selected.length)return

  const remaining=Math.max(0,5-totalImageCount)
  const accepted=selected
   .filter((file)=>["image/jpeg","image/png","image/webp"].includes(file.type))
   .filter((file)=>file.size<=8*1024*1024)
   .slice(0,remaining)

  if(selected.some((file)=>file.size>8*1024*1024)){
   setMessage("Ein Bild ist größer als 8 MB.")
  }else if(selected.some((file)=>!["image/jpeg","image/png","image/webp"].includes(file.type))){
   setMessage("Erlaubt sind nur JPG, PNG und WebP.")
  }else if(selected.length>remaining){
   setMessage("Es sind insgesamt maximal fünf Bilder möglich.")
  }else{
   setMessage("")
  }

  setNewImages((old)=>[...old,...accepted])
 }

 function removeNewImage(index:number){
  setNewImages((old)=>old.filter((_,itemIndex)=>itemIndex!==index))
 }

 async function moveExistingImage(imageId:string,direction:"left"|"right"){
  const currentIndex=existingImages.findIndex((image)=>image.id===imageId)
  const targetIndex=direction==="left"?currentIndex-1:currentIndex+1
  if(currentIndex<0||targetIndex<0||targetIndex>=existingImages.length)return

  const next=[...existingImages]
  ;[next[currentIndex],next[targetIndex]]=[next[targetIndex],next[currentIndex]]
  const reordered=next.map((image,index)=>({...image,sort_order:index}))
  setExistingImages(reordered)

  const results=await Promise.all(
   reordered.map((image)=>
    supabase
     .from("dart_marketplace_images")
     .update({sort_order:image.sort_order})
     .eq("id",image.id),
   ),
  )

  const failed=results.find((result)=>result.error)
  if(failed?.error){
   setMessage(failed.error.message)
  }
 }

 function storagePathFromUrl(url:string){
  const marker="/storage/v1/object/public/dart-marketplace-images/"
  const index=url.indexOf(marker)
  if(index===-1)return null
  return decodeURIComponent(url.slice(index+marker.length))
 }

 async function deleteExistingImage(){
  if(!deleteTarget)return
  if(existingImages.length+newImages.length<=1){
   setMessage("Mindestens ein Bild muss beim Inserat erhalten bleiben.")
   setDeleteTarget(null)
   return
  }

  setDeletingImage(true)
  setMessage("")

  try{
   const storagePath=storagePathFromUrl(deleteTarget.image_url)
   if(storagePath){
    const{error:storageError}=await supabase.storage
     .from("dart-marketplace-images")
     .remove([storagePath])
    if(storageError)console.warn("Bilddatei konnte nicht aus Storage gelöscht werden:",storageError)
   }

   const{error}=await supabase
    .from("dart_marketplace_images")
    .delete()
    .eq("id",deleteTarget.id)

   if(error)throw error

   const remaining=existingImages
    .filter((image)=>image.id!==deleteTarget.id)
    .map((image,index)=>({...image,sort_order:index}))

   setExistingImages(remaining)
   setDeleteTarget(null)

   await Promise.all(
    remaining.map((image)=>
     supabase
      .from("dart_marketplace_images")
      .update({sort_order:image.sort_order})
      .eq("id",image.id),
    ),
   )
  }catch(err:any){
   setMessage(err?.message||"Bild konnte nicht gelöscht werden.")
  }finally{
   setDeletingImage(false)
  }
 }

 async function uploadNewImages(userId:string){
  for(const[fileIndex,file]of newImages.entries()){
   const extension=file.name.split(".").pop()?.toLowerCase()||"jpg"
   const path=`${userId}/${id}/${crypto.randomUUID()}.${extension}`

   const{error:uploadError}=await supabase.storage
    .from("dart-marketplace-images")
    .upload(path,file,{
     contentType:file.type,
     upsert:false,
    })

   if(uploadError)throw uploadError

   const imageUrl=supabase.storage
    .from("dart-marketplace-images")
    .getPublicUrl(path).data.publicUrl

   const{error:imageError}=await supabase
    .from("dart_marketplace_images")
    .insert({
     listing_id:id,
     image_url:imageUrl,
     sort_order:existingImages.length+fileIndex,
    })

   if(imageError)throw imageError
  }
 }

 async function save(e:React.FormEvent){
  e.preventDefault()
  if(!form)return
  setSaving(true)
  setMessage("")

  try{
   const{data:auth}=await supabase.auth.getUser()
   if(!auth.user)throw new Error("Bitte neu anmelden.")
   if(!form.title.trim()||!form.description.trim()||!form.city.trim())throw new Error("Bitte alle Pflichtfelder ausfüllen.")
   if(!form.shipping_available&&!form.pickup_available)throw new Error("Bitte Versand oder Abholung auswählen.")
   if(totalImageCount===0)throw new Error("Bitte mindestens ein Bild hinzufügen.")
   if(totalImageCount>5)throw new Error("Es sind maximal fünf Bilder möglich.")

   const seller=await loadSellerData(auth.user)
   const{error}=await supabase.from("dart_marketplace_listings").update({title:form.title.trim(),category:form.category,description:form.description.trim(),condition:form.condition,price:form.price_type==="free"?null:Number(form.price.replace(",",".")),price_type:form.price_type,country_code:form.country_code,postal_code:form.postal_code.trim()||null,city:form.city.trim(),shipping_available:form.shipping_available,pickup_available:form.pickup_available,seller_name:seller.sellerName,seller_email:seller.sellerEmail||null,seller_phone:form.seller_phone.trim()||seller.sellerPhone||null,status:"pending"}).eq("id",id).eq("created_by",auth.user.id)

   if(error)throw error
   await uploadNewImages(auth.user.id)
   router.push("/dartboerse/meine")
  }catch(err:any){
   setMessage(err?.message||"Änderungen konnten nicht gespeichert werden.")
  }finally{
   setSaving(false)
  }
 }
 if(loading)return <div className="min-h-screen bg-[#f5f6f8]"><Header/><div className="pt-32 text-center"><Loader2 className="mx-auto h-10 w-10 animate-spin text-orange-600"/></div></div>
 if(!form)return <div className="min-h-screen bg-[#f5f6f8]"><Header/><main className="px-4 pt-24"><Card className="mx-auto max-w-lg rounded-[24px]"><CardContent className="p-8 text-center"><ShieldAlert className="mx-auto h-10 w-10 text-orange-600"/><p className="mt-4 font-bold">{message}</p></CardContent></Card></main></div>
 return <div className="min-h-screen bg-[#f5f6f8] pb-24"><Header/><main className="w-full max-w-none px-2 pb-24 pt-14 sm:px-4 sm:pt-16 lg:px-5 xl:px-6 2xl:px-8"><Button variant="outline" onClick={()=>router.push("/dartboerse/meine")} className="mb-4 rounded-xl"><ArrowLeft className="mr-2 h-4 w-4"/>Zurück</Button><section className="relative overflow-hidden rounded-[24px] border border-slate-800/10 bg-slate-950 p-4 text-white shadow-[0_24px_80px_-42px_rgba(15,23,42,0.62)] sm:rounded-[28px] sm:p-6 lg:p-8 xl:rounded-[30px]"><div className="text-sm font-black uppercase tracking-[.18em] text-orange-300">Bearbeiten</div><h1 className="mt-2 text-3xl font-black">Inserat ändern</h1><p className="mt-2 text-slate-300">Nach dem Speichern wird das Angebot erneut geprüft.</p></section><form onSubmit={save} className="mt-4 grid items-start gap-4 xl:grid-cols-2 xl:gap-5"><Card className="rounded-[24px]"><CardContent className="space-y-4 p-6"><Field label="Titel"><Input value={form.title} onChange={e=>setField("title",e.target.value)} required/></Field><div className="grid gap-4 sm:grid-cols-2"><Field label="Kategorie"><Select value={form.category} onValueChange={v=>setField("category",v)}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{Object.entries(categories).map(([v,l])=><SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent></Select></Field><Field label="Zustand"><Select value={form.condition} onValueChange={v=>setField("condition",v)}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="new">Neu</SelectItem><SelectItem value="like_new">Wie neu</SelectItem><SelectItem value="good">Gut</SelectItem><SelectItem value="used">Gebraucht</SelectItem><SelectItem value="defective">Defekt</SelectItem></SelectContent></Select></Field></div><Field label="Beschreibung"><Textarea rows={7} value={form.description} onChange={e=>setField("description",e.target.value)}/></Field>

<div className="rounded-[24px] border border-slate-200 bg-[#f5f6f8] p-4 sm:p-5">
 <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
  <div>
   <div className="flex items-center gap-2 font-black text-slate-950">
    <ImagePlus className="h-5 w-5 text-orange-600"/>
    Bilder verwalten
   </div>
   <p className="mt-1 text-sm text-slate-500">
    Bis zu fünf Bilder, jeweils maximal 8 MB. Das erste Bild ist das Titelbild.
   </p>
  </div>
  <span className="w-fit rounded-full bg-white px-3 py-1 text-xs font-black text-slate-700 shadow-sm">
   {totalImageCount}/5 Bilder
  </span>
 </div>

 {existingImages.length>0?(
  <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
   {existingImages.map((image,imageIndex)=>(
    <div key={image.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
     <div className="relative aspect-square overflow-hidden bg-slate-100">
      <img src={image.image_url} alt={`Bild ${imageIndex+1}`} className="h-full w-full object-cover"/>
      {imageIndex===0?(
       <span className="absolute left-2 top-2 rounded-full bg-orange-500 px-2.5 py-1 text-[10px] font-black text-white shadow">
        TITELBILD
       </span>
      ):null}
      <button
       type="button"
       onClick={()=>setDeleteTarget(image)}
       className="absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-full bg-red-600 text-white shadow-lg transition hover:bg-red-700"
       aria-label="Bild löschen"
      >
       <Trash2 className="h-4 w-4"/>
      </button>
     </div>

     <div className="flex items-center justify-between gap-2 p-2">
      <Button
       type="button"
       size="sm"
       variant="outline"
       disabled={imageIndex===0}
       onClick={()=>void moveExistingImage(image.id,"left")}
       className="h-9 flex-1 rounded-xl"
      >
       <ChevronLeft className="h-4 w-4"/>
      </Button>
      <span className="text-xs font-black text-slate-500">{imageIndex+1}</span>
      <Button
       type="button"
       size="sm"
       variant="outline"
       disabled={imageIndex===existingImages.length-1}
       onClick={()=>void moveExistingImage(image.id,"right")}
       className="h-9 flex-1 rounded-xl"
      >
       <ChevronRight className="h-4 w-4"/>
      </Button>
     </div>
    </div>
   ))}
  </div>
 ):null}

 {newImagePreviews.length>0?(
  <div className="mt-4">
   <div className="mb-2 text-xs font-black uppercase tracking-wide text-green-700">
    Neue Bilder
   </div>
   <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
    {newImagePreviews.map((preview,imageIndex)=>(
     <div key={`${preview.file.name}-${imageIndex}`} className="overflow-hidden rounded-2xl border border-green-200 bg-white shadow-sm">
      <div className="relative aspect-square overflow-hidden bg-slate-100">
       <img src={preview.url} alt={`Neues Bild ${imageIndex+1}`} className="h-full w-full object-cover"/>
       <span className="absolute left-2 top-2 rounded-full bg-green-600 px-2.5 py-1 text-[10px] font-black text-white shadow">
        NEU
       </span>
       <button
        type="button"
        onClick={()=>removeNewImage(imageIndex)}
        className="absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-full bg-red-600 text-white shadow-lg transition hover:bg-red-700"
        aria-label="Neues Bild entfernen"
       >
        <X className="h-4 w-4"/>
       </button>
      </div>
     </div>
    ))}
   </div>
  </div>
 ):null}

 {totalImageCount<5?(
  <label className="mt-4 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-orange-300 bg-orange-50 px-4 py-6 text-center transition hover:bg-orange-100">
   <ImagePlus className="h-8 w-8 text-orange-600"/>
   <span className="mt-2 font-black text-orange-900">Weitere Bilder hinzufügen</span>
   <span className="mt-1 text-xs text-orange-700">JPG, PNG oder WebP</span>
   <Input
    type="file"
    accept="image/jpeg,image/png,image/webp"
    multiple
    onChange={(event)=>{
     addNewImages(event.target.files)
     event.target.value=""
    }}
    className="hidden"
   />
  </label>
 ):null}
</div>

<div className="grid gap-4 sm:grid-cols-2"><Field label="Preisart"><Select value={form.price_type} onValueChange={v=>setField("price_type",v)}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="fixed">Fixpreis</SelectItem><SelectItem value="negotiable">Verhandlungsbasis</SelectItem><SelectItem value="free">Zu verschenken</SelectItem></SelectContent></Select></Field><Field label="Preis"><Input disabled={form.price_type==="free"} value={form.price} onChange={e=>setField("price",e.target.value)}/></Field></div><div className="grid gap-4 sm:grid-cols-3"><Field label="Land"><Select value={form.country_code} onValueChange={v=>setField("country_code",v)}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="AT">Österreich</SelectItem><SelectItem value="DE">Deutschland</SelectItem><SelectItem value="CH">Schweiz</SelectItem></SelectContent></Select></Field><Field label="PLZ"><Input value={form.postal_code} onChange={e=>setField("postal_code",e.target.value.replace(/\D/g,""))}/></Field><Field label="Ort"><Input value={form.city} onChange={e=>setField("city",e.target.value)}/></Field></div><div className="grid gap-3 sm:grid-cols-2"><label className="rounded-2xl border p-4 font-bold"><input type="checkbox" className="mr-2" checked={form.shipping_available} onChange={e=>setField("shipping_available",e.target.checked)}/>Versand möglich</label><label className="rounded-2xl border p-4 font-bold"><input type="checkbox" className="mr-2" checked={form.pickup_available} onChange={e=>setField("pickup_available",e.target.checked)}/>Abholung möglich</label></div><div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">Name und E-Mail werden automatisch aus deinem Profil übernommen und können nicht geändert werden.</div><Field label="Verkäufer"><Input value={form.seller_name} readOnly className="cursor-not-allowed bg-slate-100 text-slate-700"/></Field><div className="grid gap-4 sm:grid-cols-2"><Field label="E-Mail"><Input type="email" value={form.seller_email} readOnly className="cursor-not-allowed bg-slate-100 text-slate-700"/></Field><Field label="Telefon (optional)"><Input value={form.seller_phone} onChange={e=>setField("seller_phone",e.target.value)}/></Field></div>{message?<div className="rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700">{message}</div>:null}<Button disabled={saving} className="h-12 w-full rounded-2xl bg-orange-500"><Save className="mr-2 h-4 w-4"/>{saving?"Speichert …":"Änderungen einreichen"}</Button></CardContent></Card></form></main>

<AlertDialog
 open={Boolean(deleteTarget)}
 onOpenChange={(open)=>{
  if(!open&&!deletingImage)setDeleteTarget(null)
 }}
>
 <AlertDialogContent className="overflow-hidden rounded-[28px] border-0 p-0 shadow-[0_24px_80px_-42px_rgba(15,23,42,0.55)] sm:max-w-md">
  <div className="h-2 bg-gradient-to-r from-red-600 via-red-500 to-orange-500"/>
  <div className="p-6">
   <AlertDialogHeader className="text-left">
    <div className="flex items-start gap-4">
     <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-red-50 text-red-600">
      <Trash2 className="h-7 w-7"/>
     </div>
     <div>
      <AlertDialogTitle className="text-xl font-black">Bild wirklich löschen?</AlertDialogTitle>
      <AlertDialogDescription className="mt-2 leading-6">
       Das Bild wird dauerhaft aus dem Inserat entfernt.
      </AlertDialogDescription>
     </div>
    </div>
   </AlertDialogHeader>

   {deleteTarget?(
    <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
     <img src={deleteTarget.image_url} alt="Zu löschendes Bild" className="h-48 w-full object-contain"/>
    </div>
   ):null}

   <AlertDialogFooter className="mt-6 grid grid-cols-1 gap-2 sm:grid-cols-2">
    <AlertDialogCancel disabled={deletingImage} className="mt-0 h-11 rounded-xl font-black">
     Abbrechen
    </AlertDialogCancel>
    <AlertDialogAction
     disabled={deletingImage}
     onClick={(event)=>{
      event.preventDefault()
      void deleteExistingImage()
     }}
     className="h-11 rounded-xl bg-red-600 font-black text-white hover:bg-red-700"
    >
     {deletingImage?<Loader2 className="mr-2 h-4 w-4 animate-spin"/>:<Trash2 className="mr-2 h-4 w-4"/>}
     Bild löschen
    </AlertDialogAction>
   </AlertDialogFooter>
  </div>
 </AlertDialogContent>
</AlertDialog>

<MobileBottomNav/>
</div>
}
function Field({label,children}:{label:string;children:React.ReactNode}){return <label className="block"><span className="mb-1.5 block text-xs font-black uppercase tracking-wide text-slate-600">{label}</span>{children}</label>}
