"use client"

import { useState, useEffect } from "react"
import { createBrowserClient } from "@supabase/ssr"
import { Radio, ArrowRight, Users, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

interface ActiveTournament {
  tournament_id: string
  tournament_name: string
  tournament_type: string
  status: string
}

export function LiveTournamentBanner() {
  const [activeTournament, setActiveTournament] = useState<ActiveTournament | null>(null)
  const [activeMatchesCount, setActiveMatchesCount] = useState<number>(0)

  useEffect(() => {
    const loadActiveTournament = async () => {
      try {
        const { data, error } = await supabase
          .from("tournaments_status")
          .select("tournament_id, tournament_name, tournament_type, status")
          .eq("status", "active")
          .limit(1)
          .single()

        if (error) {
          setActiveTournament(null)
          return
        }

        if (data) {
          setActiveTournament(data)
          loadActiveMatches(data.tournament_id, data.tournament_type)
        }
      } catch (error) {
        setActiveTournament(null)
      }
    }

    const loadActiveMatches = async (tournamentId: string, tournamentType: string) => {
      try {
        if (tournamentType.toLowerCase().includes("dko")) {
          const { data, error } = await supabase
            .from("dko_match_states")
            .select("match_id")
            .eq("tournament_id", tournamentId)
            .not("machine_number", "is", null)
            .is("winner", null)

          if (!error && data) {
            setActiveMatchesCount(data.length)
          }
        } else if (tournamentType.toLowerCase().includes("kratzer")) {
          const { data, error } = await supabase
            .from("kratzer_matches")
            .select("id")
            .eq("tournament_id", tournamentId)
            .eq("status", "in_progress")

          if (!error && data) {
            setActiveMatchesCount(data.length)
          }
        }
      } catch (error) {
        console.error("Error loading active matches:", error)
      }
    }

    loadActiveTournament()

    const tournamentChannel = supabase
      .channel("tournament_status_changes_banner")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tournaments_status",
        },
        (payload) => {
          if (payload.eventType === "INSERT" || payload.eventType === "UPDATE") {
            const data = payload.new as any
            if (data.status === "active") {
              setActiveTournament({
                tournament_id: data.tournament_id,
                tournament_name: data.tournament_name,
                tournament_type: data.tournament_type,
                status: data.status,
              })
              loadActiveMatches(data.tournament_id, data.tournament_type)
            } else if (data.status === "cancelled" || data.status === "completed") {
              setActiveTournament(null)
              setActiveMatchesCount(0)
            }
          } else if (payload.eventType === "DELETE") {
            setActiveTournament(null)
            setActiveMatchesCount(0)
          }
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(tournamentChannel)
    }
  }, [])

  useEffect(() => {
    if (!activeTournament) return

    const matchChannel = supabase
      .channel("match_updates_banner")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: activeTournament.tournament_type.toLowerCase().includes("dko")
            ? "dko_match_states"
            : "kratzer_matches",
          filter: `tournament_id=eq.${activeTournament.tournament_id}`,
        },
        () => {
          // Reload active matches count when matches update
          loadActiveMatches(activeTournament.tournament_id, activeTournament.tournament_type)
        },
      )
      .subscribe()

    const loadActiveMatches = async (tournamentId: string, tournamentType: string) => {
      try {
        if (tournamentType.toLowerCase().includes("dko")) {
          const { data, error } = await supabase
            .from("dko_match_states")
            .select("match_id")
            .eq("tournament_id", tournamentId)
            .not("machine_number", "is", null)
            .is("winner", null)

          if (!error && data) {
            setActiveMatchesCount(data.length)
          }
        } else if (tournamentType.toLowerCase().includes("kratzer")) {
          const { data, error } = await supabase
            .from("kratzer_matches")
            .select("id")
            .eq("tournament_id", tournamentId)
            .eq("status", "in_progress")

          if (!error && data) {
            setActiveMatchesCount(data.length)
          }
        }
      } catch (error) {
        console.error("Error loading active matches:", error)
      }
    }

    return () => {
      supabase.removeChannel(matchChannel)
    }
  }, [activeTournament])

  if (!activeTournament) {
    return null
  }

  return (
    <div className="mb-6">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-orange-500 via-red-500 to-pink-600 shadow-2xl">
        {/* Animated background elements */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRjMC0yLjIxLTEuNzktNC00LTRzLTQgMS43OS00IDQgMS43OSA0IDQgNCA0LTEuNzkgNC00em0wLTMwYzAtMi4yMS0xLjc5LTQtNC00cy00IDEuNzktNCA0IDEuNzkgNCA0IDQgNC0xLjc5IDQtNHpNNiAzNGMwLTIuMjEtMS43OS00LTQtNHMtNCAxLjc5LTQgNCAxLjc5IDQgNCA0IDQtMS43OSA0LTR6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-20"></div>
        <div className="absolute top-0 right-0 w-40 h-40 bg-yellow-300 rounded-full blur-3xl opacity-20 animate-pulse"></div>
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-orange-300 rounded-full blur-3xl opacity-20 animate-pulse delay-700"></div>

        <div className="relative p-6">
          {/* Header with live indicator */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="absolute inset-0 bg-red-500 rounded-full animate-ping opacity-75"></div>
                <div className="relative flex items-center gap-2 bg-white/95 backdrop-blur-md rounded-full px-4 py-2 shadow-lg">
                  <Radio className="w-4 h-4 text-red-600 animate-pulse" />
                  <span className="text-red-600 text-sm font-black uppercase tracking-wider">Live</span>
                </div>
              </div>
              <Badge className="bg-white/20 backdrop-blur-sm text-white border-white/30 hover:bg-white/30 text-xs font-semibold">
                {activeTournament.tournament_type.replace("_", " ").toUpperCase()}
              </Badge>
            </div>

            {/* Active matches indicator */}
            {activeMatchesCount > 0 && (
              <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-3 py-1.5">
                <Zap className="w-4 h-4 text-yellow-300" />
                <span className="text-white text-sm font-bold">{activeMatchesCount}</span>
                <span className="text-white/90 text-xs font-medium">aktiv</span>
              </div>
            )}
          </div>

          {/* Tournament name */}
          <div className="mb-6">
            <h2 className="text-3xl md:text-4xl font-black text-white mb-2 leading-tight tracking-tight drop-shadow-lg">
              {activeTournament.tournament_name}
            </h2>
            <p className="text-white/90 text-sm font-medium flex items-center gap-2">
              <Users className="w-4 h-4" />
              Turnier läuft gerade
            </p>
          </div>

          {/* CTA Button */}
          <Button
            onClick={() => (window.location.href = "/live-all-app")}
            size="lg"
            className="w-full bg-white hover:bg-gray-50 text-orange-600 font-bold shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] group"
          >
            <span className="flex items-center justify-center gap-2">
              Jetzt live ansehen
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </span>
          </Button>
        </div>
      </div>
    </div>
  )
}
