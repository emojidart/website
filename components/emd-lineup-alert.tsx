"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { AlertTriangle, BellRing, X } from "lucide-react"
import { createBrowserClient } from "@supabase/ssr"

import { Button } from "@/components/ui/button"

type AlertPayload = {
  match_id?: string
  team_id?: string
  type?: string
  created_at?: string
}

type AlertDetails = {
  matchId: string
  teamId: string
  teamName: string
  homeName: string
  awayName: string
  matchDate: string
  matchTime: string
  venue: string
  dartType: string
  alertCreatedAt?: string
}

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
)

const PENDING_KEY = "emd_lineup_alert_pending"
const MAX_PENDING_AGE_MS = 15 * 60 * 1000

function clearPendingAlert() {
  try {
    localStorage.removeItem(PENDING_KEY)
  } catch {}
}

function savePendingAlert(payload: AlertPayload) {
  if (!payload.match_id || !payload.team_id) return
  try {
    localStorage.setItem(
      PENDING_KEY,
      JSON.stringify({
        ...payload,
        type: "lineup_confirmation_alert",
        received_at: Date.now(),
      }),
    )
  } catch {}
}

function readPendingAlert(): AlertPayload | null {
  try {
    const raw = localStorage.getItem(PENDING_KEY)
    if (!raw) return null
    const payload = JSON.parse(raw) as AlertPayload & { received_at?: number }
    if (!payload.match_id || !payload.team_id) {
      clearPendingAlert()
      return null
    }
    const age = Date.now() - Number(payload.received_at || 0)
    if (!payload.received_at || age > MAX_PENDING_AGE_MS) {
      clearPendingAlert()
      return null
    }
    return payload
  } catch {
    return null
  }
}

function formatDate(value?: string | null) {
  if (!value) return ""
  const d = new Date(`${value}T00:00:00`)
  if (!Number.isFinite(d.getTime())) return String(value)
  return d.toLocaleDateString("de-AT")
}

function formatTime(value?: string | null) {
  if (!value) return ""
  return String(value).slice(0, 5)
}

