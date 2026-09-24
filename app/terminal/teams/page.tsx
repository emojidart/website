"use client"

import { useEffect, useMemo, useState } from "react"
import { createBrowserClient } from "@supabase/ssr"
import {
  ArrowLeft,
  ArrowRight,
  ChevronLeft,
  Crown,
  Hand,
  MapPin,
  Shield,
  Target,
  Users,
} from "lucide-react"
import TerminalLink from "../_components/TerminalLink"

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
)

type Player = {
  id: string
  name: string
  photo_url: string | null
  throwing_hand: string | null
  origin: string | null
  role: string | null
}

type Team = {
  id: string
  name: string
  logo_url: string | null
  dart_type: string | null
  players: Player[]
}

type DartFilter = "all" | "edart" | "steeldart"

function roleOrder(role?: string | null) {
  const normalized = (role || "spieler").toLowerCase().trim()
  if (normalized === "captain") return 1
  if (normalized === "co-captain") return 2
  return 3
}

function roleLabel(role?: string | null) {
  const normalized = (role || "").toLowerCase().trim()
  if (normalized === "captain") return "Captain"
  if (normalized === "co-captain") return "Co-Captain"
  return "Spieler"
}

function handLabel(hand?: string | null) {
  if (!hand) return "–"
  const h = hand.toLowerCase()
  if (h.includes("left") || h.includes("links")) return "Links"
  if (h.includes("right") || h.includes("rechts")) return "Rechts"
  return hand
}

function TeamLogo({ team, large = false }: { team: Team; large?: boolean }) {
  const size = large ? "h-28 w-28 sm:h-32 sm:w-32" : "h-24 w-24"
  return (
    <div className={`${size} flex shrink-0 items-center justify-center overflow-hidden rounded-[26px] border border-white/10 bg-black/45 shadow-[0_20px_60px_-40px_rgba(0,0,0,.9)]`}>
      {team.logo_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={team.logo_url}
          alt={team.name}
          className="h-full w-full object-contain [transform:scale(1.18)]"
        />
      ) : (
        <Shield className="h-10 w-10 text-orange-300/75" />
      )}
    </div>
  )
}

function PlayerCard({ player }: { player: Player }) {
  const captain = roleLabel(player.role) === "Captain"
  const coCaptain = roleLabel(player.role) === "Co-Captain"

  return (
    <article className={`group overflow-hidden rounded-[24px] border bg-black/28 backdrop-blur-xl ${
      captain
        ? "border-orange-400/28"
        : coCaptain
          ? "border-cyan-300/20"
          : "border-white/[0.08]"
    }`}>
      <div className="relative aspect-[4/5] overflow-hidden bg-black/45">
        {player.photo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={player.photo_url}
            alt={player.name}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.025]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Users className="h-16 w-16 text-white/15" />
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />

        <div className="absolute inset-x-0 bottom-0 p-4">
          <div className="flex items-end justify-between gap-2">
            <div className="min-w-0">
              <h3 className="line-clamp-2 text-base font-black leading-tight sm:text-lg">
                {player.name}
              </h3>
              <span className={`mt-2 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] ${
                captain
                  ? "border-orange-300/25 bg-orange-500/14 text-orange-200"
                  : coCaptain
                    ? "border-cyan-200/20 bg-cyan-400/10 text-cyan-100"
                    : "border-white/10 bg-white/10 text-white/70"
              }`}>
                {captain && <Crown className="h-3 w-3" />}
                {roleLabel(player.role)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 border-t border-white/[0.06] p-3">
        <div className="rounded-xl bg-white/[0.035] p-2.5">
          <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.16em] text-white/30">
            <MapPin className="h-3 w-3" /> Herkunft
          </div>
          <div className="mt-1 truncate text-xs font-bold text-white/70">
            {player.origin?.trim() || "–"}
          </div>
        </div>

        <div className="rounded-xl bg-white/[0.035] p-2.5">
          <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.16em] text-white/30">
            <Hand className="h-3 w-3" /> Wurfhand
          </div>
          <div className="mt-1 text-xs font-bold text-white/70">
            {handLabel(player.throwing_hand)}
          </div>
        </div>
      </div>
    </article>
  )
}

