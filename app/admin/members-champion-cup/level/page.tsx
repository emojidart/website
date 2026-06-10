"use client"

import { Header } from "@/components/header"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"
import { AdminMembersLevelManagement } from "@/components/admin/members-champion-cup/admin-members-level-management"
import { Card, CardContent, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/hooks/use-auth"
import { Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"

export default function AdminMembersChampionCupLevelPage() {
  const { user, isAdmin, loading: authLoading, adminLoading } = useAuth()
  const router = useRouter()

  if (authLoading || adminLoading) {
    return (
      <div className="min-h-screen bg-gray-50 text-gray-900 pb-24 md:pb-0">
        <Header />
        <main className="pt-20 px-4">
          <div className="mx-auto max-w-md rounded-2xl border border-gray-200 bg-white shadow-sm p-6 flex items-center gap-3">
            <Loader2 className="w-5 h-5 animate-spin text-orange-600" />
            <p className="text-gray-700 font-medium">Lade Adminbereich...</p>
          </div>
        </main>
        <MobileBottomNav />
      </div>
    )
  }

  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 text-gray-900 pb-24 md:pb-0">
        <Header />
        <main className="pt-20 px-4">
          <Card className="mx-auto w-full max-w-md p-6 shadow-lg rounded-2xl">
            <CardTitle className="text-2xl font-bold text-center mb-6">Zugriff verweigert</CardTitle>
            <CardContent className="text-center space-y-4">
              <p className="text-gray-700">Du benötigst Admin-Rechte, um die Members Champion Cup Einstufung zu bearbeiten.</p>
              <Button onClick={() => router.push("/admin")} className="w-full rounded-xl">
                Zurück zur Admin-Seite
              </Button>
            </CardContent>
          </Card>
        </main>
        <MobileBottomNav />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans pb-24 md:pb-0">
      <Header />
      <main className="pt-16 sm:pt-14">
        <div className="mx-auto w-full px-4 py-6 sm:py-8 max-w-2xl lg:max-w-screen-xl 2xl:max-w-screen-2xl">
          <AdminMembersLevelManagement user={user} />
        </div>
      </main>
      <MobileBottomNav />
    </div>
  )
}