export default function EmdLineupAlert() {
  const router = useRouter()
  const pathname = usePathname()

  const [open, setOpen] = useState(false)
  const [details, setDetails] = useState<AlertDetails | null>(null)
  const [loading, setLoading] = useState(false)

  const requestIdRef = useRef(0)
  const suppressNextRouteCheckRef = useRef(false)

  const audioRef = useRef<AudioContext | null>(null)
  const alarmTimerRef = useRef<number | null>(null)

  const stopAttention = useCallback(() => {
    try {
      if (alarmTimerRef.current) {
        window.clearInterval(alarmTimerRef.current)
        alarmTimerRef.current = null
      }
      navigator.vibrate?.(0)
    } catch {}

    try {
      audioRef.current?.close()
    } catch {}
    audioRef.current = null
  }, [])

  const playAttentionPulse = useCallback(() => {
    try {
      navigator.vibrate?.([420, 120, 420, 120, 850, 140, 420])
    } catch {}

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
      if (!AudioCtx) return

      if (!audioRef.current || audioRef.current.state === "closed") {
        audioRef.current = new AudioCtx()
      }

      const ctx = audioRef.current
      if (ctx.state === "suspended") void ctx.resume().catch(() => {})

      const now = ctx.currentTime
      const duration = 1.8

      const oscA = ctx.createOscillator()
      const oscB = ctx.createOscillator()
      const gain = ctx.createGain()

      oscA.type = "sawtooth"
      oscB.type = "square"

      oscA.frequency.setValueAtTime(620, now)
      oscA.frequency.linearRampToValueAtTime(1050, now + 0.42)
      oscA.frequency.linearRampToValueAtTime(650, now + 0.88)
      oscA.frequency.linearRampToValueAtTime(1100, now + 1.32)
      oscA.frequency.linearRampToValueAtTime(700, now + duration)

      oscB.frequency.setValueAtTime(780, now)
      oscB.frequency.linearRampToValueAtTime(1280, now + 0.42)
      oscB.frequency.linearRampToValueAtTime(820, now + 0.88)
      oscB.frequency.linearRampToValueAtTime(1320, now + 1.32)
      oscB.frequency.linearRampToValueAtTime(860, now + duration)

      gain.gain.setValueAtTime(0.0001, now)
      gain.gain.exponentialRampToValueAtTime(0.11, now + 0.04)
      gain.gain.setValueAtTime(0.11, now + duration - 0.08)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration)

      oscA.connect(gain)
      oscB.connect(gain)
      gain.connect(ctx.destination)

      oscA.start(now)
      oscB.start(now)
      oscA.stop(now + duration)
      oscB.stop(now + duration)
    } catch (error) {
      console.log("[emd-lineup-alert] siren audio blocked:", error)
    }
  }, [])

  const startAttention = useCallback(() => {
    stopAttention()
    playAttentionPulse()
    alarmTimerRef.current = window.setInterval(playAttentionPulse, 2450)
  }, [playAttentionPulse, stopAttention])

  const removeAlertParamFromUrl = useCallback(() => {
    try {
      const url = new URL(window.location.href)
      if (!url.searchParams.has("emd_alert")) return
      url.searchParams.delete("emd_alert")
      window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`)
    } catch {}
  }, [])

  const closeAlert = useCallback(() => {
    setOpen(false)
    stopAttention()
    clearPendingAlert()
    removeAlertParamFromUrl()
  }, [removeAlertParamFromUrl, stopAttention])

  const loadAndShow = useCallback(async (payload: AlertPayload) => {
    const matchId = payload?.match_id
    const teamId = payload?.team_id
    if (!matchId || !teamId) return

    savePendingAlert(payload)

    const currentRequest = ++requestIdRef.current
    setLoading(true)

    try {
      // Alert darf ausschließlich Captain / Co-Captain des Zielteams angezeigt werden.
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.user?.id) return

      const { data: profile } = await supabase
        .from("user_profiles")
        .select("player_id")
        .eq("user_id", session.user.id)
        .maybeSingle()

      if (!profile?.player_id) return

      const { data: membership } = await supabase
        .from("team_members")
        .select("role")
        .eq("team_id", teamId)
        .eq("player_id", profile.player_id)
        .is("left_at", null)
        .maybeSingle()

      if (membership?.role !== "Captain" && membership?.role !== "Co-Captain") {
        return
      }

      const [{ data: match }, { data: team }] = await Promise.all([
        supabase
          .from("matches")
          .select(`
            id,
            match_date,
            match_time,
            venue,
            dart_type,
            home_team_id,
            away_team_id,
            home_team_type,
            away_team_type,
            home_opponent_team_id,
            away_opponent_team_id
          `)
          .eq("id", matchId)
          .maybeSingle(),
        supabase
          .from("teams")
          .select("id,name,dart_type")
          .eq("id", teamId)
          .maybeSingle(),
      ])

      if (!match || !team) return

      // Ist inzwischen bestätigt, braucht der Alert nicht mehr aufzugehen.
      const { data: header } = await supabase
        .from("match_lineup_headers")
        .select("status,current_version,confirmed_version,confirmed_at")
        .eq("match_id", matchId)
        .eq("team_id", teamId)
        .maybeSingle()

      const currentlyConfirmed =
        header?.status === "confirmed" &&
        header?.confirmed_version != null &&
        header?.confirmed_version === header?.current_version

      const alertCreatedAtMs = payload.created_at ? new Date(payload.created_at).getTime() : 0
      const confirmedAtMs = header?.confirmed_at ? new Date(header.confirmed_at).getTime() : 0
      const resolvedByLaterConfirmation =
        Boolean(alertCreatedAtMs && confirmedAtMs && confirmedAtMs >= alertCreatedAtMs)

      if (currentlyConfirmed || resolvedByLaterConfirmation) {
        clearPendingAlert()
        removeAlertParamFromUrl()
        return
      }

      let homeName = "Heimteam"
      let awayName = "Gastteam"

      if (match.home_team_type === "own" && match.home_team_id) {
        const { data } = await supabase
          .from("teams")
          .select("name")
          .eq("id", match.home_team_id)
          .maybeSingle()
        if (data?.name) homeName = data.name
      } else if (match.home_opponent_team_id) {
        const { data } = await supabase
          .from("opponent_teams")
          .select("name")
          .eq("id", match.home_opponent_team_id)
          .maybeSingle()
        if (data?.name) homeName = data.name
      }

      if (match.away_team_type === "own" && match.away_team_id) {
        const { data } = await supabase
          .from("teams")
          .select("name")
          .eq("id", match.away_team_id)
          .maybeSingle()
        if (data?.name) awayName = data.name
      } else if (match.away_opponent_team_id) {
        const { data } = await supabase
          .from("opponent_teams")
          .select("name")
          .eq("id", match.away_opponent_team_id)
          .maybeSingle()
        if (data?.name) awayName = data.name
      }

      if (currentRequest !== requestIdRef.current) return

      setDetails({
        matchId,
        teamId,
        teamName: team.name || "Team",
        homeName,
        awayName,
        matchDate: formatDate(match.match_date),
        matchTime: formatTime(match.match_time),
        venue: match.venue || "",
        dartType: (() => {
          const raw = String(team.dart_type || match.dart_type || "")
            .toLowerCase()
            .replace(/[\s_-]+/g, "")
          if (raw.includes("edart")) return "E-Dart"
          if (raw.includes("steel")) return "Steeldart"
          return team.dart_type || match.dart_type || "Dart"
        })(),
        alertCreatedAt: payload.created_at,
      })
      setOpen(true)
      window.setTimeout(startAttention, 80)
    } catch (error) {
      console.error("[emd-lineup-alert] load failed:", error)
    } finally {
      if (currentRequest === requestIdRef.current) setLoading(false)
    }
  }, [removeAlertParamFromUrl, startAttention])

  const checkPersistentAlert = useCallback(async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      const userId = session?.user?.id
      if (!userId) return

      const { data: rows, error } = await supabase
        .from("emd_lineup_alert_log")
        .select("id,created_at,match_id,team_id,recipient_mode,recipient_user_ids,sent_count,failed_count,status")
        .contains("recipient_user_ids", [userId])
        .in("status", ["sent", "partial"])
        .gt("sent_count", 0)
        .order("created_at", { ascending: false })
        .limit(20)

      if (error) {
        console.warn("[emd-lineup-alert] persistent alert query failed:", error)
        return
      }

      for (const row of rows || []) {
        const { data: header } = await supabase
          .from("match_lineup_headers")
          .select("status,current_version,confirmed_version,confirmed_at")
          .eq("match_id", row.match_id)
          .eq("team_id", row.team_id)
          .maybeSingle()

        const currentlyConfirmed =
          header?.status === "confirmed" &&
          header?.confirmed_version != null &&
          header?.confirmed_version === header?.current_version

        const alertCreatedAtMs = new Date(row.created_at).getTime()
        const confirmedAtMs = header?.confirmed_at ? new Date(header.confirmed_at).getTime() : 0
        const resolvedByLaterConfirmation =
          Boolean(confirmedAtMs && confirmedAtMs >= alertCreatedAtMs)

        if (currentlyConfirmed || resolvedByLaterConfirmation) continue

        await loadAndShow({
          type: "lineup_confirmation_alert",
          match_id: row.match_id,
          team_id: row.team_id,
          created_at: row.created_at,
        })
        return
      }
    } catch (error) {
      console.error("[emd-lineup-alert] persistent check failed:", error)
    }
  }, [loadAndShow])

  useEffect(() => {
    const checkCurrentUrl = () => {
      try {
        const params = new URLSearchParams(window.location.search)
        if (params.get("emd_alert") !== "lineup-confirmation") return

        void loadAndShow({
          type: "lineup_confirmation_alert",
          match_id: params.get("match_id") || undefined,
          team_id: params.get("team_id") || undefined,
        })
      } catch {}
    }

    const onAlert = (event: Event) => {
      const custom = event as CustomEvent<AlertPayload>
      const payload = custom.detail || {}
      if (payload.type && payload.type !== "lineup_confirmation_alert") return
      void loadAndShow(payload)
    }

    const pending = readPendingAlert()
    if (pending) void loadAndShow(pending)

    checkCurrentUrl()
    void checkPersistentAlert()

    const onFocus = () => void checkPersistentAlert()
    const onVisibility = () => {
      if (document.visibilityState === "visible") void checkPersistentAlert()
    }

    window.addEventListener("popstate", checkCurrentUrl)
    window.addEventListener("emd-lineup-alert", onAlert as EventListener)
    window.addEventListener("focus", onFocus)
    document.addEventListener("visibilitychange", onVisibility)

    return () => {
      window.removeEventListener("popstate", checkCurrentUrl)
      window.removeEventListener("emd-lineup-alert", onAlert as EventListener)
      window.removeEventListener("focus", onFocus)
      document.removeEventListener("visibilitychange", onVisibility)
      stopAttention()
    }
  }, [checkPersistentAlert, loadAndShow, stopAttention])

  useEffect(() => {
    if (!pathname) return

    if (suppressNextRouteCheckRef.current) {
      suppressNextRouteCheckRef.current = false
      return
    }

    void checkPersistentAlert()
  }, [pathname, checkPersistentAlert])

  useEffect(() => {
    if (!details?.matchId || !details?.teamId) return

    const channel = supabase
      .channel(`emd_lineup_alert_confirm_${details.matchId}_${details.teamId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "match_lineup_headers",
          filter: `match_id=eq.${details.matchId}`,
        },
        (payload) => {
          const row: any = payload.new || {}
          if (row.team_id !== details.teamId) return

          const confirmed =
            row.status === "confirmed" &&
            row.confirmed_version != null &&
            row.confirmed_version === row.current_version

          if (confirmed) {
            setOpen(false)
            stopAttention()
            clearPendingAlert()
            removeAlertParamFromUrl()
          }
        },
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [details?.matchId, details?.teamId, removeAlertParamFromUrl, stopAttention])

  if (!open || !details) return null

  return (
    <div className="fixed inset-0 z-[2147483600] h-[100dvh] w-screen overflow-hidden bg-[#020101] text-white">
      <div className="emd-alert-redwash pointer-events-none absolute inset-0" />
      <div className="emd-alert-strobe pointer-events-none absolute inset-0" />
      <div className="emd-alert-scan pointer-events-none absolute inset-0" />
      <div className="emd-alert-vignette pointer-events-none absolute inset-0" />

      <div
        className="relative mx-auto flex h-[100dvh] w-full max-w-[560px] flex-col overflow-y-auto overflow-x-hidden overscroll-contain border-x border-red-300/30 bg-[linear-gradient(180deg,#1b0204_0%,#090102_46%,#020203_100%)] shadow-[0_0_70px_rgba(239,68,68,.68)]"
        style={{
          paddingTop: "max(8px, env(safe-area-inset-top))",
          paddingBottom: "max(8px, env(safe-area-inset-bottom))",
        }}
      >
        <div className="emd-alert-edge pointer-events-none absolute inset-0" />
        <div className="emd-alert-topbar pointer-events-none absolute left-0 right-0 top-0 h-2" />

        <button
          type="button"
          onClick={closeAlert}
          className="absolute right-3 top-[max(10px,env(safe-area-inset-top))] z-30 flex h-11 w-11 items-center justify-center rounded-full border border-red-200/25 bg-black/55 text-white/90 shadow-[0_0_22px_rgba(239,68,68,.22)] backdrop-blur-xl"
          aria-label="Alert schließen"
        >
          <X className="h-6 w-6" />
        </button>

        <div className="relative z-10 flex min-h-full flex-col px-4 pb-2 pt-11 sm:px-7">
          <div className="flex flex-1 flex-col items-center justify-center text-center">
            <div className="emd-alert-badge relative flex h-[clamp(72px,11.5vh,104px)] w-[clamp(72px,11.5vh,104px)] items-center justify-center rounded-[26px] border border-red-100/70 bg-red-500/12 shadow-[0_0_60px_rgba(239,68,68,.7)]">
              <div className="emd-alert-radar pointer-events-none absolute inset-[-14px] rounded-[34px] border border-red-300/25" />
              <AlertTriangle className="h-[55%] w-[55%] text-red-50 drop-shadow-[0_0_18px_rgba(255,255,255,.35)]" strokeWidth={2.6} />
            </div>

            <div className="mt-[clamp(12px,2.4vh,24px)] flex items-center gap-2.5">
              <span className="emd-alert-dot h-2.5 w-2.5 rounded-full bg-red-400" />
              <div className="text-[clamp(10px,1.7vh,14px)] font-black uppercase tracking-[0.29em] text-red-200">
                EMD ALERT · SOFORT HANDELN
              </div>
              <span className="emd-alert-dot h-2.5 w-2.5 rounded-full bg-red-400" />
            </div>

            <h2 className="mt-[clamp(9px,1.8vh,18px)] text-[clamp(30px,6vh,52px)] font-black uppercase leading-[0.89] tracking-[-0.055em] drop-shadow-[0_4px_18px_rgba(0,0,0,.55)]">
              Aufstellung
              <br />
              noch nicht
              <br />
              bestätigt!
            </h2>

            <div className="mt-[clamp(12px,2.4vh,24px)] w-full rounded-[22px] border border-red-100/18 bg-black/52 p-[clamp(13px,2.1vh,20px)] text-left shadow-[inset_0_0_30px_rgba(239,68,68,.05),0_16px_45px_rgba(0,0,0,.42)] backdrop-blur-xl">
              <div className="text-[clamp(17px,2.35vh,21px)] font-black leading-tight">
                {details.homeName}
                <span className="mx-1.5 text-white/22">vs.</span>
                {details.awayName}
              </div>

              <div className="mt-2 text-[10px] font-black uppercase tracking-[0.15em] text-red-100/45">
                {details.teamName} · {details.dartType}
              </div>

              <div className="my-[clamp(9px,1.5vh,14px)] h-px bg-gradient-to-r from-transparent via-red-200/20 to-transparent" />

              <div className="grid gap-[clamp(5px,1.1vh,9px)] text-[clamp(13px,1.8vh,15px)] font-bold text-white/82">
                <div className="flex items-center gap-3">
                  <span className="text-red-300">●</span>
                  <span>{details.matchDate}</span>
                </div>
                {details.matchTime ? (
                  <div className="flex items-center gap-3">
                    <span className="text-red-300">●</span>
                    <span>{details.matchTime} Uhr</span>
                  </div>
                ) : null}
                <div className="flex items-center gap-3">
                  <span className="text-red-300">●</span>
                  <span>{details.venue || "Spielort noch offen"}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-[clamp(10px,1.8vh,18px)] space-y-2">
            <Button
              type="button"
              onClick={() => {
                suppressNextRouteCheckRef.current = true
                stopAttention()
                setOpen(false)
                clearPendingAlert()
                removeAlertParamFromUrl()
                router.push(
                  `/member-availability?match_id=${encodeURIComponent(details.matchId)}` +
                    `&team_id=${encodeURIComponent(details.teamId)}` +
                    `&tab=lineup`,
                )
              }}
              className="emd-alert-action h-[clamp(50px,6.7vh,62px)] w-full rounded-[19px] border border-red-100/45 bg-red-600 text-[clamp(14px,2vh,18px)] font-black uppercase tracking-[0.05em] text-white shadow-[0_0_34px_rgba(239,68,68,.58)] hover:bg-red-500"
            >
              <BellRing className="mr-2 h-5 w-5" />
              Jetzt zur Aufstellung
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={closeAlert}
              className="h-[clamp(42px,5.4vh,50px)] w-full rounded-[17px] border-white/10 bg-black/50 font-black text-white/60 hover:bg-white/[0.05] hover:text-white"
            >
              Später
            </Button>

            <div className="pb-1 text-center text-[9px] font-bold uppercase tracking-[0.16em] text-red-100/28">
              Alert bleibt aktiv bis die Aufstellung bestätigt ist
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes emdAlertRedWash {
          0%,100% { opacity:.48; transform:scale(1); }
          50% { opacity:.88; transform:scale(1.035); }
        }
        @keyframes emdAlertStrobe {
          0%, 12%, 100% { opacity:.08; }
          5%, 7% { opacity:.42; }
          52%, 60% { opacity:.12; }
          55%, 57% { opacity:.32; }
        }
        @keyframes emdAlertEdge {
          0%,100% {
            box-shadow:
              inset 0 0 0 2px rgba(248,113,113,.32),
              inset 0 0 40px rgba(239,68,68,.12),
              0 0 22px rgba(239,68,68,.28);
          }
          50% {
            box-shadow:
              inset 0 0 0 3px rgba(254,202,202,.88),
              inset 0 0 72px rgba(239,68,68,.34),
              0 0 58px rgba(239,68,68,.72);
          }
        }
        @keyframes emdAlertBadge {
          0%,100% { transform:scale(1); filter:brightness(1); }
          50% { transform:scale(1.06); filter:brightness(1.18); }
        }
        @keyframes emdAlertRadar {
          0% { transform:scale(.88); opacity:.75; }
          100% { transform:scale(1.32); opacity:0; }
        }
        @keyframes emdAlertDot {
          0%,100% { opacity:.32; box-shadow:0 0 0 rgba(248,113,113,0); }
          50% { opacity:1; box-shadow:0 0 18px rgba(248,113,113,.9); }
        }
        @keyframes emdAlertAction {
          0%,100% { transform:translateY(0); filter:brightness(1); }
          50% { transform:translateY(-1px); filter:brightness(1.18); }
        }
        @keyframes emdAlertTop {
          0% { transform:translateX(-35%); opacity:.25; }
          50% { transform:translateX(35%); opacity:1; }
          100% { transform:translateX(135%); opacity:.25; }
        }

        .emd-alert-redwash {
          background:
            radial-gradient(circle at 50% 10%, rgba(239,68,68,.46), transparent 34%),
            radial-gradient(circle at 50% 52%, rgba(127,29,29,.24), transparent 52%),
            radial-gradient(circle at 50% 96%, rgba(239,68,68,.32), transparent 34%);
          animation:emdAlertRedWash 1.45s ease-in-out infinite;
        }
        .emd-alert-strobe {
          background:linear-gradient(90deg, rgba(239,68,68,.8), transparent 22%, transparent 78%, rgba(239,68,68,.8));
          animation:emdAlertStrobe 2.1s linear infinite;
        }
        .emd-alert-scan {
          opacity:.15;
          background:repeating-linear-gradient(
            180deg,
            transparent 0 4px,
            rgba(255,255,255,.045) 5px,
            transparent 6px
          );
        }
        .emd-alert-vignette {
          box-shadow:inset 0 0 100px rgba(0,0,0,.9);
        }
        .emd-alert-edge {
          animation:emdAlertEdge .95s ease-in-out infinite;
        }
        .emd-alert-badge {
          animation:emdAlertBadge .95s ease-in-out infinite;
        }
        .emd-alert-radar {
          animation:emdAlertRadar 1.2s ease-out infinite;
        }
        .emd-alert-dot {
          animation:emdAlertDot .8s ease-in-out infinite;
        }
        .emd-alert-action {
          animation:emdAlertAction 1.05s ease-in-out infinite;
        }
        .emd-alert-topbar {
          background:linear-gradient(90deg, transparent, rgba(254,202,202,.95), transparent);
          animation:emdAlertTop 1.7s linear infinite;
        }

        @media (max-height: 760px) {
          .emd-alert-badge {
            transform:scale(.9);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .emd-alert-redwash,
          .emd-alert-strobe,
          .emd-alert-edge,
          .emd-alert-badge,
          .emd-alert-radar,
          .emd-alert-dot,
          .emd-alert-action,
          .emd-alert-topbar {
            animation:none !important;
          }
        }
      `}</style>
    </div>
  )
}
