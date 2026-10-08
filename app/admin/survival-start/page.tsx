"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { AlertTriangle, ArrowLeft, Loader2 } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/hooks/use-auth"

// Dieser Einstieg verwendet ausschließlich die Teilnehmer der Turnier-Zentrale.
// Die alte separate Survival-Anmeldeseite wird nicht mehr geöffnet.
function cutRoute(total: number): number[] {
  if (total < 4 || total % 4 !== 0) return []
  const result = [total]
  let current = total
  while (current > 4) {
    let next = current >= 40 ? current - 8 : current >= 20 ? current - 4 : current === 16 ? 12 : current === 12 ? 8 : 4
    next = Math.max(4, next - (next % 4))
    if (next >= current) next = current - 4
    result.push(next)
    current = next
  }
  return result
}

export default function SurvivalCentralStart() {
  const router = useRouter()
  const search = useSearchParams()
  const centralEventId = search.get("centralEventId")
  const machineParam = Number(search.get("machines"))
  const machineCount = Number.isInteger(machineParam) && machineParam >= 1 && machineParam <= 32 ? machineParam : 5
  const { user, isAdmin, loading: authLoading, adminLoading } = useAuth()
  const started = useRef(false)
  const [error, setError] = useState("")
  const [status, setStatus] = useState("Turnierdaten und Teilnehmer werden geprüft …")

  useEffect(() => {
    if (authLoading || adminLoading || !user || !isAdmin || started.current) return
    started.current = true
    const run = async () => {
      let createdId: string | null = null
      try {
        if (!centralEventId) throw new Error("Keine Turnier-ID übergeben. Bitte das Turnier in der Zentrale auswählen.")
        if (!navigator.onLine) throw new Error("Zum Turnierstart ist eine Internetverbindung erforderlich.")

        const [{ data: event, error: eventError }, { data: registrations, error: registrationsError }] = await Promise.all([
          supabase.from("central_tournament_events").select("id,title,selected_mode,status").eq("id", centralEventId).single(),
          supabase.from("central_tournament_registrations").select("player_id,player_name_snapshot,status").eq("event_id", centralEventId).eq("status", "registered").order("registered_at", { ascending: true }),
        ])
        if (eventError) throw eventError
        if (registrationsError) throw registrationsError
        if (event?.selected_mode !== "survival") throw new Error("Für dieses Turnier ist nicht Survival Roulette ausgewählt.")
        if (event?.status === "cancelled" || event?.status === "completed") throw new Error("Dieses Turnier ist bereits beendet oder abgesagt.")

        const players = (registrations || []).filter((item) => item.player_id).map((item) => ({
          player_id: String(item.player_id),
          player_name: String(item.player_name_snapshot || "Spieler"),
        }))
        if (new Set(players.map((p) => p.player_id)).size !== players.length) throw new Error("Teilnehmerliste enthält doppelte Spieler. Bitte die Anmeldungen prüfen.")
        const route = cutRoute(players.length)
        if (!route.length) throw new Error(`${players.length} Spieler angemeldet. Survival benötigt nach der aktuellen Spiellogik 4, 8, 12, 16 … Spieler. Bitte die Teilnehmer in der Turnier-Zentrale korrigieren.`)

        // Wiederaufnahme aus Supabase: geräteunabhängig und ohne neue Anmeldung.
        const { data: linked, error: linkedError } = await supabase.from("tournaments_status")
          .select("tournament_id").eq("central_event_id", centralEventId)
          .eq("tournament_type", "survival").eq("status", "active")
          .order("created_at", { ascending: false }).limit(1).maybeSingle()
        if (linkedError) throw linkedError
        if (linked?.tournament_id) {
          const { data: saved, error: savedError } = await supabase.from("survival_tournaments")
            .select("id,status").eq("id", linked.tournament_id).maybeSingle()
          if (savedError) throw savedError
          if (saved && (saved.status === "draft" || saved.status === "active")) {
            router.replace(`/admin/survival-roulette/${saved.id}?centralEventId=${encodeURIComponent(centralEventId)}`)
            return
          }
          throw new Error("Ein verknüpftes Survival-Turnier konnte nicht eindeutig wiederhergestellt werden. Bitte die Turnier-Zentrale prüfen; es wird kein neues Turnier angelegt.")
        }

        // Nur ein eigener, eindeutig diesem Central Event zugeordneter Draft.
        // Niemals den letzten beliebigen Entwurf eines Admins verwenden.
        const key = `survival_central_tournament_${centralEventId}`
        const storedId = window.localStorage.getItem(key)
        if (storedId) {
          const { data: existing, error: existingError } = await supabase.from("survival_tournaments")
            .select("id,status,created_by").eq("id", storedId).maybeSingle()
          if (existingError) throw existingError
          if (existing?.created_by === user.id) {
            if (existing.status === "active" || existing.status === "completed") {
              router.replace(`/admin/survival-roulette/${existing.id}?centralEventId=${encodeURIComponent(centralEventId)}`)
              return
            }
            if (existing.status === "draft") {
              // Altes Setup nicht stillschweigend überschreiben: Änderungen nur über zentralen Start.
              const { data: oldPlayers, error: oldError } = await supabase.from("survival_players")
                .select("player_id").eq("tournament_id", existing.id)
              if (oldError) throw oldError
              const oldSet = new Set((oldPlayers || []).map((p) => String(p.player_id)))
              const newSet = new Set(players.map((p) => p.player_id))
              if (oldSet.size !== newSet.size || [...newSet].some((id) => !oldSet.has(id))) {
                throw new Error("Die Anmeldungen wurden seit der letzten Vorbereitung verändert. Der vorhandene Survival-Entwurf bleibt unverändert. Bitte zuerst den alten Entwurf prüfen oder entfernen, um doppelte Turniere zu vermeiden.")
              }
              router.replace(`/admin/survival-roulette/${existing.id}?centralEventId=${encodeURIComponent(centralEventId)}`)
              return
            }
          }
          // Verwaiste oder fremde lokale Zuordnung niemals weiterverwenden.
          window.localStorage.removeItem(key)
        }

        setStatus("Survival-Turnier wird vorbereitet …")
        const { data: draft, error: createError } = await supabase.from("survival_tournaments").insert({
          name: String(event.title || "Survival Roulette"), status: "draft", current_stage: 1,
          machine_count: machineCount, rounds_per_stage: 2,
          win_points: 3, close_loss_points: 1, loss_points: 0, legs_to_win: 2,
          created_by: user.id,
        }).select("id").single()
        if (createError) throw createError
        createdId = String(draft.id)
        // Direkt speichern, damit ein Reload keinen zweiten Turnier-Datensatz erzeugt.
        window.localStorage.setItem(key, createdId)

        const { error: playerError } = await supabase.from("survival_players").insert(players.map((player) => ({
          tournament_id: createdId, player_id: player.player_id,
          player_name: player.player_name, active: true,
        })))
        if (playerError) throw playerError
        const { error: cutError } = await supabase.from("survival_stage_cuts").insert(route.map((count, index) => ({
          tournament_id: createdId, stage_no: index + 1,
          starting_players: count, qualifying_players: route[index + 1] ?? 4,
          rounds_planned: count === 4 ? 3 : 2, status: index === 0 ? "active" : "pending",
        })))
        if (cutError) throw cutError
        // Wie DKO: dauerhafte zentrale Zuordnung, nicht nur Browser-Storage.
        const { error: linkError } = await supabase.from("tournaments_status").insert({
          tournament_id: createdId, tournament_type: "survival",
          tournament_name: String(event.title || "Survival Roulette"),
          central_event_id: centralEventId, status: "active",
        })
        if (linkError) throw linkError
        const { error: centralError } = await supabase.from("central_tournament_events")
          .update({status: "started"}).eq("id", centralEventId)
          .in("status", ["draft", "open", "closed", "ready"])
        if (centralError) throw centralError
        router.replace(`/admin/survival-roulette/${createdId}?centralEventId=${encodeURIComponent(centralEventId)}`)
      } catch (err) {
        console.error("[Survival central start]", err)
        setError(err instanceof Error ? err.message : "Survival konnte nicht vorbereitet werden.")
      }
    }
    void run()
  }, [user, isAdmin, authLoading, adminLoading, centralEventId, router])

  return (
    <main className="min-h-screen bg-[#080b10] p-5 pt-24 text-white">
      <div className="mx-auto max-w-xl rounded-3xl border border-white/10 bg-[#111820] p-6 shadow-xl">
        <div className="text-xs font-black uppercase tracking-widest text-orange-400">Survival Roulette</div>
        <h1 className="mt-2 text-2xl font-black">Turnierstart</h1>
        {error ? (
          <div className="mt-6 flex items-start gap-3 rounded-2xl border border-orange-500/30 bg-orange-500/10 p-4 text-orange-100">
            <AlertTriangle className="mt-1 h-5 w-5 shrink-0" /> <p className="text-sm leading-6">{error}</p>
          </div>
        ) : <div className="mt-6 flex items-center gap-3 text-sm text-white/70"><Loader2 className="h-5 w-5 animate-spin text-orange-400" />{status}</div>}
        <button onClick={() => router.push("/admin/tournament-center")}
          className="mt-6 flex items-center gap-2 rounded-xl border border-white/20 px-4 py-3 text-sm font-bold hover:bg-white/10">
          <ArrowLeft className="h-4 w-4" /> Zur Turnier-Zentrale
        </button>
      </div>
    </main>
  )
}
