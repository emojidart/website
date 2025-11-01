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
                Informationen zur Verarbeitung Ihrer personenbezogenen Daten
              </p>
              <div className="bg-orange-600/30 rounded-xl p-4 text-orange-100">
                <p className="text-sm italic">Ihre Privatsphäre ist uns wichtig</p>
              </div>
            </div>
          </motion.div>

          <div className="space-y-8 text-foreground/80">
            <section>
              <h2 className="text-2xl font-semibold mb-4 text-foreground">1. Datenschutz auf einen Blick</h2>
              <h3 className="text-xl font-semibold mb-3 text-foreground">Allgemeine Hinweise</h3>
              <p className="mb-4">
                Die folgenden Hinweise geben einen einfachen Überblick darüber, was mit Ihren personenbezogenen Daten
                passiert, wenn Sie diese Website besuchen. Personenbezogene Daten sind alle Daten, mit denen Sie
                persönlich identifiziert werden können.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-foreground">2. Verantwortlicher</h2>
              <p className="mb-2">Verantwortlich für die Datenverarbeitung auf dieser Website ist:</p>
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
              <h2 className="text-2xl font-semibold mb-4 text-foreground">3. Datenerfassung auf dieser Website</h2>

              <h3 className="text-xl font-semibold mb-3 text-foreground">Server-Log-Dateien</h3>
              <p className="mb-4">
                Der Provider der Seiten erhebt und speichert automatisch Informationen in so genannten
                Server-Log-Dateien, die Ihr Browser automatisch an uns übermittelt. Dies sind:
              </p>
              <ul className="list-disc list-inside mb-4 space-y-1">
                <li>Browsertyp und Browserversion</li>
                <li>Verwendetes Betriebssystem</li>
                <li>Referrer URL</li>
                <li>Hostname des zugreifenden Rechners</li>
                <li>Uhrzeit der Serveranfrage</li>
                <li>IP-Adresse</li>
              </ul>
              <p className="mb-4">
                Eine Zusammenführung dieser Daten mit anderen Datenquellen wird nicht vorgenommen. Die Erfassung dieser
                Daten erfolgt auf Grundlage von Art. 6 Abs. 1 lit. f DSGVO. Der Websitebetreiber hat ein berechtigtes
                Interesse an der technisch fehlerfreien Darstellung und der Optimierung seiner Website.
              </p>

              <h3 className="text-xl font-semibold mb-3 text-foreground">Kontaktformular</h3>
              <p className="mb-4">
                Wenn Sie uns per Kontaktformular Anfragen zukommen lassen, werden Ihre Angaben aus dem Anfrageformular
                inklusive der von Ihnen dort angegebenen Kontaktdaten zwecks Bearbeitung der Anfrage und für den Fall
                von Anschlussfragen bei uns gespeichert. Diese Daten geben wir nicht ohne Ihre Einwilligung weiter.
              </p>
              <p className="mb-4">
                Die Verarbeitung dieser Daten erfolgt auf Grundlage von Art. 6 Abs. 1 lit. b DSGVO, sofern Ihre Anfrage
                mit der Erfüllung eines Vertrags zusammenhängt oder zur Durchführung vorvertraglicher Maßnahmen
                erforderlich ist. In allen übrigen Fällen beruht die Verarbeitung auf unserem berechtigten Interesse an
                der effektiven Bearbeitung der an uns gerichteten Anfragen (Art. 6 Abs. 1 lit. f DSGVO).
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-foreground">
                4. Foto- und Videoaufnahmen bei Veranstaltungen
              </h2>
              <p className="mb-4">
                Bei unseren Turnieren, Trainings und Vereinsveranstaltungen werden regelmäßig Foto- und Videoaufnahmen
                erstellt. Diese Aufnahmen dienen der Dokumentation unserer Vereinsaktivitäten und werden auf unserer
                Website, in sozialen Medien und in Printmedien veröffentlicht.
              </p>
              <p className="mb-4">
                Mit der Teilnahme an unseren Veranstaltungen erklären Sie sich damit einverstanden, dass Aufnahmen von
                Ihnen gemacht und veröffentlicht werden können. Die Rechtsgrundlage hierfür ist Art. 6 Abs. 1 lit. f
                DSGVO (berechtigtes Interesse an der Öffentlichkeitsarbeit des Vereins).
              </p>
              <p className="mb-4">
                <strong>Widerspruchsrecht:</strong> Sie können jederzeit der Verwendung Ihrer Aufnahmen widersprechen.
                Wenden Sie sich dazu bitte an die oben genannte Kontaktadresse. Bereits veröffentlichte Aufnahmen werden
                dann nach Möglichkeit entfernt oder unkenntlich gemacht.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-foreground">5. Cookies</h2>
              <p className="mb-4">
                Unsere Website verwendet Cookies. Das sind kleine Textdateien, die Ihr Webbrowser auf Ihrem Endgerät
                speichert. Cookies helfen uns dabei, unser Angebot nutzerfreundlicher, effektiver und sicherer zu
                machen.
              </p>
              <p className="mb-4">
                Einige Cookies sind "Session-Cookies". Solche Cookies werden nach Ende Ihrer Browser-Sitzung von selbst
                gelöscht. Hingegen bleiben andere Cookies auf Ihrem Endgerät bestehen, bis Sie diese selbst löschen.
                Solche Cookies helfen uns, Sie bei Rückkehr auf unserer Website wiederzuerkennen.
              </p>
              <p className="mb-4">
                Sie können Ihren Browser so einstellen, dass Sie über das Setzen von Cookies informiert werden und
                einzeln über deren Annahme entscheiden oder die Annahme von Cookies für bestimmte Fälle oder generell
                ausschließen können.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-foreground">6. Ihre Rechte</h2>
              <p className="mb-4">Sie haben folgende Rechte:</p>
              <ul className="list-disc list-inside mb-4 space-y-2">
                <li>
                  <strong>Auskunftsrecht:</strong> Sie können Auskunft über Ihre von uns verarbeiteten personenbezogenen
                  Daten verlangen.
                </li>
                <li>
                  <strong>Berichtigungsrecht:</strong> Sie können die Berichtigung unrichtiger oder die
                  Vervollständigung Ihrer bei uns gespeicherten personenbezogenen Daten verlangen.
                </li>
                <li>
                  <strong>Löschungsrecht:</strong> Sie können die Löschung Ihrer bei uns gespeicherten personenbezogenen
                  Daten verlangen, soweit nicht die Verarbeitung zur Ausübung des Rechts auf freie Meinungsäußerung und
                  Information, zur Erfüllung einer rechtlichen Verpflichtung, aus Gründen des öffentlichen Interesses
                  oder zur Geltendmachung, Ausübung oder Verteidigung von Rechtsansprüchen erforderlich ist.
                </li>
                <li>
                  <strong>Einschränkung der Verarbeitung:</strong> Sie können die Einschränkung der Verarbeitung Ihrer
                  personenbezogenen Daten verlangen.
                </li>
                <li>
                  <strong>Datenübertragbarkeit:</strong> Sie können verlangen, dass wir Ihnen Ihre personenbezogenen
                  Daten in einem strukturierten, gängigen und maschinenlesbaren Format übermitteln.
                </li>
                <li>
                  <strong>Widerspruchsrecht:</strong> Sie können der Verarbeitung Ihrer personenbezogenen Daten
                  widersprechen, wenn die Verarbeitung auf Grundlage von Art. 6 Abs. 1 lit. f DSGVO erfolgt.
                </li>
              </ul>
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
              <h2 className="text-2xl font-semibold mb-4 text-foreground">8. Speicherdauer</h2>
              <p className="mb-4">
                Soweit innerhalb dieser Datenschutzerklärung keine speziellere Speicherdauer genannt wurde, verbleiben
                Ihre personenbezogenen Daten bei uns, bis der Zweck für die Datenverarbeitung entfällt. Wenn Sie ein
                berechtigtes Löschersuchen geltend machen oder eine Einwilligung zur Datenverarbeitung widerrufen,
                werden Ihre Daten gelöscht, sofern wir keine anderen rechtlich zulässigen Gründe für die Speicherung
                Ihrer personenbezogenen Daten haben.
              </p>
            </section>
          </div>
        </motion.div>
      </main>

      <MobileBottomNav />
    </div>
  )
}
