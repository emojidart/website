"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { Crown, Pause, Play, RotateCcw, ShieldCheck, Tv2, UserRound, X } from "lucide-react"

import { Header } from "@/components/header"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"
import { supabase } from "@/lib/supabase"

type Match = {
  id: string
  home_team_id: string
  away_team_id: string
  home_team_type: "own" | "opponent" | "club_team"
  away_team_type: "own" | "opponent" | "club_team"
  home_opponent_team_id: string | null
  away_opponent_team_id: string | null
  match_date: string
  match_time: string | null
  venue: string | null
  dart_type: string | null
  status: string | null
  home_team?: { id: string; name: string } | null
  away_team?: { id: string; name: string } | null
}

type Player = {
  id: string
  player_id: string
  position: number
  is_substitute: boolean
  club_players?: {
    id: string
    name: string
    photo_url: string | null
  } | null
  role?: string | null
}

type Screen =
  | { kind: "intro" }
  | { kind: "player"; player: Player; number: number }
  | { kind: "final" }

function roleText(role: string | null | undefined) {
  if (role === "Captain") return "Kapitän"
  if (role === "Co-Captain") return "Co-Kapitän"
  return "Spieler"
}

function dartLabel(value: string | null) {
  if (!value) return "Liga"
  const v = value.toLowerCase()
  if (v.includes("steel")) return "Steel Dart"
  if (v.includes("edart") || v.includes("e-dart")) return "E-Dart"
  return value
}

function normalizeDartType(value: string | null | undefined) {
  const v = String(value ?? "").toLowerCase().replace(/[\s_-]+/g, "")
  if (v.includes("edart")) return "edart" as const
  if (v.includes("steel")) return "steeldart" as const
  return "" as const
}

function splitPlayerName(value: string) {
  const parts = value.trim().split(/\s+/).filter(Boolean)

  if (parts.length <= 1) {
    return [parts[0] || "Spieler", ""] as const
  }

  let bestIndex = 1
  let bestDifference = Number.POSITIVE_INFINITY

  for (let i = 1; i < parts.length; i += 1) {
    const first = parts.slice(0, i).join(" ")
    const second = parts.slice(i).join(" ")
    const difference = Math.abs(first.length - second.length)

    if (difference < bestDifference) {
      bestDifference = difference
      bestIndex = i
    }
  }

  return [
    parts.slice(0, bestIndex).join(" "),
    parts.slice(bestIndex).join(" "),
  ] as const
}

