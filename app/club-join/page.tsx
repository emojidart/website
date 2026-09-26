"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import type React from "react"
import Link from "next/link"
import {
  Check,
  CheckCircle2,
  ExternalLink,
  FileCheck2,
  FileText,
  Loader2,
  PenLine,
  RotateCcw,
  Send,
  ShieldCheck,
  Sparkles,
  UserPlus,
} from "lucide-react"

import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

type JoinRequestLite = {
  id: string
  status: "pending" | "approved" | "rejected" | "cancelled"
  created_at: string
}

type JoinDocument = {
  id: string
  storage_path: string
  title: string
  category: "application" | "statutes" | "confidentiality" | "privacy" | "guardian" | "other"
  version: string
  is_required: boolean
  minors_only: boolean
  sort_order: number
}

type Acceptance = {
  document_id: string
  title: string
  category: string
  version: string
  storage_path: string
  opened_at: string
  accepted_at: string
}

const CATEGORY_LABELS: Record<JoinDocument["category"], string> = {
  application: "Beitrittserklärung",
  statutes: "Vereinssatzung / Vereinsregeln",
  confidentiality: "Verschwiegenheitserklärung",
  privacy: "Datenschutz / DSGVO",
  guardian: "Einverständnis gesetzliche Vertretung",
  other: "Weiteres Vereinsdokument",
}

function calculateAge(birthdate: string) {
  if (!birthdate) return null
  const birth = new Date(`${birthdate}T00:00:00`)
  if (Number.isNaN(birth.getTime())) return null
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const month = today.getMonth() - birth.getMonth()
  if (month < 0 || (month === 0 && today.getDate() < birth.getDate())) age--
  return age
}

function splitFullName(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean)
  if (parts.length <= 1) return { firstName: parts[0] || "", lastName: "" }
  return { firstName: parts.slice(0, -1).join(" "), lastName: parts.at(-1) || "" }
}

function SignaturePad({
  label,
  onChange,
}: {
  label: string
  onChange: (dataUrl: string | null) => void
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const drawingRef = useRef(false)
  const lastPointRef = useRef<{ x: number; y: number } | null>(null)
  const [hasSignature, setHasSignature] = useState(false)

  const resizeCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    if (!rect.width) return

    const previous = hasSignature ? canvas.toDataURL("image/png") : null
    const dpr = Math.max(1, window.devicePixelRatio || 1)
    canvas.width = Math.round(rect.width * dpr)
    canvas.height = Math.round(190 * dpr)
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.lineCap = "round"
    ctx.lineJoin = "round"
    ctx.lineWidth = 2.4
    ctx.strokeStyle = "#111827"

    if (previous) {
      const img = new Image()
      img.onload = () => ctx.drawImage(img, 0, 0, rect.width, 190)
      img.src = previous
    }
  }

  useEffect(() => {
    resizeCanvas()
    window.addEventListener("resize", resizeCanvas)
    return () => window.removeEventListener("resize", resizeCanvas)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const point = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    return { x: event.clientX - rect.left, y: event.clientY - rect.top }
  }

  const start = (event: React.PointerEvent<HTMLCanvasElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId)
    drawingRef.current = true
    lastPointRef.current = point(event)
  }

  const move = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current || !lastPointRef.current) return
    const canvas = canvasRef.current
    const ctx = canvas?.getContext("2d")
    if (!canvas || !ctx) return

    const next = point(event)
    const dpr = Math.max(1, window.devicePixelRatio || 1)
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.lineCap = "round"
    ctx.lineJoin = "round"
    ctx.lineWidth = 2.4
    ctx.strokeStyle = "#111827"
    ctx.beginPath()
    ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y)
    ctx.lineTo(next.x, next.y)
    ctx.stroke()
    lastPointRef.current = next

    if (!hasSignature) setHasSignature(true)
  }

  const finish = () => {
    if (!drawingRef.current) return
    drawingRef.current = false
    lastPointRef.current = null
    const canvas = canvasRef.current
    if (!canvas || !hasSignature) return
    onChange(canvas.toDataURL("image/png", 0.85))
  }

  const clear = () => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext("2d")
    if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height)
    setHasSignature(false)
    onChange(null)
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <Label className="font-black text-gray-900">{label}</Label>
        <Button type="button" variant="ghost" size="sm" onClick={clear} disabled={!hasSignature}>
          <RotateCcw className="mr-1 h-4 w-4" /> Neu
        </Button>
      </div>
      <div className="overflow-hidden rounded-2xl border-2 border-dashed border-gray-300 bg-white">
        <canvas
          ref={canvasRef}
          className="block h-[190px] w-full touch-none cursor-crosshair"
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={finish}
          onPointerCancel={finish}
          onPointerLeave={finish}
        />
      </div>
      <p className="text-xs font-semibold text-gray-500">Mit Maus, Touchpad, Finger oder Stift unterschreiben.</p>
    </div>
  )
}