export default function TerminalTeamsPage() {
  const [loading, setLoading] = useState(true)
  const [teams, setTeams] = useState<Team[]>([])
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null)
  const [dartFilter, setDartFilter] = useState<DartFilter>("all")

  useEffect(() => {
    const load = async () => {
      setLoading(true)

      const [{ data: teamRows }, { data: memberRows }] = await Promise.all([
        supabase
          .from("teams")
          .select("id,name,logo_url,dart_type")
          .not("user_id", "is", null)
          .order("name"),
        supabase
          .from("team_members")
          .select(`
            team_id,
            role,
            left_at,
            club_players!team_members_player_id_fkey(
              id,
              name,
              photo_url,
              throwing_hand,
              origin
            )
          `)
          .is("left_at", null),
      ])

      const built = ((teamRows || []) as any[]).map((team) => ({
        id: String(team.id),
        name: String(team.name || ""),
        logo_url: team.logo_url || null,
        dart_type: team.dart_type || null,
        players: ((memberRows || []) as any[])
          .filter((m) => m.team_id === team.id && m.club_players)
          .map((m) => ({
            id: String(m.club_players.id),
            name: String(m.club_players.name || "Unbekannter Spieler"),
            photo_url: m.club_players.photo_url || null,
            throwing_hand: m.club_players.throwing_hand || null,
            origin: m.club_players.origin || null,
            role: m.role || null,
          }))
          .sort((a, b) => {
            const diff = roleOrder(a.role) - roleOrder(b.role)
            if (diff !== 0) return diff
            return a.name.localeCompare(b.name, "de")
          }),
      })) as Team[]

      setTeams(built)
      setLoading(false)
    }

    void load()
  }, [])

  const filteredTeams = useMemo(() => {
    if (dartFilter === "all") return teams
    return teams.filter((team) => team.dart_type === dartFilter)
  }, [teams, dartFilter])

  const selectedTeam = teams.find((team) => team.id === selectedTeamId) || null

  if (selectedTeam) {
    return (
      <main className="relative min-h-[100svh] overflow-x-hidden bg-[#050608] text-white">
        <div
          className="pointer-events-none fixed inset-0 bg-cover bg-[66%_50%] bg-no-repeat opacity-[0.56]"
          style={{ backgroundImage: "url('/terminal/hero-startscreen.png')" }}
        />
        <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(180deg,rgba(4,6,9,.38),rgba(4,6,9,.72)),radial-gradient(circle_at_10%_0%,rgba(249,115,22,.14),transparent_28%),radial-gradient(circle_at_100%_80%,rgba(14,165,233,.10),transparent_30%)]" />

        <div className="relative mx-auto min-h-[100svh] max-w-[1500px] px-5 py-6 lg:px-8 lg:py-8">
          <header className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setSelectedTeamId(null)}
              className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-black/35 text-white/65 backdrop-blur-xl transition hover:bg-white/[0.08]"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>

            <div>
              <div className="text-[11px] font-black uppercase tracking-[0.34em] text-orange-300/90">
                Mannschaft
              </div>
              <h1 className="mt-1 text-3xl font-black tracking-[-0.05em] sm:text-4xl">
                {selectedTeam.name}
              </h1>
            </div>
          </header>

          <section className="mt-7 overflow-hidden rounded-[34px] border border-white/[0.08] bg-black/27 p-5 backdrop-blur-2xl sm:p-6">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              <TeamLogo team={selectedTeam} large />

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full border border-orange-300/20 bg-orange-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-orange-200">
                    {selectedTeam.dart_type === "steeldart" ? "Steeldart" : "E-Dart"}
                  </span>
                  <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-white/55">
                    {selectedTeam.players.length} Spieler
                  </span>
                </div>

                <div className="mt-4 text-3xl font-black tracking-[-0.04em]">{selectedTeam.name}</div>
                <div className="mt-2 text-sm font-semibold text-white/40">
                  Aktueller Kader · Captain und Co-Captain zuerst
                </div>
              </div>
            </div>
          </section>

          <section className="mt-6">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <div className="text-xs font-black uppercase tracking-[0.24em] text-white/30">Kader</div>
                <div className="mt-1 text-2xl font-black">{selectedTeam.players.length} Spieler</div>
              </div>
            </div>

            {selectedTeam.players.length === 0 ? (
              <div className="rounded-[30px] border border-dashed border-white/10 bg-black/20 p-12 text-center backdrop-blur-xl">
                <Users className="mx-auto h-12 w-12 text-white/18" />
                <div className="mt-4 text-xl font-black text-white/60">Noch keine Spieler im Team</div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {selectedTeam.players.map((player) => (
                  <PlayerCard key={player.id} player={player} />
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    )
  }

  return (
    <main className="relative min-h-[100svh] overflow-x-hidden bg-[#050608] text-white">
      <div
        className="pointer-events-none fixed inset-0 bg-cover bg-[66%_50%] bg-no-repeat opacity-[0.58]"
        style={{ backgroundImage: "url('/terminal/hero-startscreen.png')" }}
      />
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(180deg,rgba(4,6,9,.38),rgba(4,6,9,.68)),radial-gradient(circle_at_10%_0%,rgba(249,115,22,.14),transparent_28%),radial-gradient(circle_at_100%_80%,rgba(14,165,233,.10),transparent_30%)]" />

      <div className="relative mx-auto min-h-[100svh] max-w-[1500px] px-5 py-6 lg:px-8 lg:py-8">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <TerminalLink
              href="/terminal/liga"
              label="Ligabereich wird geöffnet"
              className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-black/35 text-white/65 backdrop-blur-xl transition hover:bg-white/[0.08]"
            >
              <ArrowLeft className="h-5 w-5" />
            </TerminalLink>

            <div>
              <div className="text-[11px] font-black uppercase tracking-[0.34em] text-orange-300/90">
                EMD Club Terminal
              </div>
              <h1 className="mt-1 text-3xl font-black tracking-[-0.05em] sm:text-4xl">
                Mannschaften
              </h1>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {([
              ["all", "Alle"],
              ["edart", "E-Dart"],
              ["steeldart", "Steeldart"],
            ] as Array<[DartFilter, string]>).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setDartFilter(key)}
                className={`rounded-2xl border px-4 py-3 text-sm font-black transition ${
                  dartFilter === key
                    ? "border-orange-400/35 bg-orange-500 text-white"
                    : "border-white/10 bg-white/[0.035] text-white/55 hover:bg-white/[0.07]"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </header>

        <section className="mt-7 overflow-hidden rounded-[32px] border border-white/[0.08] bg-black/24 p-5 backdrop-blur-xl sm:p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-[20px] border border-orange-400/20 bg-orange-500/10 text-orange-300">
              <Users className="h-7 w-7" />
            </div>
            <div>
              <div className="text-xs font-black uppercase tracking-[0.24em] text-white/30">Unsere Teams</div>
              <div className="mt-1 text-2xl font-black">
                {loading ? "Wird geladen…" : `${filteredTeams.length} Mannschaften`}
              </div>
              <div className="mt-1 text-sm font-semibold text-white/38">
                Tippe auf eine Mannschaft, um den kompletten Kader zu sehen.
              </div>
            </div>
          </div>
        </section>

        <section className="mt-6">
          {loading ? (
            <div className="rounded-[32px] border border-white/[0.08] bg-black/28 p-12 text-center backdrop-blur-2xl">
              <div className="mx-auto h-1.5 w-52 overflow-hidden rounded-full bg-white/[0.08]">
                <div className="h-full w-1/2 animate-pulse rounded-full bg-orange-400" />
              </div>
              <div className="mt-4 text-sm font-black uppercase tracking-[0.24em] text-white/35">
                Mannschaften werden geladen
              </div>
            </div>
          ) : filteredTeams.length === 0 ? (
            <div className="rounded-[30px] border border-dashed border-white/10 bg-black/20 p-12 text-center backdrop-blur-xl">
              <Users className="mx-auto h-12 w-12 text-white/18" />
              <div className="mt-4 text-xl font-black text-white/60">Keine Mannschaften gefunden</div>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filteredTeams.map((team) => {
                const captain = team.players.find((p) => roleLabel(p.role) === "Captain")
                return (
                  <button
                    key={team.id}
                    type="button"
                    onClick={() => setSelectedTeamId(team.id)}
                    className="group relative touch-manipulation select-none overflow-hidden rounded-[30px] border border-white/[0.09] bg-black/28 p-5 text-left backdrop-blur-2xl transition duration-200 hover:-translate-y-1 hover:border-orange-400/28 hover:bg-black/36 active:scale-[1.025] active:border-orange-300/40 active:bg-orange-500/[0.08] active:shadow-[0_0_34px_rgba(249,115,22,.20)]"
                  >
                    <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-orange-400/55 to-transparent" />
                    <div className="flex items-center gap-4">
                      <TeamLogo team={team} />

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap gap-2">
                          <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-white/45">
                            {team.dart_type === "steeldart" ? "Steeldart" : "E-Dart"}
                          </span>
                        </div>

                        <div className="mt-3 truncate text-xl font-black">{team.name}</div>
                        <div className="mt-1 text-sm font-bold text-white/38">
                          {team.players.length} Spieler
                        </div>

                        {captain && (
                          <div className="mt-3 flex items-center gap-2 text-xs font-bold text-orange-200/70">
                            <Crown className="h-4 w-4" /> {captain.name}
                          </div>
                        )}
                      </div>

                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-orange-400/18 bg-orange-500/[0.08] text-orange-300 transition group-hover:bg-orange-500/14">
                        <ArrowRight className="h-5 w-5 transition group-hover:translate-x-1" />
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
