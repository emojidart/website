"use client"

import { Header } from "@/components/header"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"
import { Shield } from "lucide-react"
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

export default function DatenschutzPage() {
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
                  <Shield className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <h1 className="text-base sm:text-lg font-black">Datenschutzerklärung</h1>
                  <p className="text-sm text-gray-600 mt-1">
                    Informationen zur Verarbeitung personenbezogener Daten in der EMD Vereinsapp.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Content */}
          <div className="space-y-6 text-sm leading-relaxed text-gray-700">
            <Section title="1. Datenschutz auf einen Blick">
              Diese Datenschutzerklärung informiert darüber, welche personenbezogenen Daten in der App
              <strong> „Emojis Dartverein“ </strong> verarbeitet werden und welche Rechte Nutzerinnen und Nutzer haben.
            </Section>

            <Section title="2. Verantwortlicher">
              <div className="bg-white border border-gray-200 rounded-2xl p-4 mt-3 shadow-sm">
                <p className="font-black text-gray-900">Bernhard Gastberger</p>
                <p>Wüstenrotstraße 30</p>
                <p>5020 Salzburg</p>
                <p className="mt-2">
                  E-Mail:{" "}
                  <a
                    href="mailto:office@emojisdartverein.com"
                    className="text-orange-600 font-semibold"
                  >
                    office@emojisdartverein.com
                  </a>
                </p>
                <p>Telefon: +43 660 4696464</p>
              </div>
            </Section>

            <Section title="3. Verarbeitung von Daten in der App">
              <SubTitle>3.1 Mitglieder-Login</SubTitle>
              Zur Authentifizierung werden erforderliche Login-Daten verarbeitet.
              <br />
              <strong>Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. b DSGVO.

              <SubTitle>3.2 Technisch notwendige Daten</SubTitle>
              Geräte- und Systeminformationen können verarbeitet werden, um einen sicheren Betrieb der App zu gewährleisten.
              <br />
              <strong>Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. f DSGVO.

              <SubTitle>3.3 Push-Benachrichtigungen</SubTitle>
              Für Push-Mitteilungen verwenden wir <strong>Firebase Cloud Messaging (Google Ireland Limited)</strong>.
              Dabei wird ein gerätespezifisches Push-Token verarbeitet.
              <br />
              <strong>Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. f DSGVO.
            </Section>

            <Section title="4. Weitergabe von Daten">
              Eine Weitergabe erfolgt nur, wenn dies technisch notwendig oder gesetzlich vorgeschrieben ist.
            </Section>

            <Section title="5. Speicherdauer">
              Daten werden nur so lange gespeichert, wie es für den jeweiligen Zweck erforderlich ist.
            </Section>

            <Section title="6. Ihre Rechte">
              <ul className="list-disc list-inside space-y-1 mt-2">
                <li>Auskunft (Art. 15 DSGVO)</li>
                <li>Berichtigung (Art. 16 DSGVO)</li>
                <li>Löschung (Art. 17 DSGVO)</li>
                <li>Einschränkung (Art. 18 DSGVO)</li>
                <li>Datenübertragbarkeit (Art. 20 DSGVO)</li>
                <li>Widerspruch (Art. 21 DSGVO)</li>
              </ul>
            </Section>

            <Section title="7. Aufsichtsbehörde">
              <div className="bg-white border border-gray-200 rounded-2xl p-4 mt-3 shadow-sm">
                <p className="font-black text-gray-900">Österreichische Datenschutzbehörde</p>
                <p>Barichgasse 40-42</p>
                <p>1030 Wien</p>
                <p className="mt-2">Telefon: +43 1 52 152-0</p>
                <p>
                  Website:{" "}
                  <a
                    href="https://www.dsb.gv.at"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-orange-600 font-semibold"
                  >
                    www.dsb.gv.at
                  </a>
                </p>
              </div>
            </Section>

            <Section title="8. Änderungen">
              Diese Datenschutzerklärung kann bei Bedarf aktualisiert werden. Die aktuelle Version ist jederzeit in der App abrufbar.
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
      <p>{children}</p>
    </motion.section>
  )
}

function SubTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="font-bold text-gray-900 mt-4 mb-1">{children}</h3>
  )
}