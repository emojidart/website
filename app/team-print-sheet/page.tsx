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

import { Users, Printer, Loader2 } from "lucide-react"

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

  const selectedNames = useMemo(() => {
    return membersOfSelectedTeam
      .filter((m) => selectedPlayerIds.has(m.player_id))
      .map((m) => m.club_players?.name || "")
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
    <div className="min-h-screen bg-[#f5f6f8] flex flex-col pb-20">
      {/* Nicht drucken */}
      <div className="no-print">
        <Header variant="app" title="Spielerblatt" subtitle="Drucken" backHref="/member-profile-app" />
      </div>

      <style jsx global>{`
        @media print {
          @page {
            size: A4 landscape;
            margin: 10mm;
          }
          .no-print {
            display: none !important;
          }
          .print-only {
            display: block !important;
          }
        }
        @media screen {
          .print-only {
            display: none !important;
          }
        }
      `}</style>

      {/* ✅ UNDER HEADER: */}
      <main className="w-full pt-14 sm:pt-16">
        <div className="w-full max-w-none px-2 py-3 pb-24 sm:px-4 sm:py-5 sm:pb-10 lg:px-5 xl:px-6 2xl:px-8">
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
              teamName={selectedTeam?.name || ""}
              teamLogoUrl={selectedTeam?.logo_url || null}
              playerNames={selectedNames}
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
  teamName,
  teamLogoUrl,
  playerNames,
}: {
  teamName: string
  teamLogoUrl: string | null
  playerNames: string[]
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

  const totalRows = Math.max(playerNames.length, 12)
  const names = [...playerNames]
  while (names.length < totalRows) names.push("")

  return (
    <div style={{ width: "100%" }}>
      <div className="flex items-center gap-2 mb-2">
        {teamLogoUrl ? (
          <img
            src={teamLogoUrl}
            alt="Teamlogo"
            style={{ width: 30, height: 30, borderRadius: 9999, objectFit: "cover" }}
          />
        ) : null}
        <div className="font-bold text-sm">{teamName ? `TEAM: ${teamName}` : "TEAM:"}</div>
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
          {names.map((name, idx) => (
            <tr key={idx} style={{ height: 44 }}>
              <td style={{ border: "1px solid black", paddingLeft: 6, fontSize: 11 }}>{name}</td>
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