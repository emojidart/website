"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  CalendarDays,
  CheckCircle2,
  Eye,
  EyeOff,
  Mail,
  Phone,
  Search,
  Users,
  XCircle,
} from "lucide-react"

import { Header } from "@/components/header"
import { TournamentAdminNav } from "@/app/admin/_komponenten/turniere/turnier-navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { supabase } from "@/lib/supabase"

type Ev = {
  id: string
  name: string
  start_date: string
  event_date: string
  event_time: string | null
  location: string | null
  city: string | null
  max_participants: number | null
  registration_enabled: boolean
  show_participants: boolean
  registration_split_by_gender?: boolean
  men_max_participants?: number | null
  women_max_participants?: number | null
  men_reserved_slots?: number | null
  women_reserved_slots?: number | null
}

type Reg = {
  id: string
  event_id: string
  full_name: string
  player_name: string | null
  email: string
  phone: string | null
  status: "active" | "cancelled"
  registered_at: string
  cancelled_at: string | null
  division?: "men" | "women" | null
  source: "legacy" | "central"
}

export default function Page() {
  const [events, setEvents] = useState<Ev[]>([])
  const [regs, setRegs] = useState<Reg[]>([])
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<string>("")
  const [q, setQ] = useState("")
  const [selected, setSelected] = useState<string>("")
  const [menReservedInput, setMenReservedInput] = useState("")
  const [womenReservedInput, setWomenReservedInput] = useState("")

  async function api(method = "GET", body?: any) {
    const { data } = await supabase.auth.getSession()
    const token = data.session?.access_token

    const r = await fetch("/api/admin/public-tournament-registrations", {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
      cache: "no-store",
    })

    const d = await r.json().catch(() => null)
    if (!r.ok) throw new Error(d?.error || "Fehler")
    return d
  }

  async function load() {
    setLoading(true)
    try {
      const d = await api()
      setEvents(d.events || [])
      setRegs(d.registrations || [])
      if (!selected && d.events?.[0]) setSelected(d.events[0].id)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const event = events.find((e) => e.id === selected)

  const list = useMemo(
    () =>
      regs.filter(
        (r) =>
          r.event_id === selected &&
          r.status === "active" &&
          `${r.full_name} ${r.player_name || ""} ${r.email}`
            .toLowerCase()
            .includes(q.toLowerCase()),
      ),
    [regs, selected, q],
  )


  useEffect(() => {
    if (!event) return
    setMenReservedInput(String(event.men_reserved_slots ?? 0))
    setWomenReservedInput(String(event.women_reserved_slots ?? 0))
  }, [event?.id, event?.men_reserved_slots, event?.women_reserved_slots])

  const active = list
  const men = active.filter((r) => r.division === "men").length
  const women = active.filter((r) => r.division === "women").length
  const unassigned = active.filter((r) => !r.division).length

  async function patch(b: any) {
    setSavingId(String(b.id || "event"))
    try {
      await api("PATCH", b)
      await load()
    } finally {
      setSavingId("")
    }
  }

  return (
    <div className="min-h-screen bg-[#f7f7f8] pb-24">
      <Header />

      <TournamentAdminNav
        title="Öffentliche Anmeldungen"
        description="Öffentliche Turnieranmeldungen inkl. zentralem Turniersystem."
      />

      <main className="mx-auto max-w-[1600px] px-3 py-6 sm:px-5 lg:px-8">
        <div className="grid gap-5 lg:grid-cols-[360px_1fr]">
          <Card className="rounded-3xl">
            <CardContent className="p-4">
              <h2 className="text-lg font-black">Turniere</h2>

              <div className="mt-3 space-y-2">
                {loading ? (
                  <p className="text-sm text-slate-500">Lädt…</p>
                ) : (
                  events.map((e) => {
                    const eventRegs = regs.filter(
                      (r) => r.event_id === e.id && r.status === "active",
                    )

                    return (
                      <button
                        key={e.id}
                        onClick={() => setSelected(e.id)}
                        className={`w-full rounded-2xl border p-3 text-left ${
                          selected === e.id
                            ? "border-orange-300 bg-orange-50"
                            : "border-slate-200 bg-white"
                        }`}
                      >
                        <div className="font-black">{e.name}</div>
                        <div className="mt-1 text-xs text-slate-500">
                          {new Date(
                            `${e.start_date || e.event_date}T12:00:00`,
                          ).toLocaleDateString("de-DE")}{" "}
                          · {eventRegs.length}
                          {e.max_participants ? ` / ${e.max_participants}` : ""} angemeldet
                        </div>
                      </button>
                    )
                  })
                )}
              </div>
            </CardContent>
          </Card>

          <div className="space-y-5">
            {event ? (
              <>
                <Card className="rounded-3xl">
                  <CardContent className="p-5">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <div>
                        <div className="text-xs font-black uppercase tracking-wider text-orange-600">
                          Öffentliches Turnier
                        </div>

                        <h1 className="mt-1 text-2xl font-black">{event.name}</h1>

                        <div className="mt-2 flex flex-wrap gap-3 text-sm text-slate-500">
                          <span className="flex items-center gap-1">
                            <CalendarDays className="h-4 w-4" />
                            {new Date(
                              `${event.start_date || event.event_date}T12:00:00`,
                            ).toLocaleDateString("de-DE")}
                          </span>

                          <span className="flex items-center gap-1">
                            <Users className="h-4 w-4" />
                            {
                              regs.filter(
                                (r) =>
                                  r.event_id === event.id &&
                                  r.status === "active",
                              ).length
                            }
                            {event.max_participants
                              ? ` / ${event.max_participants}`
                              : ""}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="outline"
                          onClick={() =>
                            patch({
                              type: "event",
                              id: event.id,
                              registration_enabled:
                                !event.registration_enabled,
                            })
                          }
                        >
                          {event.registration_enabled ? (
                            <>
                              <XCircle className="mr-2 h-4 w-4" />
                              Anmeldung schließen
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="mr-2 h-4 w-4" />
                              Anmeldung öffnen
                            </>
                          )}
                        </Button>

                        <Button
                          variant="outline"
                          onClick={() =>
                            patch({
                              type: "event",
                              id: event.id,
                              show_participants: !event.show_participants,
                            })
                          }
                        >
                          {event.show_participants ? (
                            <>
                              <EyeOff className="mr-2 h-4 w-4" />
                              Liste verbergen
                            </>
                          ) : (
                            <>
                              <Eye className="mr-2 h-4 w-4" />
                              Liste anzeigen
                            </>
                          )}
                        </Button>

                        <Button asChild>
                          <Link
                            href={`/dach-veranstaltungen/${event.id}`}
                            target="_blank"
                          >
                            Öffentliche Seite
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {event.registration_split_by_gender ? (
                  <div className="grid gap-3 sm:grid-cols-3">
                    <Card className="rounded-3xl border-blue-200">
                      <CardContent className="p-4">
                        <div className="text-xs font-black uppercase text-blue-600">
                          Herren
                        </div>
                        <div className="mt-1 text-3xl font-black">
                          {men} / {event.men_max_participants ?? 0}
                        </div>
                        <div className="mt-1 text-xs font-bold text-slate-500">
                          {event.men_reserved_slots ?? 0} reserviert
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="rounded-3xl border-pink-200">
                      <CardContent className="p-4">
                        <div className="text-xs font-black uppercase text-pink-600">
                          Damen
                        </div>
                        <div className="mt-1 text-3xl font-black">
                          {women} / {event.women_max_participants ?? 0}
                        </div>
                        <div className="mt-1 text-xs font-bold text-slate-500">
                          {event.women_reserved_slots ?? 0} reserviert
                        </div>
                      </CardContent>
                    </Card>

                    <Card
                      className={`rounded-3xl ${
                        unassigned
                          ? "border-orange-300 bg-orange-50"
                          : "border-emerald-200 bg-emerald-50"
                      }`}
                    >
                      <CardContent className="p-4">
                        <div className="text-xs font-black uppercase text-slate-600">
                          Noch zuordnen
                        </div>
                        <div className="mt-1 text-3xl font-black">
                          {unassigned}
                        </div>
                        <div className="mt-1 text-xs font-bold text-slate-500">
                          {unassigned
                            ? "Bitte unten Herren/Damen anklicken"
                            : "Alles erledigt"}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                ) : null}

                {event.registration_split_by_gender ? (
                  <Card className="rounded-3xl border-orange-200">
                    <CardContent className="p-5">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                        <div>
                          <div className="text-xs font-black uppercase tracking-wider text-orange-600">
                            Platzkontingent
                          </div>
                          <h2 className="mt-1 text-xl font-black">
                            Reservierte Plätze manuell ändern
                          </h2>
                          <p className="mt-1 text-sm text-slate-500">
                            Nicht benötigte Plätze einfach auf 0 setzen oder jederzeit erhöhen/verringern.
                          </p>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-[150px_150px_auto]">
                          <div>
                            <label className="mb-1 block text-xs font-black uppercase text-slate-500">
                              Herren reserviert
                            </label>
                            <Input
                              type="number"
                              min={0}
                              max={event.men_max_participants ?? 64}
                              value={menReservedInput}
                              onChange={(e) => setMenReservedInput(e.target.value)}
                            />
                          </div>

                          <div>
                            <label className="mb-1 block text-xs font-black uppercase text-slate-500">
                              Damen reserviert
                            </label>
                            <Input
                              type="number"
                              min={0}
                              max={event.women_max_participants ?? 16}
                              value={womenReservedInput}
                              onChange={(e) => setWomenReservedInput(e.target.value)}
                            />
                          </div>

                          <Button
                            disabled={savingId === "capacity"}
                            onClick={() =>
                              patch({
                                type: "capacity",
                                id: event.id,
                                men_reserved_slots: Number(menReservedInput || 0),
                                women_reserved_slots: Number(womenReservedInput || 0),
                              })
                            }
                            className="bg-orange-600 font-black hover:bg-orange-700"
                          >
                            Kontingent speichern
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ) : null}

                <Card className="rounded-3xl">
                  <CardContent className="p-5">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h2 className="text-xl font-black">Teilnehmer</h2>
                        <p className="text-sm text-slate-500">
                          {active.length} aktive Einträge
                          {event.registration_split_by_gender
                            ? ` · ${unassigned} noch nicht zugeordnet`
                            : ""}
                        </p>
                      </div>

                      <div className="relative sm:w-80">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <Input
                          value={q}
                          onChange={(e) => setQ(e.target.value)}
                          placeholder="Name oder E-Mail suchen"
                          className="pl-9"
                        />
                      </div>
                    </div>

                    <div className="mt-4 overflow-x-auto">
                      <table className="w-full min-w-[1000px] text-sm">
                        <thead>
                          <tr className="border-b text-left text-xs uppercase text-slate-500">
                            <th className="p-3">Spieler</th>
                            <th className="p-3">Kontakt</th>
                            <th className="p-3">Angemeldet</th>
                            <th className="p-3">Status</th>
                            {event.registration_split_by_gender ? (
                              <th className="p-3">Bewerb</th>
                            ) : null}
                            <th className="p-3 text-right">Aktion</th>
                          </tr>
                        </thead>

                        <tbody>
                          {list.map((r) => (
                            <tr
                              key={`${r.source}-${r.id}`}
                              className={`border-b last:border-0 ${
                                event.registration_split_by_gender &&
                                r.status === "active" &&
                                !r.division
                                  ? "bg-orange-50/60"
                                  : ""
                              }`}
                            >
                              <td className="p-3">
                                <div className="font-bold">{r.full_name}</div>
                                {r.player_name &&
                                r.player_name !== r.full_name ? (
                                  <div className="text-xs text-slate-500">
                                    {r.player_name}
                                  </div>
                                ) : null}
                              </td>

                              <td className="p-3">
                                {r.email ? (
                                  <div className="flex items-center gap-1">
                                    <Mail className="h-3.5 w-3.5" />
                                    {r.email}
                                  </div>
                                ) : (
                                  <span className="text-slate-400">—</span>
                                )}

                                {r.phone ? (
                                  <div className="mt-1 flex items-center gap-1 text-slate-500">
                                    <Phone className="h-3.5 w-3.5" />
                                    {r.phone}
                                  </div>
                                ) : null}
                              </td>

                              <td className="p-3 text-slate-500">
                                {new Date(r.registered_at).toLocaleString("de-DE")}
                              </td>

                              <td className="p-3">
                                <span
                                  className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                                    r.status === "active"
                                      ? "bg-emerald-50 text-emerald-700"
                                      : "bg-slate-100 text-slate-500"
                                  }`}
                                >
                                  {r.status === "active"
                                    ? "Angemeldet"
                                    : "Abgemeldet"}
                                </span>
                              </td>

                              {event.registration_split_by_gender ? (
                                <td className="p-3">
                                  <div className="flex gap-2">
                                    <Button
                                      type="button"
                                      size="sm"
                                      disabled={
                                        savingId === r.id ||
                                        r.status !== "active"
                                      }
                                      variant={
                                        r.division === "men"
                                          ? "default"
                                          : "outline"
                                      }
                                      onClick={() =>
                                        patch({
                                          type: "division",
                                          id: r.id,
                                          source: r.source,
                                          division: "men",
                                        })
                                      }
                                    >
                                      Herren
                                    </Button>

                                    <Button
                                      type="button"
                                      size="sm"
                                      disabled={
                                        savingId === r.id ||
                                        r.status !== "active"
                                      }
                                      variant={
                                        r.division === "women"
                                          ? "default"
                                          : "outline"
                                      }
                                      onClick={() =>
                                        patch({
                                          type: "division",
                                          id: r.id,
                                          source: r.source,
                                          division: "women",
                                        })
                                      }
                                    >
                                      Damen
                                    </Button>
                                  </div>
                                </td>
                              ) : null}

                              <td className="p-3 text-right">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={savingId === r.id}
                                  onClick={() =>
                                    patch({
                                      type: "registration",
                                      id: r.id,
                                      source: r.source,
                                      status:
                                        r.status === "active"
                                          ? "cancelled"
                                          : "active",
                                    })
                                  }
                                >
                                  {r.status === "active"
                                    ? "Abmelden"
                                    : "Reaktivieren"}
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>

                      {!list.length ? (
                        <div className="py-12 text-center text-slate-500">
                          Keine Teilnehmer gefunden.
                        </div>
                      ) : null}
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card>
                <CardContent className="p-10 text-center text-slate-500">
                  Kein öffentliches Turnier ausgewählt.
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
