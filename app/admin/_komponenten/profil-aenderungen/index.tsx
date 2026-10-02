"use client"

import { useEffect, useMemo, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  CheckCircle2,
  Download,
  ImageUp,
  Loader2,
  RefreshCcw,
  UserRoundPen,
  XCircle,
} from "lucide-react"

type RequestRow = {
  id: string
  user_id: string
  club_player_id: string | null
  requester_type: "member" | "guest"
  request_type: "name" | "photo"
  current_name: string | null
  requested_name: string | null
  current_photo_url: string | null
  upload_bucket: string | null
  upload_path: string | null
  original_filename: string | null
  status: "pending" | "approved" | "rejected" | "cancelled"
  admin_note: string | null
  processed_photo_url: string | null
  created_at: string
  reviewed_at: string | null
}

type Filter = "pending" | "all" | "name" | "photo"

function fmtDate(value: string) {
  try {
    return new Date(value).toLocaleString("de-AT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  } catch {
    return value
  }
}

export function AdminProfileChangeRequests({
  onPendingCountChange,
}: {
  onPendingCountChange?: (count: number) => void
}) {
  const [rows, setRows] = useState<RequestRow[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [filter, setFilter] = useState<Filter>("pending")
  const [message, setMessage] = useState("")
  const [rejectNotes, setRejectNotes] = useState<Record<string, string>>({})
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({})
  const [processedFiles, setProcessedFiles] = useState<Record<string, File | null>>({})

  const load = async () => {
    setLoading(true)
    setMessage("")
    try {
      const { data, error } = await supabase
        .from("profile_change_requests")
        .select("*")
        .order("created_at", { ascending: false })

      if (error) throw error

      const nextRows = (data || []) as RequestRow[]
      setRows(nextRows)

      const pending = nextRows.filter((row) => row.status === "pending").length
      onPendingCountChange?.(pending)

      const photoRows = nextRows.filter(
        (row) => row.request_type === "photo" && row.status === "pending" && row.upload_bucket && row.upload_path,
      )

      const urlEntries = await Promise.all(
        photoRows.map(async (row) => {
          const { data: signed, error: signedError } = await supabase.storage
            .from(row.upload_bucket!)
            .createSignedUrl(row.upload_path!, 60 * 60)

          if (signedError || !signed?.signedUrl) return [row.id, ""] as const
          return [row.id, signed.signedUrl] as const
        }),
      )

      setSignedUrls(Object.fromEntries(urlEntries))
    } catch (error: any) {
      console.error("Admin profile change requests load error:", error)
      setRows([])
      setMessage(error?.message || "Profiländerungen konnten nicht geladen werden.")
      onPendingCountChange?.(0)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()

    const channel = supabase
      .channel("admin_profile_change_requests")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profile_change_requests" },
        () => void load(),
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const visibleRows = useMemo(() => {
    if (filter === "pending") return rows.filter((row) => row.status === "pending")
    if (filter === "name") return rows.filter((row) => row.request_type === "name")
    if (filter === "photo") return rows.filter((row) => row.request_type === "photo")
    return rows
  }, [filter, rows])

  const pendingCount = rows.filter((row) => row.status === "pending").length
  const pendingNameCount = rows.filter((row) => row.status === "pending" && row.request_type === "name").length
  const pendingPhotoCount = rows.filter((row) => row.status === "pending" && row.request_type === "photo").length

  const approveName = async (row: RequestRow) => {
    setBusyId(row.id)
    setMessage("")
    try {
      const { error } = await supabase.rpc("admin_approve_profile_name_request", {
        p_request_id: row.id,
      })
      if (error) throw error
      setMessage(`Namensänderung für ${row.current_name || "Mitglied"} wurde übernommen.`)
      await load()
    } catch (error: any) {
      console.error("Approve name request error:", error)
      setMessage(error?.message || "Namensänderung konnte nicht übernommen werden.")
    } finally {
      setBusyId(null)
    }
  }

  const reject = async (row: RequestRow) => {
    setBusyId(row.id)
    setMessage("")
    try {
      const { error } = await supabase.rpc("admin_reject_profile_change_request", {
        p_request_id: row.id,
        p_admin_note: rejectNotes[row.id] || null,
      })
      if (error) throw error
      setMessage("Anfrage wurde abgelehnt.")
      await load()
    } catch (error: any) {
      console.error("Reject request error:", error)
      setMessage(error?.message || "Anfrage konnte nicht abgelehnt werden.")
    } finally {
      setBusyId(null)
    }
  }

  const completePhoto = async (row: RequestRow) => {
    const file = processedFiles[row.id]
    if (!file) {
      setMessage("Bitte zuerst das fertig bearbeitete Profilbild auswählen.")
      return
    }

    setBusyId(row.id)
    setMessage("")

    try {
      const rawExt = (file.name.split(".").pop() || "jpg").toLowerCase()
      const ext = ["jpg", "jpeg", "png", "webp"].includes(rawExt) ? rawExt : "jpg"
      const cleanName = String(row.current_name || "spieler")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9_-]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "")
        .toLowerCase()

      const path = `${row.club_player_id || row.user_id}/${cleanName || "spieler"}-${Date.now()}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from("profile-processed-avatars")
        .upload(path, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type || `image/${ext}`,
        })

      if (uploadError) throw uploadError

      const { data: publicData } = supabase.storage
        .from("profile-processed-avatars")
        .getPublicUrl(path)

      const { error: completeError } = await supabase.rpc(
        "admin_complete_profile_photo_request",
        {
          p_request_id: row.id,
          p_processed_photo_url: publicData.publicUrl,
        },
      )

      if (completeError) throw completeError

      setProcessedFiles((current) => ({ ...current, [row.id]: null }))
      setMessage(`Neues Profilbild für ${row.current_name || "Mitglied"} wurde übernommen.`)
      await load()
    } catch (error: any) {
      console.error("Complete photo request error:", error)
      setMessage(error?.message || "Profilbild konnte nicht übernommen werden.")
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="space-y-5">
      <Card className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
        <CardHeader className="border-b border-slate-100">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="text-xs font-black uppercase tracking-[0.16em] text-orange-600">
                Verein · Profile
              </div>
              <CardTitle className="mt-1 text-2xl font-black text-slate-950">
                Profiländerungen
              </CardTitle>
              <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-slate-500">
                Namensänderungen prüfen und neue Mitgliederfotos herunterladen, bearbeiten und anschließend als einheitliches Vereinsfoto übernehmen.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Badge className="rounded-full bg-orange-100 px-3 py-1.5 font-black text-orange-700 hover:bg-orange-100">
                {pendingCount} offen
              </Badge>
              <Button variant="outline" onClick={() => void load()} disabled={loading} className="rounded-xl">
                <RefreshCcw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                Aktualisieren
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-6">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              ["pending", `Offen (${pendingCount})`],
              ["name", `Namen (${pendingNameCount})`],
              ["photo", `Fotos (${pendingPhotoCount})`],
              ["all", `Alle (${rows.length})`],
            ].map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setFilter(key as Filter)}
                className={`min-h-11 rounded-xl border px-3 text-sm font-black transition ${
                  filter === key
                    ? "border-orange-300 bg-orange-50 text-orange-700"
                    : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {message ? (
            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700">
              {message}
            </div>
          ) : null}
        </CardContent>
      </Card>

      {loading ? (
        <Card>
          <CardContent className="flex items-center justify-center gap-3 py-14 text-sm font-bold text-slate-500">
            <Loader2 className="h-5 w-5 animate-spin text-orange-500" />
            Profiländerungen werden geladen …
          </CardContent>
        </Card>
      ) : visibleRows.length === 0 ? (
        <Card>
          <CardContent className="py-14 text-center">
            <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-500" />
            <div className="mt-3 text-lg font-black text-slate-900">Keine Anfragen in diesem Bereich</div>
            <div className="mt-1 text-sm font-medium text-slate-500">Hier ist aktuell nichts zu bearbeiten.</div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {visibleRows.map((row) => {
            const busy = busyId === row.id
            const isPending = row.status === "pending"

            return (
              <Card key={row.id} className="overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-sm">
                <CardContent className="p-0">
                  <div className="flex flex-col gap-4 border-b border-slate-100 p-5 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex items-start gap-4">
                      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
                        row.request_type === "photo"
                          ? "bg-violet-50 text-violet-600"
                          : "bg-orange-50 text-orange-600"
                      }`}>
                        {row.request_type === "photo"
                          ? <ImageUp className="h-6 w-6" />
                          : <UserRoundPen className="h-6 w-6" />}
                      </div>

                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="text-lg font-black text-slate-950">
                            {row.current_name || "Mitglied"}
                          </div>
                          <Badge variant="outline" className="rounded-full">
                            {row.request_type === "photo" ? "Profilbild" : "Name"}
                          </Badge>
                          <Badge
                            className={`rounded-full ${
                              row.status === "pending"
                                ? "bg-amber-100 text-amber-800 hover:bg-amber-100"
                                : row.status === "approved"
                                  ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-100"
                                  : row.status === "rejected"
                                    ? "bg-red-100 text-red-700 hover:bg-red-100"
                                    : "bg-slate-100 text-slate-600 hover:bg-slate-100"
                            }`}
                          >
                            {row.status === "pending"
                              ? "Offen"
                              : row.status === "approved"
                                ? "Erledigt"
                                : row.status === "rejected"
                                  ? "Abgelehnt"
                                  : "Ersetzt"}
                          </Badge>
                        </div>
                        <div className="mt-1 text-xs font-semibold text-slate-400">
                          Angefragt am {fmtDate(row.created_at)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {row.request_type === "name" ? (
                    <div className="grid gap-4 p-5 lg:grid-cols-[1fr_auto_1fr] lg:items-center">
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <div className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">Aktuell</div>
                        <div className="mt-1 text-lg font-black text-slate-700">{row.current_name || "—"}</div>
                      </div>

                      <div className="hidden text-xl font-black text-slate-300 lg:block">→</div>

                      <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4">
                        <div className="text-[10px] font-black uppercase tracking-[0.14em] text-orange-500">Gewünscht</div>
                        <div className="mt-1 text-lg font-black text-orange-950">{row.requested_name || "—"}</div>
                      </div>
                    </div>
                  ) : (
                    <div className="grid gap-5 p-5 lg:grid-cols-2">
                      <div>
                        <div className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">Aktuelles Vereinsfoto</div>
                        <div className="mt-3 flex min-h-[220px] items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 p-4">
                          {row.current_photo_url ? (
                            <img src={row.current_photo_url} alt="" className="max-h-[280px] max-w-full rounded-xl object-contain" />
                          ) : (
                            <div className="text-sm font-bold text-slate-400">Kein aktuelles Foto</div>
                          )}
                        </div>
                      </div>

                      <div>
                        <div className="text-[10px] font-black uppercase tracking-[0.14em] text-violet-500">Neu eingereichtes Foto</div>
                        <div className="mt-3 flex min-h-[220px] items-center justify-center overflow-hidden rounded-2xl border border-violet-200 bg-violet-50/40 p-4">
                          {signedUrls[row.id] ? (
                            <img src={signedUrls[row.id]} alt="" className="max-h-[280px] max-w-full rounded-xl object-contain" />
                          ) : (
                            <div className="text-sm font-bold text-slate-400">Vorschau nicht verfügbar</div>
                          )}
                        </div>

                        {signedUrls[row.id] ? (
                          <a
                            href={signedUrls[row.id]}
                            download={row.original_filename || "profilfoto"}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-3 flex h-11 items-center justify-center rounded-xl border border-violet-200 bg-violet-50 text-sm font-black text-violet-700 transition hover:bg-violet-100"
                          >
                            <Download className="mr-2 h-4 w-4" />
                            Original herunterladen
                          </a>
                        ) : null}
                      </div>
                    </div>
                  )}

                  {isPending ? (
                    <div className="border-t border-slate-100 bg-slate-50/70 p-5">
                      {row.request_type === "photo" ? (
                        <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                          <div className="text-sm font-black text-emerald-950">Fertig bearbeitetes Vereinsfoto hochladen</div>
                          <div className="mt-1 text-xs font-semibold leading-5 text-emerald-800/70">
                            Erst Original herunterladen und bearbeiten. Danach hier die fertige Version auswählen – erst dann wird das Profilbild des Mitglieds ersetzt.
                          </div>
                          <Input
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            className="mt-3 bg-white"
                            onChange={(event) => {
                              const file = event.target.files?.[0] || null
                              setProcessedFiles((current) => ({ ...current, [row.id]: file }))
                            }}
                          />
                        </div>
                      ) : null}

                      <div className="grid gap-3 lg:grid-cols-[1fr_auto_auto]">
                        <Input
                          value={rejectNotes[row.id] || ""}
                          onChange={(event) =>
                            setRejectNotes((current) => ({ ...current, [row.id]: event.target.value }))
                          }
                          placeholder="Optionaler Hinweis bei Ablehnung"
                          className="bg-white"
                        />

                        <Button
                          type="button"
                          variant="outline"
                          disabled={busy}
                          onClick={() => void reject(row)}
                          className="border-red-200 bg-white text-red-700 hover:bg-red-50"
                        >
                          {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <XCircle className="mr-2 h-4 w-4" />}
                          Ablehnen
                        </Button>

                        {row.request_type === "name" ? (
                          <Button
                            type="button"
                            disabled={busy}
                            onClick={() => void approveName(row)}
                            className="bg-emerald-600 font-black text-white hover:bg-emerald-500"
                          >
                            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                            Namen übernehmen
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            disabled={busy || !processedFiles[row.id]}
                            onClick={() => void completePhoto(row)}
                            className="bg-emerald-600 font-black text-white hover:bg-emerald-500 disabled:opacity-40"
                          >
                            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImageUp className="mr-2 h-4 w-4" />}
                            Bearbeitetes Foto übernehmen
                          </Button>
                        )}
                      </div>
                    </div>
                  ) : row.admin_note ? (
                    <div className="border-t border-slate-100 bg-slate-50 p-5 text-sm font-semibold text-slate-600">
                      Admin-Hinweis: {row.admin_note}
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
