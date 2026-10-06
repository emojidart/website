"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { supabase } from "@/lib/supabase"
import type { EmdPrediction } from "@/components/emd-tv/sportdarts-tv"

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
  const dateText = new Intl.DateTimeFormat("de-AT", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
  }).format(d)
  const timeText = time ? `${time.slice(0, 5)} Uhr` : ""
  return timeText ? `${dateText} · ${timeText}` : dateText
}


function tvPlayerImageUrl(src: string | null, width = 1100, height = 1500, quality = 70) {
  if (!src) return null
  try {
    const u = new URL(src)
    const marker = "/storage/v1/object/public/"
    if (!u.pathname.includes(marker)) return src
    u.pathname = u.pathname.replace(marker, "/storage/v1/render/image/public/")
    u.searchParams.set("width", String(width))
    u.searchParams.set("height", String(height))
    u.searchParams.set("quality", String(quality))
    u.searchParams.set("resize", "contain")
    return u.toString()
  } catch {
    return src
  }
}

function preloadImage(src: string, fallbackSrc?: string, timeoutMs = 9000) {
  return new Promise<HTMLImageElement | null>((resolve) => {
    const img = new Image()
    img.decoding = "sync"
    let done = false
    const finish = () => {
      if (done) return
      done = true
      resolve(img)
    }
    const timeout = window.setTimeout(finish, timeoutMs)
    img.onload = async () => {
      window.clearTimeout(timeout)
      try {
        await img.decode?.()
      } catch {}
      finish()
    }
    img.onerror = () => {
      if (fallbackSrc && img.src !== fallbackSrc) {
        img.src = fallbackSrc
        return
      }
      window.clearTimeout(timeout)
      if (done) return
      done = true
      resolve(null)
    }
    img.src = src
  })
}

function playerNameSize(name: string) {
  const len = name.trim().length
  if (len >= 22) return "clamp(2.95rem,4.8vw,5.9rem)"
  if (len >= 17) return "clamp(3.25rem,5.2vw,6.35rem)"
  if (len >= 13) return "clamp(3.55rem,5.65vw,6.85rem)"
  return "clamp(3.85rem,6.15vw,7.35rem)"
}

