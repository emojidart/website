"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Header } from "@/components/header"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { supabase } from "@/lib/supabase"
import { CalendarDays, CheckCircle2, Clock3, DoorOpen, Loader2, LockKeyhole, Save, XCircle } from "lucide-react"

type Opening = {
  id: string
  open_date: string
  status: "planned" | "open" | "closed"
  opens_at: string | null
  closes_at: string | null
  note: string | null
  updated_at: string
}

function viennaDateISO(offsetDays = 0) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Vienna",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(Date.now() + offsetDays * 86400000))
  const get = (type: string) => parts.find((p) => p.type === type)?.value || ""
  return `${get("year")}-${get("month")}-${get("day")}`
}

function shortTime(value?: string | null) {
  if (!value) return ""
  return value.slice(0, 5)
}

function formatDate(iso: string) {
  return new Date(`${iso}T12:00:00`).toLocaleDateString("de-AT", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
  })
}

export default function ClubhousePage() {
  const [rows, setRows] = useState<Opening[]>([])
  const [loading, setLoading] = useState(true)
  const [canManage, setCanManage] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState("")

  const today = viennaDateISO()
  const [planDate, setPlanDate] = useState(today)
  const [opensAt, setOpensAt] = useState("18:00")
  const [closesAt, setClosesAt] = useState("23:00")
  const [note, setNote] = useState("")

  const loadOpenings = useCallback(async () => {
    const until = viennaDateISO(30)
    const { data, error } = await supabase
      .from("clubhouse_openings")
      .select("id,open_date,status,opens_at,closes_at,note,updated_at")
      .gte("open_date", today)
      .lte("open_date", until)
      .order("open_date", { ascending: true })

    if (!error) setRows((data || []) as Opening[])
    setLoading(false)
  }, [today])

  const loadPermission = useCallback(async () => {
    const { data: auth } = await supabase.auth.getUser()
    const userId = auth.user?.id

    if (!userId) {
      setCanManage(false)
      return
    }

    const { data: profile, error: profileError } = await supabase
      .from("user_profiles")
      .select("player_id")
      .eq("user_id", userId)
      .maybeSingle()

    if (profileError || !profile?.player_id) {
      setCanManage(false)
      return
    }

    const { data: permission, error: permissionError } = await supabase
      .from("user_page_permissions")
      .select("allowed")
      .eq("player_id", profile.player_id)
      .eq("page_key", "clubhouse")
      .maybeSingle()

    setCanManage(!permissionError && permission?.allowed === true)
  }, [])

  useEffect(() => {
    void loadOpenings()
    void loadPermission()

    const channel = supabase
      .channel("clubhouse_public_status")
      .on("postgres_changes", { event: "*", schema: "public", table: "clubhouse_openings" }, () => void loadOpenings())
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [loadOpenings, loadPermission])

  const todayRow = rows.find((row) => row.open_date === today) || null
  const upcoming = useMemo(() => rows.filter((row) => row.open_date > today && row.status !== "closed").slice(0, 8), [rows, today])

  async function saveDay(status: Opening["status"], opts?: { date?: string; push?: boolean }) {
    setSaving(true)
    setMessage("")
    const { data: auth } = await supabase.auth.getUser()
    const userId = auth.user?.id
    if (!userId) {
      setMessage("Bitte zuerst anmelden.")
      setSaving(false)
      return
    }

    const date = opts?.date || today
    const payload = {
      open_date: date,
      status,
      opens_at: opensAt || null,
      closes_at: closesAt || null,
      note: note.trim() || null,
      updated_by: userId,
      updated_at: new Date().toISOString(),
      created_by: userId,
    }

    const { error } = await supabase.from("clubhouse_openings").upsert(payload, { onConflict: "open_date" })
    if (error) {
      setMessage(`Fehler: ${error.message}`)
      setSaving(false)
      return
    }

    if (opts?.push && (status === "open" || status === "closed")) {
      try {
        await fetch("/api/push/clubhouse", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ open_date: date }),
        })
      } catch {}
    }

    setMessage(status === "open" ? "Vereinsheim wurde als geöffnet eingetragen." : status === "closed" ? "Für heute wurde geschlossen eingetragen." : "Öffnungszeit wurde geplant.")
    await loadOpenings()
    setSaving(false)
  }

  return (
    <div className="min-h-[100dvh] w-full overflow-x-hidden bg-slate-50 pb-24">
      <Header />
      <div className="h-12 sm:h-14" aria-hidden="true" />

      <main className="w-full px-3 py-4 sm:px-5 sm:py-6 lg:px-6 xl:px-8">
        <section className="w-full overflow-hidden rounded-[24px] bg-slate-950 text-white shadow-xl sm:rounded-[30px]">
          <div className="p-4 sm:p-6 lg:p-8 xl:p-10">
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-orange-300">
              <DoorOpen className="h-4 w-4" />
              EMD Vereinsheim
            </div>
            <h1 className="mt-3 text-[2rem] font-black leading-tight tracking-tight sm:text-4xl lg:text-5xl">Ist heute offen?</h1>
            <p className="mt-2 max-w-3xl text-sm font-semibold leading-relaxed text-white/55 sm:text-base lg:text-lg">
              Hier siehst du, ob das Pfeil OK heute geöffnet ist und wann es das nächste Mal offen hat.
            </p>

            <div className="mt-5 rounded-[22px] border border-white/10 bg-white/[0.06] p-4 sm:mt-6 sm:rounded-3xl sm:p-6 lg:p-7">
              {loading ? (
                <div className="flex items-center gap-3 text-white/70"><Loader2 className="h-5 w-5 animate-spin" /> Status wird geladen…</div>
              ) : todayRow?.status === "open" ? (
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-emerald-400/15 px-3 py-1.5 text-sm font-black text-emerald-300">
                    <CheckCircle2 className="h-4 w-4" /> HEUTE GEÖFFNET
                  </div>
                  <div className="mt-4 break-words text-2xl font-black leading-tight sm:text-3xl">
                    {todayRow.opens_at ? `ab ${shortTime(todayRow.opens_at)} Uhr` : "ab sofort"}
                    {todayRow.closes_at ? ` · bis ca. ${shortTime(todayRow.closes_at)} Uhr` : ""}
                  </div>
                  {todayRow.note ? <p className="mt-2 text-base font-semibold text-white/65">{todayRow.note}</p> : null}
                </div>
              ) : todayRow?.status === "planned" ? (
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-sky-400/15 px-3 py-1.5 text-sm font-black text-sky-300">
                    <CalendarDays className="h-4 w-4" /> HEUTE GEPLANT GEÖFFNET
                  </div>
                  <div className="mt-4 break-words text-2xl font-black leading-tight sm:text-3xl">
                    {todayRow.opens_at ? `ab ${shortTime(todayRow.opens_at)} Uhr` : "Öffnung geplant"}
                    {todayRow.closes_at ? ` · bis ca. ${shortTime(todayRow.closes_at)} Uhr` : ""}
                  </div>
                  {todayRow.note ? <p className="mt-2 text-base font-semibold text-white/65">{todayRow.note}</p> : null}
                </div>
              ) : todayRow?.status === "closed" ? (
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-red-400/15 px-3 py-1.5 text-sm font-black text-red-300">
                    <XCircle className="h-4 w-4" /> HEUTE GESCHLOSSEN
                  </div>
                  {todayRow.note ? <p className="mt-4 text-base font-semibold text-white/65">{todayRow.note}</p> : null}
                </div>
              ) : (
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-sm font-black text-white/70">
                    <Clock3 className="h-4 w-4" /> NOCH KEINE INFO
                  </div>
                  <div className="mt-4 break-words text-xl font-black leading-tight sm:text-2xl">Für heute wurde noch keine Öffnung eingetragen.</div>
                  <p className="mt-2 text-sm font-semibold text-white/50">Sobald jemand aufsperrt oder eine Öffnung plant, erscheint es hier.</p>
                </div>
              )}
            </div>
          </div>
        </section>

        {canManage ? (
          <section className="mt-4 w-full sm:mt-5">
            <Card className="w-full overflow-hidden rounded-[22px] border-orange-200 shadow-sm sm:rounded-3xl">
              <CardContent className="p-4 sm:p-6 lg:p-7">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-orange-100"><LockKeyhole className="h-5 w-5 text-orange-700" /></div>
                  <div>
                    <div className="font-black text-slate-950">Vereinsheim verwalten</div>
                    <div className="text-sm font-semibold text-slate-500">Nur für freigeschaltete Personen sichtbar.</div>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <Button disabled={saving} onClick={() => void saveDay("open", { push: true })} className="min-h-14 w-full whitespace-normal rounded-2xl bg-emerald-600 px-4 py-3 text-base font-black leading-tight hover:bg-emerald-700">
                    <DoorOpen className="mr-2 h-5 w-5" /> Jetzt geöffnet
                  </Button>
                  <Button disabled={saving} onClick={() => void saveDay("closed", { push: true })} variant="outline" className="min-h-14 w-full whitespace-normal rounded-2xl border-red-200 px-4 py-3 text-base font-black leading-tight text-red-700 hover:bg-red-50">
                    <XCircle className="mr-2 h-5 w-5" /> Heute geschlossen
                  </Button>
                </div>

                <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div><Label>Datum</Label><Input type="date" min={today} value={planDate} onChange={(e) => setPlanDate(e.target.value)} className="mt-1.5 h-11" /></div>
                  <div><Label>Von</Label><Input type="time" value={opensAt} onChange={(e) => setOpensAt(e.target.value)} className="mt-1.5 h-11" /></div>
                  <div><Label>Bis ca.</Label><Input type="time" value={closesAt} onChange={(e) => setClosesAt(e.target.value)} className="mt-1.5 h-11" /></div>
                </div>
                <div className="mt-4"><Label>Hinweis (optional)</Label><Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="z. B. Heute spontaner Spielabend – jeder ist willkommen 🎯" className="mt-1.5 min-h-20" /></div>
                <Button disabled={saving || !planDate} onClick={() => void saveDay("planned", { date: planDate })} className="mt-4 min-h-12 w-full whitespace-normal rounded-xl bg-slate-950 px-4 py-3 font-black leading-tight hover:bg-slate-800">
                  {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Öffnung planen / speichern
                </Button>
                {message ? <div className="mt-3 rounded-xl bg-slate-100 px-4 py-3 text-sm font-bold text-slate-700">{message}</div> : null}
              </CardContent>
            </Card>
          </section>
        ) : null}

        <section className="mt-6 w-full sm:mt-7">
          <div className="mb-3 flex flex-col items-start justify-between gap-2 sm:flex-row sm:items-end sm:gap-3">
            <div><div className="text-xs font-black uppercase tracking-wider text-orange-600">Vorschau</div><h2 className="text-xl font-black text-slate-950">Nächste Öffnungen</h2></div>
            <Link href="/" className="text-sm font-black text-slate-500 hover:text-slate-900">Zur Startseite</Link>
          </div>

          {upcoming.length ? (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              {upcoming.map((row) => (
                <div key={row.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="font-black capitalize text-slate-950">{formatDate(row.open_date)}</div>
                  <div className="mt-1 text-sm font-bold text-slate-600">
                    {row.opens_at ? `${shortTime(row.opens_at)} Uhr` : "Zeit folgt"}{row.closes_at ? ` – ${shortTime(row.closes_at)} Uhr` : ""}
                  </div>
                  {row.note ? <div className="mt-2 text-sm font-semibold text-slate-500">{row.note}</div> : null}
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm font-semibold text-slate-500">Aktuell sind keine weiteren Öffnungen geplant.</div>
          )}
        </section>
      </main>
      <MobileBottomNav />
    </div>
  )
}
