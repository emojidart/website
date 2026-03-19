"use client"

import { useEffect, useMemo, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Building2,
  Calendar,
  CheckCircle2,
  Copy,
  FileDown,
  KeyRound,
  Link2,
  Link2Off,
  Loader2,
  Mail,
  MapPin,
  RefreshCw,
  ShieldAlert,
  UserCheck,
  XCircle,
} from "lucide-react"
import type { ClubPlayer } from "@/components/vereinsverwaltung/types"

type Team = { id: string; name: string }
type TeamMember = { player_id: string; team_id: string; role: string | null }
type UserProfileLite = { player_id: string | null; user_id: string | null }

type GeneratedCodeRow = {
  id: string
  player_id: string
  player_name: string
  code: string
  created_at: string
  used_at: string | null
}

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  player: ClubPlayer | null
  onCodeChanged?: () => void | Promise<void>
}

const QR_TARGET_BASE_URL = "https://emojisdartverein.com/member-account-request"

function generateCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
  const part = (len: number) =>
    Array.from({ length: len }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("")
  return `QR-${part(4)}-${part(3)}`
}

function formatDateTime(d: string) {
  return new Date(d).toLocaleString("de-DE", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function fmtDateISO(d: string | null | undefined) {
  if (!d) return "—"
  const s = String(d)
  const iso = s.includes("T") ? s.split("T")[0] : s
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return s
  const [y, m, day] = iso.split("-")
  return `${day}.${m}.${y}`
}

function fmtText(v: unknown) {
  const s = v == null ? "" : String(v)
  return s.trim().length > 0 ? s : "—"
}

async function buildModernPdf(opts: {
  title: string
  items: Array<{ name: string; code: string; teamLabel: string }>
  filename: string
}) {
  const [{ jsPDF }, QRCode] = await Promise.all([
  import("jspdf/dist/jspdf.umd"),
  import("qrcode"),
])

  const doc = new jsPDF({ unit: "mm", format: "a4", compress: true })

  // @ts-ignore
  if (typeof doc.setCharSpace === "function") doc.setCharSpace(0)

  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()

  const margin = 16
  const cardW = pageW - margin * 2
  const headerH = 18
  const footerH = 10
  const cardH = pageH - margin * 2 - headerH - footerH

  const drawHeader = (pageNumber: number) => {
    doc.setFont("helvetica", "bold")
    doc.setFontSize(16)
    doc.setTextColor(20)
    doc.text(opts.title, margin, margin + 6)

    doc.setFont("helvetica", "normal")
    doc.setFontSize(10)
    doc.setTextColor(90)
    doc.text(
      `Erstellt: ${new Date().toLocaleString("de-DE")}  •  Anzahl: ${opts.items.length}`,
      margin,
      margin + 12
    )

    doc.setDrawColor(220)
    doc.line(margin, margin + headerH - 2, pageW - margin, margin + headerH - 2)

    doc.setTextColor(130)
    doc.setFontSize(9)
    doc.text(`Seite ${pageNumber}`, pageW - margin, pageH - margin, { align: "right" })
    doc.setTextColor(0)
  }

  const drawCard = async (x: number, y: number, item: { name: string; code: string; teamLabel: string }) => {
    // @ts-ignore
    if (typeof doc.setCharSpace === "function") doc.setCharSpace(0)

    const pad = 10

    doc.setDrawColor(230)
    doc.setFillColor(255, 255, 255)
    doc.roundedRect(x, y, cardW, cardH, 6, 6, "FD")

    doc.setFillColor(30, 41, 59)
    doc.roundedRect(x, y, cardW, 14, 6, 6, "F")

    doc.setFont("helvetica", "bold")
    doc.setFontSize(13)
    doc.setTextColor(255)
    const team = (item.teamLabel || "Ohne Team").trim()
    doc.text(team.length > 50 ? team.slice(0, 50) + "…" : team, x + pad, y + 9.5)

    const top = y + 20

    doc.setFont("helvetica", "bold")
    doc.setFontSize(22)
    doc.setTextColor(20)

    const nameMaxW = cardW - pad * 2
    const nameLines = doc.splitTextToSize(item.name, nameMaxW).slice(0, 2)
    const nameY = top + 10
    doc.text(nameLines, x + cardW / 2, nameY, { align: "center", lineHeightFactor: 1.15 })

    const qrSize = 70
    const qrX = x + (cardW - qrSize) / 2
    const qrY = nameY + nameLines.length * 11 + 10

    doc.setDrawColor(230)
    doc.setFillColor(255, 255, 255)
    doc.roundedRect(qrX - 4, qrY - 4, qrSize + 8, qrSize + 8, 6, 6, "FD")

    if (item.code) {
      const url = `${QR_TARGET_BASE_URL}?code=${encodeURIComponent(item.code)}`
      const dataUrl = await QRCode.toDataURL(url, {
        margin: 1,
        scale: 8,
        errorCorrectionLevel: "M",
      })
      doc.addImage(dataUrl, "PNG", qrX, qrY, qrSize, qrSize)
    }

    const codeText = item.code || "—"
    const labelY = qrY + qrSize + 14
    const badgeCenterY = labelY + 14

    doc.setFont("helvetica", "normal")
    doc.setFontSize(12)
    doc.setTextColor(90)
    doc.text("Mitglieder-Code", x + cardW / 2, labelY, { align: "center" })

    doc.setFont("helvetica", "bold")
    doc.setFontSize(18)
    doc.setTextColor(30)

    const badgePadding = 18
    const badgeH = 18
    const badgeW = Math.min(cardW - pad * 2, doc.getTextWidth(codeText) + badgePadding * 2)
    const badgeX = x + (cardW - badgeW) / 2
    const badgeY = badgeCenterY - badgeH / 2

    doc.setFillColor(238, 242, 255)
    doc.setDrawColor(220)
    doc.roundedRect(badgeX, badgeY, badgeW, badgeH, 7, 7, "FD")

    doc.text(codeText, x + cardW / 2, badgeCenterY + 5, { align: "center" })

    const instrTop = y + cardH - 64
    doc.setDrawColor(235)
    doc.line(x + pad, instrTop - 10, x + cardW - pad, instrTop - 10)

    doc.setFont("helvetica", "bold")
    doc.setFontSize(12)
    doc.setTextColor(40)
    doc.text("Anleitung", x + pad, instrTop)

    doc.setFont("helvetica", "normal")
    doc.setFontSize(11)
    doc.setTextColor(60)

    const instrW = cardW - pad * 2
    const lines = [
      "1) QR-Code scannen oder Link öffnen:",
      "   emojisdartverein.com/member-account-request",
      "2) Code eingeben (Einmalcode) – Prüfung, ob du das bist.",
      "3) E-Mail-Adresse eingeben und Passwort vergeben.",
      "   (Dein Name wird automatisch gesetzt.)",
      "4) Bestätigungs-Mail öffnen (auch Spam/Junk prüfen) und bestätigen.",
      "5) Danach sofort einloggen.",
    ]

    const wrapped: string[] = []
    for (const l of lines) wrapped.push(...doc.splitTextToSize(l, instrW))
    doc.text(wrapped, x + pad, instrTop + 9, { lineHeightFactor: 1.25 })

    doc.setTextColor(0)
  }

  let page = 1
  drawHeader(page)

  let idx = 0
  for (const item of opts.items) {
    const x = margin
    const y = margin + headerH

    await drawCard(x, y, item)

    idx++
    if (idx < opts.items.length) {
      doc.addPage()
      page++
      drawHeader(page)
    }
  }

  doc.save(opts.filename)
}

export function PlayerCodeDialog({
  open,
  onOpenChange,
  player,
  onCodeChanged,
}: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const [teams, setTeams] = useState<Team[]>([])
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [playersWithAccount, setPlayersWithAccount] = useState<Set<string>>(new Set())
  const [activeCode, setActiveCode] = useState<GeneratedCodeRow | null>(null)

  const [generating, setGenerating] = useState(false)
  const [markingUsed, setMarkingUsed] = useState(false)
  const [downloading, setDownloading] = useState(false)

  const initials = useMemo(() => {
    const name = player?.name?.trim() || "?"
    return name
      .split(" ")
      .filter(Boolean)
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase()
  }, [player])

  const teamById = useMemo(() => new Map(teams.map((t) => [t.id, t.name])), [teams])

  const playerTeamIds = useMemo(() => {
    if (!player?.id) return []
    return teamMembers.filter((tm) => tm.player_id === player.id).map((tm) => tm.team_id)
  }, [teamMembers, player?.id])

  const playerTeamNames = useMemo(() => {
    return playerTeamIds.map((id) => teamById.get(id) || id)
  }, [playerTeamIds, teamById])

  const teamLabel = playerTeamNames.length ? playerTeamNames.join(", ") : "Ohne Team"
  const hasAccount = player?.id ? playersWithAccount.has(player.id) : false
  const isInactive = (player as any)?.is_active === false || !!player?.club_left_at
  const hasMemberCard = !!(player as any)?.spieldatenbank_id

  const copy = async (txt: string) => {
    try {
      await navigator.clipboard.writeText(txt)
      setSuccess("Code in die Zwischenablage kopiert.")
      setTimeout(() => setSuccess(""), 1800)
    } catch {
      setError("Kopieren fehlgeschlagen.")
    }
  }

  const fetchDialogData = async () => {
    if (!player?.id || !open) return

    setLoading(true)
    setError("")
    setSuccess("")

    try {
      const [
        { data: profiles, error: profErr },
        { data: codeRows, error: codeErr },
        { data: teamData, error: teamErr },
        { data: tmData, error: tmErr },
      ] = await Promise.all([
        supabase.from("user_profiles").select("player_id,user_id"),
        supabase
          .from("qr_code_generated")
          .select("id,player_id,player_name,code,created_at,used_at")
          .eq("player_id", player.id)
          .is("used_at", null)
          .maybeSingle(),
        supabase.from("teams").select("id,name").order("name"),
        supabase.from("team_members").select("player_id,team_id,role").eq("player_id", player.id),
      ])

      if (profErr) throw profErr
      if (codeErr) throw codeErr
      if (teamErr) throw teamErr
      if (tmErr) throw tmErr

      const hasAcc = new Set<string>()
      ;((profiles || []) as UserProfileLite[]).forEach((r) => {
        if (r.player_id && r.user_id) hasAcc.add(r.player_id)
      })

      setPlayersWithAccount(hasAcc)
      setActiveCode((codeRows as GeneratedCodeRow | null) ?? null)
      setTeams((teamData || []) as Team[])
      setTeamMembers((tmData || []) as TeamMember[])
    } catch (e: any) {
      setError(e?.message || "Daten konnten nicht geladen werden.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDialogData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, player?.id])

  const generateForPlayer = async () => {
    if (!player?.id) return

    setError("")
    setSuccess("")
    setGenerating(true)

    try {
      if (hasAccount) {
        throw new Error("Dieser Spieler hat bereits ein Konto.")
      }

      if (activeCode) {
        const { error: upErr } = await supabase
          .from("qr_code_generated")
          .update({
            used_at: new Date().toISOString(),
            note: "replaced by new code",
          })
          .eq("id", activeCode.id)

        if (upErr) throw upErr
      }

      const code = generateCode()

      const { error: insErr } = await supabase.from("qr_code_generated").insert({
        player_id: player.id,
        player_name: player.name,
        code,
        created_at: new Date().toISOString(),
        used_at: null,
      })

      if (insErr) throw insErr

      setSuccess(`Neuer Code für ${player.name} wurde erstellt.`)
      await fetchDialogData()
      await Promise.resolve(onCodeChanged?.())
    } catch (e: any) {
      setError(e?.message || "Code konnte nicht erstellt werden.")
    } finally {
      setGenerating(false)
    }
  }

  const markCodeAsUsed = async () => {
    if (!activeCode) return

    setError("")
    setSuccess("")
    setMarkingUsed(true)

    try {
      const { error: upErr } = await supabase
        .from("qr_code_generated")
        .update({
          used_at: new Date().toISOString(),
          note: "manually marked used",
        })
        .eq("id", activeCode.id)

      if (upErr) throw upErr

      setSuccess("Code wurde als benutzt markiert.")
      await fetchDialogData()
      await Promise.resolve(onCodeChanged?.())
    } catch (e: any) {
      setError(e?.message || "Code konnte nicht auf benutzt gesetzt werden.")
    } finally {
      setMarkingUsed(false)
    }
  }

  const downloadPdf = async () => {
    if (!player) return

    if (!activeCode?.code) {
      setError("Es ist kein aktiver Code vorhanden.")
      return
    }

    setError("")
    setSuccess("")
    setDownloading(true)

    try {
      const safeName = player.name.replaceAll(" ", "_").replaceAll("/", "_")
      await buildModernPdf({
        title: `${player.name} – ${teamLabel}`,
        filename: `code_${safeName}.pdf`,
        items: [
          {
            name: player.name,
            code: activeCode.code,
            teamLabel,
          },
        ],
      })
    } catch (e: any) {
      setError(e?.message || "PDF konnte nicht erstellt werden.")
    } finally {
      setDownloading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl border border-zinc-200 bg-[#f7f7f8] p-0 shadow-2xl">
        <div className="overflow-hidden rounded-3xl">
         <div className="border-b border-zinc-200 bg-white px-5 py-5 sm:px-6 sm:py-6">
  <DialogHeader>
    <DialogTitle className="flex items-center gap-3 text-left text-zinc-900">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-zinc-100 ring-1 ring-zinc-200">
        <KeyRound className="h-5 w-5" />
      </div>

      <div>
        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
          Mitgliederzugang
        </div>
        <div className="text-xl font-extrabold sm:text-2xl">
          Code & Registrierung verwalten
        </div>
      </div>
    </DialogTitle>
  </DialogHeader>
</div>

          <div className="space-y-5 p-4 sm:p-6">
            {loading ? (
              <div className="flex items-center justify-center py-12 text-sm text-zinc-600">
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Lade Daten...
              </div>
            ) : (
              <>
                {(error || success) && (
                  <div className="space-y-3">
                    {error ? (
                      <div className="flex gap-2 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
                        <div>{error}</div>
                      </div>
                    ) : null}

                    {success ? (
                      <div className="flex gap-2 rounded-2xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                        <div>{success}</div>
                      </div>
                    ) : null}
                  </div>
                )}

                <section className="rounded-[28px] border border-zinc-200 bg-white p-4 shadow-sm sm:p-5">
                  <div className="flex flex-col gap-5">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex items-center gap-4">
                        <Avatar className="h-20 w-20 border-4 border-white shadow-md ring-1 ring-zinc-200">
                          <AvatarImage
                            src={player?.photo_url || "/placeholder.svg?height=80&width=80&query=player-avatar"}
                            alt={player?.name || "Spieler"}
                          />
                          <AvatarFallback className="bg-gradient-to-br from-orange-500 to-orange-600 text-xl font-bold text-white">
                            {initials}
                          </AvatarFallback>
                        </Avatar>

                        <div className="min-w-0">
                          <h3 className="text-2xl font-extrabold tracking-tight text-zinc-950">
                            {player?.name ?? "Spieler"}
                          </h3>
                          <p className="mt-1 text-sm text-zinc-500">
                            Spielerprofil und Mitgliederzugang
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 sm:justify-end">
                        <Badge
                          variant="outline"
                          className={
                            isInactive
                              ? "border-red-200 bg-red-50 text-red-700"
                              : "border-green-200 bg-green-50 text-green-700"
                          }
                        >
                          {isInactive ? "Deaktiviert" : "Aktiv"}
                        </Badge>

                        <Badge
                          variant="outline"
                          className={
                            hasAccount
                              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                              : "border-zinc-200 bg-zinc-50 text-zinc-700"
                          }
                        >
                          {hasAccount ? "Konto vorhanden" : "Noch kein Konto"}
                        </Badge>

                        <Badge
                          variant="outline"
                          className={
                            hasMemberCard
                              ? "border-blue-200 bg-blue-50 text-blue-700"
                              : "border-orange-200 bg-orange-50 text-orange-700"
                          }
                        >
                          {hasMemberCard ? (
                            <>
                              <Link2 className="mr-1 h-3.5 w-3.5" />
                              Member Card aktiv
                            </>
                          ) : (
                            <>
                              <Link2Off className="mr-1 h-3.5 w-3.5" />
                              Member Card fehlt
                            </>
                          )}
                        </Badge>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <div className="rounded-2xl border border-zinc-200 bg-zinc-50/80 p-4">
                        <div className="mb-1 flex items-center gap-1 text-xs font-medium text-zinc-500">
                          <Building2 className="h-3.5 w-3.5" />
                          Team
                        </div>
                        <div className="font-semibold text-zinc-900">{teamLabel}</div>
                      </div>

                      <div className="rounded-2xl border border-zinc-200 bg-zinc-50/80 p-4">
                        <div className="mb-1 flex items-center gap-1 text-xs font-medium text-zinc-500">
                          <Calendar className="h-3.5 w-3.5" />
                          Geburtsdatum
                        </div>
                        <div className="font-semibold text-zinc-900">
                          {fmtDateISO(player?.birthdate)}
                        </div>
                      </div>

                      <div className="rounded-2xl border border-zinc-200 bg-zinc-50/80 p-4">
                        <div className="mb-1 flex items-center gap-1 text-xs font-medium text-zinc-500">
                          <MapPin className="h-3.5 w-3.5" />
                          Ort
                        </div>
                        <div className="font-semibold text-zinc-900">
                          {fmtText(player?.city)}
                        </div>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-zinc-200 bg-zinc-50/80 p-4">
                      <div className="mb-1 flex items-center gap-1 text-xs font-medium text-zinc-500">
                        <Mail className="h-3.5 w-3.5" />
                        E-Mail
                      </div>
                      <div className="font-semibold text-zinc-900">
                        {fmtText(player?.email)}
                      </div>
                    </div>
                  </div>
                </section>

                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <Card className="rounded-[24px] border border-zinc-200 bg-white shadow-sm">
                    <CardContent className="p-5 space-y-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="text-sm text-zinc-500">Aktueller Mitglieder-Code</div>
                          <div className="text-lg font-bold text-zinc-950">Code-Verwaltung</div>
                        </div>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={fetchDialogData}
                          className="rounded-xl border-zinc-200 bg-white"
                        >
                          <RefreshCw className="mr-2 h-4 w-4" />
                          Neu laden
                        </Button>
                      </div>

                      <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                        {activeCode ? (
                          <div className="space-y-3">
                            <div className="text-xs text-zinc-500">
                              Erstellt am {formatDateTime(activeCode.created_at)}
                            </div>

                            <div className="flex flex-col justify-between gap-3 rounded-2xl border border-zinc-200 bg-white px-4 py-4 sm:flex-row sm:items-center">
                              <div className="font-mono text-xl tracking-wider text-zinc-950">
                                {activeCode.code}
                              </div>

                              <Button
                                variant="outline"
                                onClick={() => copy(activeCode.code)}
                                className="rounded-xl border-zinc-200"
                              >
                                <Copy className="mr-2 h-4 w-4" />
                                Kopieren
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="text-sm text-zinc-500">
                            Kein aktiver Code vorhanden.
                          </div>
                        )}
                      </div>

                      {hasAccount ? (
                        <div className="flex gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
                          <UserCheck className="mt-0.5 h-4 w-4 shrink-0" />
                          <div>
                            Für diesen Spieler existiert bereits ein Konto. Normalerweise sollte daher kein neuer Mitglieder-Code mehr erzeugt werden.
                          </div>
                        </div>
                      ) : null}

                      <div className="flex flex-wrap gap-2">
                        <Button
                          onClick={generateForPlayer}
                          disabled={generating || hasAccount}
                          className="rounded-xl bg-slate-900 hover:bg-slate-800"
                        >
                          {generating ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Generiere...
                            </>
                          ) : activeCode ? (
                            <>
                              <RefreshCw className="mr-2 h-4 w-4" />
                              Neu generieren
                            </>
                          ) : (
                            <>
                              <KeyRound className="mr-2 h-4 w-4" />
                              Code generieren
                            </>
                          )}
                        </Button>

                        <Button
                          variant="outline"
                          onClick={markCodeAsUsed}
                          disabled={!activeCode || markingUsed}
                          className="rounded-xl border-amber-200 text-amber-700 hover:bg-amber-50"
                        >
                          {markingUsed ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Setze...
                            </>
                          ) : (
                            <>
                              <XCircle className="mr-2 h-4 w-4" />
                              Als benutzt markieren
                            </>
                          )}
                        </Button>

                        <Button
                          variant="outline"
                          onClick={downloadPdf}
                          disabled={!activeCode || downloading}
                          className="rounded-xl border-blue-200 text-blue-700 hover:bg-blue-50"
                        >
                          {downloading ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              PDF...
                            </>
                          ) : (
                            <>
                              <FileDown className="mr-2 h-4 w-4" />
                              PDF laden
                            </>
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="rounded-[24px] border border-zinc-200 bg-white shadow-sm">
                    <CardContent className="p-5 space-y-4">
                      <div>
                        <div className="text-sm text-zinc-500">Registrierungs-Hinweis</div>
                        <div className="text-lg font-bold text-zinc-950">
                          So nutzt der Spieler den Code
                        </div>
                      </div>

                      <div className="rounded-2xl border border-orange-200 bg-gradient-to-br from-orange-50 to-amber-50 p-4">
                        <div className="space-y-3 text-sm text-zinc-700">
                          <div>
                            <span className="font-semibold text-zinc-950">1.</span> QR-Code scannen oder Seite öffnen:
                            <div className="mt-1 break-all font-medium text-orange-700">
                              {QR_TARGET_BASE_URL}
                            </div>
                          </div>

                          <div>
                            <span className="font-semibold text-zinc-950">2.</span> Mitglieder-Code eingeben und prüfen lassen.
                          </div>

                          <div>
                            <span className="font-semibold text-zinc-950">3.</span> E-Mail-Adresse und Passwort festlegen.
                          </div>

                          <div>
                            <span className="font-semibold text-zinc-950">4.</span> Bestätigungs-Mail öffnen und Konto aktivieren.
                          </div>

                          <div>
                            <span className="font-semibold text-zinc-950">5.</span> Danach normal im Member-Bereich anmelden.
                          </div>
                        </div>
                      </div>

                      <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                        <div className="mb-2 text-sm font-semibold text-zinc-950">
                          Hinweise
                        </div>
                        <ul className="space-y-2 text-sm text-zinc-600">
                          <li>• Pro Spieler sollte immer nur ein aktiver Code bestehen.</li>
                          <li>• Ein neuer Code ersetzt den bisherigen aktiven Code.</li>
                          <li>• Sobald ein Konto existiert, wird normalerweise kein neuer Code mehr benötigt.</li>
                        </ul>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="flex justify-end pt-1">
                  <Button
                    variant="outline"
                    onClick={() => onOpenChange(false)}
                    className="rounded-xl border-zinc-200 bg-white"
                  >
                    Schließen
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}