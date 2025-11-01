"use client"

import { Header } from "@/components/header"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"
import { Scale } from "lucide-react"
import { motion } from "framer-motion"

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100, damping: 12 } },
}

export default function ImpressumPage() {
  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans">
      <Header />
      <main className="pt-8 pb-24">
        <motion.div
          className="container mx-auto px-4 md:px-6 py-8"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.div variants={itemVariants} className="text-center mb-12">
            <div className="bg-gradient-to-br from-orange-500 to-orange-700 rounded-2xl shadow-xl border border-orange-200 p-8 md:p-12 text-white">
              <div className="bg-white/10 rounded-full p-4 w-20 h-20 mx-auto mb-6 backdrop-blur-sm">
                <Scale className="h-12 w-12 text-white mx-auto" />
              </div>
              <h1 className="text-4xl md:text-6xl font-extrabold uppercase leading-none tracking-tighter mb-4">
                <span className="block text-white">IMPRESSUM</span>
              </h1>
              <p className="text-lg md:text-xl font-bold uppercase text-orange-100 mb-4">
                Angaben gemäß E-Commerce-Gesetz und Mediengesetz
              </p>
              <div className="bg-orange-600/30 rounded-xl p-4 text-orange-100">
                <p className="text-sm italic">Rechtliche Informationen zum Verein</p>
              </div>
            </div>
          </motion.div>

          <div className="space-y-8 text-foreground/80">
            <section>
              <h2 className="text-2xl font-semibold mb-4 text-foreground">
                Angaben gemäß § 5 E-Commerce-Gesetz (ECG) und Mediengesetz
              </h2>
              <p className="leading-relaxed">
                Emoj!'s Dartverein e.V.
                <br />
                Wüstenrotstraße 30
                <br />
                5020 Salzburg, Österreich
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-foreground">Vereinsvorstand</h2>
              <p className="leading-relaxed">Obmann: Bernhard Gastberger</p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-foreground">Kontakt</h2>
              <p className="leading-relaxed">
                Telefon: +436604696464
                <br />
                E-Mail: office@emojisdartverein.com
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-foreground">
                Foto- und Videoaufnahmen bei Veranstaltungen
              </h2>
              <p className="leading-relaxed mb-4">
                Bei unseren Turnieren, Trainings und Vereinsveranstaltungen werden regelmäßig Foto- und Videoaufnahmen
                für Dokumentations- und Werbezwecke erstellt. Diese Aufnahmen können auf unserer Website, in sozialen
                Medien und in Vereinspublikationen veröffentlicht werden.
              </p>
              <p className="leading-relaxed mb-4">
                Mit der Teilnahme an unseren Veranstaltungen erklären sich die Teilnehmer mit der Anfertigung und
                Veröffentlichung solcher Aufnahmen einverstanden. Sollten Sie mit der Veröffentlichung von Aufnahmen,
                auf denen Sie zu sehen sind, nicht einverstanden sein, bitten wir um eine kurze Mitteilung an die oben
                angegebene E-Mail-Adresse. Wir werden die entsprechenden Aufnahmen dann umgehend entfernen.
              </p>
              <p className="leading-relaxed">
                Alle Aufnahmen werden ausschließlich im Zusammenhang mit der Vereinstätigkeit verwendet und nicht an
                Dritte zu kommerziellen Zwecken weitergegeben.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-foreground">Haftungsausschluss</h2>

              <h3 className="text-xl font-semibold mb-2 mt-4 text-foreground">Haftung für Inhalte</h3>
              <p className="leading-relaxed mb-4">
                Die Inhalte unserer Seiten wurden mit größter Sorgfalt erstellt. Für die Richtigkeit, Vollständigkeit
                und Aktualität der Inhalte können wir jedoch keine Gewähr übernehmen. Als Diensteanbieter sind wir für
                eigene Inhalte auf diesen Seiten nach den allgemeinen Gesetzen verantwortlich. Wir sind jedoch nicht
                verpflichtet, übermittelte oder gespeicherte fremde Informationen zu überwachen.
              </p>

              <h3 className="text-xl font-semibold mb-2 mt-4 text-foreground">Haftung für Links</h3>
              <p className="leading-relaxed mb-4">
                Unser Angebot enthält Links zu externen Webseiten Dritter, auf deren Inhalte wir keinen Einfluss haben.
                Deshalb können wir für diese fremden Inhalte auch keine Gewähr übernehmen. Für die Inhalte der
                verlinkten Seiten ist stets der jeweilige Anbieter oder Betreiber der Seiten verantwortlich. Die
                verlinkten Seiten wurden zum Zeitpunkt der Verlinkung auf mögliche Rechtsverstöße überprüft.
                Rechtswidrige Inhalte waren zum Zeitpunkt der Verlinkung nicht erkennbar.
              </p>

              <h3 className="text-xl font-semibold mb-2 mt-4 text-foreground">Urheberrecht</h3>
              <p className="leading-relaxed">
                Die durch die Seitenbetreiber erstellten Inhalte und Werke auf diesen Seiten unterliegen dem
                österreichischen Urheberrecht. Die Vervielfältigung, Bearbeitung, Verbreitung und jede Art der
                Verwertung außerhalb der Grenzen des Urheberrechtes bedürfen der schriftlichen Zustimmung des jeweiligen
                Autors bzw. Erstellers. Downloads und Kopien dieser Seite sind nur für den privaten, nicht kommerziellen
                Gebrauch gestattet.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-foreground">Datenschutz</h2>
              <p className="leading-relaxed mb-4">
                Die Nutzung unserer Webseite ist in der Regel ohne Angabe personenbezogener Daten möglich. Soweit auf
                unseren Seiten personenbezogene Daten (beispielsweise Name, Anschrift oder E-Mail-Adressen) erhoben
                werden, erfolgt dies, soweit möglich, stets auf freiwilliger Basis. Diese Daten werden ohne Ihre
                ausdrückliche Zustimmung nicht an Dritte weitergegeben.
              </p>
              <p className="leading-relaxed">
                Wir weisen darauf hin, dass die Datenübertragung im Internet (z.B. bei der Kommunikation per E-Mail)
                Sicherheitslücken aufweisen kann. Ein lückenloser Schutz der Daten vor dem Zugriff durch Dritte ist
                nicht möglich. Weitere Informationen zum Datenschutz finden Sie in unserer Datenschutzerklärung.
              </p>
            </section>
          </div>
        </motion.div>
      </main>

      <MobileBottomNav />
    </div>
  )
}
