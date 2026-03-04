"use client"

import { Header } from "@/components/header"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"
import { Scale } from "lucide-react"
import { motion } from "framer-motion"

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05, delayChildren: 0.05 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 120, damping: 15 } },
}

export default function ImpressumPage() {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 pb-20 overflow-x-hidden">
      <Header />

     <main className="pt-12 sm:pt-14">
  <motion.div
    className="mx-auto w-full px-4 py-6 sm:py-8 max-w-2xl lg:max-w-screen-xl 2xl:max-w-screen-2xl"
    variants={containerVariants}
    initial="hidden"
    animate="visible"
  >
          {/* App Header Card */}
          <motion.div variants={itemVariants} className="mb-6">
            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
              <div className="h-2 bg-gradient-to-r from-orange-500 to-orange-600" />
              <div className="p-4 flex items-start gap-3">
                <div className="w-11 h-11 rounded-2xl bg-orange-50 border border-orange-200 flex items-center justify-center flex-shrink-0">
                  <Scale className="w-5 h-5 text-orange-600" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-base sm:text-lg font-black">Impressum</h1>
                  <p className="text-sm text-gray-600 mt-1">
                    Angaben gemäß E-Commerce-Gesetz und Mediengesetz.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Content */}
          <div className="space-y-6 text-sm leading-relaxed text-gray-700">
            <Section title="Angaben gemäß § 5 ECG & Mediengesetz">
              <div className="bg-white border border-gray-200 rounded-2xl p-4 mt-3 shadow-sm">
                <p className="font-black text-gray-900">Emoj!'s Dartverein e.V.</p>
                <p>Wüstenrotstraße 30</p>
                <p>5020 Salzburg, Österreich</p>
              </div>
            </Section>

            <Section title="Vereinsvorstand">
              <div className="bg-white border border-gray-200 rounded-2xl p-4 mt-3 shadow-sm">
                <p className="text-gray-600 text-xs font-bold">Obmann</p>
                <p className="font-black text-gray-900">Bernhard Gastberger</p>
              </div>
            </Section>

            <Section title="Kontakt">
              <div className="bg-white border border-gray-200 rounded-2xl p-4 mt-3 shadow-sm space-y-2">
                <p>
                  <span className="font-bold text-gray-900">Telefon:</span> +43 660 4696464
                </p>
                <p className="break-all">
                  <span className="font-bold text-gray-900">E-Mail:</span>{" "}
                  <a href="mailto:office@emojisdartverein.com" className="text-orange-600 font-semibold">
                    office@emojisdartverein.com
                  </a>
                </p>
              </div>
            </Section>

            <Section title="Foto- & Videoaufnahmen bei Veranstaltungen">
              <p className="mt-2">
                Bei unseren Turnieren, Trainings und Vereinsveranstaltungen werden regelmäßig Foto- und Videoaufnahmen
                für Dokumentations- und Werbezwecke erstellt. Diese Aufnahmen können auf unserer Website, in sozialen
                Medien und in Vereinspublikationen veröffentlicht werden.
              </p>
              <p className="mt-3">
                Mit der Teilnahme an unseren Veranstaltungen erklären sich die Teilnehmer mit der Anfertigung und
                Veröffentlichung solcher Aufnahmen einverstanden. Sollten Sie damit nicht einverstanden sein, bitten
                wir um eine kurze Mitteilung an die oben angegebene E-Mail-Adresse. Wir entfernen die entsprechenden
                Inhalte dann umgehend.
              </p>
              <p className="mt-3">
                Alle Aufnahmen werden ausschließlich im Zusammenhang mit der Vereinstätigkeit verwendet und nicht an
                Dritte zu kommerziellen Zwecken weitergegeben.
              </p>
            </Section>

            <Section title="Haftungsausschluss">
              <SubTitle>Haftung für Inhalte</SubTitle>
              <p>
                Die Inhalte wurden mit größter Sorgfalt erstellt. Für Richtigkeit, Vollständigkeit und Aktualität kann
                jedoch keine Gewähr übernommen werden. Als Diensteanbieter sind wir nach den allgemeinen Gesetzen für
                eigene Inhalte verantwortlich, jedoch nicht verpflichtet, übermittelte oder gespeicherte fremde
                Informationen zu überwachen.
              </p>

              <SubTitle>Haftung für Links</SubTitle>
              <p>
                Unser Angebot enthält Links zu externen Webseiten Dritter, auf deren Inhalte wir keinen Einfluss haben.
                Deshalb können wir für diese fremden Inhalte keine Gewähr übernehmen. Für die Inhalte der verlinkten
                Seiten ist stets der jeweilige Anbieter/Betreiber verantwortlich.
              </p>

              <SubTitle>Urheberrecht</SubTitle>
              <p>
                Die erstellten Inhalte und Werke unterliegen dem österreichischen Urheberrecht. Vervielfältigung,
                Bearbeitung, Verbreitung und jede Art der Verwertung außerhalb der Grenzen des Urheberrechtes bedürfen
                der schriftlichen Zustimmung des jeweiligen Autors/Erstellers.
              </p>
            </Section>

            <Section title="Datenschutz">
              <p>
                Die Nutzung unserer Webseite ist in der Regel ohne Angabe personenbezogener Daten möglich. Soweit auf
                unseren Seiten personenbezogene Daten erhoben werden, erfolgt dies – soweit möglich – stets auf
                freiwilliger Basis. Diese Daten werden ohne ausdrückliche Zustimmung nicht an Dritte weitergegeben.
              </p>
              <p className="mt-3">
                Wir weisen darauf hin, dass die Datenübertragung im Internet Sicherheitslücken aufweisen kann. Ein
                lückenloser Schutz vor Zugriffen durch Dritte ist nicht möglich. Weitere Infos findest du in der
                Datenschutzerklärung.
              </p>
            </Section>
          </div>
        </motion.div>
      </main>

      <MobileBottomNav />
    </div>
  )
}

/* Helper Components */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <motion.section variants={itemVariants}>
      <h2 className="text-base sm:text-lg font-black text-gray-900 mb-2">{title}</h2>
      <div className="text-gray-700">{children}</div>
    </motion.section>
  )
}

function SubTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="font-bold text-gray-900 mt-4 mb-1">{children}</h3>
}