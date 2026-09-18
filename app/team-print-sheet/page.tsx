"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/hooks/use-auth"

import { Header } from "@/components/header"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

import { Users, Printer, Loader2, ScanLine } from "lucide-react"
import { QRCodeSVG } from "qrcode.react"

type TeamMembership = {
  id: string
  team_id: string
  role: string | null
  teams: { id: string; name: string; logo_url: string | null } | null
}

type TeamMember = {
  id: string
  team_id: string
  player_id: string
  club_players: { id: string; name: string } | null
}

export default function TeamPrintSheetPage() {
  const { session, loading: authLoading } = useAuth()
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [memberships, setMemberships] = useState<TeamMembership[]>([])
  const [members, setMembers] = useState<TeamMember[]>([])

  const [selectedTeamId, setSelectedTeamId] = useState<string>("")
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!authLoading && !session) router.push("/member-login")
  }, [authLoading, session, router])

  useEffect(() => {
    if (session?.user) fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session])

  const fetchData = async () => {
    setLoading(true)
    try {
      const { data: profileData } = await supabase
        .from("user_profiles")
        .select("player_id")
        .eq("user_id", session!.user.id)
        .single()

      const myPlayerId = profileData?.player_id
      if (!myPlayerId) return

      const { data: mData } = await supabase
        .from("team_members")
        .select("id, team_id, role, teams (id, name, logo_url)")
        .eq("player_id", myPlayerId)
        .is("left_at", null)

      const allMemberships = (mData || []) as TeamMembership[]
      setMemberships(allMemberships)

      const firstManageable = allMemberships.find((x) => x.role === "Captain" || x.role === "Co-Captain")
      if (firstManageable?.team_id) setSelectedTeamId(firstManageable.team_id)

      const teamIds = allMemberships.map((x) => x.team_id)
      const { data: memData } = await supabase
        .from("team_members")
        .select("id, team_id, player_id, club_players:club_players!team_members_player_id_fkey (id, name)")
        .in("team_id", teamIds)
        .is("left_at", null)

      setMembers((memData || []) as TeamMember[])
    } finally {
      setLoading(false)
    }
  }

  const myRoleByTeamId = useMemo(() => {
    const map = new Map<string, string | null>()
    memberships.forEach((m) => map.set(m.team_id, m.role))
    return map
  }, [memberships])

  const canManage =
    myRoleByTeamId.get(selectedTeamId) === "Captain" || myRoleByTeamId.get(selectedTeamId) === "Co-Captain"

  const manageableTeams = useMemo(() => {
    return memberships.filter((m) => m.role === "Captain" || m.role === "Co-Captain")
  }, [memberships])

  const selectedTeam = useMemo(() => {
    return memberships.find((m) => m.team_id === selectedTeamId)?.teams || null
  }, [memberships, selectedTeamId])

  const membersOfSelectedTeam = useMemo(() => {
    return members
      .filter((m) => m.team_id === selectedTeamId)
      .sort((a, b) => (a.club_players?.name || "").localeCompare(b.club_players?.name || ""))
  }, [members, selectedTeamId])

  const selectedPlayers = useMemo(() => {
    return membersOfSelectedTeam
      .filter((m) => selectedPlayerIds.has(m.player_id))
      .map((m) => ({ id: m.player_id, name: m.club_players?.name || "" }))
  }, [membersOfSelectedTeam, selectedPlayerIds])

  const togglePlayer = (playerId: string, checked: boolean) => {
    setSelectedPlayerIds((prev) => {
      const next = new Set(prev)
      if (checked) next.add(playerId)
      else next.delete(playerId)
      return next
    })
  }

  if (authLoading || loading) {
    return (
      <main className="min-h-screen flex flex-col bg-[#f5f6f8]">
        <Header variant="app" title="Spielerblatt" subtitle="Drucken" backHref="/member-profile-app" />

        <div className="flex-1 flex items-center justify-center px-4 pb-20">
          <div className="animate-in fade-in zoom-in-95 duration-300">
            <div className="flex flex-col items-center gap-6 rounded-3xl bg-white shadow-2xl px-10 py-10 border border-orange-100">
              <div className="relative">
                <div className="absolute inset-0 rounded-full bg-orange-500/30 blur-2xl animate-pulse" />
                <Loader2 className="relative h-12 w-12 animate-spin text-orange-600" />
              </div>

              <div className="text-center">
                <p className="text-lg font-bold text-slate-950">Seite wird geladen</p>
                <p className="text-sm text-slate-500 mt-1">Bitte kurz warten…</p>
              </div>
            </div>
          </div>
        </div>

        <MobileBottomNav />
      </main>
    )
  }

  return (
    <div className="print-shell min-h-screen bg-[#f5f6f8] flex flex-col pb-20">
      {/* Nicht drucken */}
      <div className="no-print">
        <Header variant="app" title="Spielerblatt" subtitle="Drucken" backHref="/member-profile-app" />
      </div>

      <style jsx global>{`
        @media print {
          @page {
            size: A4 landscape;
            margin: 6mm;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            min-height: 0 !important;
            height: auto !important;
            overflow: visible !important;
            background: white !important;
          }
          .no-print {
            display: none !important;
          }
          .print-shell {
            min-height: 0 !important;
            height: auto !important;
            padding: 0 !important;
            margin: 0 !important;
            background: white !important;
          }
          .print-main, .print-container {
            padding: 0 !important;
            margin: 0 !important;
            min-height: 0 !important;
            height: auto !important;
          }
          .print-only {
            display: block !important;
            margin: 0 !important;
            padding: 0 !important;
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
          .print-container > .h-6 {
            display: none !important;
          }
        }
        @media screen {
          .print-only {
            display: none !important;
          }
        }
      `}</style>

      {/* ✅ UNDER HEADER: */}
      <main className="print-main w-full pt-14 sm:pt-16">
        <div className="print-container w-full max-w-none px-2 py-3 pb-24 sm:px-4 sm:py-5 sm:pb-10 lg:px-5 xl:px-6 2xl:px-8">
          {/* TOP WHITE CONTAINER */}
          <section className="no-print relative mb-4 overflow-hidden rounded-[24px] border border-slate-800/10 bg-slate-950 shadow-[0_24px_80px_-42px_rgba(15,23,42,0.62)] sm:mb-5 sm:rounded-[28px] xl:rounded-[30px]">
            <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-orange-500/20 blur-3xl" />
            <div className="relative flex flex-col gap-5 p-4 sm:p-6 lg:flex-row lg:items-end lg:justify-between lg:p-8">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.07]">
                  <Printer className="h-6 w-6 text-orange-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white/50">Spieler auswählen und Blatt drucken</p>
                  <h1 className="mt-1 text-3xl font-black tracking-[-0.04em] text-white sm:text-4xl">Spielerblatt drucken</h1>
                  <p className="mt-2 text-sm font-medium text-white/55">Nur Kapitän/Co-Kapitän kann drucken.</p>
                </div>
              </div>
            </div>
          </section>

          {/* CONTENT */}
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(320px,420px)_1fr]">
            {/* Auswahl */}
            <Card className="no-print overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_18px_60px_-44px_rgba(15,23,42,0.5)]">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm sm:text-base font-black">
                  <Users className="h-5 w-5 text-orange-600" />
                  Auswahl
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-4">
                <div>
                  <div className="text-xs font-bold text-slate-500 mb-2">Team</div>
                  <Select
                    value={selectedTeamId}
                    onValueChange={(v) => {
                      setSelectedTeamId(v)
                      setSelectedPlayerIds(new Set())
                    }}
                  >
                    <SelectTrigger className="h-11 rounded-2xl border-slate-200 bg-white">
                      <SelectValue placeholder="Team wählen" />
                    </SelectTrigger>
                    <SelectContent>
                      {manageableTeams.map((m) => (
                        <SelectItem key={m.team_id} value={m.team_id}>
                          {m.teams?.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <div className="text-xs font-bold text-slate-500 mb-2">Spieler</div>
                  <div className="max-h-[420px] space-y-2 overflow-auto rounded-[18px] border border-slate-200 bg-slate-50/70 p-3">
                    {membersOfSelectedTeam.length === 0 ? (
                      <div className="text-sm text-slate-500 py-6 text-center">Keine Spieler im Team.</div>
                    ) : (
                      membersOfSelectedTeam.map((m) => (
                        <label
                          key={m.id}
                          className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 transition hover:border-orange-200 hover:bg-orange-50/30"
                        >
                          <Checkbox
                            checked={selectedPlayerIds.has(m.player_id)}
                            onCheckedChange={(v) => togglePlayer(m.player_id, Boolean(v))}
                          />
                          <span className="font-semibold text-slate-950">{m.club_players?.name}</span>
                        </label>
                      ))
                    )}
                  </div>
                </div>

                <Button
                  className="w-full h-11 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white font-black shadow-sm"
                  onClick={() => window.print()}
                  disabled={!canManage}
                >
                  <Printer className="h-4 w-4 mr-2" />
                  Drucken
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-11 rounded-2xl font-black"
                  onClick={() => router.push("/team-scan-sheet")}
                  disabled={!canManage}
                >
                  <ScanLine className="h-4 w-4 mr-2" />
                  Statistikblatt scannen (TEST)
                </Button>

                {!canManage ? (
                  <div className="text-xs text-slate-500">
                    Hinweis: Du brauchst Kapitän/Co-Kapitän Rechte für dieses Team.
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </div>

          {/* ✅ Nur im Druck sichtbar */}
          <div className="print-only">
            <PrintSheet
              teamId={selectedTeamId}
              teamName={selectedTeam?.name || ""}
              teamLogoUrl={selectedTeam?.logo_url || null}
              players={selectedPlayers}
            />
          </div>

          <div className="h-6" aria-hidden="true" />
        </div>
      </main>

      <div className="no-print">
        <MobileBottomNav />
      </div>
    </div>
  )
}

function PrintSheet({
  teamId,
  teamName,
  teamLogoUrl,
  players,
}: {
  teamId: string
  teamName: string
  teamLogoUrl: string | null
  players: { id: string; name: string }[]
}) {
  const headers = [
    "SPIELER",
    "LEGS W",
    "LEGS L",
    "20",
    "19",
    "18",
    "17",
    "16",
    "15",
    "BULL",
    "180",
    "171",
    "H. TONNE",
    "TONNE",
    "SHANG",
    "95+",
    "<26",
    "<30",
    "SEMP",
  ]

  const shortId = (id: string) => id.replace(/-/g, "").toLowerCase().slice(0, 10)
  const qrValue = `DPSTAT2|${shortId(teamId)}|${players.map((p) => shortId(p.id)).join(",")}`

  const totalRows = Math.max(players.length, 12)
  const rows = [...players]
  while (rows.length < totalRows) rows.push({ id: "", name: "" })

  return (
    <div style={{ width: "100%", position: "relative" }}>
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {teamLogoUrl ? (
            <img
              src={teamLogoUrl}
              alt="Teamlogo"
              style={{ width: 30, height: 30, borderRadius: 9999, objectFit: "cover" }}
            />
          ) : null}
          <div>
            <div className="font-bold text-sm">{teamName ? `TEAM: ${teamName}` : "TEAM:"}</div>
            <div style={{ fontSize: 8, color: "#666" }}>DartPilot Statistikblatt · Stable Mobile v8.3</div>
          </div>
        </div>

        {teamId && players.length ? (
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ fontSize: 8, textAlign: "right", color: "#555" }}>
              <div style={{ fontWeight: 700 }}>SCAN-CODE</div>
              <div>{players.length} Spieler</div>
            </div>
            <div style={{ background: "white", padding: 2, border: "1px solid #bbb" }}>
              <QRCodeSVG value={qrValue} size={76} level="L" marginSize={4} />
            </div>
          </div>
        ) : null}
      </div>

      {/* Mobile markers are overlays only: they do NOT wrap, shrink or move the original v8 table. */}
      <div aria-hidden="true" style={{ position: "absolute", left: 0, right: 0, top: 50, bottom: 0, pointerEvents: "none", zIndex: 20 }}>
        <svg width="20" height="20" viewBox="0 0 20 20" style={{ position: "absolute", left: 0, top: 0, transform: "translate(-50%, -50%)" }}><rect width="20" height="20" fill="#000" /></svg>
        <svg width="20" height="20" viewBox="0 0 20 20" style={{ position: "absolute", right: 0, top: 0, transform: "translate(50%, -50%)" }}><rect width="20" height="20" fill="#000" /></svg>
        <svg width="20" height="20" viewBox="0 0 20 20" style={{ position: "absolute", right: 0, bottom: 0, transform: "translate(50%, 50%)" }}><rect width="20" height="20" fill="#000" /></svg>
        <svg width="20" height="20" viewBox="0 0 20 20" style={{ position: "absolute", left: 0, bottom: 0, transform: "translate(-50%, 50%)" }}><rect width="20" height="20" fill="#000" /></svg>
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
        <thead>
          <tr>
            {headers.map((h) => (
              <th
                key={h}
                style={{
                  border: "1px solid black",
                  fontSize: 10,
                  padding: 4,
                  textAlign: "center",
                  width: h === "SPIELER" ? "18%" : h === "LEGS W" || h === "LEGS L" ? "5%" : "4%",
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {rows.map((player, idx) => (
            <tr key={idx} style={{ height: 44 }}>
              <td style={{ border: "1px solid black", paddingLeft: 6, fontSize: 11 }}>{player.name}</td>
              {Array.from({ length: headers.length - 1 }).map((_, i) => (
                <td key={i} style={{ border: "1px solid black" }} />
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}