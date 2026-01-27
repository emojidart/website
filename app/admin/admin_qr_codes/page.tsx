"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { Header } from "@/components/header"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  ArrowLeft,
  Copy,
  KeyRound,
  Loader2,
  RefreshCw,
  Search,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Users,
  UserCheck,
  Building2,
  CheckSquare,
  Square,
  FileDown,
} from "lucide-react"

type ClubPlayer = { id: string; name: string }
type UserProfileLite = { player_id: string | null; user_id: string | null }
type Team = { id: string; name: string }
type TeamMember = { player_id: string; team_id: string; role: string | null }

type GeneratedCodeRow = {
  id: string
  player_id: string
  player_name: string
  code: string
  created_at: string
  used_at: string | null
}

type ViewMode = "noAccount" | "hasAccount"
type TeamFilter = "ALL" | "NO_TEAM" | string // team_id

const QR_TARGET_BASE_URL = "https://emojisdartverein.com/member-account-request"

function generateCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
  const part = (len: number) => Array.from({ length: len }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("")
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

/**
 * Modern PDF (no popups):
 * Uses jsPDF + qrcode.
 *
 * Install deps:
 *   npm i jspdf qrcode
 *
 * QR Code contains:
 *   https://emojisdartverein.com/member-account-request
 */
async function buildModernPdf(opts: {
  title: string
  items: Array<{ name: string; code: string; teamLabel: string }>
  filename: string
}) {
  const [{ jsPDF }, QRCode] = await Promise.all([import("jspdf"), import("qrcode")])

  const doc = new jsPDF({ unit: "mm", format: "a4", compress: true })

  // Prevent weird letter spacing in some PDF viewers
  // @ts-ignore
  if (typeof doc.setCharSpace === "function") doc.setCharSpace(0)
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()

  // Layout: 1 card per page (clean, centered)
  const margin = 16
  const gap = 0
  const cols = 1
  const rows = 1

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
    doc.text(`Erstellt: ${new Date().toLocaleString("de-DE")}  •  Anzahl: ${opts.items.length}`, margin, margin + 12)

    doc.setDrawColor(220)
    doc.line(margin, margin + headerH - 2, pageW - margin, margin + headerH - 2)

    doc.setTextColor(130)
    doc.setFontSize(9)
    doc.text(`Seite ${pageNumber}`, pageW - margin, pageH - margin, { align: "right" })
    doc.setTextColor(0)
  }

  const drawCard = async (x: number, y: number, item: { name: string; code: string; teamLabel: string }) => {
    // Prevent weird letter spacing in some PDF viewers
    // @ts-ignore
    if (typeof doc.setCharSpace === "function") doc.setCharSpace(0)

    const pad = 10

    // Big clean card
    doc.setDrawColor(230)
    doc.setFillColor(255, 255, 255)
    doc.roundedRect(x, y, cardW, cardH, 6, 6, "FD")

    // Top bar (team)
    doc.setFillColor(30, 41, 59)
    doc.roundedRect(x, y, cardW, 14, 6, 6, "F")

    doc.setFont("helvetica", "bold")
    doc.setFontSize(13)
    doc.setTextColor(255)
    const team = (item.teamLabel || "Ohne Team").trim()
    doc.text(team.length > 50 ? team.slice(0, 50) + "…" : team, x + pad, y + 9.5)

    // Content area
    const top = y + 20

    // Name (centered)
    doc.setFont("helvetica", "bold")
    doc.setFontSize(22)
    doc.setTextColor(20)

    const nameMaxW = cardW - pad * 2
    const nameLines = doc.splitTextToSize(item.name, nameMaxW).slice(0, 2)
    const nameY = top + 10
    doc.text(nameLines, x + cardW / 2, nameY, { align: "center", lineHeightFactor: 1.15 })

    // QR (big, centered)
    const qrSize = 70
    const qrX = x + (cardW - qrSize) / 2
    const qrY = nameY + nameLines.length * 11 + 10

    // QR background
    doc.setDrawColor(230)
    doc.setFillColor(255, 255, 255)
    doc.roundedRect(qrX - 4, qrY - 4, qrSize + 8, qrSize + 8, 6, 6, "FD")

    if (item.code) {
      const url = `${QR_TARGET_BASE_URL}?code=${encodeURIComponent(item.code)}`
      const dataUrl = await QRCode.toDataURL(url, { margin: 1, scale: 8, errorCorrectionLevel: "M" })
      doc.addImage(dataUrl, "PNG", qrX, qrY, qrSize, qrSize)
    }

    // Code + Label (perfectly centered under QR)
    const codeText = item.code || "—"

    // spacing under QR box
    const labelY = qrY + qrSize + 14
    const badgeCenterY = labelY + 14

    // Label
    doc.setFont("helvetica", "normal")
    doc.setFontSize(12)
    doc.setTextColor(90)
    doc.text("Mitglieder-Code", x + cardW / 2, labelY, { align: "center" })

    // Badge
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

    // vertically centered text in badge (baseline tweak)
    doc.text(codeText, x + cardW / 2, badgeCenterY + 5, { align: "center" })

    // Instructions block (bottom)
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
    const local = idx % (cols * rows)
    const col = local % cols
    const row = Math.floor(local / cols)

    const x = margin
    const y = margin + headerH

    await drawCard(x, y, item)

    idx++
    if (idx < opts.items.length && idx % (cols * rows) === 0) {
      doc.addPage()
      page++
      drawHeader(page)
    }
  }

  doc.save(opts.filename)
}

