import { Header } from "@/components/header"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"
import { createServerClient } from "@/lib/supabase/server"
import { AlertCircle, Users } from "lucide-react"
import { RecruitmentGallery } from "@/components/recruitment-gallery"

interface RecruitmentNeed {
  id: string
  team_name: string
  league: string
  start_date: string
  description: string | null
  created_at: string
}

export default async function PlayerSearchPage() {
  const supabase = createServerClient()

  const { data: recruitmentData, error: recruitmentError } = await supabase
    .from("player_recruitment_needs")
    .select("*")
    .order("created_at", { ascending: false })

  if (recruitmentError) {
    return (
      <div className="min-h-screen bg-gray-50 text-gray-900 font-sans flex flex-col pb-20 md:pb-0">
        <Header />
        <main className="flex-grow flex items-center justify-center p-8">
          <div className="text-center text-destructive">
            <AlertCircle className="h-12 w-12 mx-auto mb-4" />
            <h1 className="text-2xl font-bold">Fehler beim Laden der Positionen</h1>
            <p className="text-lg">Bitte versuchen Sie es später erneut.</p>
          </div>
        </main>
        <MobileBottomNav />
      </div>
    )
  }

  const recruitmentNeeds: RecruitmentNeed[] = recruitmentData || []

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans pb-20 md:pb-0">
      <Header />

     <main className="pt-16 sm:pt-14 pb-24">
  <div className="mx-auto w-full px-4 py-6 sm:py-8 max-w-2xl lg:max-w-screen-xl 2xl:max-w-screen-2xl">
          {/* App-like header card */}
          <div className="mb-4 rounded-2xl border border-gray-200/70 bg-white shadow-md ring-1 ring-black/5">
            <div className="p-4 sm:p-6">
              <div className="flex items-start gap-4">
                <div className="shrink-0 rounded-2xl bg-orange-600 text-white p-3 shadow-sm">
                  <Users className="w-6 h-6" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-orange-50 text-orange-700 border border-orange-100">
                    Recruitment
                  </div>

                  <h1 className="mt-2 text-xl sm:text-2xl font-black leading-tight">
                    Offene Positionen
                  </h1>

                  <p className="mt-1 text-sm text-gray-600">
                    Wir suchen Spieler für unsere Teams. Tippe rein und melde dich.
                  </p>

                  <div className="mt-3 inline-flex items-center gap-2 text-xs text-gray-600">
                    <span className="font-semibold text-gray-900">{recruitmentNeeds.length}</span>
                    <span>Eintrag(e) verfügbar</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="rounded-2xl border border-gray-200/70 bg-white shadow-sm ring-1 ring-black/5">
            <div className="p-3 sm:p-4">
              <RecruitmentGallery recruitmentNeeds={recruitmentNeeds} />
            </div>
          </div>
        </div>
      </main>

      <MobileBottomNav />
    </div>
  )
}