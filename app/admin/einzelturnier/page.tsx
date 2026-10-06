"use client"

import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { EinzelturnierSetup } from "@/app/admin/_komponenten/turniere/einzelturnier/einzelturnier-setup"

export default function AdminEinzelturnierPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-[#05070a] p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-[1600px] space-y-4">
        <button
          type="button"
          onClick={() => router.push("/admin/turnier_spieltage_starten")}
          className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/[0.08] bg-[#0b0d11] px-4 text-sm font-black text-white/65 transition hover:border-orange-300/20 hover:bg-orange-500/[0.06] hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Turniertage
        </button>

        <EinzelturnierSetup />
      </div>
    </div>
  )
}
