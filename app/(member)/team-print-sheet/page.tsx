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

import { Users, ArrowLeft, Printer } from "lucide-react"

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

      const firstManageable = allMemberships.find(
        (x) => x.role === "Captain" || x.role === "Co-Captain"
      )
      if (firstManageable?.team_id) setSelectedTeamId(firstManageable.team_id)

      const teamIds = allMemberships.map((x) => x.team_id)
      const { data: memData } = await supabase
        .from("team_members")
        .select(
          "id, team_id, player_id, club_players:club_players!team_members_player_id_fkey (id, name)"
        )
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
    myRoleByTeamId.get(selectedTeamId) === "Captain" ||
    myRoleByTeamId.get(selectedTeamId) === "Co-Captain"

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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-orange-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Nicht drucken */}
      <div className="no-print">
        <Header />
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

      <main className="flex-grow w-full px-6 py-6 max-w-6xl mx-auto">
        {/* ORANGE HEADER */}
        <div className="no-print rounded-2xl bg-orange-600 text-white p-6 shadow-lg mb-6">
          <div className="flex items-center gap-4">
            <Printer className="h-8 w-8" />
            <div>
              <div className="text-2xl font-bold">Spielerblatt drucken</div>
              <div className="text-sm text-orange-100">Spieler wählen → Drucken</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Auswahl */}
          <Card className="no-print">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-orange-600" />
                Auswahl
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                variant="outline"
                onClick={() => router.push("/member-profile-app")}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Zurück
              </Button>

              <Select
                value={selectedTeamId}
                onValueChange={(v) => {
                  setSelectedTeamId(v)
                  setSelectedPlayerIds(new Set())
                }}
              >
                <SelectTrigger>
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

              <div className="border rounded-xl p-3 max-h-[400px] overflow-auto space-y-2">
                {membersOfSelectedTeam.map((m) => (
                  <label key={m.id} className="flex items-center gap-3">
                    <Checkbox
                      checked={selectedPlayerIds.has(m.player_id)}
                      onCheckedChange={(v) => togglePlayer(m.player_id, Boolean(v))}
                    />
                    <span>{m.club_players?.name}</span>
                  </label>
                ))}
              </div>

              <Button
                className="w-full bg-orange-600 hover:bg-orange-700"
                onClick={() => window.print()}
                disabled={!canManage}
              >
                <Printer className="h-4 w-4 mr-2" />
                Drucken
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* ✅ Nur im Druck sichtbar (nicht am Screen) */}
        <div className="print-only">
          <PrintSheet
            teamName={selectedTeam?.name || ""}
            teamLogoUrl={selectedTeam?.logo_url || null}
            playerNames={selectedNames}
          />
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
                  width:
                    h === "SPIELER"
                      ? "18%"
                      : h === "LEGS W" || h === "LEGS L"
                        ? "5%"
                        : "4%",
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
              <td style={{ border: "1px solid black", paddingLeft: 6, fontSize: 11 }}>
                {name}
              </td>
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