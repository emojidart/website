"use client"

import { Header } from "@/components/header"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"
import { Shield } from "lucide-react"
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

export default function DatenschutzPage() {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-background text-white font-sans">
      <Header />

      {/* Stabiler Hintergrund wie im Member-Profil – ohne Fade/Flackern */}
      <div className="pointer-events-none fixed inset-0 z-0 bg-background" aria-hidden="true" />

     <main className="relative z-10 mx-auto w-full max-w-[var(--emd-content-max)] px-3 pb-28 pt-16 sm:px-5 sm:pt-20 lg:px-7 lg:pb-14 xl:px-8">
  <motion.div
    className="w-full"
    variants={containerVariants}
    initial={false}
    animate="visible"
  >
          {/* App Header Card */}
          <motion.div variants={itemVariants} className="mb-4 sm:mb-5">
            <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-card shadow-[0_35px_120px_-55px_rgba(0,0,0,.95)]  sm:rounded-[34px]">
              <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,rgba(249,115,22,.08),transparent_34%,rgba(14,165,233,.06)_78%,transparent)]" />
              <div className="relative flex items-start gap-4 p-4 sm:p-6 lg:p-8 xl:p-9">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/10">
                  <Shield className="h-5 w-5 text-orange-300" />
                </div>
                <div className="min-w-0">
                  <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground"><span className="h-2 w-2 rounded-full bg-orange-400" />Datenschutz · EMD</div>
                  <h1 className="text-3xl font-semibold tracking-[-0.04em] text-white sm:text-4xl lg:text-5xl">Datenschutzerklärung</h1>
                  <p className="mt-2 text-sm font-medium text-muted-foreground">Informationen zur Verarbeitung personenbezogener Daten in der EMD Vereinsapp.</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Content */}
          <div className="space-y-5 text-sm leading-relaxed text-white/65">
            <Section title="1. Datenschutz auf einen Blick">
              Diese Datenschutzerklärung informiert darüber, welche personenbezogenen Daten in der App
              <strong> „Emojis Dartverein“ </strong> verarbeitet werden und welche Rechte Nutzerinnen und Nutzer haben.
            </Section>

            <Section title="2. Verantwortlicher">
              <div className="mt-3 rounded-[20px] border border-white/10 bg-white/5 p-4 shadow-[0_18px_55px_-44px_rgba(0,0,0,.95)]">
                <p className="font-semibold text-white">Bernhard Gastberger</p>
                <p>Wüstenrotstraße 30</p>
                <p>5020 Salzburg</p>
                <p className="mt-2">
                  E-Mail:{" "}
                  <a
                    href="mailto:office@emojisdartverein.com"
                    className="text-orange-300 font-semibold"
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
              <div className="mt-3 rounded-[20px] border border-white/10 bg-white/5 p-4 shadow-[0_18px_55px_-44px_rgba(0,0,0,.95)]">
                <p className="font-semibold text-white">Österreichische Datenschutzbehörde</p>
                <p>Barichgasse 40-42</p>
                <p>1030 Wien</p>
                <p className="mt-2">Telefon: +43 1 52 152-0</p>
                <p>
                  Website:{" "}
                  <a
                    href="https://www.dsb.gv.at"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-orange-300 font-semibold"
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
    <motion.section variants={itemVariants} className="rounded-[22px] border border-white/10 bg-card p-4 shadow-[0_20px_70px_-52px_rgba(0,0,0,.95)]  sm:p-5">
      <h2 className="text-base sm:text-lg font-semibold text-white mb-2">{title}</h2>
      <p>{children}</p>
    </motion.section>
  )
}

function SubTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="font-bold text-white mt-4 mb-1">{children}</h3>
  )
}