export default function EmdTvMatchPreviewPage() {
  const router = useRouter()
  const params = useParams<{ matchId: string }>()
  const searchParams = useSearchParams()
  const matchId = params?.matchId
  const teamId = searchParams.get("team_id")
  const embedded = searchParams.get("embedded") === "1"

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [match, setMatch] = useState<Match | null>(null)
  const [teamName, setTeamName] = useState("Mein Team")
  const [teamLogo, setTeamLogo] = useState<string | null>(null)
  const [homeName, setHomeName] = useState("Heim")
  const [awayName, setAwayName] = useState("Auswärts")
  const [players, setPlayers] = useState<Player[]>([])
  const [screenIndex, setScreenIndex] = useState(0)
  const [playing, setPlaying] = useState(true)
  const [typedHome, setTypedHome] = useState("")
  const [typedAway, setTypedAway] = useState("")
  const [showVs, setShowVs] = useState(false)
  const [typedPlayerName, setTypedPlayerName] = useState("")
  const frameRef = useRef<HTMLElement | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)

  useEffect(() => {
    if (!matchId || !teamId) return
    void loadPreview()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchId, teamId])

  async function loadPreview() {
    setLoading(true)
    setError(null)

    try {
      const { data: header, error: headerError } = await supabase
        .from("match_lineup_headers")
        .select("status,current_version,confirmed_version")
        .eq("match_id", matchId)
        .eq("team_id", teamId)
        .maybeSingle()

      if (headerError) throw headerError

      const confirmed =
        (header as any)?.status === "confirmed" &&
        (header as any)?.confirmed_version !== null &&
        (header as any)?.current_version !== null &&
        (header as any)?.confirmed_version === (header as any)?.current_version

      if (!confirmed) {
        setError("Für dieses Spiel liegt aktuell keine bestätigte Aufstellung vor.")
        return
      }

      const [matchRes, lineupRes, teamRes, memberRes, opponentRes] = await Promise.all([
        supabase
          .from("matches")
          .select(`
            id,
            home_team_id,
            away_team_id,
            home_team_type,
            away_team_type,
            home_opponent_team_id,
            away_opponent_team_id,
            match_date,
            match_time,
            venue,
            dart_type,
            status,
            home_team:teams!matches_home_team_id_fkey(id,name),
            away_team:teams!matches_away_team_id_fkey(id,name)
          `)
          .eq("id", matchId)
          .single(),
        supabase
          .from("match_lineups")
          .select("id,player_id,position,is_substitute,club_players:club_players(id,name,photo_url)")
          .eq("match_id", matchId)
          .eq("team_id", teamId),
        supabase.from("teams").select("id,name,logo_url,dart_type").eq("id", teamId).maybeSingle(),
        supabase
          .from("team_members")
          .select("player_id,role")
          .eq("team_id", teamId)
          .is("left_at", null),
        supabase.from("opponent_teams").select("id,name"),
      ])

      if (matchRes.error) throw matchRes.error
      if (lineupRes.error) throw lineupRes.error
      if (memberRes.error) throw memberRes.error

      const loadedMatch = matchRes.data as any as Match

      // Sicherheit: keine alte Match Preview direkt per URL öffnen.
      const now = new Date()
      const yyyy = now.getFullYear()
      const mm = String(now.getMonth() + 1).padStart(2, "0")
      const dd = String(now.getDate()).padStart(2, "0")
      const today = `${yyyy}-${mm}-${dd}`

      if (
        loadedMatch.status === "completed" ||
        !loadedMatch.match_date ||
        loadedMatch.match_date < today
      ) {
        setError("Diese Match Preview ist nicht mehr verfügbar.")
        return
      }

      if (loadedMatch.match_date === today && loadedMatch.match_time) {
        const startAt = new Date(`${loadedMatch.match_date}T${loadedMatch.match_time}`).getTime()
        if (Number.isFinite(startAt) && startAt <= now.getTime()) {
          setError("Diese Match Preview ist nicht mehr verfügbar.")
          return
        }
      }

      const roles = new Map<string, string | null>()
      ;(((memberRes.data as any[]) || []) as any[]).forEach((m) => {
        roles.set(m.player_id, m.role ?? null)
      })

      const loadedPlayers = (((lineupRes.data as any[]) || []) as Player[]).map((p) => ({
        ...p,
        role: roles.get(p.player_id) ?? null,
      }))

      // Eine bestätigte Aufstellung ist nur gültig, wenn die Mindestzahl an Startern erfüllt ist.
      // E-Dart = 4 Starter, Steeldart = 3 Starter.
      const normalizedDartType = normalizeDartType((teamRes.data as any)?.dart_type || loadedMatch.dart_type)
      const requiredStarters = normalizedDartType === "edart" ? 4 : normalizedDartType === "steeldart" ? 3 : 1
      const starterCount = loadedPlayers.filter((p) => !p.is_substitute).length

      if (starterCount < requiredStarters) {
        setError(`Die Aufstellung ist unvollständig: ${starterCount} von ${requiredStarters} benötigten Startern eingetragen.`)
        return
      }

      const opponents = new Map<string, string>()
      ;(((opponentRes.data as any[]) || []) as any[]).forEach((o) => opponents.set(o.id, o.name))

      const getSideName = (side: "home" | "away") => {
        const type = side === "home" ? loadedMatch.home_team_type : loadedMatch.away_team_type
        const oppId =
          side === "home" ? loadedMatch.home_opponent_team_id : loadedMatch.away_opponent_team_id
        const own = side === "home" ? loadedMatch.home_team : loadedMatch.away_team

        if (type === "opponent" && oppId) return opponents.get(oppId) || "Gegner"
        return own?.name || "Unbekannt"
      }

      setMatch(loadedMatch)
      setPlayers(loadedPlayers)
      setTeamName((teamRes.data as any)?.name || "Mein Team")
      setTeamLogo((teamRes.data as any)?.logo_url || null)
      setHomeName(getSideName("home"))
      setAwayName(getSideName("away"))
      setScreenIndex(0)
      setPlaying(true)
    } catch (e) {
      console.error("EMD TV preview error:", e)
      setError("Die Match Preview konnte nicht geladen werden.")
    } finally {
      setLoading(false)
    }
  }

  const rolePriority = (role: string | null | undefined) => {
    if (role === "Captain") return 0
    if (role === "Co-Captain") return 1
    return 2
  }

  const starters = useMemo(
    () =>
      players
        .filter((p) => !p.is_substitute)
        .sort((a, b) => {
          const d = rolePriority(a.role) - rolePriority(b.role)
          return d !== 0 ? d : a.position - b.position
        }),
    [players],
  )

  const substitutes = useMemo(
    () =>
      players
        .filter((p) => p.is_substitute)
        .sort((a, b) => a.position - b.position),
    [players],
  )

  const allPresentedPlayers = useMemo(
    () => [...starters, ...substitutes],
    [starters, substitutes],
  )

  const screens = useMemo<Screen[]>(
    () => [
      { kind: "intro" },
      ...allPresentedPlayers.map((player, i) => ({
        kind: "player" as const,
        player,
        number: i + 1,
      })),
      { kind: "final" },
    ],
    [allPresentedPlayers],
  )

  useEffect(() => {
    if (!playing || screens.length <= 1) return

    const isFinal = screenIndex === screens.length - 1
    const timer = window.setTimeout(() => {
      if (isFinal && embedded) {
        window.parent.postMessage({ type: "EMD_TV_LINEUP_COMPLETE", matchId, teamId }, window.location.origin)
        return
      }
      setScreenIndex((prev) => (prev + 1) % screens.length)
    }, screenIndex === 0 ? 5200 : isFinal ? 7000 : 3400)

    return () => window.clearTimeout(timer)
  }, [playing, screenIndex, screens.length, embedded, matchId, teamId])

  useEffect(() => {
    if (screenIndex !== 0) return

    let cancelled = false
    let timer: number | undefined

    setTypedHome("")
    setTypedAway("")
    setShowVs(false)

    const typeText = (
      value: string,
      setter: (value: string) => void,
      done: () => void,
      speed = 72,
    ) => {
      let i = 0
      const tick = () => {
        if (cancelled) return
        i += 1
        setter(value.slice(0, i))
        if (i < value.length) {
          timer = window.setTimeout(tick, speed)
        } else {
          done()
        }
      }
      timer = window.setTimeout(tick, 250)
    }

    typeText(homeName, setTypedHome, () => {
      if (cancelled) return
      timer = window.setTimeout(() => {
        if (cancelled) return
        setShowVs(true)
        timer = window.setTimeout(() => {
          if (cancelled) return
          typeText(awayName, setTypedAway, () => {}, 72)
        }, 420)
      }, 320)
    })

    return () => {
      cancelled = true
      if (timer) window.clearTimeout(timer)
    }
  }, [screenIndex, homeName, awayName])

  useEffect(() => {
    const current = screens[screenIndex]
    if (!current || current.kind !== "player") {
      setTypedPlayerName("")
      return
    }

    const target = (current.player.club_players?.name || "Spieler").trim()
    let cancelled = false
    let timer: number | undefined
    let i = 0

    setTypedPlayerName("")

    const tick = () => {
      if (cancelled) return
      i += 1
      setTypedPlayerName(target.slice(0, i))

      if (i < target.length) {
        timer = window.setTimeout(tick, 68)
      }
    }

    // kleine TV-Pause nach dem Szenenwechsel, dann startet der Name
    timer = window.setTimeout(tick, 360)

    return () => {
      cancelled = true
      if (timer) window.clearTimeout(timer)
    }
  }, [screenIndex, screens])

  useEffect(() => {
    const syncFullscreen = () => {
      setIsFullscreen(Boolean(document.fullscreenElement))
    }

    document.addEventListener("fullscreenchange", syncFullscreen)
    return () => document.removeEventListener("fullscreenchange", syncFullscreen)
  }, [])

  async function enterFullscreen() {
    const el = frameRef.current
    if (!el) return

    try {
      if (document.fullscreenElement) return
      if (el.requestFullscreen) {
        await el.requestFullscreen()
      }
    } catch (e) {
      console.warn("Fullscreen konnte nicht gestartet werden:", e)
    }
  }

  async function exitPreview() {
    try {
      if (document.fullscreenElement && document.exitFullscreen) {
        await document.exitFullscreen()
      }
    } catch (e) {
      console.warn("Vollbild konnte nicht beendet werden:", e)
    } finally {
      router.push("/emd-tv")
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#030509] text-white">
        {!embedded ? <Header variant="app" title="EMD TV" subtitle="Match Preview" backHref="/emd-tv" /> : null}
        <main className="flex min-h-screen items-center justify-center">
          <div className="text-center">
            <Tv2 className="mx-auto h-10 w-10 animate-pulse text-orange-300" />
            <div className="mt-4 font-black">TV Preview wird vorbereitet</div>
          </div>
        </main>
      </div>
    )
  }


  if (error || !match || !screens[screenIndex]) {
    return (
      <div className="min-h-screen bg-[#030509] text-white">
        {!embedded ? <Header variant="app" title="EMD TV" subtitle="Match Preview" backHref="/emd-tv" /> : null}
        <main className="mx-auto flex min-h-[80vh] max-w-2xl items-center justify-center px-4">
          <div className="w-full rounded-[28px] border border-white/[0.08] bg-black/35 p-7 text-center backdrop-blur-xl">
            <Tv2 className="mx-auto h-10 w-10 text-white/25" />
            <div className="mt-4 text-lg font-black">{error || "Match Preview nicht verfügbar"}</div>
          </div>
        </main>
        {!embedded ? <MobileBottomNav /> : null}
      </div>
    )
  }

  const screen = screens[screenIndex]
  const introTeamName = teamName.replace(/\s+/g, " ").trim()
  const progress = screens.length > 1 ? ((screenIndex + 1) / screens.length) * 100 : 0

  const currentPlayerName =
    screen.kind === "player"
      ? (screen.player.club_players?.name || "Spieler").trim()
      : ""
  const [playerNameLine1, playerNameLine2] = splitPlayerName(currentPlayerName)
  const typedPlayerLine1 =
    screen.kind === "player"
      ? typedPlayerName.slice(0, playerNameLine1.length)
      : ""
  const typedPlayerLine2 =
    screen.kind === "player" && typedPlayerName.length > playerNameLine1.length
      ? typedPlayerName.slice(playerNameLine1.length).trimStart()
      : ""
  const isTypingPlayerName =
    screen.kind === "player" && typedPlayerName !== currentPlayerName

  return (
    <div className="emd-tv-page min-h-screen overflow-hidden bg-[#020305] text-white">
      {!embedded ? (
        <div className="emd-tv-page-header">
          <Header variant="app" title="EMD TV" subtitle="Match Preview" backHref="/emd-tv" />
        </div>
      ) : null}

      <main className={`emd-tv-main mx-auto w-full max-w-[var(--emd-content-max)] px-3 pb-28 pt-20 sm:px-5 sm:pt-24 lg:px-7 lg:pb-14 ${embedded ? "!fixed !inset-0 !max-w-none !p-0" : ""}`}>
        <style>{`
          .emd-tv-frame{
            width:min(1280px,96vw);
            height:min(760px,92vh);
            position:relative;
            overflow:hidden;
            border-radius:28px;
            border:1px solid rgba(255,255,255,.10);
            background:#080b11;
            box-shadow:0 40px 120px rgba(0,0,0,.65);
            margin:0 auto;
          }
          .emd-tv-frame-embedded{
            width:100vw;
            height:100vh;
            max-width:none;
            max-height:none;
            border-radius:0;
            border:0;
            margin:0;
          }
          .emd-tv-frame:after{
            content:"";
            position:absolute;inset:0;pointer-events:none;z-index:30;
            box-shadow:inset 0 0 95px rgba(0,0,0,.38);
          }
          .emd-tv-top{
            position:absolute;z-index:60;left:0;right:0;top:0;height:74px;
            display:flex;align-items:center;justify-content:space-between;padding:0 28px;
            background:linear-gradient(#05070be8,transparent);
          }
          .emd-tv-logo{font-weight:950;letter-spacing:.18em}
          .emd-tv-logo b{color:#ff7a00}
          .emd-tv-live{
            font-size:12px;letter-spacing:.12em;padding:8px 13px;
            border:1px solid #ffffff21;border-radius:99px;background:#ffffff0a;
          }
          .emd-tv-actions{display:flex;align-items:center;gap:8px}
          .emd-tv-close{
            width:38px;height:38px;display:inline-flex;align-items:center;justify-content:center;
            border:1px solid rgba(255,255,255,.16);border-radius:999px;
            background:rgba(5,7,11,.72);color:#fff;cursor:pointer;
            transition:transform .2s ease,background .2s ease,border-color .2s ease;
            backdrop-filter:blur(10px);
          }
          .emd-tv-close:hover{
            transform:scale(1.06);background:rgba(239,68,68,.16);border-color:rgba(248,113,113,.42);
          }
          .emd-stage{position:absolute;inset:0}
          .emd-scene{position:absolute;inset:0}
          .emd-intro,.emd-final{position:absolute;inset:0;width:100%;height:100%;display:grid;place-items:center;text-align:center}
          .emd-kicker{font-size:13px;font-weight:900;letter-spacing:.35em;text-transform:uppercase;color:#ff7a00}
          .emd-intro h1,.emd-final h1{
            font-size:clamp(58px,9vw,120px);line-height:.84;letter-spacing:-.065em;
            text-transform:uppercase;margin:16px 0;font-weight:950;
          }
          .emd-intro p,.emd-final p{font-size:18px;color:#c7ccd5}
          .emd-team-logo-wrap{
            margin:0 auto 24px;
            display:flex;
            align-items:center;
            justify-content:center;
            width:154px;
            height:96px;
            border-radius:24px;
            border:1px solid rgba(255,255,255,.11);
            background:rgba(5,7,11,.55);
            box-shadow:
              0 0 52px rgba(255,122,0,.12),
              inset 0 0 34px rgba(255,255,255,.025);
            backdrop-filter:blur(12px);
            overflow:hidden;
          }
          .emd-team-logo{
            width:100%;
            height:100%;
            object-fit:contain;
            transform:scale(1.38);
            transform-origin:center;
            filter:drop-shadow(0 12px 24px rgba(0,0,0,.48));
          }
          .emd-team-logo-fallback{
            font-size:34px;
            font-weight:950;
            letter-spacing:.12em;
            color:rgba(255,255,255,.18);
          }

          .emd-intro{
            position:absolute !important;
            inset:0 !important;
            width:100%;
            height:100%;
            overflow:hidden;
            display:flex !important;
            align-items:center;
            justify-content:center;
            padding:78px 40px 54px;
            background:
              radial-gradient(circle at 50% 44%,rgba(255,122,0,.10),transparent 25%),
              linear-gradient(180deg,#05070b 0%,#020306 100%);
          }
          .emd-intro:before{
            content:"";
            position:absolute;
            inset:0;
            background:
              repeating-linear-gradient(90deg,transparent 0 84px,rgba(255,255,255,.014) 85px,transparent 86px),
              linear-gradient(0deg,rgba(255,255,255,.015) 1px,transparent 1px);
            background-size:auto,100% 42px;
            opacity:.75;
            pointer-events:none;
          }
          .emd-intro-content{
            position:relative;
            z-index:12;
            width:min(1080px,92%);
            text-align:center;
            transform:translateY(26px);
          }
          .emd-intro-title{
            font-size:clamp(54px,7.6vw,102px) !important;
            line-height:.90 !important;
            word-spacing:.20em;
            letter-spacing:-.04em !important;
            margin-top:18px !important;
            margin-bottom:20px !important;
          }
          .emd-versus-line{
            margin-top:18px;
            min-height:36px;
            display:flex;
            align-items:center;
            justify-content:center;
            gap:14px;
            flex-wrap:wrap;
            font-size:clamp(16px,2vw,24px);
            font-weight:800;
            letter-spacing:.01em;
            color:#d3d7df;
          }
          .emd-typed-team{
            display:inline-block;
            min-width:1ch;
            text-shadow:0 4px 18px rgba(0,0,0,.38);
          }
          .emd-typed-team.typing:after{
            content:"";
            display:inline-block;
            width:2px;
            height:1em;
            margin-left:3px;
            vertical-align:-.10em;
            background:#ff7a00;
            box-shadow:0 0 10px rgba(255,122,0,.7);
            animation:emdCursor .68s steps(1,end) infinite;
          }
          .emd-versus{
            color:#ff7a00;
            font-weight:950;
            letter-spacing:.12em;
            opacity:0;
            transform:scale(.8);
            transition:opacity .28s ease, transform .28s ease;
          }
          .emd-versus.show{
            opacity:1;
            transform:scale(1);
          }
          @keyframes emdCursor{
            0%,45%{opacity:1}
            46%,100%{opacity:0}
          }
          .emd-intro-fx{
            position:absolute;
            inset:0;
            z-index:5;
            pointer-events:none;
            overflow:hidden;
          }
          .emd-intro-spot{
            position:absolute;
            top:-24%;
            height:135%;
            width:18%;
            border-radius:120px;
            mix-blend-mode:screen;
            filter:blur(12px);
            transform-origin:top center;
          }
          .emd-intro-spot.s1{
            left:8%;
            background:linear-gradient(180deg,rgba(255,255,255,.70),rgba(255,190,110,.42) 22%,rgba(255,122,0,.20) 48%,transparent 100%);
            animation:introSpot1 4.2s ease-in-out infinite alternate;
          }
          .emd-intro-spot.s2{
            right:8%;
            background:linear-gradient(180deg,rgba(255,255,255,.86),rgba(255,215,165,.48) 20%,rgba(255,122,0,.24) 48%,transparent 100%);
            animation:introSpot2 4.8s ease-in-out infinite alternate;
          }
          .emd-intro-spot.s3{
            right:32%;
            width:12%;
            background:linear-gradient(180deg,rgba(255,255,255,.46),rgba(255,180,90,.26) 24%,rgba(255,122,0,.12) 48%,transparent 100%);
            animation:introSpot3 5.2s ease-in-out infinite alternate;
          }
          .emd-intro-flare{
            position:absolute;
            left:-12%;
            top:26%;
            width:46%;
            height:14%;
            background:linear-gradient(90deg,transparent,rgba(255,215,165,.14),rgba(255,122,0,.30),transparent);
            filter:blur(14px);
            transform:rotate(-9deg);
            mix-blend-mode:screen;
            animation:introFlare 3.6s ease-in-out infinite;
          }
          .emd-intro-glow{
            position:absolute;
            right:6%;
            top:25%;
            width:38px;
            height:38px;
            border-radius:50%;
            background:white;
            box-shadow:
              0 0 26px 10px rgba(255,255,255,.52),
              0 0 95px 36px rgba(255,122,0,.24);
            animation:introGlow 2.4s ease-in-out infinite;
          }
          @keyframes introSpot1{
            from{transform:translateX(-18px) rotate(12deg);opacity:.28}
            to{transform:translateX(82px) rotate(24deg);opacity:.70}
          }
          @keyframes introSpot2{
            from{transform:translateX(24px) rotate(-14deg);opacity:.38}
            to{transform:translateX(-92px) rotate(-27deg);opacity:.88}
          }
          @keyframes introSpot3{
            from{transform:translateX(0) rotate(-4deg);opacity:.18}
            to{transform:translateX(-42px) rotate(-12deg);opacity:.52}
          }
          @keyframes introFlare{
            0%{transform:translateX(-35%) rotate(-9deg);opacity:0}
            22%{opacity:.88}
            72%{opacity:.34}
            100%{transform:translateX(290%) rotate(-9deg);opacity:0}
          }
          @keyframes introGlow{
            0%,100%{transform:scale(.72);opacity:.24}
            50%{transform:scale(1.18);opacity:.92}
          }

          .emd-player{position:relative;height:100%;overflow:hidden;background:#05070b}
          .emd-player:after{
            content:"";position:absolute;inset:0;z-index:4;pointer-events:none;
            background:
              linear-gradient(90deg,rgba(5,7,11,.02) 0%,rgba(5,7,11,.04) 34%,rgba(5,7,11,.14) 50%,rgba(5,7,11,.78) 67%,#05070b 87%,#05070b 100%),
              linear-gradient(0deg,#05070b 0%,transparent 28%);
          }
          .emd-visual{position:absolute;inset:0;overflow:hidden;background:#05070b}
          .emd-bg{
            position:absolute;inset:-8%;background-size:cover;background-position:center 28%;
            filter:blur(26px) brightness(.30) saturate(.85);transform:scale(1.18);opacity:.92;
          }
          .emd-halo{
            position:absolute;z-index:1;left:6%;top:10%;width:48%;height:70%;
            background:radial-gradient(circle,rgba(255,122,0,.18),rgba(255,122,0,.05) 44%,transparent 72%);
            filter:blur(16px);animation:haloPulse 4.2s ease-in-out infinite;
          }
          .emd-photo{
            position:absolute;z-index:3;left:0;top:-7%;width:auto;height:118%;max-width:none;
            object-fit:contain;object-position:center top;transform:none;transform-origin:center center;
            filter:drop-shadow(0 28px 42px rgba(0,0,0,.52)) contrast(1.03) saturate(.98);
            -webkit-mask-image:linear-gradient(to right,black 0%,black 78%,rgba(0,0,0,.94) 86%,rgba(0,0,0,.58) 93%,transparent 100%);
            mask-image:linear-gradient(to right,black 0%,black 78%,rgba(0,0,0,.94) 86%,rgba(0,0,0,.58) 93%,transparent 100%);
            animation:heroFade 1.05s cubic-bezier(.18,.72,.2,1) both;
          }

          .emd-arena{position:absolute;inset:0;z-index:7;pointer-events:none;overflow:hidden}
          .emd-pillar{position:absolute;top:-16%;bottom:-8%;border-radius:120px;mix-blend-mode:screen;filter:blur(10px)}
          .emd-p1{right:22%;width:14%;background:linear-gradient(180deg,rgba(255,255,255,.86) 0%,rgba(255,214,160,.72) 18%,rgba(255,145,40,.36) 46%,rgba(255,122,0,.12) 72%,transparent 100%);animation:p1 3.6s ease-in-out infinite alternate}
          .emd-p2{right:10%;width:16%;background:linear-gradient(180deg,rgba(255,255,255,.95) 0%,rgba(255,228,188,.82) 16%,rgba(255,162,52,.42) 42%,rgba(255,122,0,.16) 70%,transparent 100%);animation:p2 4.2s ease-in-out infinite alternate}
          .emd-p3{right:-1%;width:13%;background:linear-gradient(180deg,rgba(255,255,255,.72) 0%,rgba(255,210,150,.62) 16%,rgba(255,145,40,.30) 42%,rgba(255,122,0,.10) 70%,transparent 100%);animation:p3 3.9s ease-in-out infinite alternate}

          .emd-info{
            position:absolute;z-index:8;right:3.7%;top:50%;transform:translateY(-50%);
            width:44%;padding:26px 18px 30px 30px;
            background:linear-gradient(90deg,rgba(8,11,17,.16),rgba(8,11,17,.56) 58%,rgba(8,11,17,.72));
            border-left:1px solid rgba(255,255,255,.055);backdrop-filter:blur(8px);
          }
          .emd-info:before{
            content:"";position:absolute;left:0;top:18%;bottom:18%;width:3px;
            background:linear-gradient(180deg,transparent,#ff7a00,#ffb15e,#ff7a00,transparent);
            box-shadow:0 0 20px rgba(255,122,0,.55);
          }
          .emd-no{
            position:absolute;right:18px;top:12px;font-size:192px;font-weight:950;
            color:rgba(255,255,255,.055);line-height:1;
          }
          .emd-small{
            display:inline-flex;align-items:center;gap:10px;color:#ff7a00;font-size:13px;
            font-weight:900;letter-spacing:.24em;text-transform:uppercase;
          }
          .emd-small:before{content:"";width:28px;height:2px;background:#ff7a00;box-shadow:0 0 14px rgba(255,122,0,.6)}
          .emd-name{
            display:flex;
            min-height:1.86em;
            flex-direction:column;
            justify-content:center;
            align-items:flex-start;
            gap:.02em;
            margin:14px 0 20px;
            text-align:left;
            font-size:clamp(46px,5.5vw,78px);
            line-height:.88;
            letter-spacing:-.055em;
            text-transform:uppercase;
            font-weight:950;
            text-shadow:0 6px 26px rgba(0,0,0,.5);
          }
          .emd-name-line{
            display:block;
            width:100%;
            min-height:.88em;
            white-space:nowrap;
            text-align:left;
          }
          .emd-name-cursor{
            display:inline-block;
            width:4px;
            height:.78em;
            margin-left:7px;
            vertical-align:-.03em;
            background:#ff7a00;
            box-shadow:0 0 14px rgba(255,122,0,.78);
            animation:emdCursor .68s steps(1,end) infinite;
          }
          .emd-bar{width:120px;height:4px;background:#ff7a00;box-shadow:0 0 22px rgba(255,117,0,.55)}
          .emd-tags{display:flex;flex-wrap:wrap;gap:9px;margin-top:20px}
          .emd-tag{
            padding:9px 12px;border:1px solid #ffffff24;
            background:linear-gradient(180deg,rgba(255,255,255,.08),rgba(255,255,255,.035));
            border-radius:99px;color:#d9dde4;font-size:13px;display:inline-flex;gap:6px;align-items:center;
          }

          .emd-lower{
            position:absolute;left:0;right:0;bottom:0;height:54px;z-index:18;display:flex;align-items:center;
            background:linear-gradient(90deg,rgba(2,4,7,.96),rgba(4,7,11,.92) 42%,rgba(7,10,15,.82) 72%,rgba(2,4,7,.94));
            border-top:1px solid rgba(255,255,255,.055);box-shadow:0 -12px 34px rgba(0,0,0,.24);overflow:hidden;
            padding-right:14px;
          }
          .emd-lower:before{content:"";width:7px;height:100%;background:linear-gradient(180deg,#ff9a3f,#ff7a00,#d94d00);box-shadow:0 0 18px rgba(255,122,0,.5)}
          .emd-lower-brand{
            margin-left:18px;
            flex:0 0 auto;
            color:#aeb5bf;
            font-size:11px;
            font-weight:900;
            text-transform:uppercase;
            letter-spacing:.28em;
            line-height:1;
          }
          .emd-lower-sep{
            margin-left:18px;
            flex:0 0 auto;
            width:1px;
            height:20px;
            background:rgba(255,255,255,.11);
          }
          .emd-lower-text{
            margin-left:18px;
            min-width:0;
            flex:1 1 auto;
            color:#fff;
            font-size:13px;
            font-weight:900;
            text-transform:uppercase;
            letter-spacing:.08em;
            line-height:1.1;
            white-space:nowrap;
            overflow:hidden;
            text-overflow:ellipsis;
          }

          .emd-final-card{width:min(1040px,92%)}
          .emd-grid{display:grid;gap:10px;margin-top:32px}
          .emd-card{position:relative;height:235px;overflow:hidden;background:#080b11;border-radius:18px;border:1px solid rgba(255,255,255,.07)}
          .emd-card img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center 22%}
          .emd-card:after{content:"";position:absolute;z-index:2;inset:40% 0 0;background:linear-gradient(transparent,#05070bf2)}
          .emd-card span{position:absolute;z-index:3;left:14px;right:14px;bottom:14px;font-weight:900;text-align:left;text-transform:uppercase;text-shadow:0 3px 12px rgba(0,0,0,.8)}
          .emd-card span:before{content:"";display:block;width:34px;height:3px;margin-bottom:8px;background:#ff7a00;box-shadow:0 0 14px rgba(255,122,0,.55)}

          .emd-progress{position:absolute;z-index:100;left:0;right:0;bottom:0;height:3px;background:#ffffff0d}
          .emd-progress i{display:block;height:100%;background:#ff7a00;transition:width .3s}
          .emd-silhouette{
            position:absolute;left:7%;top:12%;z-index:3;width:44%;height:72%;
            display:flex;align-items:center;justify-content:center;
          }

          @keyframes heroFade{from{opacity:.38;filter:blur(8px) brightness(.72)}to{opacity:1}}
          @keyframes haloPulse{0%,100%{transform:scale(1);opacity:.95}50%{transform:scale(1.06);opacity:1}}
          @keyframes p1{from{transform:translateX(0) skewX(-7deg);opacity:.34}to{transform:translateX(-10px) skewX(-1deg);opacity:.70}}
          @keyframes p2{from{transform:translateX(0) skewX(-4deg);opacity:.46}to{transform:translateX(8px) skewX(3deg);opacity:.90}}
          @keyframes p3{from{transform:translateX(0) skewX(5deg);opacity:.28}to{transform:translateX(-6px) skewX(-2deg);opacity:.62}}


          /* ========== EMD TV ARENA MODE ========== */
          .emd-tv-frame{
            isolation:isolate;
          }
          .emd-tv-frame:before{
            content:"";
            position:absolute;
            inset:0;
            z-index:29;
            pointer-events:none;
            opacity:.42;
            background:
              repeating-linear-gradient(180deg,rgba(255,255,255,.022) 0 1px,transparent 1px 4px),
              radial-gradient(circle at 50% 115%,rgba(249,115,22,.12),transparent 35%);
            mix-blend-mode:screen;
          }
          .emd-arena-atmosphere{
            position:absolute;
            inset:0;
            z-index:24;
            pointer-events:none;
            overflow:hidden;
          }
          .emd-arena-atmosphere:before{
            content:"";
            position:absolute;
            left:-25%;
            top:-45%;
            width:34%;
            height:180%;
            transform:rotate(18deg);
            background:linear-gradient(180deg,transparent,rgba(255,255,255,.10) 30%,rgba(249,115,22,.20) 52%,transparent 75%);
            filter:blur(16px);
            animation:emdMegaSweep 5.8s ease-in-out infinite;
            mix-blend-mode:screen;
          }
          .emd-arena-atmosphere:after{
            content:"";
            position:absolute;
            inset:0;
            background:radial-gradient(circle at 50% 105%,rgba(249,115,22,.18),transparent 27%);
            animation:emdArenaBreath 3.8s ease-in-out infinite;
          }
          .emd-ember{
            position:absolute;
            width:4px;
            height:4px;
            border-radius:999px;
            background:#ffb15e;
            box-shadow:0 0 10px rgba(255,122,0,.9);
            opacity:0;
            animation:emdEmber 4.8s linear infinite;
          }
          .emd-ember.e1{left:8%;bottom:2%;animation-delay:.1s}
          .emd-ember.e2{left:19%;bottom:0;animation-delay:1.3s;animation-duration:5.7s}
          .emd-ember.e3{left:37%;bottom:1%;animation-delay:.7s;animation-duration:4.2s}
          .emd-ember.e4{left:64%;bottom:0;animation-delay:2.2s;animation-duration:5.1s}
          .emd-ember.e5{left:82%;bottom:2%;animation-delay:1.8s;animation-duration:4.6s}
          .emd-ember.e6{left:93%;bottom:0;animation-delay:3.1s;animation-duration:5.4s}

          .emd-scene{
            animation:emdSceneImpact .72s cubic-bezier(.16,.72,.18,1) both;
          }
          .emd-scene:before{
            content:"";
            position:absolute;
            inset:0;
            z-index:80;
            pointer-events:none;
            background:linear-gradient(100deg,transparent 0 35%,rgba(255,255,255,.23) 48%,rgba(249,115,22,.18) 54%,transparent 66%);
            transform:translateX(-130%);
            animation:emdSceneSlash .86s cubic-bezier(.2,.8,.2,1) both;
          }

          .emd-tv-live{
            position:relative;
            overflow:hidden;
          }
          .emd-tv-live:before{
            content:"";
            display:inline-block;
            width:6px;height:6px;
            margin-right:7px;
            border-radius:50%;
            background:#ff7a00;
            box-shadow:0 0 14px rgba(255,122,0,.95);
            animation:emdLiveDot 1.15s ease-in-out infinite;
          }

          .emd-intro-ring{
            position:absolute;
            left:50%;
            top:47%;
            z-index:4;
            width:min(68vw,760px);
            aspect-ratio:1;
            transform:translate(-50%,-50%);
            border-radius:50%;
            border:1px solid rgba(249,115,22,.12);
            box-shadow:
              0 0 0 34px rgba(249,115,22,.025),
              0 0 0 78px rgba(249,115,22,.018),
              inset 0 0 80px rgba(249,115,22,.035);
            animation:emdIntroRing 7s linear infinite;
          }
          .emd-intro-ring:before,.emd-intro-ring:after{
            content:"";
            position:absolute;
            inset:12%;
            border-radius:50%;
            border:1px dashed rgba(255,255,255,.08);
          }
          .emd-intro-ring:after{
            inset:28%;
            border-style:solid;
            border-color:rgba(249,115,22,.10);
          }

          .emd-player{
            animation:emdPlayerPunch .85s cubic-bezier(.16,.78,.2,1) both;
          }
          .emd-player .emd-info{
            animation:emdInfoSlide .92s .12s cubic-bezier(.16,.78,.2,1) both;
          }
          .emd-player .emd-photo{
            animation:emdHeroEntrance 1.05s cubic-bezier(.16,.78,.2,1) both;
          }
          .emd-bar{
            transform-origin:left center;
            animation:emdBarCharge .85s .45s cubic-bezier(.2,.8,.2,1) both;
          }
          .emd-tag{
            animation:emdTagPop .5s cubic-bezier(.2,.9,.25,1) both;
          }
          .emd-tag:nth-child(1){animation-delay:.50s}
          .emd-tag:nth-child(2){animation-delay:.60s}
          .emd-tag:nth-child(3){animation-delay:.70s}
          .emd-tag:nth-child(4){animation-delay:.80s}

          .emd-captain-burst{
            position:absolute;
            z-index:6;
            right:22%;
            top:16%;
            width:170px;
            height:170px;
            border-radius:50%;
            background:radial-gradient(circle,rgba(255,196,92,.20),rgba(249,115,22,.07) 38%,transparent 70%);
            filter:blur(1px);
            animation:emdCaptainBurst 2.7s ease-in-out infinite;
            pointer-events:none;
          }
          .emd-captain-burst:before,
          .emd-captain-burst:after{
            content:"";
            position:absolute;
            inset:15%;
            border-radius:50%;
            border:1px solid rgba(255,196,92,.25);
            animation:emdCaptainRing 2.7s ease-out infinite;
          }
          .emd-captain-burst:after{animation-delay:1.1s}

          .emd-final{
            overflow:hidden;
          }
          .emd-final:before{
            content:"";
            position:absolute;
            inset:-25%;
            z-index:0;
            background:
              conic-gradient(from 180deg at 50% 50%,transparent,rgba(249,115,22,.06),transparent 24%,rgba(255,255,255,.035),transparent 50%,rgba(249,115,22,.06),transparent 76%);
            animation:emdFinalSpin 18s linear infinite;
          }
          .emd-final-card{
            position:relative;
            z-index:3;
            animation:emdFinalRise .95s cubic-bezier(.16,.78,.2,1) both;
          }
          .emd-card{
            transform-origin:center bottom;
            animation:emdCardRise .72s cubic-bezier(.16,.78,.2,1) both;
          }
          .emd-card:nth-child(1){animation-delay:.08s}
          .emd-card:nth-child(2){animation-delay:.16s}
          .emd-card:nth-child(3){animation-delay:.24s}
          .emd-card:nth-child(4){animation-delay:.32s}
          .emd-card:before{
            content:"";
            position:absolute;
            inset:0;
            z-index:4;
            pointer-events:none;
            background:linear-gradient(115deg,transparent 0 35%,rgba(255,255,255,.12) 48%,transparent 60%);
            transform:translateX(-120%);
            animation:emdCardShine 2.6s 1s ease-in-out infinite;
          }          @keyframes emdSceneImpact{
            0%{opacity:0;transform:scale(1.035);filter:brightness(1.8) blur(5px)}
            42%{opacity:1;filter:brightness(1.18) blur(0)}
            100%{transform:scale(1);filter:brightness(1)}
          }
          @keyframes emdSceneSlash{0%{transform:translateX(-130%)}100%{transform:translateX(130%)}}
          @keyframes emdMegaSweep{
            0%,15%{transform:translateX(-10vw) rotate(18deg);opacity:0}
            35%{opacity:.85}
            80%,100%{transform:translateX(150vw) rotate(18deg);opacity:0}
          }
          @keyframes emdArenaBreath{0%,100%{opacity:.42}50%{opacity:1}}
          @keyframes emdEmber{
            0%{transform:translate3d(0,0,0) scale(.6);opacity:0}
            12%{opacity:.9}
            70%{opacity:.55}
            100%{transform:translate3d(38px,-78vh,0) scale(1.6);opacity:0}
          }
          @keyframes emdLiveDot{0%,100%{opacity:.4;transform:scale(.8)}50%{opacity:1;transform:scale(1.18)}}
          @keyframes emdIntroRing{to{transform:translate(-50%,-50%) rotate(360deg)}}50%{opacity:1;transform:translateY(-2px)}}
          @keyframes emdPlayerPunch{0%{opacity:.2;transform:scale(1.025)}100%{opacity:1;transform:scale(1)}}
          @keyframes emdInfoSlide{0%{opacity:0;transform:translate(52px,-50%)}100%{opacity:1;transform:translate(0,-50%)}}
          @keyframes emdHeroEntrance{0%{opacity:0;transform:translateX(-34px) scale(1.035);filter:blur(7px) brightness(.7)}100%{opacity:1;transform:none;filter:drop-shadow(0 28px 42px rgba(0,0,0,.52)) contrast(1.03) saturate(.98)}}
          @keyframes emdBarCharge{0%{transform:scaleX(0);box-shadow:0 0 0 rgba(255,117,0,0)}100%{transform:scaleX(1);box-shadow:0 0 22px rgba(255,117,0,.55)}}
          @keyframes emdTagPop{0%{opacity:0;transform:translateY(10px) scale(.94)}100%{opacity:1;transform:none}}
          @keyframes emdCaptainBurst{0%,100%{transform:scale(.84);opacity:.38}50%{transform:scale(1.12);opacity:.92}}
          @keyframes emdCaptainRing{0%{transform:scale(.55);opacity:.7}100%{transform:scale(1.6);opacity:0}}
          @keyframes emdFinalSpin{to{transform:rotate(360deg)}}
          @keyframes emdFinalRise{0%{opacity:0;transform:translateY(22px) scale(.97)}100%{opacity:1;transform:none}}
          @keyframes emdCardRise{0%{opacity:0;transform:translateY(28px) rotateX(8deg) scale(.96)}100%{opacity:1;transform:none}}
          @keyframes emdCardShine{0%,18%{transform:translateX(-120%);opacity:0}35%{opacity:1}58%,100%{transform:translateX(120%);opacity:0}}

          @media(prefers-reduced-motion:reduce){
            .emd-tv-frame *, .emd-tv-frame:before, .emd-tv-frame:after{
              animation-duration:.01ms !important;
              animation-iteration-count:1 !important;
            }
          }


          .emd-mobile-fullscreen-hint{
            display:none;
          }

          @media(max-width:760px){
            .emd-tv-page{
              height:100dvh;
              min-height:100dvh;
              overflow:hidden !important;
              background:#020305;
            }
            .emd-tv-page-header,
            .emd-tv-bottom-nav,
            .emd-tv-controls{
              display:none !important;
            }
            .emd-tv-main{
              width:100%;
              max-width:none;
              height:100dvh;
              min-height:100dvh;
              padding:4px !important;
              margin:0;
              display:flex;
              align-items:center;
              justify-content:center;
              overflow:hidden;
            }
            .emd-mobile-fullscreen-hint{
              position:absolute;
              z-index:120;
              left:auto;
              right:64px;
              top:12px;
              bottom:auto;
              transform:none;
              display:flex;
              align-items:center;
              justify-content:center;
              min-width:0;
              padding:9px 12px;
              border:1px solid rgba(255,255,255,.12);
              border-radius:999px;
              background:rgba(3,5,8,.72);
              color:#fff;
              font-size:10px;
              font-weight:900;
              letter-spacing:.06em;
              text-transform:uppercase;
              backdrop-filter:blur(10px);
              box-shadow:0 10px 30px rgba(0,0,0,.35);
              pointer-events:none;
            }

            .emd-arena-atmosphere{opacity:.72}
            .emd-intro-ring{width:92vw;opacity:.60}
            .emd-captain-burst{right:-22px;top:16%;width:120px;height:120px;opacity:.65}
            .emd-tv-frame{
              width:calc(100vw - 8px);
              height:calc(100dvh - 8px);
              max-width:none;
              max-height:none;
              margin:0;
              border-radius:14px;
            }
            .emd-tv-top{
              height:56px;
              padding:0 12px;
              z-index:90;
            }
            .emd-tv-logo{
              position:relative;
              z-index:91;
              display:block;
              font-size:13px;
              line-height:1;
              letter-spacing:.12em;
              color:#fff;
              text-shadow:0 2px 10px rgba(0,0,0,.7);
            }
            .emd-tv-live{display:none}
            .emd-player:after{
              background:linear-gradient(0deg,#05070b 0%,rgba(5,7,11,.82) 30%,transparent 63%);
            }
            .emd-photo{
              left:0;
              top:0;
              width:100%;
              height:100%;
              max-width:100%;
              object-fit:cover;
              object-position:center top;
              -webkit-mask-image:linear-gradient(to bottom,black 0%,black 74%,rgba(0,0,0,.82) 86%,rgba(0,0,0,.35) 94%,transparent 100%);
              mask-image:linear-gradient(to bottom,black 0%,black 74%,rgba(0,0,0,.82) 86%,rgba(0,0,0,.35) 94%,transparent 100%);
            }
            .emd-info{
              left:14px;
              right:14px;
              top:auto;
              bottom:12px;
              transform:none;
              width:auto;
              padding:10px 14px 8px;
              border-left:0;
              background:linear-gradient(0deg,rgba(5,7,11,.94),rgba(5,7,11,.52),transparent);
              backdrop-filter:none;
            }
            .emd-info:before{
              left:14px;
              right:auto;
              top:auto;
              bottom:-2px;
              width:110px;
              height:3px;
            }
            .emd-no{
              font-size:104px;
              top:-18px;
              right:6px;
              color:rgba(255,255,255,.18);
              text-shadow:
                0 0 18px rgba(255,122,0,.20),
                0 8px 30px rgba(0,0,0,.48);
              -webkit-text-stroke:1px rgba(255,255,255,.045);
            }
            .emd-small{
              font-size:10px;
              letter-spacing:.18em;
              gap:8px;
            }
            .emd-small:before{
              width:20px;
            }
            .emd-name{
              min-height:1.86em;
              margin:5px 0 6px;
              gap:.02em;
              align-items:flex-start;
              text-align:left;
              font-size:clamp(27px,7.8vw,36px);
              line-height:.88;
            }
            .emd-name-line{
              min-height:.88em;
              white-space:nowrap;
              text-align:left;
            }
            .emd-name-cursor{
              width:3px;
              height:.76em;
              margin-left:5px;
            }
            .emd-bar{
              width:126px;
              height:4px;
              box-shadow:0 0 18px rgba(255,117,0,.78);
            }
            .emd-tags{
              gap:6px;
              margin-top:8px;
            }
            .emd-tag{
              padding:6px 9px;
              font-size:10px;
              gap:5px;
            }
            .emd-lower{
              height:42px;
              padding-right:10px;
            }
            .emd-lower-brand{
              margin-left:12px;
              font-size:9px;
              letter-spacing:.16em;
            }
            .emd-lower-sep{
              margin-left:10px;
              height:16px;
            }
            .emd-lower-text{
              margin-left:10px;
              font-size:10px;
              letter-spacing:.04em;
            }
            .emd-grid{
              grid-template-columns:repeat(2,1fr)!important;
              gap:6px;
            }
            .emd-card{
              height:164px;
            }
            .emd-card span{
              left:10px;
              right:10px;
              bottom:10px;
              font-size:11px;
            }
            .emd-final{
              align-items:center;
              padding:54px 10px 18px;
            }
            .emd-final-card{
              width:100%;
              max-width:100%;
            }
            .emd-final .emd-team-logo-wrap{
              width:92px;
              height:58px;
              margin-bottom:9px;
              border-radius:15px;
            }
            .emd-final .emd-kicker{
              font-size:9px;
              letter-spacing:.20em;
            }
            .emd-final h1{
              font-size:clamp(42px,12vw,54px);
              line-height:.82;
              margin:12px 0 14px;
            }
            .emd-final .emd-grid{
              margin-top:14px;
            }
            .emd-final .emd-card{
              height:clamp(118px,21dvh,158px);
            }
            .emd-final p{
              margin-top:12px !important;
              font-size:12px;
            }
            .emd-team-logo-wrap{
              width:118px;
              height:74px;
              border-radius:18px;
              margin-bottom:12px;
            }
            .emd-team-logo{
              transform:scale(1.26);
            }
            .emd-intro{
              padding:64px 14px 42px;
            }
            .emd-intro-content{
              width:100%;
              max-width:100%;
              transform:translateY(10px);
              padding:0 2px;
            }
            .emd-kicker{
              font-size:10px;
              letter-spacing:.24em;
            }
            .emd-intro-title{
              font-size:clamp(36px,11vw,44px) !important;
              line-height:.94 !important;
              word-spacing:.10em;
              letter-spacing:-.03em !important;
              margin-top:14px !important;
              margin-bottom:14px !important;
            }
            .emd-versus-line{
              margin-top:12px;
              min-height:28px;
              gap:10px;
              font-size:clamp(13px,4.6vw,18px);
              line-height:1.15;
              padding:0 4px;
            }
            .emd-tv-frame:fullscreen{
              width:100vw !important;
              height:100vh !important;
              max-width:none !important;
              border-radius:0 !important;
              border:0 !important;
            }
            .emd-tv-frame:fullscreen .emd-mobile-fullscreen-hint{
              display:none;
            }
            @media(max-width:420px){
              .emd-tv-top{
                height:52px;
                padding:0 10px;
              }
              .emd-tv-logo{
                font-size:12px;
                letter-spacing:.10em;
              }
            }
          }
        `}</style>

        <section ref={frameRef} className={`emd-tv-frame ${embedded ? "emd-tv-frame-embedded" : ""}`} onClick={() => { if (!embedded && window.innerWidth <= 760 && !document.fullscreenElement) void enterFullscreen() }}>
          <div className="emd-arena-atmosphere" aria-hidden="true">
            <span className="emd-ember e1" />
            <span className="emd-ember e2" />
            <span className="emd-ember e3" />
            <span className="emd-ember e4" />
            <span className="emd-ember e5" />
            <span className="emd-ember e6" />
          </div>

          <div className="emd-tv-top">
            <div className="emd-tv-logo">EMD <b>TV</b></div>
            <div className="emd-tv-actions">
              <div className="emd-tv-live">MATCH PREVIEW</div>
              {!embedded ? <button
                type="button"
                className="emd-tv-close"
                aria-label="Preview beenden"
                title="Beenden"
                onClick={(e) => {
                  e.stopPropagation()
                  void exitPreview()
                }}
              >
                <X className="h-5 w-5" />
              </button> : null}
            </div>
          </div>

          <div className="emd-stage">
            {screen.kind === "intro" ? (
              <div className="emd-scene emd-intro" key={`intro-${screenIndex}`}>
                <div className="emd-intro-ring" aria-hidden="true" />
                <div className="emd-intro-fx">
                  <div className="emd-intro-spot s1" />
                  <div className="emd-intro-spot s2" />
                  <div className="emd-intro-spot s3" />
                  <div className="emd-intro-flare" />
                  <div className="emd-intro-glow" />
                </div>

                <div className="emd-intro-content">
                  <div className="emd-team-logo-wrap">
                    {teamLogo ? (
                      <img className="emd-team-logo" src={teamLogo} alt={`${teamName} Logo`} />
                    ) : (
                      <div className="emd-team-logo-fallback">EMD</div>
                    )}
                  </div>
                  <div className="emd-kicker">EMD TV · STARTING LINEUP</div>
                  <h1 className="emd-intro-title">{introTeamName}</h1>


                  <div className="emd-versus-line" aria-label={`${homeName} gegen ${awayName}`}>
                    <span className={`emd-typed-team ${typedHome !== homeName ? "typing" : ""}`}>
                      {typedHome}
                    </span>

                    <span className={`emd-versus ${showVs ? "show" : ""}`}>
                      VS
                    </span>

                    <span className={`emd-typed-team ${showVs && typedAway !== awayName ? "typing" : ""}`}>
                      {typedAway}
                    </span>
                  </div>
                </div>
              </div>
            ) : null}

            {screen.kind === "player" ? (
              <div className="emd-scene emd-player" key={`player-${screenIndex}`}>
                {screen.player.role === "Captain" ? <div className="emd-captain-burst" aria-hidden="true" /> : null}
                <div className="emd-visual">
                  {screen.player.club_players?.photo_url ? (
                    <>
                      <div
                        className="emd-bg"
                        style={{ backgroundImage: `url("${screen.player.club_players.photo_url}")` }}
                      />
                      <div className="emd-halo" />
                      <img
                        className="emd-photo"
                        src={screen.player.club_players.photo_url}
                        alt={screen.player.club_players.name}
                      />
                    </>
                  ) : (
                    <div className="emd-silhouette">
                      <div className="absolute h-[80%] w-[80%] rounded-full bg-orange-500/[0.10] blur-[55px]" />
                      <UserRound className="relative h-[70%] w-[70%] stroke-[1.05] text-white/[0.15]" />
                    </div>
                  )}

                  <div className="emd-arena">
                    <div className="emd-pillar emd-p1" />
                    <div className="emd-pillar emd-p2" />
                    <div className="emd-pillar emd-p3" />
                  </div>
                </div>

                <div className="emd-info">
                  <div className="emd-no">{String(screen.number).padStart(2, "0")}</div>
                  <div className="emd-small">
                    {screen.player.is_substitute ? "Substitute" : "Starting Lineup"}
                  </div>
                  <div className="emd-name" aria-label={currentPlayerName}>
                    <span className="emd-name-line">
                      {typedPlayerLine1}
                      {isTypingPlayerName && typedPlayerName.length <= playerNameLine1.length ? (
                        <span className="emd-name-cursor" aria-hidden="true" />
                      ) : null}
                    </span>
                    <span className="emd-name-line">
                      {typedPlayerLine2}
                      {isTypingPlayerName && typedPlayerName.length > playerNameLine1.length ? (
                        <span className="emd-name-cursor" aria-hidden="true" />
                      ) : null}
                    </span>
                  </div>
                  <div className="emd-bar" />
                  <div className="emd-tags">
                    <span className="emd-tag">
                      {screen.player.role === "Captain" ? <Crown className="h-4 w-4" /> : null}
                      {screen.player.role === "Co-Captain" ? <ShieldCheck className="h-4 w-4" /> : null}
                      {roleText(screen.player.role)}
                    </span>
                    <span className="emd-tag">{teamName}</span>
                    <span className="emd-tag">{dartLabel(match.dart_type)}</span>
                    {screen.player.is_substitute ? <span className="emd-tag">Auswechselspieler</span> : null}
                  </div>
                </div>

                <div className="emd-lower">
                  <div className="emd-lower-brand">EMD TV</div>
                  <div className="emd-lower-sep" />
                  <div className="emd-lower-text">
                    {teamName} · {screen.player.is_substitute ? "Ersatz" : roleText(screen.player.role)}
                  </div>
                </div>
              </div>
            ) : null}

            {screen.kind === "final" ? (
              <div className="emd-scene emd-final" key={`final-${screenIndex}`}>
                <div className="emd-final-card">
                  <div className="emd-team-logo-wrap">
                    {teamLogo ? (
                      <img className="emd-team-logo" src={teamLogo} alt={`${teamName} Logo`} />
                    ) : (
                      <div className="emd-team-logo-fallback">EMD</div>
                    )}
                  </div>
                  <div className="emd-kicker">EMD TV · STARTING LINEUP</div>
                  <h1>LINEUP<br />CONFIRMED</h1>

                  <div
                    className="emd-grid"
                    style={{
                      gridTemplateColumns: `repeat(${Math.max(1, Math.min(allPresentedPlayers.length, 4))}, 1fr)`,
                    }}
                  >
                    {allPresentedPlayers.slice(0, 4).map((p) => (
                      <div className="emd-card" key={p.id}>
                        {p.club_players?.photo_url ? (
                          <img src={p.club_players.photo_url} alt={p.club_players.name} />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center bg-[radial-gradient(circle_at_50%_35%,rgba(249,115,22,.20),transparent_30%),linear-gradient(135deg,#121823,#06080c)]">
                            <UserRound className="h-[58%] w-[58%] stroke-[1.1] text-white/[0.12]" />
                          </div>
                        )}
                        <span>
                          {p.club_players?.name || "Spieler"}
                          {p.is_substitute ? " · Ersatz" : ""}
                        </span>
                      </div>
                    ))}
                  </div>

                  {allPresentedPlayers.length > 4 ? (
                    <div
                      className="mx-auto mt-3 grid max-w-[520px] gap-2"
                      style={{
                        gridTemplateColumns: `repeat(${Math.min(allPresentedPlayers.length - 4, 2)}, 1fr)`,
                      }}
                    >
                      {allPresentedPlayers.slice(4).map((p) => (
                        <div className="emd-card h-[120px]" key={p.id}>
                          {p.club_players?.photo_url ? (
                            <img src={p.club_players.photo_url} alt={p.club_players.name} />
                          ) : (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <UserRound className="h-[58%] w-[58%] text-white/[0.12]" />
                            </div>
                          )}
                          <span>
                            {p.club_players?.name || "Spieler"}
                            {p.is_substitute ? " · Ersatz" : ""}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : null}

                  <p className="mt-6">{homeName} <b style={{ color: "#ff7a00" }}>VS</b> {awayName}</p>
                </div>
              </div>
            ) : null}
          </div>

          <div className="emd-progress">
            <i style={{ width: `${progress}%` }} />
          </div>

          {!embedded && !isFullscreen ? (
            <div className="emd-mobile-fullscreen-hint">
              Antippen für Vollbild
            </div>
          ) : null}
        </section>

        {!embedded ? <div className="emd-tv-controls mx-auto mt-4 flex max-w-[1280px] flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => setPlaying((v) => !v)}
            className="inline-flex items-center gap-2 rounded-full border border-orange-300/20 bg-orange-500/[0.10] px-4 py-2.5 text-sm font-black text-orange-100"
          >
            {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 fill-current" />}
            {playing ? "Pause" : "Abspielen"}
          </button>

          <button
            type="button"
            onClick={() => {
              setScreenIndex(0)
              setPlaying(true)
            }}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-black text-white/70"
          >
            <RotateCcw className="h-4 w-4" />
            Neu starten
          </button>

          <button
            type="button"
            onClick={() => void exitPreview()}
            className="inline-flex items-center gap-2 rounded-full border border-red-300/20 bg-red-500/[0.08] px-4 py-2.5 text-sm font-black text-red-100"
          >
            <X className="h-4 w-4" />
            Beenden
          </button>
        </div> : null}
      </main>

      {!embedded ? (
        <div className="emd-tv-bottom-nav">
          <MobileBottomNav />
        </div>
      ) : null}
    </div>
  )
}
