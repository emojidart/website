"use client"

import { Header } from "@/components/header"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"
import { Scale } from "lucide-react"
import { motion } from "framer-motion"

const containerVariants = {
  hidden: { opacity: 1 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05, delayChildren: 0.05 },
  },
}

const itemVariants = {
  hidden: { opacity: 1, y: 0 },
  visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 120, damping: 15 } },
}

export default function ImpressumPage() {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#050608] text-white font-sans">
      <Header />

      {/* Stabiler Hintergrund wie im Member-Profil – ohne Fade/Flackern */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-[#050608]">
        <div
          className="absolute inset-0 bg-cover bg-[66%_50%] bg-no-repeat opacity-[0.34]"
          style={{ backgroundImage: "url('/terminal/hero-startscreen.png')" }}
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(3,5,8,.68),rgba(3,5,9,.93)_46%,rgba(2,4,7,.98))]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_8%_18%,rgba(249,115,22,.18),transparent_26%),radial-gradient(circle_at_88%_30%,rgba(14,165,233,.14),transparent_28%),radial-gradient(circle_at_55%_82%,rgba(99,102,241,.09),transparent_24%)]" />
      </div>

     <main className="relative z-10 mx-auto w-full max-w-[1680px] px-3 pb-28 pt-16 sm:px-5 sm:pt-20 lg:px-7 lg:pb-14 xl:px-8">
  <motion.div
    className="w-full"
    variants={containerVariants}
    initial={false}
    animate="visible"
  >
          {/* App Header Card */}
          <motion.div variants={itemVariants} className="mb-4 sm:mb-5">
            <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-black/35 shadow-[0_35px_120px_-55px_rgba(0,0,0,.95)] backdrop-blur-2xl sm:rounded-[34px]">
              <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,rgba(249,115,22,.08),transparent_34%,rgba(14,165,233,.06)_78%,transparent)]" />
              <div className="relative flex items-start gap-4 p-4 sm:p-6 lg:p-8 xl:p-9">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/10">
                  <Scale className="h-5 w-5 text-orange-300" />
                </div>
                <div className="min-w-0">
                  <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.22em] text-white/55"><span className="h-2 w-2 rounded-full bg-orange-400" />Rechtliches · Verein</div>
                  <h1 className="text-3xl font-black tracking-[-0.04em] text-white sm:text-4xl lg:text-5xl">Impressum</h1>
                  <p className="mt-2 text-sm font-medium text-white/55">Angaben gemäß E-Commerce-Gesetz und Mediengesetz.</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Content */}
          <div className="space-y-5 text-sm leading-relaxed text-white/65">
            <Section title="Angaben gemäß § 5 ECG & Mediengesetz">
              <div className="mt-3 rounded-[20px] border border-white/10 bg-white/5 p-4 shadow-[0_18px_55px_-44px_rgba(0,0,0,.95)]">
                <p className="font-black text-white">Emoj!'s Dartverein e.V.</p>
                <p>Wüstenrotstraße 30</p>
                <p>5020 Salzburg, Österreich</p>
              </div>
            </Section>

            <Section title="Vereinsvorstand">
              <div className="mt-3 rounded-[20px] border border-white/10 bg-white/5 p-4 shadow-[0_18px_55px_-44px_rgba(0,0,0,.95)]">
                <p className="text-xs font-bold text-white/35">Obmann</p>
                <p className="font-black text-white">Bernhard Gastberger</p>
              </div>
            </Section>

            <Section title="Kontakt">
              <div className="mt-3 rounded-[20px] border border-white/10 bg-white/5 p-4 shadow-[0_18px_55px_-44px_rgba(0,0,0,.95)] space-y-2">
                <p>
                  <span className="font-bold text-white">Telefon:</span> +43 660 4696464
                </p>
                <p className="break-all">
                  <span className="font-bold text-white">E-Mail:</span>{" "}
                  <a href="mailto:office@emojisdartverein.com" className="text-orange-300 font-semibold">
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
    <motion.section variants={itemVariants} className="rounded-[22px] border border-white/10 bg-black/25 p-4 shadow-[0_20px_70px_-52px_rgba(0,0,0,.95)] backdrop-blur-xl sm:p-5">
      <h2 className="text-base sm:text-lg font-black text-white mb-2">{title}</h2>
      <div className="text-white/65">{children}</div>
    </motion.section>
  )
}

function SubTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="font-bold text-white mt-4 mb-1">{children}</h3>
}