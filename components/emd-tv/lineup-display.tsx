"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { supabase } from "@/lib/supabase"

type Match = {
  id: string
  home_team_type: string | null
  away_team_type: string | null
  home_opponent_team_id: string | null
  away_opponent_team_id: string | null
  match_date: string
  match_time: string | null
  venue: string | null
  dart_type: string | null
  home_team?: { id: string; name: string } | null
  away_team?: { id: string; name: string } | null
}

type Player = {
  id: string
  player_id: string
  position: number
  is_substitute: boolean
  role: string | null
  club_players?: { id: string; name: string; photo_url: string | null } | null
}

type Screen =
  | { kind: "intro" }
  | { kind: "player"; player: Player; number: number }
  | { kind: "final" }

function rolePriority(role: string | null) {
  if (role === "Captain") return 0
  if (role === "Co-Captain") return 1
  return 2
}

function roleText(role: string | null) {
  if (role === "Captain") return "KAPITÄN"
  if (role === "Co-Captain") return "CO-KAPITÄN"
  return "SPIELER"
}

function dartLabel(value: string | null) {
  const v = String(value || "").toLowerCase()
  if (v.includes("steel")) return "STEEL DART"
  if (v.includes("edart") || v.includes("e-dart")) return "E-DART"
  return "LIGA"
}

function formatMatchDate(date: string, time: string | null) {
  const d = new Date(`${date}T${time || "12:00:00"}`)
  const dateText = new Intl.DateTimeFormat("de-AT", { weekday: "long", day: "2-digit", month: "2-digit" }).format(d)
  const timeText = time ? `${time.slice(0, 5)} Uhr` : ""
  return timeText ? `${dateText} · ${timeText}` : dateText
}

