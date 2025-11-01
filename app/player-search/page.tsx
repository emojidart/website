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
      <div className="min-h-screen bg-white text-gray-900 font-sans flex flex-col">
        <Header />
        <main className="flex-grow flex items-center justify-center p-8">
          <div className="text-center text-destructive">
            <AlertCircle className="h-12 w-12 mx-auto mb-4" />
            <h1 className="text-2xl font-bold">Fehler beim Laden der Positionen</h1>
            <p className="text-lg">Bitte versuchen Sie es später erneut.</p>
          </div>
        </main>
      </div>
    )
  }

  const recruitmentNeeds: RecruitmentNeed[] = recruitmentData || []

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans pb-20 md:pb-0">
      <Header />

      <main className="pt-8 pb-24">
        <div className="container mx-auto px-4 md:px-6 py-8">
          <div className="text-center mb-12">
            <div className="bg-gradient-to-br from-orange-500 to-orange-700 rounded-2xl shadow-xl border border-orange-200 p-8 md:p-12 text-white">
              <div className="bg-white/10 rounded-full p-4 w-20 h-20 mx-auto mb-6 backdrop-blur-sm">
                <Users className="h-12 w-12 text-white mx-auto" />
              </div>
              <h1 className="text-4xl md:text-6xl font-extrabold uppercase leading-none tracking-tighter mb-4">
                <span className="block text-white">OFFENE</span>
                <span className="block text-orange-200">POSITIONEN</span>
              </h1>
              <p className="text-lg md:text-xl font-bold uppercase text-orange-100 mb-4">
                Wir suchen talentierte Darts-Spieler für unsere Teams
              </p>
              <div className="bg-orange-600/30 rounded-xl p-4 text-orange-100">
                <p className="text-sm italic">Bewirb dich jetzt und werde Teil unseres Teams!</p>
              </div>
            </div>
          </div>

          <RecruitmentGallery recruitmentNeeds={recruitmentNeeds} />
        </div>
      </main>

      <MobileBottomNav />
    </div>
  )
}
