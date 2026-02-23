"use client"

import { Header } from "@/components/header"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"
import { Shield } from "lucide-react"
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

export default function DatenschutzPage() {
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
                <Shield className="h-12 w-12 text-white mx-auto" />
              </div>
              <h1 className="text-4xl md:text-6xl font-extrabold uppercase leading-none tracking-tighter mb-4">
                <span className="block text-white">DATENSCHUTZ</span>
                <span className="block text-orange-200">ERKLÄRUNG</span>
              </h1>
              <p className="text-lg md:text-xl font-bold uppercase text-orange-100 mb-4">
                Informationen zur Verarbeitung Ihrer personenbezogenen Daten in der App
              </p>
              <div className="bg-orange-600/30 rounded-xl p-4 text-orange-100">
                <p className="text-sm italic">Ihre Privatsphäre ist uns wichtig</p>
              </div>
            </div>
          </motion.div>

          <div className="space-y-8 text-foreground/80">
            <section>
              <h2 className="text-2xl font-semibold mb-4 text-foreground">1. Datenschutz auf einen Blick</h2>
              <p className="mb-4">
                Diese Datenschutzerklärung informiert darüber, welche personenbezogenen Daten in der App{" "}
                <strong>„Emojis Dartverein“</strong> verarbeitet werden, zu welchen Zwecken dies erfolgt und welche
                Rechte Nutzerinnen und Nutzer haben.
              </p>
              <p className="mb-4">
                Personenbezogene Daten sind alle Daten, mit denen Sie persönlich identifiziert werden können.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-foreground">2. Verantwortlicher</h2>
              <p className="mb-2">Verantwortlich für die Datenverarbeitung in dieser App ist:</p>
              <div className="bg-muted p-4 rounded-lg">
                <p className="font-semibold">Bernhard Gastberger</p>
                <p>Wüstenrotstraße 30</p>
                <p>5020 Salzburg</p>
                <p className="mt-2">
                  E-Mail:{" "}
                  <a href="mailto:office@emojisdartverein.com" className="text-primary hover:underline">
                    office@emojisdartverein.com
                  </a>
                </p>
                <p>Telefon: +436604696464</p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-foreground">3. Verarbeitung von Daten in der App</h2>

              <h3 className="text-xl font-semibold mb-3 text-foreground">3.1 Mitglieder-Login</h3>
              <p className="mb-4">
                Für Vereinsmitglieder bietet die App einen geschützten Login-Bereich. Dabei werden die zur
                Authentifizierung erforderlichen Zugangsdaten verarbeitet (z.B. Benutzername, Mitgliedskennung oder
                vergleichbare Login-Daten).
              </p>
              <p className="mb-4">
                <strong>Zweck:</strong> Bereitstellung des Mitgliederbereichs und sichere Authentifizierung.
                <br />
                <strong>Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. b DSGVO (Erfüllung des Nutzungsverhältnisses).
              </p>

              <h3 className="text-xl font-semibold mb-3 text-foreground">3.2 Technisch notwendige Daten</h3>
              <p className="mb-4">
                Beim Betrieb der App können technisch notwendige Daten verarbeitet werden, z.B. Geräte- und
                Betriebssysteminformationen, Zeitpunkte von Zugriffen oder technische Ereignisse. Diese Daten sind
                erforderlich, um die App stabil und sicher bereitzustellen sowie Missbrauch zu verhindern.
              </p>
              <p className="mb-4">
                <strong>Zweck:</strong> Stabiler und sicherer App-Betrieb.
                <br />
                <strong>Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse am sicheren
                Betrieb).
              </p>

              <h3 className="text-xl font-semibold mb-3 text-foreground">
                3.3 Push-Benachrichtigungen (Firebase Cloud Messaging)
              </h3>
              <p className="mb-4">
                Die App kann Push-Benachrichtigungen versenden. Dafür verwenden wir{" "}
                <strong>Firebase Cloud Messaging (FCM)</strong>, einen Dienst der{" "}
                <strong>Google Ireland Limited</strong>.
              </p>
              <p className="mb-4">
                Hierbei wird insbesondere ein gerätespezifisches <strong>Push-Token</strong> verarbeitet, damit
                Benachrichtigungen an Ihr Endgerät zugestellt werden können.
              </p>
              <p className="mb-4">
                <strong>Zweck:</strong> Zustellung von Vereins-Infos, Terminen und wichtigen Mitteilungen per Push.
                <br />
                <strong>Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an zeitnaher
                Information).
              </p>
              <p className="mb-4">
                <strong>Deaktivierung:</strong> Push-Benachrichtigungen können jederzeit in den
                Android-Systemeinstellungen deaktiviert werden.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-foreground">4. Weitergabe von Daten</h2>
              <p className="mb-4">
                Eine Weitergabe personenbezogener Daten an Dritte erfolgt grundsätzlich nicht, außer wenn dies für den
                technischen Betrieb erforderlich ist (z.B. Firebase Cloud Messaging) oder wenn gesetzliche
                Verpflichtungen bestehen.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-foreground">5. Speicherdauer</h2>
              <p className="mb-4">
                Wir speichern personenbezogene Daten nur so lange, wie es für die jeweiligen Zwecke erforderlich ist
                oder gesetzliche Aufbewahrungspflichten bestehen. Login-/Mitgliedsdaten werden im Rahmen der
                Vereinsverwaltung gespeichert, solange das Mitgliedsverhältnis besteht.
              </p>
              <p className="mb-4">
                Push-Tokens werden solange verarbeitet, wie Push-Benachrichtigungen genutzt werden. Tokens können sich
                technisch ändern (z.B. nach App-Neuinstallation).
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-foreground">6. Ihre Rechte</h2>
              <p className="mb-4">Sie haben folgende Rechte:</p>
              <ul className="list-disc list-inside mb-4 space-y-2">
                <li>Auskunft (Art. 15 DSGVO)</li>
                <li>Berichtigung (Art. 16 DSGVO)</li>
                <li>Löschung (Art. 17 DSGVO)</li>
                <li>Einschränkung der Verarbeitung (Art. 18 DSGVO)</li>
                <li>Datenübertragbarkeit (Art. 20 DSGVO)</li>
                <li>Widerspruch (Art. 21 DSGVO)</li>
              </ul>
              <p className="mb-4">
                Zur Ausübung Ihrer Rechte wenden Sie sich bitte an die oben genannte Kontaktadresse.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-foreground">
                7. Beschwerderecht bei der Aufsichtsbehörde
              </h2>
              <p className="mb-4">
                Sie haben das Recht, sich bei einer Datenschutz-Aufsichtsbehörde über die Verarbeitung Ihrer
                personenbezogenen Daten durch uns zu beschweren.
              </p>
              <div className="bg-muted p-4 rounded-lg">
                <p className="font-semibold">Österreichische Datenschutzbehörde</p>
                <p>Barichgasse 40-42</p>
                <p>1030 Wien</p>
                <p className="mt-2">Telefon: +43 1 52 152-0</p>
                <p>
                  E-Mail:{" "}
                  <a href="mailto:dsb@dsb.gv.at" className="text-primary hover:underline">
                    dsb@dsb.gv.at
                  </a>
                </p>
                <p>
                  Website:{" "}
                  <a
                    href="https://www.dsb.gv.at"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    www.dsb.gv.at
                  </a>
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-foreground">8. Änderungen</h2>
              <p className="mb-4">
                Wir können diese Datenschutzerklärung bei Bedarf aktualisieren, z.B. bei rechtlichen Änderungen oder
                wenn sich Funktionen der App ändern. Die jeweils aktuelle Version ist in der App abrufbar.
              </p>
            </section>
          </div>
        </motion.div>
      </main>

      <MobileBottomNav />
    </div>
  )
}