export default function ClubJoinPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [userId, setUserId] = useState("")
  const [existing, setExisting] = useState<JoinRequestLite | null>(null)
  const [linkedSpieldatenbankId, setLinkedSpieldatenbankId] = useState<string | null>(null)
  const [documents, setDocuments] = useState<JoinDocument[]>([])
  const [accepted, setAccepted] = useState<Record<string, Acceptance>>({})
  const [opened, setOpened] = useState<Record<string, string>>({})
  const [viewer, setViewer] = useState<{ doc: JoinDocument; url: string } | null>(null)
  const [viewerLoading, setViewerLoading] = useState(false)
  const [viewerReadyAt, setViewerReadyAt] = useState<number | null>(null)
  const [viewerTick, setViewerTick] = useState(0)
  const [signature, setSignature] = useState<string | null>(null)
  const [guardianSignature, setGuardianSignature] = useState<string | null>(null)
  const [guardianName, setGuardianName] = useState("")
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [trialRequested, setTrialRequested] = useState<boolean | null>(null)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  const [form, setForm] = useState({
    full_name: "",
    email: "",
    birthdate: "",
    street: "",
    house_number: "",
    postal_code: "",
    city: "",
    phone: "",
    jersey_size: "",
    note: "",
  })

  useEffect(() => {
    if (!viewerReadyAt) return
    const timer = window.setInterval(() => setViewerTick((v) => v + 1), 1000)
    return () => window.clearInterval(timer)
  }, [viewerReadyAt])

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        if (userError) throw userError
        if (!user) throw new Error("Bitte zuerst einloggen.")

        setUserId(user.id)

        const [requestRes, guestRes, docsRes] = await Promise.all([
          supabase
            .from("club_join_requests")
            .select("id,status,created_at")
            .eq("user_id", user.id)
            .in("status", ["pending", "approved"])
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle(),
          supabase
            .from("guest_requests")
            .select("full_name,player_name,email,phone,linked_spieldatenbank_id")
            .eq("auth_user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle(),
          supabase
            .from("club_join_documents")
            .select("id,storage_path,title,category,version,is_required,minors_only,sort_order")
            .eq("is_active", true)
            .order("sort_order", { ascending: true })
            .order("created_at", { ascending: true }),
        ])

        if (requestRes.error) throw requestRes.error
        if (guestRes.error) throw guestRes.error
        if (docsRes.error) throw docsRes.error

        setExisting((requestRes.data || null) as JoinRequestLite | null)
        setLinkedSpieldatenbankId(guestRes.data?.linked_spieldatenbank_id || null)
        setDocuments((docsRes.data || []) as JoinDocument[])

        const lockedFullName = guestRes.data?.full_name || guestRes.data?.player_name || ""
        const lockedNameParts = splitFullName(lockedFullName)
        setFirstName(lockedNameParts.firstName)
        setLastName(lockedNameParts.lastName)

        setForm((prev) => ({
          ...prev,
          full_name: lockedFullName || prev.full_name,
          email: user.email || guestRes.data?.email || prev.email,
          phone: guestRes.data?.phone || prev.phone,
        }))
      } catch (error: any) {
        setMessage({ type: "error", text: error?.message || "Beitrittsseite konnte nicht geladen werden." })
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [])

  const age = useMemo(() => calculateAge(form.birthdate), [form.birthdate])
  const isMinor = age !== null && age < 18
  const visibleDocuments = useMemo(
    () => documents.filter((doc) => !doc.minors_only || isMinor),
    [documents, isMinor],
  )
  const requiredDocuments = visibleDocuments.filter((doc) => doc.is_required)
  const acceptedRequiredCount = requiredDocuments.filter((doc) => !!accepted[doc.id]).length
  const allRequiredAccepted = requiredDocuments.every((doc) => !!accepted[doc.id])
  const guardianComplete = !isMinor || (!!guardianName.trim() && !!guardianSignature)

  const readyToSend =
    !!form.full_name.trim() &&
    !!form.birthdate &&
    allRequiredAccepted &&
    !!signature &&
    guardianComplete &&
    trialRequested !== null

  const setField = (key: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const openDocument = async (doc: JoinDocument) => {
    try {
      setViewerLoading(true)
      setMessage(null)
      const { data, error } = await supabase.storage.from("club-documents").createSignedUrl(doc.storage_path, 900)
      if (error) throw error
      if (!data?.signedUrl) throw new Error("Dokument konnte nicht geöffnet werden.")
      const now = new Date().toISOString()
      setOpened((prev) => ({ ...prev, [doc.id]: prev[doc.id] || now }))
      setViewer({ doc, url: data.signedUrl })
      setViewerReadyAt(Date.now())
      setViewerTick(0)
    } catch (error: any) {
      setMessage({ type: "error", text: error?.message || "Dokument konnte nicht geöffnet werden." })
    } finally {
      setViewerLoading(false)
    }
  }

  const canConfirmViewer = !!viewerReadyAt && Date.now() - viewerReadyAt >= 8000

  const acceptViewer = () => {
    if (!viewer || !canConfirmViewer) return
    const acceptedAt = new Date().toISOString()
    setAccepted((prev) => ({
      ...prev,
      [viewer.doc.id]: {
        document_id: viewer.doc.id,
        title: viewer.doc.title,
        category: viewer.doc.category,
        version: viewer.doc.version,
        storage_path: viewer.doc.storage_path,
        opened_at: opened[viewer.doc.id] || acceptedAt,
        accepted_at: acceptedAt,
      },
    }))
    setViewer(null)
    setViewerReadyAt(null)
  }

  async function submit() {
    if (!userId) return
    if (!form.full_name.trim()) {
      setMessage({ type: "error", text: "Bitte gib deinen vollständigen Namen ein." })
      return
    }
    if (!form.birthdate) {
      setMessage({ type: "error", text: "Bitte gib dein Geburtsdatum ein." })
      return
    }
    if (!allRequiredAccepted) {
      setMessage({ type: "error", text: "Bitte lies und bestätige zuerst alle Pflichtdokumente." })
      return
    }
    if (!signature) {
      setMessage({ type: "error", text: "Bitte unterschreibe den Beitrittsantrag." })
      return
    }
    if (isMinor && (!guardianName.trim() || !guardianSignature)) {
      setMessage({ type: "error", text: "Bei Minderjährigen fehlt die Zustimmung der gesetzlichen Vertretung." })
      return
    }
    if (trialRequested === null) {
      setMessage({ type: "error", text: "Bitte wähle aus, ob du die kostenlose Testphase nutzen möchtest." })
      return
    }

    try {
      setSaving(true)
      setMessage(null)
      const now = new Date().toISOString()

      const acceptanceSnapshot = visibleDocuments
        .filter((doc) => accepted[doc.id])
        .map((doc) => accepted[doc.id])

      const { data, error } = await supabase
        .from("club_join_requests")
        .insert({
          user_id: userId,
          full_name: form.full_name.trim(),
          email: form.email.trim() || null,
          birthdate: form.birthdate || null,
          street: form.street.trim() || null,
          house_number: form.house_number.trim() || null,
          postal_code: form.postal_code.trim() || null,
          city: form.city.trim() || null,
          phone: form.phone.trim() || null,
          jersey_size: form.jersey_size.trim() || null,
          linked_spieldatenbank_id: linkedSpieldatenbankId,
          note: form.note.trim() || null,
          status: "pending",
          trial_requested: trialRequested,
          signature_data_url: signature,
          signed_at: now,
          document_acceptances: acceptanceSnapshot,
          documents_accepted_at: now,
          guardian_full_name: isMinor ? guardianName.trim() : null,
          guardian_signature_data_url: isMinor ? guardianSignature : null,
          guardian_signed_at: isMinor ? now : null,
        })
        .select("id,status,created_at")
        .single()

      if (error) throw error

      try {
        const notifyResponse = await fetch("/api/notify-new-request", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "club_join_request",
            fullName: form.full_name.trim(),
            email: form.email.trim(),
            phone: form.phone.trim(),
          }),
        })
        if (!notifyResponse.ok) {
          const notifyError = await notifyResponse.json().catch(() => null)
          console.error("[club-join] Info-Mail konnte nicht gesendet werden:", notifyError)
        }
      } catch (notifyError) {
        console.error("[club-join] Info-Mail Fehler:", notifyError)
      }

      setExisting(data as JoinRequestLite)
      setMessage({
        type: "success",
        text: "Deine Beitrittsanfrage wurde vollständig übermittelt. Bis zur Bestätigung bleibst du Gast.",
      })
    } catch (error: any) {
      setMessage({ type: "error", text: error?.message || "Die Beitrittsanfrage konnte nicht gesendet werden." })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="flex min-h-[420px] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-orange-600" /></div>
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-4 p-3 sm:p-6">
      <Card className="overflow-hidden rounded-2xl border-orange-200 shadow-sm">
        <div className="h-2 bg-orange-600" />
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="flex items-center gap-2 text-xl sm:text-2xl">
            <UserPlus className="h-6 w-6 text-orange-600" />
            Verein beitreten
          </CardTitle>
          <CardDescription className="text-sm sm:text-base">
            Deine Anfrage wird zuerst von der Vereinsleitung geprüft. Erst nach Freigabe kann eine gewünschte Testphase aktiviert werden.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-5 p-4 pt-0 sm:p-6 sm:pt-0">
          {existing?.status === "pending" ? (
            <div className="space-y-4 rounded-2xl border border-orange-200 bg-orange-50 p-5">
              <div>
                <div className="font-black text-orange-900">Beitrittsanfrage wird geprüft</div>
                <p className="mt-1 text-sm font-semibold text-orange-800">
                  Deine Unterlagen wurden übermittelt. Die Vereinsleitung prüft jetzt deine Anfrage.
                </p>
              </div>
              <Button asChild variant="outline" className="w-full rounded-xl border-orange-300 bg-white font-black text-orange-800 hover:bg-orange-100">
                <Link href="/guest-profile-app">Zurück zum Gastprofil</Link>
              </Button>
            </div>
          ) : existing?.status === "approved" ? (
            <div className="space-y-4 rounded-2xl border border-green-200 bg-green-50 p-5">
              <div>
                <div className="flex items-center gap-2 font-black text-green-900">
                  <CheckCircle2 className="h-5 w-5" /> Beitritt bestätigt
                </div>
                <p className="mt-1 text-sm font-semibold text-green-800">Du wurdest als Vereinsmitglied aufgenommen.</p>
              </div>
              <Button asChild className="w-full rounded-xl bg-green-700 font-black text-white hover:bg-green-800">
                <Link href="/member-profile-app">EMD VereinsApp öffnen</Link>
              </Button>
            </div>
          ) : (
            <>
              <section className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-orange-100 font-black text-orange-700">1</div>
                  <div>
                    <h2 className="font-black text-gray-900">Persönliche Daten</h2>
                    <p className="text-xs font-semibold text-gray-500">Bitte kontrolliere deine Angaben.</p>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Vorname</Label>
                    <Input value={firstName} readOnly className="bg-gray-100 text-gray-700" />
                    <p className="text-[11px] font-semibold text-gray-500">Aus deinem Gastkonto übernommen.</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Nachname</Label>
                    <Input value={lastName} readOnly className="bg-gray-100 text-gray-700" />
                    <p className="text-[11px] font-semibold text-gray-500">Aus deinem Gastkonto übernommen.</p>
                  </div>
                  <div className="space-y-2">
                    <Label>E-Mail</Label>
                    <Input type="email" value={form.email} readOnly className="bg-gray-100 text-gray-700" />
                  </div>
                  <div className="space-y-2">
                    <Label>Geburtsdatum *</Label>
                    <Input type="date" value={form.birthdate} onChange={(e) => setField("birthdate", e.target.value)} />
                    {isMinor ? (
                      <p className="rounded-lg bg-purple-50 px-3 py-2 text-xs font-bold text-purple-800">
                        Für Minderjährige werden automatisch die zusätzlich erforderlichen Dokumente und die Zustimmung der gesetzlichen Vertretung eingeblendet.
                      </p>
                    ) : null}
                  </div>
                  <div className="space-y-2"><Label>Straße</Label><Input value={form.street} onChange={(e) => setField("street", e.target.value)} /></div>
                  <div className="space-y-2"><Label>Hausnummer</Label><Input value={form.house_number} onChange={(e) => setField("house_number", e.target.value)} /></div>
                  <div className="space-y-2"><Label>PLZ</Label><Input value={form.postal_code} onChange={(e) => setField("postal_code", e.target.value)} /></div>
                  <div className="space-y-2"><Label>Ort</Label><Input value={form.city} onChange={(e) => setField("city", e.target.value)} /></div>
                  <div className="space-y-2"><Label>Telefon</Label><Input value={form.phone} onChange={(e) => setField("phone", e.target.value)} /></div>
                  <div className="space-y-2"><Label>Trikotgröße (optional)</Label><Input value={form.jersey_size} onChange={(e) => setField("jersey_size", e.target.value)} /></div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label>Nachricht an den Verein (optional)</Label>
                    <Textarea value={form.note} onChange={(e) => setField("note", e.target.value)} placeholder="Optionaler Hinweis..." />
                  </div>
                </div>
              </section>

              <section className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5">
                <div className="mb-4 flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-orange-100 font-black text-orange-700">2</div>
                  <div className="min-w-0">
                    <h2 className="font-black text-gray-900">Vereinsdokumente lesen & bestätigen</h2>
                    <p className="text-xs font-semibold text-gray-500">
                      Öffne die angezeigten Dokumente, lies sie vollständig und bestätige sie anschließend.
                    </p>
                  </div>
                </div>

                {visibleDocuments.length === 0 ? (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800">
                    Aktuell sind für deinen Beitritt keine Dokumente hinterlegt.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {visibleDocuments.map((doc, index) => {
                      const isAccepted = !!accepted[doc.id]
                      return (
                        <div key={doc.id} className={isAccepted ? "rounded-2xl border border-green-200 bg-green-50 p-4" : "rounded-2xl border border-gray-200 bg-gray-50 p-4"}>
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <FileText className="h-5 w-5 shrink-0 text-orange-600" />
                                <span className="font-black text-gray-900">{index + 1}. {doc.title}</span>
                              </div>
                              <div className="mt-1 text-xs font-semibold text-gray-500">{CATEGORY_LABELS[doc.category]}</div>
                            </div>
                            <Button type="button" variant={isAccepted ? "outline" : "default"} onClick={() => void openDocument(doc)} disabled={viewerLoading} className="w-full sm:w-auto">
                              {isAccepted ? <Check className="mr-2 h-4 w-4 text-green-700" /> : <ExternalLink className="mr-2 h-4 w-4" />}
                              {isAccepted ? "Erneut ansehen" : "Dokument öffnen"}
                            </Button>
                          </div>
                          <div className={isAccepted ? "mt-3 flex items-center gap-2 text-sm font-black text-green-800" : "mt-3 text-sm font-semibold text-gray-500"}>
                            {isAccepted ? <><FileCheck2 className="h-4 w-4" /> Gelesen und akzeptiert</> : opened[doc.id] ? "Geöffnet – Bestätigung noch ausständig" : "Noch nicht geöffnet"}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}

                <div className="mt-4 rounded-xl bg-gray-900 px-4 py-3 text-sm font-bold text-white">
                  Pflichtdokumente: {acceptedRequiredCount}/{requiredDocuments.length} bestätigt
                </div>
              </section>

              <section className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5">
                <div className="mb-4 flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-orange-100 font-black text-orange-700">3</div>
                  <div>
                    <h2 className="font-black text-gray-900">Digitale Unterschrift</h2>
                    <p className="text-xs font-semibold text-gray-500">Bestätigt deine Angaben und die akzeptierten Dokumente.</p>
                  </div>
                </div>

                <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm font-semibold text-blue-800">
                  Mit meiner Unterschrift bestätige ich, dass meine Angaben richtig sind und ich die oben bestätigten Dokumente gelesen und akzeptiert habe.
                </div>

                <div className="mt-4">
                  <SignaturePad label="Unterschrift Antragsteller/in *" onChange={setSignature} />
                </div>

                {isMinor ? (
                  <div className="mt-5 space-y-4 rounded-2xl border border-purple-200 bg-purple-50 p-4">
                    <div className="flex items-center gap-2 font-black text-purple-900"><ShieldCheck className="h-5 w-5" /> Zustimmung gesetzliche Vertretung</div>
                    <div className="space-y-2">
                      <Label>Vor- und Nachname der gesetzlichen Vertretung *</Label>
                      <Input value={guardianName} onChange={(e) => setGuardianName(e.target.value)} placeholder="Vor- und Nachname" />
                    </div>
                    <SignaturePad label="Unterschrift gesetzliche Vertretung *" onChange={setGuardianSignature} />
                  </div>
                ) : null}
              </section>

              <section className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5">
                <div className="mb-4 flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-orange-100 font-black text-orange-700">4</div>
                  <div>
                    <h2 className="font-black text-gray-900">Kostenlose Testphase</h2>
                    <p className="text-xs font-semibold text-gray-500">Eine Testphase wird erst nach Genehmigung deiner Beitrittsanfrage aktiviert.</p>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <button type="button" onClick={() => setTrialRequested(true)} className={trialRequested === true ? "rounded-2xl border-2 border-orange-600 bg-orange-50 p-4 text-left" : "rounded-2xl border-2 border-gray-200 bg-white p-4 text-left hover:border-orange-300"}>
                    <div className="flex items-center gap-2 font-black text-gray-900"><Sparkles className="h-5 w-5 text-orange-600" /> Ja, Testphase nutzen</div>
                    <div className="mt-1 text-xs font-semibold text-gray-500">Wird bei erfolgreicher Aufnahme automatisch freigeschaltet.</div>
                  </button>
                  <button type="button" onClick={() => setTrialRequested(false)} className={trialRequested === false ? "rounded-2xl border-2 border-gray-900 bg-gray-50 p-4 text-left" : "rounded-2xl border-2 border-gray-200 bg-white p-4 text-left hover:border-gray-400"}>
                    <div className="font-black text-gray-900">Nein, keine Testphase</div>
                    <div className="mt-1 text-xs font-semibold text-gray-500">Nach Aufnahme kannst du deine Mitgliedschaft regulär auswählen.</div>
                  </button>
                </div>
              </section>

              <div className="sticky bottom-3 z-10 rounded-2xl border border-gray-200 bg-white/95 p-3 shadow-xl backdrop-blur sm:static sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none">
                <Button type="button" onClick={() => void submit()} disabled={saving || !readyToSend} className="h-12 w-full rounded-xl bg-orange-600 text-base font-black text-white hover:bg-orange-700 disabled:opacity-50">
                  {saving ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Send className="mr-2 h-5 w-5" />}
                  Beitrittsanfrage verbindlich senden
                </Button>
                {!readyToSend ? <div className="mt-2 text-center text-xs font-semibold text-gray-500">Alle Pflichtfelder, Dokumente, Unterschriften und die Testphasen-Auswahl müssen vollständig sein.</div> : null}
              </div>
            </>
          )}

          {message ? (
            <div className={message.type === "success" ? "rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-bold text-green-800" : "rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-800"}>
              {message.text}
            </div>
          ) : null}
        </CardContent>
      </Card>

      {viewer ? (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-4">
          <div className="flex h-[96dvh] w-full max-w-5xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:h-[92vh] sm:rounded-2xl">
            <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
              <div className="min-w-0">
                <div className="truncate font-black text-gray-900">{viewer.doc.title}</div>
                <div className="text-xs font-semibold text-gray-500">{CATEGORY_LABELS[viewer.doc.category]}</div>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={() => { setViewer(null); setViewerReadyAt(null) }}>Schließen</Button>
            </div>

            <div className="min-h-0 flex-1 bg-gray-100 p-2 sm:p-3">
              <iframe src={`${viewer.url}#view=FitH`} title={viewer.doc.title} className="h-full w-full rounded-xl border bg-white" />
            </div>

            <div className="border-t bg-white p-3 sm:p-4">
              <div className="mb-3 text-xs font-semibold text-gray-600">
                Bitte lies das Dokument vollständig. Anschließend kannst du bestätigen, dass du es gelesen und akzeptiert hast.
              </div>
              <Button type="button" onClick={acceptViewer} disabled={!canConfirmViewer} className="h-12 w-full rounded-xl bg-green-600 font-black text-white hover:bg-green-700 disabled:bg-gray-300">
                {canConfirmViewer ? <CheckCircle2 className="mr-2 h-5 w-5" /> : <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                {canConfirmViewer ? "Vollständig gelesen & akzeptiert" : `Lesen… (${Math.max(0, 8 - Math.floor((Date.now() - (viewerReadyAt || Date.now())) / 1000))} s)`}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
