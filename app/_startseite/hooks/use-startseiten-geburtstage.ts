"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import type { BirthdayPlayer } from "@/app/_startseite/typen"

export function useStartseitenGeburtstage() {
  const [birthdayPlayers, setBirthdayPlayers] = useState<BirthdayPlayer[]>([])
  const [birthdayLoading, setBirthdayLoading] = useState(true)

  useEffect(() => {
    const loadTodayBirthdays = async () => {
      try {
        setBirthdayLoading(true)

        const today = new Date()
        const todayMonth = String(today.getMonth() + 1).padStart(2, "0")
        const todayDay = String(today.getDate()).padStart(2, "0")

        const { data, error } = await supabase
          .from("club_players")
          .select("id, name, birthdate")
          .not("birthdate", "is", null)

        if (error) throw error

        const birthdays =
          (data || [])
            .filter((player: any) => {
              if (!player.birthdate || !player.name) return false

              const birthdate = String(player.birthdate).slice(0, 10)
              const parts = birthdate.split("-")

              if (parts.length !== 3) return false

              const month = parts[1]
              const day = parts[2]

              return month === todayMonth && day === todayDay
            })
            .map((player: any) => {
              const birthdate = String(player.birthdate).slice(0, 10)
              const birthYear = Number(birthdate.split("-")[0])
              const currentYear = today.getFullYear()

              return {
                id: String(player.id),
                name: String(player.name),
                birthdate,
                age: Number.isFinite(birthYear) ? currentYear - birthYear : null,
              }
            })
            .sort((a: BirthdayPlayer, b: BirthdayPlayer) =>
              a.name.localeCompare(b.name, "de"),
            )

        setBirthdayPlayers(birthdays)
      } catch (error) {
        console.error("Error loading birthdays:", error)
        setBirthdayPlayers([])
      } finally {
        setBirthdayLoading(false)
      }
    }

    loadTodayBirthdays()
  }, [])

  return {
    birthdayPlayers,
    birthdayLoading,
  }
}