export default function AdminQrCodesPage() {
  const router = useRouter()
  const [view, setView] = useState<ViewMode>("noAccount")
  const [teamFilter, setTeamFilter] = useState<TeamFilter>("ALL")

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [search, setSearch] = useState("")

  const [players, setPlayers] = useState<ClubPlayer[]>([])
  const [playersWithAccount, setPlayersWithAccount] = useState<Set<string>>(new Set())
  const [teams, setTeams] = useState<Team[]>([])
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])

  const [activeCodes, setActiveCodes] = useState<Map<string, GeneratedCodeRow>>(new Map())

  const [generatingFor, setGeneratingFor] = useState<string | null>(null)
  const [markingUsedFor, setMarkingUsedFor] = useState<string | null>(null)

  const [lastGenerated, setLastGenerated] = useState<{ playerName: string; code: string } | null>(null)

  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [downloading, setDownloading] = useState(false)

  const teamById = useMemo(() => new Map(teams.map((t) => [t.id, t.name])), [teams])

  const playerTeams = useMemo(() => {
    const m = new Map<string, string[]>()
    for (const tm of teamMembers) {
      const arr = m.get(tm.player_id) || []
      if (!arr.includes(tm.team_id)) arr.push(tm.team_id)
      m.set(tm.player_id, arr)
    }
    return m
  }, [teamMembers])

  const fetchData = async () => {
    setLoading(true)
    setError("")
    setLastGenerated(null)

    try {
      const [
        { data: clubPlayers, error: pErr },
        { data: profiles, error: profErr },
        { data: codes, error: cErr },
        { data: teamData, error: tErr },
        { data: tmData, error: tmErr },
      ] = await Promise.all([
        supabase.from("club_players").select("id,name").order("name"),
        supabase.from("user_profiles").select("player_id,user_id"),
        supabase.from("qr_code_generated").select("id,player_id,player_name,code,created_at,used_at").is("used_at", null),
        supabase.from("teams").select("id,name").order("name"),
        supabase.from("team_members").select("player_id,team_id,role"),
      ])

      if (pErr) throw pErr
      if (profErr) throw profErr
      if (cErr) throw cErr
      if (tErr) throw tErr
      if (tmErr) throw tmErr

      const hasAcc = new Set<string>()
      ;((profiles || []) as UserProfileLite[]).forEach((r) => {
        if (r.player_id && r.user_id) hasAcc.add(r.player_id)
      })

      const m = new Map<string, GeneratedCodeRow>()
      ;(codes || []).forEach((r: any) => m.set(r.player_id, r))

      setPlayers((clubPlayers || []) as ClubPlayer[])
      setPlayersWithAccount(hasAcc)
      setActiveCodes(m)
      setTeams((teamData || []) as Team[])
      setTeamMembers((tmData || []) as TeamMember[])

      setSelected((prev) => {
        const keep = new Set<string>()
        const ids = new Set((clubPlayers || []).map((p: any) => p.id))
        prev.forEach((id) => {
          if (ids.has(id)) keep.add(id)
        })
        return keep
      })
    } catch (e: any) {
      setError(e?.message || "Unbekannter Fehler")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const baseList = useMemo(() => {
    const list =
      view === "noAccount"
        ? players.filter((p) => !playersWithAccount.has(p.id))
        : players.filter((p) => playersWithAccount.has(p.id))

    const s = search.trim().toLowerCase()
    const searched = !s ? list : list.filter((p) => p.name.toLowerCase().includes(s))

    if (teamFilter === "ALL") return searched
    if (teamFilter === "NO_TEAM") return searched.filter((p) => !(playerTeams.get(p.id)?.length))
    return searched.filter((p) => (playerTeams.get(p.id) || []).includes(teamFilter))
  }, [players, playersWithAccount, view, search, teamFilter, playerTeams])

  const listWithoutTeam = useMemo(() => baseList.filter((p) => !(playerTeams.get(p.id)?.length)), [baseList, playerTeams])
  const listWithTeam = useMemo(() => baseList.filter((p) => (playerTeams.get(p.id)?.length)), [baseList, playerTeams])

  const teamTitle = teamFilter === "ALL" ? "Alle Teams" : teamFilter === "NO_TEAM" ? "Ohne Team" : teamById.get(teamFilter) || "Team"

  const copy = async (txt: string) => {
    try {
      await navigator.clipboard.writeText(txt)
    } catch {
      // ignore
    }
  }

  const toggleSelected = (playerId: string) => {
    setSelected((prev) => {
      const n = new Set(prev)
      if (n.has(playerId)) n.delete(playerId)
      else n.add(playerId)
      return n
    })
  }

  const toggleSelectAllFiltered = () => {
    const ids = baseList.map((p) => p.id)
    const allSelected = ids.length > 0 && ids.every((id) => selected.has(id))
    setSelected((prev) => {
      const n = new Set(prev)
      if (allSelected) ids.forEach((id) => n.delete(id))
      else ids.forEach((id) => n.add(id))
      return n
    })
  }

  const generateForPlayer = async (p: ClubPlayer) => {
    setError("")
    setLastGenerated(null)
    setGeneratingFor(p.id)

    try {
      if (playersWithAccount.has(p.id)) throw new Error("Dieser Spieler hat inzwischen schon ein Konto.")
      const existing = activeCodes.get(p.id)
      if (existing) {
        const { error: upErr } = await supabase
          .from("qr_code_generated")
          .update({ used_at: new Date().toISOString(), note: "replaced by new code" })
          .eq("id", existing.id)
        if (upErr) throw upErr
      }

      const code = generateCode()
      const { error: insErr } = await supabase.from("qr_code_generated").insert({
        player_id: p.id,
        player_name: p.name,
        code,
        created_at: new Date().toISOString(),
        used_at: null,
      })
      if (insErr) throw insErr

      setLastGenerated({ playerName: p.name, code })
      await fetchData()
    } catch (e: any) {
      setError(e?.message || "Unbekannter Fehler")
    } finally {
      setGeneratingFor(null)
    }
  }

  const markCodeAsUsed = async (playerId: string) => {
    setError("")
    setLastGenerated(null)
    setMarkingUsedFor(playerId)

    try {
      const active = activeCodes.get(playerId)
      if (!active) return
      const { error: upErr } = await supabase
        .from("qr_code_generated")
        .update({ used_at: new Date().toISOString(), note: "manually marked used" })
        .eq("id", active.id)
      if (upErr) throw upErr
      await fetchData()
    } catch (e: any) {
      setError(e?.message || "Unbekannter Fehler")
    } finally {
      setMarkingUsedFor(null)
    }
  }

  const downloadModernPdf = async () => {
    setError("")
    const chosen = baseList.filter((p) => selected.has(p.id))
    if (chosen.length === 0) {
      setError("Bitte zuerst einen Spieler markieren.")
      return
    }
    if (chosen.length !== 1) {
      setError("Bitte genau EINEN Spieler markieren (pro PDF immer nur ein Code).")
      return
    }

    setDownloading(true)
    try {
      const items = chosen.map((p) => {
        const code = activeCodes.get(p.id)?.code || ""
        const teamIds = playerTeams.get(p.id) || []
        const teamNames = teamIds.map((tid) => teamById.get(tid) || tid)
        return {
          name: p.name,
          code,
          teamLabel: teamNames.length ? teamNames.join(", ") : "Ohne Team",
        }
      })

      const title = `${chosen[0].name} – ${teamTitle}`
      const safeName = chosen[0].name.replaceAll(" ", "_").replaceAll("/", "_")
      const filename = `code_${safeName}.pdf`

      await buildModernPdf({ title, items, filename })
    } catch (e: any) {
      setError(e?.message || "PDF konnte nicht erstellt werden.")
    } finally {
      setDownloading(false)
    }
  }

  const renderRow = (p: ClubPlayer) => {
    const active = activeCodes.get(p.id)
    const busy = generatingFor === p.id
    const busyUsed = markingUsedFor === p.id
    const teamIds = playerTeams.get(p.id) || []
    const teamNames = teamIds.map((tid) => teamById.get(tid) || tid)
    const teamText = teamNames.length ? teamNames.join(", ") : "Ohne Team"
    const isSelected = selected.has(p.id)

    return (
      <div key={p.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white p-4">
        <div className="flex items-start gap-3 min-w-0">
          <button type="button" onClick={() => toggleSelected(p.id)} className="mt-0.5 text-gray-700 hover:text-gray-900">
            {isSelected ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
          </button>

          <div className="min-w-0">
            <div className="font-semibold text-gray-900 truncate">{p.name}</div>
            <div className="text-xs text-gray-500 mt-1">
              <span className="inline-flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5" />
                {teamText}
              </span>
              {"  "}•{"  "}
              {active ? (
                <span>
                  Aktiver Code: <span className="font-mono">{active.code}</span> • erstellt {formatDateTime(active.created_at)}
                </span>
              ) : (
                <span>Kein aktiver Code</span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap justify-end">
          {teamNames.length === 0 ? <Badge className="bg-zinc-100 text-zinc-800 border-zinc-200">ohne Team</Badge> : null}
          {active ? <Badge className="bg-amber-100 text-amber-800 border-amber-200">aktiv</Badge> : null}

          {active ? (
            <Button variant="outline" className="gap-2 rounded-xl" onClick={() => copy(active.code)}>
              <Copy className="w-4 h-4" />
              Copy
            </Button>
          ) : null}

          {view === "noAccount" ? (
            <>
              {active ? (
                <Button variant="outline" onClick={() => markCodeAsUsed(p.id)} disabled={busyUsed} className="rounded-xl gap-2">
                  {busyUsed ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                  Used
                </Button>
              ) : null}

              <Button onClick={() => generateForPlayer(p)} disabled={busy} className="bg-slate-800 hover:bg-slate-900 rounded-xl">
                {busy ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generiere...
                  </span>
                ) : active ? (
                  "Neu generieren"
                ) : (
                  "Code generieren"
                )}
              </Button>
            </>
          ) : (
            <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">Konto vorhanden</Badge>
          )}
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container mx-auto px-4 py-10">
          <div className="flex items-center justify-center gap-2 text-gray-600">
            <Loader2 className="w-4 h-4 animate-spin" />
            Lade...
          </div>
        </div>
      </div>
    )
  }

  const allFilteredSelected = baseList.length > 0 && baseList.every((p) => selected.has(p.id))

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <section className="container mx-auto px-4 pt-6 pb-10">
        <div className="max-w-4xl mx-auto space-y-4">
          <div className="rounded-2xl bg-gradient-to-br from-slate-800 to-slate-700 text-white p-5 shadow-xl">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-white/10 p-2">
                <KeyRound className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h1 className="text-2xl font-black leading-tight">QR Codes generieren</h1>
                <p className="text-sm text-white/90 mt-1">
                  PDF: Name + Team + Code + QR (öffnet {QR_TARGET_BASE_URL}) + Anleitung für die Spieler.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button onClick={() => router.push("/admin")} variant="secondary" className="gap-2">
                  <ArrowLeft className="w-4 h-4" />
                  Zurück
                </Button>
                <Button onClick={fetchData} variant="secondary" className="gap-2">
                  <RefreshCw className="w-4 h-4" />
                  Aktualisieren
                </Button>
              </div>
            </div>

            <div className="mt-4 flex flex-col sm:flex-row gap-2">
              <Button
                type="button"
                onClick={() => setView("noAccount")}
                className={`rounded-xl gap-2 ${view === "noAccount" ? "bg-white text-slate-900 hover:bg-white/90" : "bg-white/10 hover:bg-white/15"}`}
              >
                <Users className="w-4 h-4" />
                Ohne Konto
              </Button>
              <Button
                type="button"
                onClick={() => setView("hasAccount")}
                className={`rounded-xl gap-2 ${view === "hasAccount" ? "bg-white text-slate-900 hover:bg-white/90" : "bg-white/10 hover:bg-white/15"}`}
              >
                <UserCheck className="w-4 h-4" />
                Mit Konto
              </Button>
            </div>
          </div>

          {lastGenerated ? (
            <Card className="border-0 shadow-xl rounded-2xl overflow-hidden">
              <CardContent className="p-5 sm:p-6 space-y-3">
                <div className="flex items-center gap-2 text-green-700">
                  <CheckCircle2 className="w-5 h-5" />
                  <div className="font-semibold">Code erstellt</div>
                </div>
                <div className="text-sm text-gray-700">
                  Spieler: <b>{lastGenerated.playerName}</b>
                </div>
                <div className="rounded-xl border bg-gray-50 p-4 flex items-center justify-between gap-3">
                  <div className="font-mono text-lg tracking-wider">{lastGenerated.code}</div>
                  <Button variant="outline" className="gap-2" onClick={() => copy(lastGenerated.code)}>
                    <Copy className="w-4 h-4" />
                    Kopieren
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : null}

          {error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 text-red-700 p-4 flex gap-2 items-start">
              <ShieldAlert className="w-4 h-4 mt-0.5" />
              <div className="text-sm">{error}</div>
            </div>
          ) : null}

          <Card className="border-0 shadow-xl rounded-2xl overflow-hidden">
            <CardContent className="p-5 sm:p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="relative sm:col-span-2">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Spieler suchen..." className="pl-10 h-11" />
                </div>

                <div>
                  <select
                    value={teamFilter}
                    onChange={(e) => setTeamFilter(e.target.value as TeamFilter)}
                    className="w-full h-11 rounded-xl border border-gray-200 bg-white px-3 text-sm shadow-sm"
                  >
                    <option value="ALL">Alle Vereine/Teams</option>
                    <option value="NO_TEAM">Ohne Team</option>
                    {teams.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="text-sm text-gray-600">
                  Ansicht: <b>{view === "noAccount" ? "Ohne Konto" : "Mit Konto"}</b> • Filter: <b>{teamTitle}</b> • Treffer: <b>{baseList.length}</b>
                </div>

                <div className="flex items-center gap-2">
                  <Button variant="outline" className="gap-2 rounded-xl" onClick={toggleSelectAllFiltered}>
                    {allFilteredSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                    {allFilteredSelected ? "Alles abwählen" : "Alle markieren"}
                  </Button>

                  <Button
                    onClick={downloadModernPdf}
                    disabled={downloading}
                    className="gap-2 rounded-xl bg-slate-800 hover:bg-slate-900"
                  >
                    {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
                    PDF (1 Spieler)
                  </Button>
                </div>
              </div>

              <div className="space-y-3">
                {listWithoutTeam.length ? (
                  <div className="pt-2">
                    <div className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Ohne Team</div>
                    <div className="space-y-2">{listWithoutTeam.map((p) => renderRow(p))}</div>
                  </div>
                ) : null}

                {listWithTeam.length ? (
                  <div className="pt-2">
                    <div className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Mit Team</div>
                    <div className="space-y-2">{listWithTeam.map((p) => renderRow(p))}</div>
                  </div>
                ) : null}

                {baseList.length === 0 ? (
                  <div className="text-sm text-gray-500 py-8 text-center">Keine Spieler gefunden.</div>
                ) : null}
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  )
}
