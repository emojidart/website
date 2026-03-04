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
      <main className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <Header variant="app" title="Spielerblatt" subtitle="Drucken" backHref="/member-profile-app" />

        <div className="flex-1 flex items-center justify-center px-4 pb-20">
          <div className="animate-in fade-in zoom-in-95 duration-300">
            <div className="flex flex-col items-center gap-6 rounded-3xl bg-white shadow-2xl px-10 py-10 border border-orange-100">
              <div className="relative">
                <div className="absolute inset-0 rounded-full bg-orange-500/30 blur-2xl animate-pulse" />
                <Loader2 className="relative h-12 w-12 animate-spin text-orange-600" />
              </div>

              <div className="text-center">
                <p className="text-lg font-bold text-gray-900">Seite wird geladen</p>
                <p className="text-sm text-gray-500 mt-1">Bitte kurz warten…</p>
              </div>
            </div>
          </div>
        </div>

        <MobileBottomNav />
      </main>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex flex-col pb-20">
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
      <main className="pt-12 sm:pt-14">
        <div className="mx-auto w-full px-4 py-6 sm:py-8 max-w-2xl lg:max-w-screen-xl 2xl:max-w-screen-2xl">
          {/* TOP WHITE CONTAINER */}
          <section className="no-print rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden mb-5 sm:mb-6">
            <div className="h-2 bg-gradient-to-r from-orange-500 to-orange-600" />
            <div className="p-4 sm:p-5 flex items-start gap-3">
              <div className="w-11 h-11 rounded-2xl bg-orange-50 border border-orange-200 flex items-center justify-center flex-shrink-0">
                <Printer className="w-5 h-5 text-orange-600" />
              </div>

              <div className="min-w-0 flex-1">
                <h1 className="text-base sm:text-lg font-black">Spielerblatt drucken</h1>
                <p className="text-sm text-gray-600 mt-1">Spieler wählen → Drucken</p>
                <p className="text-xs text-gray-500 mt-1">Nur Kapitän/Co-Kapitän kann drucken.</p>
              </div>
            </div>
          </section>

          {/* CONTENT */}
          <div className="grid grid-cols-1 gap-4">
            {/* Auswahl */}
            <Card className="no-print rounded-2xl border border-gray-200 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm sm:text-base font-black">
                  <Users className="h-5 w-5 text-orange-600" />
                  Auswahl
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-4">
                <div>
                  <div className="text-xs font-bold text-gray-500 mb-2">Team</div>
                  <Select
                    value={selectedTeamId}
                    onValueChange={(v) => {
                      setSelectedTeamId(v)
                      setSelectedPlayerIds(new Set())
                    }}
                  >
                    <SelectTrigger className="h-11 rounded-2xl border-gray-200 bg-white">
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
                  <div className="text-xs font-bold text-gray-500 mb-2">Spieler</div>
                  <div className="rounded-2xl border border-gray-200 bg-gray-50 p-3 max-h-[360px] overflow-auto space-y-2">
                    {membersOfSelectedTeam.length === 0 ? (
                      <div className="text-sm text-gray-500 py-6 text-center">Keine Spieler im Team.</div>
                    ) : (
                      membersOfSelectedTeam.map((m) => (
                        <label
                          key={m.id}
                          className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white hover:bg-gray-50 p-3"
                        >
                          <Checkbox
                            checked={selectedPlayerIds.has(m.player_id)}
                            onCheckedChange={(v) => togglePlayer(m.player_id, Boolean(v))}
                          />
                          <span className="font-semibold text-gray-900">{m.club_players?.name}</span>
                        </label>
                      ))
                    )}
                  </div>
                </div>

                <Button
                  className="w-full h-11 rounded-2xl bg-orange-600 hover:bg-orange-700 text-white font-black shadow-sm"
                  onClick={() => window.print()}
                  disabled={!canManage}
                >
                  <Printer className="h-4 w-4 mr-2" />
                  Drucken
                </Button>

                {!canManage ? (
                  <div className="text-xs text-gray-500">
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