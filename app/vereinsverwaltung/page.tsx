"use client"

import { useEffect, useState } from "react"
import { ClubPlayerTeamManagement } from "@/components/vereinsverwaltung/ClubPlayerTeamManagement"
import { supabase } from "@/lib/supabase"
import type { User } from "@supabase/supabase-js"

export default function VereinsverwaltungPage() {
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user ?? null))
  }, [])

  return (
    <div className="p-6">
      <ClubPlayerTeamManagement user={user} onDataSaved={() => {}} />
    </div>
  )
}
