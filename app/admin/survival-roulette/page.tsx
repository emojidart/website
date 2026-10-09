"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import {
  AlertCircle,
  CheckCircle,
  Flame,
  Play,
  Search,
  Trophy,
  Trash2,
  UserPlus,
  Users,
  X,
} from "lucide-react"
import { Header } from "@/components/header"
import { TournamentAdminNav } from "@/app/admin/_komponenten/turniere/turnier-navigation"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/hooks/use-auth"
import {
  TournamentRegistrationPanel,
  type TournamentRegistrationAvailablePlayer,
  type TournamentRegistrationRegisteredPlayer,
} from "@/components/tournament-registration/tournament-registration-panel"

type DbPlayer = {
  id: number | string
  name: string
}

type SurvivalPlayer = {
  player_id: string
  player_name: string
}

function buildSurvivalRoute(total: number) {
  if (total < 4 || total % 4 !== 0) return []

  const route = [total]
  let current = total

  while (current > 4) {
    let next: number

    if (current >= 40) next = current - 8
    else if (current >= 20) next = current - 4
    else if (current === 16) next = 12
    else if (current === 12) next = 8
    else next = 4

    next = Math.max(4, next - (next % 4))

    if (next >= current) {
      next = current - 4
    }

    route.push(next)
    current = next
  }

  return route
}

export default function SurvivalRouletteAdminPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const centralEventId = searchParams.get("centralEventId")
  const { user, isAdmin, loading: authLoading, adminLoading } = useAuth()

  const [tournamentName, setTournamentName] = useState("Survival Roulette")
  const [availablePlayers, setAvailablePlayers] = useState<DbPlayer[]>([])
  const [registeredPlayers, setRegisteredPlayers] = useState<SurvivalPlayer[]>([])
  const [selectedPlayers, setSelectedPlayers] = useState<Set<string>>(new Set())
  const [searchTerm, setSearchTerm] = useState("")
  const [loading, setLoading] = useState(true)
  const [startingTournament, setStartingTournament] = useState(false)
  const [machineCount, setMachineCount] = useState(5)
  const [legsToWin, setLegsToWin] = useState<2 | 3 | 4>(2)
  const [draftTournamentId, setDraftTournamentId] = useState<string | null>(null)
  const [isOnline, setIsOnline] = useState(true)
  const [notice, setNotice] = useState<{
    title: string
    message: string
    tone: "info" | "warning" | "error"
  } | null>(null)
  const [showClearRegistration, setShowClearRegistration] = useState(false)

  const alert = (message: string) => {
    let title = "Hinweis"
    let tone: "info" | "warning" | "error" = "info"

    if (/internet|offline/i.test(message)) {
      title = "Keine Internetverbindung"
      tone = "warning"
    } else if (/konnte nicht|nicht bereit|fehlgeschlagen/i.test(message)) {
      title = "Aktion nicht möglich"
      tone = "error"
    }

    setNotice({ title, message, tone })
  }

  const draftKey = user?.id
    ? `survival_roulette_draft_${user.id}${centralEventId ? `_event_${centralEventId}` : ""}`
    : "survival_roulette_draft"
  const backupKey = user?.id
    ? `survival_roulette_setup_backup_${user.id}${centralEventId ? `_event_${centralEventId}` : ""}`
    : "survival_roulette_setup_backup"

  const saveLocalBackup = (override?: Partial<{
    tournamentName: string
    machineCount: number
    legsToWin: number
    registeredPlayers: SurvivalPlayer[]
    draftTournamentId: string | null
  }>) => {
    if (typeof window === "undefined") return
    const payload = {
      tournamentName,
      machineCount,
      legsToWin,
      registeredPlayers,
      draftTournamentId,
      savedAt: new Date().toISOString(),
      ...override,
    }
    localStorage.setItem(backupKey, JSON.stringify(payload))
  }

  useEffect(() => {
    if (typeof window === "undefined") return
    const syncOnline = () => setIsOnline(navigator.onLine)
    syncOnline()
    window.addEventListener("online", syncOnline)
    window.addEventListener("offline", syncOnline)
    return () => {
      window.removeEventListener("online", syncOnline)
      window.removeEventListener("offline", syncOnline)
    }
  }, [])

  useEffect(() => {
    if (typeof window === "undefined") return
    saveLocalBackup()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tournamentName, machineCount, legsToWin, registeredPlayers, draftTournamentId])

  useEffect(() => {
    if (!user) return

    const initialize = async () => {
      setLoading(true)

      // 1) Always restore local setup immediately first.
      if (typeof window !== "undefined") {
        try {
          const cached = localStorage.getItem(backupKey)
          if (cached) {
            const parsed = JSON.parse(cached)
            if (parsed?.tournamentName) setTournamentName(String(parsed.tournamentName))
            if (Number(parsed?.machineCount) >= 1) setMachineCount(Number(parsed.machineCount))
            if ([2, 3, 4].includes(Number(parsed?.legsToWin))) setLegsToWin(Number(parsed.legsToWin) as 2 | 3 | 4)
            if (Array.isArray(parsed?.registeredPlayers)) {
              setRegisteredPlayers(parsed.registeredPlayers)
            }
            if (parsed?.draftTournamentId) {
              setDraftTournamentId(String(parsed.draftTournamentId))
            }
          }
        } catch (error) {
          console.warn("[Survival] Lokales Setup-Backup konnte nicht gelesen werden:", error)
        }
      }

      try {
        const { data: playerData, error: playerError } = await supabase
          .from("spieldatenbank")
          .select("id, name")
          .order("name", { ascending: true })

        if (playerError) throw playerError
        setAvailablePlayers((playerData || []) as DbPlayer[])

        // IMPORTANT: an active tournament always has priority over drafts.
        // Never open/create an empty draft while a Survival tournament is running.
        const { data: activeTournament, error: activeTournamentError } = await supabase
          .from("survival_tournaments")
          .select("id,status,updated_at")
          .eq("created_by", user.id)
          .eq("status", "active")
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle()

        if (activeTournamentError) throw activeTournamentError

        if (activeTournament?.id && !centralEventId) {
          if (typeof window !== "undefined") {
            localStorage.setItem(
              `survival_roulette_active_${user.id}`,
              String(activeTournament.id),
            )
          }

          router.replace(`/admin/survival-roulette/${activeTournament.id}`)
          return
        }

        let storedDraftId =
          typeof window !== "undefined" ? localStorage.getItem(draftKey) : null

        let draft: any = null

        if (storedDraftId) {
          const { data } = await supabase
            .from("survival_tournaments")
            .select("*")
            .eq("id", storedDraftId)
            .eq("created_by", user.id)
            .eq("status", "draft")
            .maybeSingle()
          draft = data
        }

        // Never use an unrelated draft for a central event.
        // Its own event-scoped key is the only draft that may be resumed.
        if (!draft && !centralEventId) {
          const { data } = await supabase
            .from("survival_tournaments")
            .select("*")
            .eq("created_by", user.id)
            .eq("status", "draft")
            .order("updated_at", { ascending: false })
            .limit(1)
            .maybeSingle()
          draft = data
        }

        if (!draft) {
          const { data, error } = await supabase
            .from("survival_tournaments")
            .insert({
              name: tournamentName.trim() || "Survival Roulette",
              status: "draft",
              current_stage: 1,
              machine_count: machineCount,
              rounds_per_stage: 2,
              win_points: 3,
              close_loss_points: 1,
              loss_points: 0,
              legs_to_win: legsToWin,
              created_by: user.id,
            })
            .select("*")
            .single()

          if (error) throw error
          draft = data
        }

        const id = String(draft.id)
        setDraftTournamentId(id)

        let resolvedTournamentName = draft.name || "Survival Roulette"
        let resolvedPlayers: SurvivalPlayer[] | null = null

        if (centralEventId) {
          const [{ data: centralEvent, error: centralEventError }, { data: centralRegistrations, error: centralRegistrationsError }] =
            await Promise.all([
              supabase
                .from("central_tournament_events")
                .select("id,title")
                .eq("id", centralEventId)
                .maybeSingle(),
              supabase
                .from("central_tournament_registrations")
                .select("player_id,player_name_snapshot,status")
                .eq("event_id", centralEventId)
                .eq("status", "registered")
                .order("registered_at", { ascending: true }),
            ])

          if (centralEventError) throw centralEventError
          if (centralRegistrationsError) throw centralRegistrationsError
          if (!centralEvent) throw new Error("Das angelegte Turnier existiert nicht mehr.")

          if (centralEvent?.title) {
            resolvedTournamentName = String(centralEvent.title)
          }

          resolvedPlayers = (centralRegistrations || [])
            .filter((row: any) => Boolean(row.player_id))
            .map((row: any) => ({
              player_id: String(row.player_id),
              player_name: String(row.player_name_snapshot || "Spieler"),
            }))

          // Synchronize the exact central-event roster: never retain players
          // imported from an older draft or subsequently removed centrally.
          const expectedPlayerIds = new Set(resolvedPlayers.map((player) => player.player_id))
          const { data: existingPlayers, error: existingPlayersError } = await supabase
            .from("survival_players")
            .select("player_id")
            .eq("tournament_id", id)
          if (existingPlayersError) throw existingPlayersError
          const obsoleteIds = (existingPlayers || [])
            .map((player: any) => String(player.player_id))
            .filter((playerId: string) => !expectedPlayerIds.has(playerId))
          if (obsoleteIds.length > 0) {
            const { error: removeObsoleteError } = await supabase
              .from("survival_players")
              .delete()
              .eq("tournament_id", id)
              .in("player_id", obsoleteIds)
            if (removeObsoleteError) throw removeObsoleteError
          }

          if (resolvedPlayers.length > 0) {
            const { error: syncCentralPlayersError } = await supabase
              .from("survival_players")
              .upsert(
                resolvedPlayers.map((player) => ({
                  tournament_id: id,
                  player_id: player.player_id,
                  player_name: player.player_name,
                  active: true,
                })),
                { onConflict: "tournament_id,player_id" },
              )

            if (syncCentralPlayersError) throw syncCentralPlayersError
          }

          const { error: syncNameError } = await supabase
            .from("survival_tournaments")
            .update({
              name: resolvedTournamentName,
              updated_at: new Date().toISOString(),
            })
            .eq("id", id)

          if (syncNameError) throw syncNameError
        }

        setTournamentName(resolvedTournamentName)
        setMachineCount(Number(draft.machine_count || 5))

        if (typeof window !== "undefined") {
          localStorage.setItem(draftKey, id)
        }

        if (!resolvedPlayers) {
          const { data: savedPlayers, error: savedPlayersError } = await supabase
            .from("survival_players")
            .select("player_id,player_name")
            .eq("tournament_id", id)
            .order("created_at", { ascending: true })

          if (savedPlayersError) throw savedPlayersError
          resolvedPlayers = (savedPlayers || []) as SurvivalPlayer[]
        }

        setRegisteredPlayers(resolvedPlayers)
        saveLocalBackup({
          tournamentName: resolvedTournamentName,
          machineCount: Number(draft.machine_count || 5),
          registeredPlayers: resolvedPlayers,
          draftTournamentId: id,
        })
      } catch (error) {
        console.error("[Survival] Setup konnte online nicht initialisiert werden:", error)
        alert("Survival-Setup konnte nicht vollständig geladen werden. Bitte Internetverbindung und Turnier prüfen, bevor du startest.")
        // Local backup remains visible. Do not wipe anything.
      } finally {
        setLoading(false)
      }
    }

    void initialize()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, centralEventId])

  const filteredPlayers = useMemo(() => {
    const search = searchTerm.trim().toLowerCase()

    return availablePlayers.filter((player) => {
      const alreadyRegistered = registeredPlayers.some(
        (registered) => registered.player_id === String(player.id),
      )

      if (alreadyRegistered) return false
      if (!search) return true

      return player.name.toLowerCase().includes(search)
    })
  }, [availablePlayers, registeredPlayers, searchTerm])

  const route = useMemo(
    () => buildSurvivalRoute(registeredPlayers.length),
    [registeredPlayers.length],
  )

  const tournamentFormCompleted = tournamentName.trim().length > 0 && machineCount >= 1
  const validPlayerCount =
    registeredPlayers.length >= 4 && registeredPlayers.length % 4 === 0

  const canStart =
    tournamentFormCompleted && validPlayerCount && registeredPlayers.length >= 4

  const togglePlayer = (playerId: string) => {
    setSelectedPlayers((previous) => {
      const next = new Set(previous)

      if (next.has(playerId)) {
        next.delete(playerId)
      } else {
        next.add(playerId)
      }

      return next
    })
  }

  const registerSelectedPlayers = async () => {
    if (centralEventId) {
      alert("Bei angelegten Turnieren bitte die Teilnehmer in der Turnier-Zentrale ändern und das Survival-Setup danach neu öffnen.")
      return
    }
    if (selectedPlayers.size === 0) return

    const newPlayers = availablePlayers
      .filter((player) => selectedPlayers.has(String(player.id)))
      .filter(
        (player) =>
          !registeredPlayers.some(
            (registered) => registered.player_id === String(player.id),
          ),
      )
      .map((player) => ({
        player_id: String(player.id),
        player_name: player.name,
      }))

    if (newPlayers.length === 0) return

    // Update UI + local backup first, so navigation/reload never clears the selection.
    const nextPlayers = [...registeredPlayers, ...newPlayers]
    setRegisteredPlayers(nextPlayers)
    setSelectedPlayers(new Set())
    saveLocalBackup({ registeredPlayers: nextPlayers })

    if (!draftTournamentId) {
      alert("Draft wird noch vorbereitet. Bitte kurz warten und erneut versuchen.")
      return
    }

    if (!navigator.onLine) {
      alert("Keine Internetverbindung. Die Auswahl ist lokal gesichert und kann online synchronisiert werden.")
      return
    }

    const { error } = await supabase
      .from("survival_players")
      .upsert(
        newPlayers.map((player) => ({
          tournament_id: draftTournamentId,
          player_id: player.player_id,
          player_name: player.player_name,
          active: true,
        })),
        { onConflict: "tournament_id,player_id" },
      )

    if (error) {
      console.error("[Survival] Spieler konnten nicht gespeichert werden:", error)
      alert("Spieler sind lokal gesichert, konnten aber gerade nicht mit Supabase synchronisiert werden.")
    }
  }

  const unregisterPlayer = async (playerId: string) => {
    if (centralEventId) {
      alert("Die Teilnehmer dieses Turniers werden zentral verwaltet. Bitte in der Turnier-Zentrale ändern.")
      return
    }
    const nextPlayers = registeredPlayers.filter((player) => player.player_id !== playerId)
    setRegisteredPlayers(nextPlayers)
    saveLocalBackup({ registeredPlayers: nextPlayers })

    if (!draftTournamentId || !navigator.onLine) return

    const { error } = await supabase
      .from("survival_players")
      .delete()
      .eq("tournament_id", draftTournamentId)
      .eq("player_id", playerId)

    if (error) {
      console.error("[Survival] Spieler konnte nicht entfernt werden:", error)
    }
  }

  const clearRegistration = async () => {
    if (centralEventId) {
      setShowClearRegistration(false)
      alert("Die Teilnehmer dieses Turniers werden zentral verwaltet. Bitte in der Turnier-Zentrale ändern.")
      return
    }
    if (startingTournament || registeredPlayers.length === 0) return

    if (!draftTournamentId) {
      alert("Turnier-Draft ist noch nicht bereit.")
      return
    }

    if (!navigator.onLine) {
      alert("Keine Internetverbindung. Registrierung wird erst online geleert, damit Supabase und die Anzeige identisch bleiben.")
      return
    }

    setStartingTournament(true)

    try {
      const { error } = await supabase
        .from("survival_players")
        .delete()
        .eq("tournament_id", draftTournamentId)

      if (error) throw error

      setRegisteredPlayers([])
      setSelectedPlayers(new Set())
      saveLocalBackup({ registeredPlayers: [] })
      setShowClearRegistration(false)
    } catch (error) {
      console.error("[Survival] Registrierung leeren fehlgeschlagen:", error)
      alert("Registrierung konnte nicht geleert werden.")
    } finally {
      setStartingTournament(false)
    }
  }

  const startTournament = async () => {
    if (!user || !canStart || startingTournament) return

    if (!navigator.onLine) {
      alert("Zum Starten des Turniers wird kurz eine Internetverbindung benötigt. Deine Teilnehmer sind lokal gesichert.")
      return
    }

    if (!draftTournamentId) {
      alert("Turnier-Draft ist noch nicht bereit.")
      return
    }

    setStartingTournament(true)

    try {
      // A central event must use its current roster, not a stale browser snapshot.
      if (centralEventId) {
        const { data: currentRegistrations, error: registrationsError } = await supabase
          .from("central_tournament_registrations")
          .select("player_id")
          .eq("event_id", centralEventId)
          .eq("status", "registered")
        if (registrationsError) throw registrationsError
        const currentIds = new Set((currentRegistrations || []).map((row: any) => String(row.player_id)))
        const localIds = new Set(registeredPlayers.map((player) => player.player_id))
        if (currentIds.size !== localIds.size || [...currentIds].some((id) => !localIds.has(id))) {
          alert("Die Anmeldungen im angelegten Turnier haben sich geändert. Bitte die Survival-Seite neu öffnen, damit niemand falsch eingeteilt wird.")
          return
        }
      }

      // Ensure every locally visible player is also persisted before start.
      const { error: syncPlayersError } = await supabase
        .from("survival_players")
        .upsert(
          registeredPlayers.map((player) => ({
            tournament_id: draftTournamentId,
            player_id: player.player_id,
            player_name: player.player_name,
            active: true,
          })),
          { onConflict: "tournament_id,player_id" },
        )

      if (syncPlayersError) throw syncPlayersError

      const { error: tournamentError } = await supabase
        .from("survival_tournaments")
        .update({
          name: tournamentName.trim() || "Survival Roulette",
          status: "draft",
          current_stage: 1,
          machine_count: machineCount,
          rounds_per_stage: 2,
          win_points: 3,
          close_loss_points: 1,
          loss_points: 0,
          legs_to_win: legsToWin,
          updated_at: new Date().toISOString(),
        })
        .eq("id", draftTournamentId)
        .eq("created_by", user.id)
        .eq("status", "draft")

      if (tournamentError) throw tournamentError

      // Rebuild cut plan atomically enough for a draft: delete stale plan, insert current route.
      const { error: deleteCutsError } = await supabase
        .from("survival_stage_cuts")
        .delete()
        .eq("tournament_id", draftTournamentId)

      if (deleteCutsError) throw deleteCutsError

      const cuts = route.map((startingPlayers, index) => ({
        tournament_id: draftTournamentId,
        stage_no: index + 1,
        starting_players: startingPlayers,
        qualifying_players: route[index + 1] ?? 4,
        rounds_planned: startingPlayers === 4 ? 3 : 2,
        status: index === 0 ? "active" : "pending",
      }))

      const { error: cutsError } = await supabase
        .from("survival_stage_cuts")
        .insert(cuts)

      if (cutsError) throw cutsError

      saveLocalBackup({
        tournamentName: tournamentName.trim() || "Survival Roulette",
        machineCount,
        registeredPlayers,
        draftTournamentId,
      })

      router.push(`/admin/survival-roulette/${draftTournamentId}`)
    } catch (error) {
      console.error("[Survival] Turnier konnte nicht vorbereitet werden:", error)
      alert("Survival Roulette konnte nicht vorbereitet werden. Die lokale Sicherung bleibt erhalten.")
    } finally {
      setStartingTournament(false)
    }
  }


  useEffect(() => {
    if (!draftTournamentId || !user || !navigator.onLine) return

    const timer = window.setTimeout(async () => {
      const { error } = await supabase
        .from("survival_tournaments")
        .update({
          name: tournamentName.trim() || "Survival Roulette",
          machine_count: machineCount,
          updated_at: new Date().toISOString(),
        })
        .eq("id", draftTournamentId)
        .eq("created_by", user.id)
        .eq("status", "draft")

      if (error) {
        console.error("[Survival] Draft-Einstellungen konnten nicht gespeichert werden:", error)
      }
    }, 350)

    return () => window.clearTimeout(timer)
  }, [draftTournamentId, tournamentName, machineCount, user])

  const sharedAvailablePlayers: TournamentRegistrationAvailablePlayer[] = availablePlayers
    .filter((player) => !registeredPlayers.some((registered) => registered.player_id === String(player.id)))
    .map((player) => ({
      id: String(player.id),
      name: player.name,
      eligible: true,
    }))

  const sharedRegisteredPlayers: TournamentRegistrationRegisteredPlayer[] = registeredPlayers.map((player) => ({
    id: player.player_id,
    name: player.player_name,
  }))

  if (authLoading || adminLoading || loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Header />
      </div>
    )
  }

  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Header />
        <div className="pt-24 text-center font-bold text-slate-700">
          Zugriff verweigert
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#080a10] text-white">
      <Header />

      <TournamentAdminNav
        title="Survival Roulette"
        description="Teilnehmer registrieren und Survival Roulette starten."
      />

      <div className="mx-auto w-full max-w-[1600px] px-4 py-5 sm:px-6 xl:px-10 2xl:px-12">
        <div className="mb-5 flex flex-col gap-3 rounded-[28px] border border-orange-500/25 bg-gradient-to-br from-[#21130f] via-[#16151a] to-[#090c14] px-6 py-6 text-white shadow-[0_18px_55px_-42px_rgba(15,23,42,.9)] sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <div className="text-[11px] font-black uppercase tracking-[0.2em] text-orange-300">
              Turnier Setup
            </div>
            <div className="mt-1 text-xl font-black sm:text-2xl">
              Teilnehmer & Turnierstart
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs font-bold sm:text-sm">
            <span className="rounded-full border border-white/10 bg-[#11151e]/10 px-3 py-1.5">
              {registeredPlayers.length} registriert
            </span>

            <span
              className={`rounded-full border px-3 py-1.5 ${
                canStart
                  ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200"
                  : "border-orange-400/30 bg-orange-400/10 text-orange-200"
              }`}
            >
              {canStart ? "Setup bereit" : "Setup offen"}
            </span>
            <span
              className={`rounded-full border px-3 py-1.5 ${
                validPlayerCount
                  ? "border-emerald-300/40 bg-emerald-400/15 text-emerald-100"
                  : "border-orange-500/35/30 bg-orange-400/10 text-orange-100"
              }`}
            >
              {validPlayerCount
                ? `${registeredPlayers.length} Spieler · STARTBEREIT`
                : `${registeredPlayers.length} Spieler · noch nicht startbereit`}
            </span>
            <span className={`rounded-full border px-3 py-1.5 ${isOnline ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200" : "border-amber-400/30 bg-amber-400/10 text-amber-200"}`}>
              {isOnline ? "Online · gespeichert" : "Offline · lokal gesichert"}
            </span>
          </div>
        </div>

        <div className="mb-6 overflow-hidden rounded-[28px] border border-white/10 bg-[#11151e] p-5 shadow-[0_18px_55px_-42px_rgba(15,23,42,.45)] sm:p-5 lg:p-7">
          <div className="grid gap-5 xl:grid-cols-2 xl:gap-5">
            <div>
              <div className="mb-4 flex items-center gap-3">
                <Trophy className="h-6 w-6 text-orange-400" />
                <h3 className="text-xl font-bold text-white">
                  Turniername
                </h3>
                <span className="font-bold text-red-500">*</span>
              </div>

              <input
                type="text"
                value={tournamentName}
                onChange={(event) => setTournamentName(event.target.value)}
                placeholder="z.B. Survival Roulette"
                maxLength={100}
                className="h-12 w-full rounded-2xl border border-white/10 bg-[#10131b] px-4 text-base font-semibold text-white shadow-none outline-none transition focus:border-orange-400 focus:bg-[#161b25] focus:ring-4 focus:ring-orange-500/20"
              />

              <p className="mt-2 text-sm text-slate-400">Pflichtfeld!</p>
            </div>

            <div>
              <div className="mb-4 flex items-center gap-3">
                <Flame className="h-6 w-6 text-orange-400" />
                <h3 className="text-xl font-bold text-white">
                  Survival Modus
                </h3>
              </div>

              <div className="mb-4 rounded-2xl border border-orange-500/25 bg-[#11151e] p-4">
                <label htmlFor="survival-best-of" className="mb-2 block text-sm font-black text-white">Legs pro Match</label>
                <select id="survival-best-of" value={legsToWin} disabled={startingTournament}
                  onChange={(event) => setLegsToWin(Number(event.target.value) as 2 | 3 | 4)}
                  className="w-full rounded-xl border border-white/15 bg-[#11151e] px-3 py-3 font-bold text-white">
                  <option value={2}>Best of 3 – 2 Legs zum Sieg</option>
                  <option value={3}>Best of 5 – 3 Legs zum Sieg</option>
                  <option value={4}>Best of 7 – 4 Legs zum Sieg</option>
                </select>
              </div>
              <div className="grid gap-2 sm:grid-cols-3">
                <div className="rounded-2xl border border-orange-500/35 bg-orange-500/10 p-4">
                  <div className="text-sm font-black text-white">
                    2 Runden
                  </div>
                  <div className="mt-1 text-xs font-medium leading-4 text-slate-400">
                    Mindestens 2 Spiele pro Stage vor dem Cut
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[.04] p-4">
                  <div className="text-sm font-black text-white">
                    Best of {legsToWin * 2 - 1}
                  </div>
                  <div className="mt-1 text-xs font-medium leading-4 text-slate-400">
                    {legsToWin} Legs zum Sieg
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[.04] p-4">
                  <div className="text-sm font-black text-white">
                    Punktewertung
                  </div>
                  <div className="mt-1 text-xs font-medium leading-4 text-slate-400">
                    Sieg 3 · knappe Niederlage 1 · deutliche Niederlage 0 Punkte
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <label className="mb-2 block text-sm font-bold text-white">
                  Anzahl Automaten
                </label>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={machineCount}
                  onChange={(event) => {
                    const value = Number(event.target.value)
                    setMachineCount(Number.isFinite(value) ? Math.max(1, Math.min(50, value)) : 1)
                  }}
                  className="h-12 w-full rounded-2xl border border-white/10 bg-[#10131b] px-4 text-base font-semibold text-white shadow-none outline-none transition focus:border-orange-400 focus:bg-[#161b25] focus:ring-4 focus:ring-orange-500/20"
                />
                <p className="mt-2 text-sm text-slate-400">
                  Wie viele Automaten stehen für dieses Turnier zur Verfügung?
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-white/10 bg-[#10131b] px-4 py-3.5">
            {tournamentFormCompleted ? (
              <p className="flex items-center gap-2 font-semibold text-green-600">
                <span className="h-2 w-2 rounded-full bg-green-600" />
                ✓ Formular vollständig – Du kannst jetzt Spieler registrieren
              </p>
            ) : (
              <p className="flex items-center gap-2 font-semibold text-orange-400">
                <AlertCircle className="h-4 w-4" />
                Bitte Turniername und Automatenanzahl vollständig festlegen
              </p>
            )}
          </div>
        </div>

        {registeredPlayers.length > 0 && (
          <div className="mb-6 overflow-hidden rounded-[28px] border border-orange-500/25 bg-gradient-to-br from-orange-50 via-white to-amber-50/50 p-5 shadow-[0_18px_55px_-42px_rgba(15,23,42,.45)] sm:p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h3 className="text-xl font-bold text-white">
                  Turnier bereit zum Starten
                </h3>

                <p className="mt-1 text-slate-400">
                  {registeredPlayers.length} Spieler registriert
                </p>

                {route.length > 0 ? (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {route.map((count, index) => (
                      <div
                        key={`${count}-${index}`}
                        className="flex items-center gap-2"
                      >
                        <span className="rounded-full border border-orange-500/25 bg-[#11151e] px-3 py-1 text-xs font-black text-slate-200">
                          {index === 0
                            ? `${count} Start`
                            : index === route.length - 1
                              ? `Final ${count}`
                              : `Top ${count}`}
                        </span>

                        {index < route.length - 1 ? (
                          <span className="font-black text-orange-400">→</span>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mt-3 flex items-center gap-2 text-sm font-bold text-amber-700">
                    <AlertCircle className="h-4 w-4" />
                    Teilnehmerzahl muss durch 4 teilbar sein.
                  </div>
                )}
              </div>

              <button
                onClick={startTournament}
                disabled={!canStart || startingTournament}
                className={`flex items-center justify-center gap-2 rounded-lg px-6 py-3 font-bold transition-colors ${
                  canStart && !startingTournament
                    ? "bg-orange-500/100 text-white hover:bg-orange-600"
                    : "cursor-not-allowed bg-gray-300 text-slate-400"
                }`}
              >
                <Play className="h-5 w-5" />
                {startingTournament
                  ? "Starte..."
                  : "Survival Roulette starten"}
              </button>
            </div>
          </div>
        )}

        <TournamentRegistrationPanel
          availablePlayers={sharedAvailablePlayers}
          registeredPlayers={sharedRegisteredPlayers}
          selectedIds={selectedPlayers}
          onToggleSelected={togglePlayer}
          searchTerm={searchTerm}
          onSearchTermChange={setSearchTerm}
          loading={loading}
          canRegister={tournamentFormCompleted}
          disabledNotice={
            tournamentFormCompleted
              ? null
              : "Bitte zuerst Turniername und Automatenanzahl vollständig festlegen."
          }
          onRegister={registerSelectedPlayers}
          showEligibilityFilters={false}
          showPaid={false}
          registeredSubtitle="Für Survival Roulette vorgemerkt"
          onRemove={unregisterPlayer}
          onClearAll={() => setShowClearRegistration(true)}
          clearAllLabel="Registrierung leeren"
        />

        {registeredPlayers.length > 0 ? (
          <div
            className={`mt-4 rounded-2xl border px-4 py-3 text-sm font-semibold ${
              validPlayerCount
                ? "border-emerald-300/20 bg-emerald-500/[0.08] text-emerald-200"
                : "border-orange-500/35/20 bg-orange-500/100/[0.08] text-orange-200"
            }`}
          >
            <div className="flex items-center gap-2">
              {validPlayerCount ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              {validPlayerCount
                ? `${registeredPlayers.length} Spieler – Turnier kann gestartet werden.`
                : `${registeredPlayers.length} Spieler – die Teilnehmerzahl muss durch 4 teilbar sein.`}
            </div>
          </div>
        ) : null}
      </div>

      {showClearRegistration ? (
        <div className="fixed inset-0 z-[165] grid place-items-center bg-[#131720]/65 p-4 backdrop-blur-md">
          <div className="w-full max-w-md overflow-hidden rounded-[26px] border border-white/10 bg-[#11151e] shadow-[0_30px_100px_-35px_rgba(15,23,42,.75)]">
            <div className="border-b border-slate-100 px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-rose-100 text-rose-600"><Trash2 className="h-5 w-5" /></div>
                <div>
                  <h3 className="text-base font-black text-white">Registrierung leeren?</h3>
                  <p className="mt-1 text-sm font-medium text-slate-400">{registeredPlayers.length} Spieler sind aktuell vorgemerkt.</p>
                </div>
              </div>
            </div>
            <div className="p-5">
              <p className="text-sm font-medium leading-5 text-slate-300">Alle aktuell registrierten Spieler werden aus diesem Turnier entfernt. Turniername und Automatenanzahl bleiben erhalten.</p>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <button type="button" onClick={() => setShowClearRegistration(false)} disabled={startingTournament} className="rounded-xl border border-white/10 bg-[#11151e] px-4 py-3 font-black text-slate-200 hover:bg-[#11151e] disabled:opacity-40">Abbrechen</button>
                <button type="button" onClick={() => void clearRegistration()} disabled={startingTournament} className="rounded-xl bg-rose-600 px-4 py-3 font-black text-white hover:bg-rose-700 disabled:opacity-50">{startingTournament ? "Wird geleert..." : "Alle entfernen"}</button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {notice ? (
        <div className="fixed inset-0 z-[170] grid place-items-center bg-[#131720]/65 p-4 backdrop-blur-md">
          <div className="w-full max-w-md overflow-hidden rounded-[26px] border border-white/10 bg-[#11151e] shadow-[0_30px_100px_-35px_rgba(15,23,42,.7)]">
            <div className="px-6 pb-2 pt-6 text-center">
              <div className={`mx-auto grid h-12 w-12 place-items-center rounded-2xl ${
                notice.tone === "error" ? "bg-rose-100 text-rose-600" :
                notice.tone === "warning" ? "bg-amber-100 text-amber-600" :
                "bg-sky-100 text-sky-600"
              }`}>
                <AlertCircle className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-base font-black text-white">{notice.title}</h3>
              <p className="mt-2 whitespace-pre-line text-sm font-medium leading-6 text-slate-400">{notice.message}</p>
            </div>
            <div className="p-5 pt-4">
              <button type="button" onClick={() => setNotice(null)} className="w-full rounded-xl bg-[#131720] px-5 py-3 font-black text-white hover:bg-orange-500">OK</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