export default function LineupDisplay({
  matchId,
  teamId,
  onComplete,
  prediction = null,
}: {
  matchId: string
  teamId: string
  onComplete: () => void
  prediction?: EmdPrediction | null
}) {
  const [ready, setReady] = useState(false)
  const [match, setMatch] = useState<Match | null>(null)
  const [teamName, setTeamName] = useState("EMD")
  const [homeName, setHomeName] = useState("HEIM")
  const [awayName, setAwayName] = useState("AUSWÄRTS")
  const [players, setPlayers] = useState<Player[]>([])
  const [screenIndex, setScreenIndex] = useState(0)
  const completedRef = useRef(false)
  const imageCacheRef = useRef<HTMLImageElement[]>([])

  useEffect(() => {
    let cancelled = false
    completedRef.current = false
    setReady(false)
    setScreenIndex(0)

    async function load() {
      const [headerRes, matchRes, lineupRes, teamRes, memberRes, opponentRes] = await Promise.all([
        supabase
          .from("match_lineup_headers")
          .select("status,current_version,confirmed_version")
          .eq("match_id", matchId)
          .eq("team_id", teamId)
          .maybeSingle(),
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
        supabase.from("teams").select("id,name,dart_type").eq("id", teamId).maybeSingle(),
        supabase.from("team_members").select("player_id,role").eq("team_id", teamId).is("left_at", null),
        supabase.from("opponent_teams").select("id,name"),
      ])

      if (cancelled || headerRes.error || !matchRes.data || matchRes.error || lineupRes.error) {
        if (!cancelled) onComplete()
        return
      }

      const header = headerRes.data as {
        status?: string | null
        current_version?: number | null
        confirmed_version?: number | null
      } | null
      const isConfirmed =
        header?.status === "confirmed" &&
        header.current_version !== null &&
        header.current_version !== undefined &&
        header.confirmed_version !== null &&
        header.confirmed_version !== undefined &&
        header.current_version === header.confirmed_version

      // Niemals Entwürfe oder nachträglich geänderte, nicht erneut bestätigte
      // Aufstellungen auf EMD TV anzeigen.
      if (!isConfirmed) {
        if (!cancelled) onComplete()
        return
      }

      const roles = new Map<string, string | null>()
      ;((memberRes.data || []) as Array<{ player_id: string; role: string | null }>).forEach((m) => roles.set(m.player_id, m.role))

      const loadedPlayers = ((lineupRes.data || []) as unknown as Player[]).map((p) => ({
        ...p,
        role: roles.get(p.player_id) || null,
      }))

      const opponents = new Map<string, string>()
      ;((opponentRes.data || []) as Array<{ id: string; name: string }>).forEach((o) => opponents.set(o.id, o.name))

      const loadedMatch = matchRes.data as unknown as Match
      const teamDartType = (teamRes.data as { dart_type?: string | null } | null)?.dart_type || loadedMatch.dart_type
      const normalizedDartType = String(teamDartType ?? "").toLowerCase().replace(/[\s_-]+/g, "")
      const requiredStarters = normalizedDartType.includes("edart") ? 4 : normalizedDartType.includes("steel") ? 3 : 1
      const starterCount = loadedPlayers.filter((p) => !p.is_substitute).length
      if (starterCount < requiredStarters) {
        if (!cancelled) onComplete()
        return
      }

      const sideName = (side: "home" | "away") => {
        const type = side === "home" ? loadedMatch.home_team_type : loadedMatch.away_team_type
        const oppId = side === "home" ? loadedMatch.home_opponent_team_id : loadedMatch.away_opponent_team_id
        const own = side === "home" ? loadedMatch.home_team : loadedMatch.away_team
        if (type === "opponent" && oppId) return opponents.get(oppId) || "GEGNER"
        return own?.name || "UNBEKANNT"
      }

      setMatch(loadedMatch)
      setTeamName((teamRes.data as { name?: string } | null)?.name || "EMD")
      setHomeName(sideName("home"))
      setAwayName(sideName("away"))
      setPlayers(loadedPlayers)

      const urls = loadedPlayers
        .map((p) => p.club_players?.photo_url)
        .filter((value): value is string => Boolean(value))

      // TV darf niemals auf Fotos warten. Daten sind da -> Lineup startet sofort.
      if (!cancelled) setReady(true)

      // Bilder parallel im Hintergrund warm halten. Durch das Vorladen im EMD-TV-Screen
      // sind sie meistens bereits im Browsercache; langsame Fotos blockieren die Sequenz nicht mehr.
      void Promise.all(urls.map((src) => preloadImage(tvPlayerImageUrl(src) || src, src))).then((decodedImages) => {
        if (!cancelled) {
          imageCacheRef.current = decodedImages.filter((img): img is HTMLImageElement => Boolean(img))
        }
      })
    }

    void load()
    return () => {
      cancelled = true
      imageCacheRef.current = []
    }
  }, [matchId, teamId, onComplete])

  const starters = useMemo(
    () =>
      players
        .filter((p) => !p.is_substitute)
        .sort((a, b) => {
          const role = rolePriority(a.role) - rolePriority(b.role)
          return role !== 0 ? role : a.position - b.position
        }),
    [players],
  )

  const substitutes = useMemo(
    () => players.filter((p) => p.is_substitute).sort((a, b) => a.position - b.position),
    [players],
  )

  const allPlayers = useMemo(() => [...starters, ...substitutes], [starters, substitutes])

  const screens = useMemo<Screen[]>(
    () => [
      { kind: "intro" },
      ...allPlayers.map((player, index) => ({ kind: "player" as const, player, number: index + 1 })),
      { kind: "final" },
    ],
    [allPlayers],
  )

  const screen = screens[screenIndex] || screens[0]

  useEffect(() => {
    if (!ready || screens.length < 2) return
    const final = screenIndex === screens.length - 1
    const delay = screenIndex === 0 ? 3600 : final ? 5000 : 2600
    const timer = window.setTimeout(() => {
      if (final) {
        if (!completedRef.current) {
          completedRef.current = true
          onComplete()
        }
        return
      }

      // Innerhalb eines Teams direkt zum nächsten Bild wechseln.
      // Die STARTING-LINEUP-Folie kommt nur beim Start des nächsten Teams.
      setScreenIndex((i) => i + 1)
    }, delay)
    return () => window.clearTimeout(timer)
  }, [ready, screenIndex, screens.length, onComplete])

  if (!ready || !match) {
    return (
      <div className="absolute inset-0 overflow-hidden bg-[#030303] text-white">
        <div className="absolute inset-0 bg-[url('/terminal/hero-startscreen.png')] bg-cover bg-center opacity-[.26]" />
        <div className="absolute inset-0 bg-[linear-gradient(110deg,rgba(0,0,0,.97),rgba(5,5,6,.90)_48%,rgba(17,8,2,.76))]" />
        <div className="absolute inset-0 grid place-items-center px-[5vw] text-center">
          <div>
            <div className="text-[clamp(.78rem,1vw,1.08rem)] font-black uppercase tracking-[.42em] text-orange-300/82">EMD TV</div>
            <div className="mt-[1.6vh] text-[clamp(2.5rem,4.8vw,5.6rem)] font-black uppercase leading-[.92] tracking-[-.05em]">STARTING LINEUP</div>
            <div className="mx-auto mt-[2.4vh] h-[4px] w-[10vw] bg-orange-400 shadow-[0_0_28px_rgba(251,146,60,.55)]" />
          </div>
        </div>
      </div>
    )
  }

  const currentPlayer = screen.kind === "player" ? screen.player : null
  const playerName = currentPlayer?.club_players?.name || "SPIELER"
  const photoOriginal = currentPlayer?.club_players?.photo_url || null
  const photo = tvPlayerImageUrl(photoOriginal) || photoOriginal
  const finalCount = allPlayers.length
  const oneRowFinal = finalCount <= 6

  return (
    <div className="absolute inset-0 overflow-hidden bg-[#030303] text-white">
      <style jsx>{`
        @keyframes lineupIn {
          from { opacity: 0; transform: scale(1.018) translateY(8px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes sweep {
          0% { transform: translateX(-130%); opacity: 0; }
          15% { opacity: .55; }
          100% { transform: translateX(250%); opacity: 0; }
        }
        .li-fade { animation: lineupIn .45s cubic-bezier(.2,.75,.2,1) both; }
        .li-sweep { animation: sweep 4.5s ease-in-out infinite; }
      `}</style>

      <div className="absolute inset-0 bg-[url('/terminal/hero-startscreen.png')] bg-cover bg-center opacity-[.28]" />
      <div className="absolute inset-0 bg-[linear-gradient(110deg,rgba(0,0,0,.98),rgba(5,5,6,.91)_48%,rgba(17,8,2,.77))]" />
      <div className="absolute left-[-10vw] top-[12vh] h-[42vw] w-[42vw] rounded-full bg-orange-500/[.07] blur-[7vw]" />
      <div className="absolute right-[-12vw] top-[5vh] h-[38vw] w-[38vw] rounded-full bg-orange-300/[.05] blur-[7vw]" />
      <div className="li-sweep absolute left-[-18%] top-[32%] h-[9%] w-[50%] rotate-[-8deg] bg-gradient-to-r from-transparent via-orange-300/12 to-transparent blur-xl" />

      {screen.kind === "intro" ? (
        <section key="intro" className="li-fade absolute inset-0 grid place-items-center px-[5vw] text-center">
          <div>
            <div className="text-[clamp(.75rem,1vw,1.05rem)] font-black uppercase tracking-[.42em] text-orange-300/80">
              EMD TV · STARTING LINEUP
            </div>
            <h1 className="mt-[2.5vh] text-[clamp(3.8rem,7vw,8rem)] font-black uppercase leading-[.86] tracking-[-.07em]">
              {teamName}
            </h1>
            <div className="mx-auto mt-[3vh] h-[4px] w-[12vw] bg-orange-400 shadow-[0_0_30px_rgba(251,146,60,.55)]" />
            <div className="mt-[4vh] flex items-center justify-center gap-[2vw] text-[clamp(1.3rem,2.3vw,2.8rem)] font-black uppercase tracking-[-.03em]">
              <span>{homeName}</span>
              <span className="text-orange-400">VS</span>
              <span>{awayName}</span>
            </div>
            <div className="mt-[2vh] text-[clamp(.75rem,1.05vw,1.1rem)] font-bold uppercase tracking-[.18em] text-white/42">
              {dartLabel(match.dart_type)} · {formatMatchDate(match.match_date, match.match_time)}
            </div>

            {prediction ? (
              <div className="mx-auto mt-[3vh] w-fit rounded-[1.1vw] border border-orange-300/15 bg-black/35 px-[1.5vw] py-[1.25vh] shadow-[0_18px_50px_rgba(0,0,0,.28)] backdrop-blur-xl">
                <div className="text-[clamp(.56rem,.7vw,.78rem)] font-black uppercase tracking-[.26em] text-orange-300/75">EMD PROGNOSE</div>
                <div className="mt-[.75vh] flex items-center justify-center gap-[1.2vw] text-[clamp(.9rem,1.25vw,1.45rem)] font-black uppercase">
                  <span className="text-emerald-200">{prediction.firstWin}% Sieg</span>
                  <span className="text-white/22">·</span>
                  <span className="text-white/70">{prediction.draw}% X</span>
                  <span className="text-white/22">·</span>
                  <span className="text-red-200/85">{prediction.secondWin}% Niederlage</span>
                </div>
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      {screen.kind === "player" && currentPlayer ? (
        <section key={`${currentPlayer.id}-${screenIndex}`} className="li-fade absolute inset-0 overflow-hidden">
          <div className="absolute inset-0">
            {/* Foto links. Die Fotofläche endet bei 49vw; der TV-Hintergrund läuft direkt dahinter weiter. */}
            <div className="absolute inset-y-0 left-0 w-[49vw] overflow-hidden">
              {photo ? (
                <>
                  <div
                    className="absolute inset-[-7%] bg-cover bg-center opacity-30 blur-2xl"
                    style={{ backgroundImage: `url('${photo}')` }}
                  />
                  <img
                    src={photo}
                    onError={(e) => {
                      if (photoOriginal && e.currentTarget.dataset.fallback !== "1") {
                        e.currentTarget.dataset.fallback = "1"
                        e.currentTarget.src = photoOriginal
                      }
                    }}
                    alt=""
                    draggable={false}
                    decoding="sync"
                    fetchPriority="high"
                    className="absolute left-0 top-[59%] h-[80vh] w-[49vw] -translate-y-1/2 object-contain object-center drop-shadow-[0_35px_50px_rgba(0,0,0,.55)]"
                    style={{
                      WebkitMaskImage: "linear-gradient(to right,#000 0%,#000 93%,rgba(0,0,0,.78) 96%,transparent 100%)",
                      maskImage: "linear-gradient(to right,#000 0%,#000 93%,rgba(0,0,0,.78) 96%,transparent 100%)",
                    }}
                  />
                </>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-[radial-gradient(circle_at_45%_38%,rgba(251,146,60,.10),transparent_28%)]">
                  <div className="relative h-[58vh] w-[30vw] max-w-[430px]">
                    <div className="absolute left-1/2 top-[4%] h-[12vw] max-h-[180px] w-[12vw] max-w-[180px] -translate-x-1/2 rounded-full bg-white/[.10]" />
                    <div className="absolute bottom-[3%] left-1/2 h-[36vh] w-[24vw] max-w-[360px] -translate-x-1/2 rounded-[48%_48%_18%_18%] bg-white/[.075]" />
                    <div className="absolute inset-x-0 bottom-[1vh] text-center text-[clamp(.62rem,.85vw,.9rem)] font-black uppercase tracking-[.26em] text-white/30">KEIN FOTO</div>
                  </div>
                </div>
              )}
            </div>

            {/* Hintergrund beginnt DIREKT am Foto. Nur der Text bleibt weit rechts. */}
            <div className="absolute inset-y-0 left-[49vw] right-0 z-[2] bg-[linear-gradient(110deg,rgba(6,5,5,.18),rgba(8,6,5,.10)_22%,transparent_55%)]" />

            <div className="absolute inset-y-0 left-[49vw] right-0 z-10 flex min-w-0 flex-col justify-center overflow-hidden pl-[2.4vw] pr-[3.2vw]">
              <div className="absolute right-[4vw] top-[9vh] text-[clamp(8rem,15vw,18rem)] font-black leading-none text-white/[.035]">
                {String(screen.number).padStart(2, "0")}
              </div>
              <div className="text-[clamp(.72rem,.95vw,1rem)] font-black uppercase tracking-[.34em] text-orange-300/80">
                {currentPlayer.is_substitute ? "ERSATZSPIELER" : roleText(currentPlayer.role)}
              </div>
              <h2
                className="mt-[2vh] max-w-[16ch] break-words font-black uppercase leading-[.84] tracking-[-.072em]"
                style={{ fontSize: playerNameSize(playerName) }}
              >
                {playerName}
              </h2>
              <div className="mt-[3vh] h-[4px] w-[8vw] bg-orange-400 shadow-[0_0_24px_rgba(251,146,60,.6)]" />
              <div className="mt-[3vh] text-[clamp(.8rem,1.1vw,1.15rem)] font-bold uppercase tracking-[.17em] text-white/44">
                {teamName} · {dartLabel(match.dart_type)}
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {screen.kind === "final" ? (
        <section key="final" className="li-fade absolute inset-0 flex flex-col px-[3.2vw] pb-[3.2vh] pt-[3.2vh]">
          <div className="text-center">
            <div className="text-[clamp(.68rem,.86vw,.92rem)] font-black uppercase tracking-[.4em] text-orange-300/80">
              EMD TV · STARTING LINEUP
            </div>
            <h2 className="mt-[.8vh] text-[clamp(2.5rem,4.4vw,5.25rem)] font-black uppercase tracking-[-.06em]">
              {teamName}
            </h2>
          </div>

          <div
            className={`mx-auto mt-[2.2vh] flex w-full flex-1 items-center justify-center ${oneRowFinal ? "gap-[.65vw]" : "flex-wrap content-center gap-x-[1vw] gap-y-[1.8vh]"}`}
          >
            {allPlayers.map((player, index) => {
              const p = player.club_players
              const width = oneRowFinal
                ? finalCount <= 4
                  ? "22vw"
                  : finalCount === 5
                    ? "17.7vw"
                    : "14.7vw"
                : "21vw"
              const height = oneRowFinal ? "58vh" : "28vh"

              return (
                <div
                  key={player.id}
                  className="relative overflow-hidden bg-transparent"
                  style={{ width, height }}
                >
                  {p?.photo_url ? (
                    <>
                      <div
                        className="absolute inset-0 scale-[1.06] bg-cover bg-center opacity-20 blur-[1vw]"
                        style={{ backgroundImage: `url('${tvPlayerImageUrl(p.photo_url, 700, 1100, 66) || p.photo_url}')` }}
                      />
                      <img
                        src={tvPlayerImageUrl(p.photo_url, 700, 1100, 66) || p.photo_url}
                        onError={(e) => {
                          if (p.photo_url && e.currentTarget.dataset.fallback !== "1") {
                            e.currentTarget.dataset.fallback = "1"
                            e.currentTarget.src = p.photo_url
                          }
                        }}
                        alt={p.name || `Spieler ${index + 1}`}
                        draggable={false}
                        decoding="sync"
                        className="absolute inset-0 h-full w-full object-contain object-top"
                        style={{
                          WebkitMaskImage:
                            "linear-gradient(to bottom, #000 0%, #000 72%, rgba(0,0,0,.96) 79%, rgba(0,0,0,.58) 90%, transparent 100%)",
                          maskImage:
                            "linear-gradient(to bottom, #000 0%, #000 72%, rgba(0,0,0,.96) 79%, rgba(0,0,0,.58) 90%, transparent 100%)",
                        }}
                      />
                    </>
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-[radial-gradient(circle_at_50%_38%,rgba(251,146,60,.08),transparent_30%)]">
                      <div className="relative h-[82%] w-[72%]">
                        <div className="absolute left-1/2 top-[8%] aspect-square w-[42%] -translate-x-1/2 rounded-full bg-white/[.10]" />
                        <div className="absolute bottom-[10%] left-1/2 h-[56%] w-[86%] -translate-x-1/2 rounded-[50%_50%_16%_16%] bg-white/[.07]" />
                        <div className="absolute inset-x-0 bottom-[7%] text-center text-[clamp(.42rem,.52vw,.62rem)] font-black uppercase tracking-[.20em] text-white/28">KEIN FOTO</div>
                      </div>
                    </div>
                  )}

                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[33%] bg-gradient-to-t from-[#030303] via-[#030303]/85 to-transparent" />
                  <div className="absolute inset-x-0 bottom-[1.1vh] z-10 px-[.55vw] text-center [text-shadow:0_3px_18px_rgba(0,0,0,.95)]">
                    <div className="text-[clamp(.45rem,.58vw,.68rem)] font-black uppercase tracking-[.15em] text-orange-300/88">
                      {player.is_substitute ? "ERSATZ" : roleText(player.role)}
                    </div>
                    <div
                      className="mt-1 font-black uppercase leading-[.96] tracking-[-.035em]"
                      style={{ fontSize: finalCount >= 6 ? "clamp(.72rem,.92vw,1.06rem)" : "clamp(.82rem,1.12vw,1.34rem)" }}
                    >
                      {p?.name || `Spieler ${index + 1}`}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      ) : null}
    </div>
  )
}