export default function LineupDisplay({
  matchId,
  teamId,
  onComplete,
}: {
  matchId: string
  teamId: string
  onComplete: () => void
}) {
  const [ready, setReady] = useState(false)
  const [match, setMatch] = useState<Match | null>(null)
  const [teamName, setTeamName] = useState("EMD")
  const [teamLogo, setTeamLogo] = useState<string | null>(null)
  const [homeName, setHomeName] = useState("HEIM")
  const [awayName, setAwayName] = useState("AUSWÄRTS")
  const [players, setPlayers] = useState<Player[]>([])
  const [screenIndex, setScreenIndex] = useState(0)
  const completedRef = useRef(false)

  useEffect(() => {
    let cancelled = false
    completedRef.current = false
    setReady(false)
    setScreenIndex(0)

    async function load() {
      const [matchRes, lineupRes, teamRes, memberRes, opponentRes] = await Promise.all([
        supabase
          .from("matches")
          .select("id,home_team_id,away_team_id,home_team_type,away_team_type,home_opponent_team_id,away_opponent_team_id,match_date,match_time,venue,dart_type,home_team:teams!matches_home_team_id_fkey(id,name),away_team:teams!matches_away_team_id_fkey(id,name)")
          .eq("id", matchId)
          .maybeSingle(),
        supabase
          .from("match_lineups")
          .select("id,player_id,position,is_substitute,club_players:club_players(id,name,photo_url)")
          .eq("match_id", matchId)
          .eq("team_id", teamId),
        supabase.from("teams").select("id,name,logo_url,dart_type").eq("id", teamId).maybeSingle(),
        supabase.from("team_members").select("player_id,role").eq("team_id", teamId).is("left_at", null),
        supabase.from("opponent_teams").select("id,name"),
      ])

      if (cancelled || !matchRes.data || matchRes.error || lineupRes.error) {
        if (!cancelled) onComplete()
        return
      }

      const roles = new Map<string, string | null>()
      ;((memberRes.data || []) as Array<{ player_id: string; role: string | null }>).forEach((m) => roles.set(m.player_id, m.role))
      const loadedPlayers = ((lineupRes.data || []) as unknown as Player[]).map((p) => ({ ...p, role: roles.get(p.player_id) || null }))
      const opponents = new Map<string, string>()
      ;((opponentRes.data || []) as Array<{ id: string; name: string }>).forEach((o) => opponents.set(o.id, o.name))
      const loadedMatch = matchRes.data as unknown as Match

      const sideName = (side: "home" | "away") => {
        const type = side === "home" ? loadedMatch.home_team_type : loadedMatch.away_team_type
        const oppId = side === "home" ? loadedMatch.home_opponent_team_id : loadedMatch.away_opponent_team_id
        const own = side === "home" ? loadedMatch.home_team : loadedMatch.away_team
        if (type === "opponent" && oppId) return opponents.get(oppId) || "GEGNER"
        return own?.name || "UNBEKANNT"
      }

      setMatch(loadedMatch)
      setTeamName((teamRes.data as any)?.name || "EMD")
      setTeamLogo((teamRes.data as any)?.logo_url || null)
      setHomeName(sideName("home"))
      setAwayName(sideName("away"))
      setPlayers(loadedPlayers)

      const urls = loadedPlayers.map((p) => p.club_players?.photo_url).filter(Boolean) as string[]
      await Promise.all(urls.map((src) => new Promise<void>((resolve) => {
        const img = new Image()
        img.onload = () => resolve()
        img.onerror = () => resolve()
        img.src = src
      })))

      if (!cancelled) setReady(true)
    }

    void load()
    return () => { cancelled = true }
  }, [matchId, teamId, onComplete])

  const starters = useMemo(() => players.filter((p) => !p.is_substitute).sort((a, b) => {
    const role = rolePriority(a.role) - rolePriority(b.role)
    return role !== 0 ? role : a.position - b.position
  }), [players])

  const substitutes = useMemo(() => players.filter((p) => p.is_substitute).sort((a, b) => a.position - b.position), [players])
  const allPlayers = useMemo(() => [...starters, ...substitutes], [starters, substitutes])
  const screens = useMemo<Screen[]>(() => [
    { kind: "intro" },
    ...allPlayers.map((player, index) => ({ kind: "player" as const, player, number: index + 1 })),
    { kind: "final" },
  ], [allPlayers])
  const screen = screens[screenIndex] || screens[0]

  useEffect(() => {
    if (!ready || screens.length < 2) return
    const final = screenIndex === screens.length - 1
    const delay = screenIndex === 0 ? 4800 : final ? 7600 : 3600
    const timer = window.setTimeout(() => {
      if (final) {
        if (!completedRef.current) {
          completedRef.current = true
          onComplete()
        }
        return
      }
      setScreenIndex((i) => i + 1)
    }, delay)
    return () => window.clearTimeout(timer)
  }, [ready, screenIndex, screens.length, onComplete])

  if (!ready || !match) {
    return <div className="absolute inset-0 bg-[#030303]" />
  }

  const currentPlayer = screen.kind === "player" ? screen.player : null
  const playerName = currentPlayer?.club_players?.name || "SPIELER"
  const photo = currentPlayer?.club_players?.photo_url || null

  return (
    <div className="absolute inset-0 overflow-hidden bg-[#030303] text-white">
      <style jsx>{`
        @keyframes lineupIn { from { opacity: 0; transform: scale(1.025) translateY(10px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        @keyframes softPulse { 0%,100% { opacity:.45 } 50% { opacity:.9 } }
        @keyframes sweep { 0% { transform: translateX(-130%); opacity:0 } 15% { opacity:.8 } 100% { transform: translateX(250%); opacity:0 } }
        .li-fade { animation: lineupIn .55s cubic-bezier(.2,.75,.2,1) both; }
        .li-sweep { animation: sweep 4s ease-in-out infinite; }
        .li-pulse { animation: softPulse 3.4s ease-in-out infinite; }
      `}</style>

      <div className="absolute inset-0 bg-[url('/terminal/hero-startscreen.png')] bg-cover bg-center opacity-[.30]" />
      <div className="absolute inset-0 bg-[linear-gradient(110deg,rgba(0,0,0,.98),rgba(5,5,6,.90)_48%,rgba(17,8,2,.76))]" />
      <div className="absolute left-[-10vw] top-[12vh] h-[42vw] w-[42vw] rounded-full bg-orange-500/[.08] blur-[7vw]" />
      <div className="absolute right-[-12vw] top-[5vh] h-[38vw] w-[38vw] rounded-full bg-orange-300/[.055] blur-[7vw]" />
      <div className="absolute left-[-18%] top-[32%] h-[9%] w-[50%] rotate-[-8deg] bg-gradient-to-r from-transparent via-orange-300/15 to-transparent blur-xl li-sweep" />

      {screen.kind === "intro" ? (
        <section key="intro" className="li-fade absolute inset-0 grid place-items-center px-[5vw] text-center">
          <div>
            <div className="text-[clamp(.75rem,1vw,1.05rem)] font-black uppercase tracking-[.42em] text-orange-300/80">EMD TV · STARTING LINEUP</div>
            <h1 className="mt-[2.5vh] text-[clamp(3.8rem,7vw,8rem)] font-black uppercase leading-[.86] tracking-[-.07em]">{teamName}</h1>
            <div className="mx-auto mt-[3vh] h-[4px] w-[12vw] bg-orange-400 shadow-[0_0_30px_rgba(251,146,60,.55)]" />
            <div className="mt-[4vh] flex items-center justify-center gap-[2vw] text-[clamp(1.3rem,2.3vw,2.8rem)] font-black uppercase tracking-[-.03em]">
              <span>{homeName}</span><span className="text-orange-400">VS</span><span>{awayName}</span>
            </div>
            <div className="mt-[2vh] text-[clamp(.75rem,1.05vw,1.1rem)] font-bold uppercase tracking-[.18em] text-white/42">{dartLabel(match.dart_type)} · {formatMatchDate(match.match_date, match.match_time)}</div>
          </div>
        </section>
      ) : null}

      {screen.kind === "player" && currentPlayer ? (
        <section key={`${currentPlayer.id}-${screenIndex}`} className="li-fade absolute inset-0 overflow-hidden">
          <div className="absolute inset-0 grid grid-cols-[1.18fr_.82fr]">
            <div className="relative overflow-hidden">
              {photo ? (
                <>
                  <div className="absolute inset-[-7%] bg-cover bg-center opacity-30 blur-2xl" style={{ backgroundImage: `url('${photo}')` }} />
                  <img
                    src={photo}
                    alt=""
                    className="absolute left-[4vw] top-[56%] h-[80vh] w-[49vw] -translate-y-1/2 object-contain object-center drop-shadow-[0_35px_50px_rgba(0,0,0,.55)]"
                  />
                </>
              ) : (
                <div className="absolute bottom-[8vh] left-[10vw] h-[55vh] w-[26vw] rounded-[50%_50%_42%_42%] bg-white/[.055]" />
              )}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-[#030303]" />
            </div>

            <div className="relative z-10 flex flex-col justify-center pr-[5vw]">
              <div className="absolute right-[4vw] top-[9vh] text-[clamp(8rem,15vw,18rem)] font-black leading-none text-white/[.035]">{String(screen.number).padStart(2, "0")}</div>
              <div className="text-[clamp(.72rem,.95vw,1rem)] font-black uppercase tracking-[.34em] text-orange-300/80">{currentPlayer.is_substitute ? "ERSATZSPIELER" : roleText(currentPlayer.role)}</div>
              <h2 className="mt-[2vh] max-w-[8ch] text-[clamp(4rem,7.5vw,9rem)] font-black uppercase leading-[.82] tracking-[-.075em]">{playerName}</h2>
              <div className="mt-[3vh] h-[4px] w-[8vw] bg-orange-400 shadow-[0_0_24px_rgba(251,146,60,.6)]" />
              <div className="mt-[3vh] text-[clamp(.8rem,1.1vw,1.15rem)] font-bold uppercase tracking-[.17em] text-white/44">{teamName} · {dartLabel(match.dart_type)}</div>
            </div>
          </div>
        </section>
      ) : null}

      {screen.kind === "final" ? (
        <section key="final" className="li-fade absolute inset-0 flex flex-col px-[4.3vw] pb-[4vh] pt-[4vh]">
          <div className="text-center">
            <div className="text-[clamp(.7rem,.9vw,.95rem)] font-black uppercase tracking-[.4em] text-orange-300/80">EMD TV · STARTING LINEUP</div>
            <h2 className="mt-[1vh] text-[clamp(2.5rem,4.6vw,5.5rem)] font-black uppercase tracking-[-.06em]">{teamName}</h2>
          </div>

          {allPlayers.length === 5 ? (
            <div className="mx-auto mt-[3vh] flex w-full max-w-[94vw] flex-1 items-center justify-center gap-[1vw]">
              {allPlayers.map((player, index) => {
                const p = player.club_players
                return (
                  <div key={player.id} className="relative h-[56vh] w-[17.2vw] overflow-hidden rounded-[1.35vw] border border-white/[.10] bg-black/55 shadow-[0_22px_60px_rgba(0,0,0,.38)]">
                    {p?.photo_url ? (
                      <>
                        <div className="absolute inset-[-8%] bg-cover bg-center opacity-20 blur-2xl" style={{ backgroundImage: `url('${p.photo_url}')` }} />
                        <img src={p.photo_url} alt={p?.name || `Spieler ${index + 1}`} className="absolute inset-x-[3%] top-[2%] h-[78%] w-[94%] object-contain object-center" />
                      </>
                    ) : (
                      <div className="absolute inset-[6%] rounded-[1vw] bg-white/[.04]" />
                    )}
                    <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_42%,rgba(0,0,0,.16)_60%,rgba(0,0,0,.96)_100%)]" />
                    <div className="absolute inset-x-0 bottom-0 px-[.85vw] pb-[1vw] pt-[2vw] text-center">
                      <div className="text-[clamp(.45rem,.58vw,.68rem)] font-black uppercase tracking-[.15em] text-orange-300/85">{player.is_substitute ? "ERSATZ" : roleText(player.role)}</div>
                      <div className="mt-1 text-[clamp(.78rem,1.05vw,1.25rem)] font-black uppercase leading-[.95] tracking-[-.035em]">{p?.name || `Spieler ${index + 1}`}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div
              className="mx-auto mt-[3vh] grid w-full max-w-[94vw] flex-1 place-content-center gap-[1.2vw]"
              style={{
                gridTemplateColumns: `repeat(${Math.min(4, Math.max(1, allPlayers.length))}, minmax(0, 1fr))`,
                gridAutoRows: allPlayers.length > 4 ? "minmax(0, 27vh)" : "minmax(0, 56vh)",
              }}
            >
              {allPlayers.map((player, index) => {
                const p = player.club_players
                return (
                  <div key={player.id} className="relative min-h-0 overflow-hidden rounded-[1.35vw] border border-white/[.10] bg-black/55 shadow-[0_22px_60px_rgba(0,0,0,.38)]">
                    {p?.photo_url ? (
                      <>
                        <div className="absolute inset-[-8%] bg-cover bg-center opacity-20 blur-2xl" style={{ backgroundImage: `url('${p.photo_url}')` }} />
                        <img src={p.photo_url} alt={p?.name || `Spieler ${index + 1}`} className="absolute inset-x-[3%] top-[2%] h-[78%] w-[94%] object-contain object-center" />
                      </>
                    ) : (
                      <div className="absolute inset-[6%] rounded-[1vw] bg-white/[.04]" />
                    )}
                    <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_42%,rgba(0,0,0,.16)_60%,rgba(0,0,0,.96)_100%)]" />
                    <div className="absolute inset-x-0 bottom-0 px-[1vw] pb-[1.05vw] pt-[2vw] text-center">
                      <div className="text-[clamp(.5rem,.64vw,.72rem)] font-black uppercase tracking-[.16em] text-orange-300/85">{player.is_substitute ? "ERSATZ" : roleText(player.role)}</div>
                      <div className="mt-1 text-[clamp(.9rem,1.25vw,1.55rem)] font-black uppercase leading-[.95] tracking-[-.035em]">{p?.name || `Spieler ${index + 1}`}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      ) : null}
    </div>
  )
}
