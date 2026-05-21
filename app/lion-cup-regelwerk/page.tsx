"use client"

import type React from "react"
import { Header } from "@/components/header"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"
import { motion } from "framer-motion"
import {
  Crown,
  Calendar,
  Clock,
  MapPin,
  Trophy,
  Euro,
  Users,
  Target,
  AlertCircle,
  Shield,
  Camera,
  Gavel,
  ArrowLeft,
  FileText,
  Split,
  BadgeCheck,
  Ban,
  ListChecks,
  Coins,
  Eye,
  Flag,
} from "lucide-react"
import Link from "next/link"

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.15,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 110, damping: 14 } },
}

/** UI Helpers */
function SectionCard({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode
  title: string
  children: React.ReactNode
}) {
  return (
    <motion.section
      variants={itemVariants}
      className="rounded-2xl border border-gray-200/70 bg-white shadow-sm ring-1 ring-black/5"
    >
      <div className="p-4 sm:p-6">
        <div className="flex items-start gap-3">
          <div className="shrink-0 rounded-2xl bg-orange-600 text-white p-3 shadow-sm">{icon}</div>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg sm:text-xl font-black text-gray-900">{title}</h2>
          </div>
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </motion.section>
  )
}

function SubCard({
  tone = "neutral",
  title,
  children,
}: {
  tone?: "neutral" | "info" | "warn" | "success"
  title?: string
  children: React.ReactNode
}) {
  const toneCls =
    tone === "info"
      ? "bg-blue-50 border-blue-100"
      : tone === "warn"
        ? "bg-yellow-50 border-yellow-200"
        : tone === "success"
          ? "bg-emerald-50 border-emerald-100"
          : "bg-gray-50 border-gray-100"

  const titleCls =
    tone === "info"
      ? "text-blue-900"
      : tone === "warn"
        ? "text-yellow-900"
        : tone === "success"
          ? "text-emerald-900"
          : "text-gray-900"

  return (
    <div className={`rounded-xl border p-4 ${toneCls}`}>
      {title ? <div className={`font-black mb-2 ${titleCls}`}>{title}</div> : null}
      <div className="text-sm text-gray-700 leading-relaxed">{children}</div>
    </div>
  )
}

export default function RegelwerkAppPage() {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans pb-24 md:pb-0">
      <Header />

      <main className="pt-16 sm:pt-14">
        <motion.div
            className="mx-auto w-full px-4 py-6 sm:py-8 max-w-2xl lg:max-w-screen-xl 2xl:max-w-screen-2xl"

          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
     

          {/* HERO */}
          <motion.div variants={itemVariants} className="mb-6">
            <div className="rounded-3xl border border-gray-200/70 bg-white shadow-md ring-1 ring-black/5 overflow-hidden">
              <div className="p-5 sm:p-7">
                <div className="flex items-start gap-4">
                  <div className="shrink-0 rounded-2xl bg-orange-600 text-white p-3 shadow-sm">
                    <Crown className="w-6 h-6" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="inline-flex items-center gap-2">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-black bg-orange-50 text-orange-700 border border-orange-100">
                        EMD – LION CUP
                      </span>
                      <span className="text-xs text-gray-500">Stand Herbst 2025</span>
                    </div>

                    <h1 className="mt-2 text-2xl sm:text-3xl font-black leading-tight">
                      Regelwerk & Prämierungsliste
                    </h1>

                    <p className="mt-1 text-sm sm:text-base text-gray-600">
                      Prämierungsliste <span className="font-semibold text-gray-900">01.09.2025 – 01.06.2026</span>
                    </p>

                    <div className="mt-4 rounded-2xl border border-orange-100 bg-orange-50 p-4">
                      <p className="text-xs sm:text-sm text-orange-900 leading-relaxed">
                        Diese Prämierungsliste ist ein allgemeines Informationsdokument und gilt nur als Hinweis des
                        Ablaufs. Änderungen vorbehalten!
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="h-1.5 w-full bg-gradient-to-r from-orange-500 via-orange-600 to-orange-700" />
            </div>
          </motion.div>

          {/* CONTENT */}
          <div className="space-y-4">
            {/*  */}
            <SectionCard
              icon={<FileText className="w-5 h-5" />}
              title="Offizielle Zusatz-Ausschreibung (ab dem 24. Turniertag)"
            >
              <div className="space-y-3">
                <SubCard tone="info" title="EMD LION CUP – Serie">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white px-3 py-1 text-xs font-bold text-blue-900">
                      <Split className="w-4 h-4" />
                      Zusatz-Regelwerk ab dem 24. Turniertag
                    </span>
                    <span className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white px-3 py-1 text-xs font-bold text-blue-900">
                      <Trophy className="w-4 h-4" />
                      Gruppenteilung & Finalqualifikation
                    </span>
                  </div>
                </SubCard>

                <SubCard title="§1 Gültigkeit">
                  <p>
                    Dieses Zusatz-Regelwerk tritt ab dem <strong>24. Turniertag</strong> der laufenden EMD LION CUP Serie
                    in Kraft und ergänzt die bestehende Hauptausschreibung.
                  </p>
                  <p className="mt-2">
                    Alle Teilnehmer erkennen mit ihrer Teilnahme diese Bestimmungen als <strong>verbindlich</strong> an.
                  </p>
                </SubCard>

                <SubCard title="§2 Gruppenteilung (Tabelle A & Tabelle B)">
                  <p>
                    Ab dem <strong>24. Turniertag</strong> erfolgt eine endgültige Teilung der Gesamttabelle in:
                  </p>

                  <div className="mt-3 grid sm:grid-cols-2 gap-3">
                    <div className="rounded-xl border border-gray-200 bg-white p-4">
                      <div className="font-black text-gray-900">Tabelle A</div>
                      <div className="text-xs text-gray-600 mt-1">oberer Teil</div>
                    </div>
                    <div className="rounded-xl border border-gray-200 bg-white p-4">
                      <div className="font-black text-gray-900">Tabelle B</div>
                      <div className="text-xs text-gray-600 mt-1">unterer Teil</div>
                    </div>
                  </div>

                  <div className="mt-4 space-y-3">
                    <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4">
                      <div className="flex items-center gap-2 font-black text-yellow-900">
                        <Ban className="w-4 h-4" />
                        Kein Aufstieg mehr möglich
                      </div>
                      <p className="mt-2 text-sm text-gray-700">
                        Ein Wechsel von <strong>Tabelle B</strong> in <strong>Tabelle A</strong> ist ausgeschlossen –
                        auch dann nicht, wenn ein Teilnehmer in Tabelle B mehr Punkte erzielt als Teilnehmer in Tabelle A.
                      </p>
                    </div>

                    <div className="rounded-xl border border-gray-200 bg-white p-4">
                      <div className="flex items-center gap-2 font-black text-gray-900">
                        <BadgeCheck className="w-4 h-4" />
                        Endgültige Zuteilung
                      </div>
                      <p className="mt-2 text-sm text-gray-700">
                        Die Gruppenzuteilung ist <strong>fix</strong> und bleibt bis zum Finaltag <strong>unverändert</strong>.
                      </p>
                    </div>

                    <div className="rounded-xl border border-gray-200 bg-white p-4">
                      <div className="flex items-center gap-2 font-black text-gray-900">
                        <Users className="w-4 h-4" />
                        Teilnehmeranzahl bei ungerader Gesamtzahl
                      </div>
                      <p className="mt-2 text-sm text-gray-700">
                        Bei einer ungeraden Anzahl qualifizierter Teilnehmer wird:
                      </p>
                      <ul className="mt-2 text-sm text-gray-700 space-y-1">
                        <li>• der größere Anteil <strong>Tabelle A</strong></li>
                        <li>• der kleinere Anteil <strong>Tabelle B</strong></li>
                      </ul>
                      <p className="mt-2 text-sm text-gray-700">zugeordnet.</p>
                    </div>
                  </div>
                </SubCard>

                <SubCard title="§3 Teilnahmeberechtigung nach dem 24. Turniertag">
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
                      <div className="flex items-center gap-2 font-black text-emerald-900">
                        <ListChecks className="w-4 h-4" />
                        ✅ Teilnahmeberechtigt
                      </div>
                      <ul className="mt-2 text-sm text-gray-700 space-y-2">
                        <li>
                          • Spieler, die die Möglichkeit haben, bis zum Finaltag die vorgeschriebenen{" "}
                          <strong>20 Antritte</strong> zu erreichen.
                        </li>
                        <li>
                          • Teilnehmer, die bereits mindestens <strong>einen Antritt</strong> absolviert haben.
                        </li>
                        <li>• Diese Teilnehmer werden in der Tabelle gesondert gekennzeichnet.</li>
                      </ul>
                    </div>

                    <div className="rounded-xl border border-red-100 bg-red-50 p-4">
                      <div className="flex items-center gap-2 font-black text-red-900">
                        <Ban className="w-4 h-4" />
                        ❌ Nicht mehr möglich
                      </div>
                      <p className="mt-2 text-sm text-gray-700">
                        <strong>Neuanmeldungen</strong> sind ab dem 24. Turniertag ausgeschlossen.
                      </p>
                    </div>
                  </div>
                </SubCard>

                <SubCard title="§4 Mindestanzahl von Antritten für Preisgeldberechtigung">
                  <div className="space-y-3">
                    <div className="rounded-xl border border-gray-200 bg-white p-4">
                      <div className="font-black text-gray-900">Voraussetzungen</div>
                      <ul className="mt-2 text-sm text-gray-700 space-y-2">
                        <li>• Es müssen die vorgeschriebenen <strong>20 Antritte</strong> erreicht werden.</li>
                        <li>
                          • Wird diese Anzahl nicht erreicht, besteht <strong>kein Anspruch</strong> auf Preisgeld – selbst wenn
                          eine Platzierung erreicht wurde.
                        </li>
                      </ul>
                    </div>

                    <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4">
                      <div className="font-black text-yellow-900">Nachrückregelung</div>
                      <p className="mt-2 text-sm text-gray-700">
                        Erreicht ein Teilnehmer auf einem Preisgeldrang nicht die erforderliche Anzahl an Antritten,
                        rückt automatisch der <strong>nächstplatzierte Teilnehmer</strong> nach.
                      </p>
                      <p className="mt-2 text-sm text-gray-700">
                        Sollte kein weiterer qualifizierter Teilnehmer die Voraussetzungen erfüllen, wird das Preisgeld gemäß{" "}
                        <strong>§5</strong> verteilt.
                      </p>
                    </div>
                  </div>
                </SubCard>

                <SubCard title="§5 Preisgeldregelung – Tabelle B">
                  <div className="space-y-3">
                    <div className="rounded-xl border border-gray-200 bg-white p-4">
                      <div className="flex items-center gap-2 font-black text-gray-900">
                        <Coins className="w-4 h-4" />
                        Sonderregelung Tabelle B
                      </div>
                      <p className="mt-2 text-sm text-gray-700">
                        Wird in Tabelle B die erforderliche Teilnehmeranzahl oder Mindestanzahl an Antritten für einzelne
                        Preisgeld-Platzierungen nicht erreicht, wird das dafür vorgesehene Preisgeld auf die übrigen qualifizierten
                        Preisgeld-Platzierungen innerhalb der Tabelle B aufgeteilt.
                      </p>
                    </div>

                    <div className="rounded-xl border border-gray-200 bg-white p-4">
                      <div className="font-black text-gray-900">Falls niemand mehr qualifiziert ist</div>
                      <p className="mt-2 text-sm text-gray-700">
                        Sollte in Tabelle B kein qualifizierter Teilnehmer mehr für bestimmte Preisgeldränge vorhanden sein, wird das
                        verbleibende Preisgeld auf die qualifizierten Preisgeld-Platzierungen der <strong>Tabelle A</strong> aufgeteilt.
                      </p>
                    </div>
                  </div>
                </SubCard>

                <SubCard title="§6 Transparenz & Kennzeichnung">
                  <ul className="text-sm text-gray-700 space-y-2">
                    <li className="flex items-start gap-2">
                      <Eye className="w-4 h-4 mt-0.5 text-gray-600" />
                      <span>
                        Alle Tabellenstände werden getrennt veröffentlicht: <strong>Tabelle A</strong> und <strong>Tabelle B</strong>.
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <BadgeCheck className="w-4 h-4 mt-0.5 text-gray-600" />
                      <span>
                        Teilnehmer mit noch nicht erfüllter Mindestanzahl an Antritten werden entsprechend <strong>markiert</strong>.
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <FileText className="w-4 h-4 mt-0.5 text-gray-600" />
                      <span>
                        Maßgeblich ist ausschließlich die vom Veranstalter veröffentlichte <strong>offizielle Wertung</strong>.
                      </span>
                    </li>
                  </ul>
                </SubCard>

                <SubCard tone="warn" title="§7 Finaltag – Ablauf & Modus">
                  <p>
                    Der <strong>Finaltag</strong> findet am <strong>05.06.2026</strong> um <strong>19:30 Uhr</strong> statt.
                  </p>
                  <ul className="mt-2 text-sm text-gray-700 space-y-2">
                    <li>• Gespielt wird am Finaltag im Modus <strong>Best of 5</strong>.</li>
                    
                  </ul>
                  
                </SubCard>
              </div>
            </SectionCard>

            {/**/}
            <SectionCard icon={<Crown className="w-5 h-5" />} title="Bewerb – Eigenschaften wie ein Löwe!">
              <div className="grid sm:grid-cols-2 gap-3">
                <SubCard>
                  <ul className="space-y-2">
                    <li>• <strong>Innovativ – Kreativ – Attraktiv</strong></li>
                    <li>• <strong>Kämpfen und hungrig wie ein Löwe</strong></li>
                    <li>• Im Mittelpunkt der Dart Community, strahlen im Rampenlicht</li>
                  </ul>
                </SubCard>
                <SubCard>
                  <ul className="space-y-2">
                    <li>• <strong>Loyal und sportlich fair, intensiv und aufrichtig</strong></li>
                    <li>• Beeindrucken mit Charisma und gesundem Optimismus</li>
                    <li>• <strong>Die Kombination aus Selbstsicherheit und Kreativität</strong></li>
                  </ul>
                </SubCard>
              </div>
            </SectionCard>

            <SectionCard icon={<MapPin className="w-5 h-5" />} title="Austragungsort & Termine">
              <div className="grid sm:grid-cols-2 gap-3">
                <SubCard tone="info" title="Austragungsort">
                  <strong>Dart & Freizeit Vereinsheim „Pfeil-OK" e.V.</strong>
                  <br />
                  Linzer Bundesstraße 16
                  <br />
                  5020 Salzburg
                </SubCard>

                <div className="space-y-3">
                  <SubCard tone="info" title="Periode des Bewerbes">
                    <div className="inline-flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-blue-700" />
                      <span className="font-semibold">01. September 2025 bis 01. Juni 2026</span>
                    </div>
                  </SubCard>

                  <SubCard tone="info" title="Spielzeit & Prozess">
                    <div className="space-y-2">
                      <div className="inline-flex items-center gap-2">
                        <Clock className="w-4 h-4 text-blue-700" />
                        <span>
                          <strong>Jeden Montag</strong> – 19:30 Uhr
                        </span>
                      </div>
                      <div className="inline-flex items-center gap-2">
                        <Trophy className="w-4 h-4 text-blue-700" />
                        <span className="font-semibold">34 Turniertage + 1 Mega-Finaltag</span>
                      </div>
                    </div>
                  </SubCard>
                </div>
              </div>
            </SectionCard>

            <SectionCard icon={<AlertCircle className="w-5 h-5" />} title="Spielpausen">
              <SubCard tone="warn" title="Keine Turniere an folgenden Terminen">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 mt-2">
                  {["27. Okt. 2025", "22. Dez. 2025", "29. Dez. 2025", "05. Jan. 2026", "11. Mai 2026"].map((d) => (
                    <div
                      key={d}
                      className="rounded-xl bg-white border border-yellow-200 px-3 py-2 text-center text-xs font-bold text-yellow-800"
                    >
                      {d}
                    </div>
                  ))}
                </div>
              </SubCard>
            </SectionCard>

            <SectionCard icon={<Users className="w-5 h-5" />} title="Leveleinstufung">
              <SubCard tone="success">
                <p className="text-sm">
                  <strong>Jeder kann teilnehmen</strong>, ausgenommen <strong>„A-Level Spieler"</strong>, um unterschiedliche
                  Spielstärken zu fördern und zu motivieren.
                </p>
                <p className="text-xs text-emerald-800 mt-2">
                  <strong>Ausnahmen:</strong> Entscheidung der Veranstalter und/oder Turnierleitung
                </p>
              </SubCard>
            </SectionCard>

            <SectionCard icon={<Euro className="w-5 h-5" />} title="Turnierstartgeld & Beiträge">
              <div className="grid sm:grid-cols-2 gap-3">
                <SubCard title="Reguläre Teilnahme">
                  <ul className="space-y-2">
                    <li>• <strong>Turnierstartgeld pro Teilnahme:</strong> € 4,00</li>
                    <li>• <strong>Teilnahmebeitrag (einmalig):</strong> € 5,00</li>
                    <li className="text-xs text-gray-600">Berechtigung für 34 Turniertage</li>
                  </ul>
                </SubCard>

                <div className="space-y-3">
                  <SubCard title="Qualifizierte Teilnehmer">
                    <ul className="space-y-2">
                      <li>• <strong>Finaltag-Beitrag (einmalig):</strong> € 5,00</li>
                      <li className="text-xs text-gray-600">Berechtigung für Finaltag</li>
                    </ul>
                  </SubCard>
                  <SubCard title="Wirt-Sponsoring">
                    <ul className="space-y-2">
                      <li>• <strong>Bis 500 Teilnahmen:</strong> € 100,00 (einmalig)</li>
                      <li>• <strong>Ab 501 Teilnahmen:</strong> € 250,00 (einmalig)</li>
                    </ul>
                  </SubCard>
                </div>
              </div>
            </SectionCard>

            <SectionCard icon={<Target className="w-5 h-5" />} title="Starterfeld & Anmeldung">
              <SubCard>
                <p>
                  Um ein <strong>EMD – LION CUP-Turnier</strong> zu organisieren, müssen mindestens{" "}
                  <strong>4 Teilnehmer</strong> mitspielen.
                </p>
                <p className="mt-2">
                  Die Spieler müssen sich mit <strong>vollem Namen anmelden</strong> und eingetragen werden.
                </p>
              </SubCard>
            </SectionCard>

            <SectionCard icon={<Trophy className="w-5 h-5" />} title="Punktewertung">
              <div className="space-y-3">
                <SubCard title="Grundwertung">
                  <ul className="space-y-2">
                    <li>• <strong>Letzter Platz:</strong> 10 Punkte</li>
                    <li>• <strong>Jede bessere Platzierung:</strong> +2 Punkte zusätzlich</li>
                    <li>• <strong>Ergebnis-Punkte:</strong> Zusätzlich zu den Platzierungspunkten</li>
                  </ul>
                  <div className="mt-3 rounded-xl bg-white border border-gray-200 p-3 text-xs text-gray-700">
                    <strong>Beispiel:</strong> 1:2 + 1:2 = 2 Punkte + Platzierungspunkte 10 = 12 Gesamtpunkte
                  </div>
                </SubCard>

                <SubCard title="Bonus">
                  <strong>1. Platzierter von Gewinner-Seite:</strong> +5 Bonuspunkte zusätzlich
                </SubCard>
              </div>
            </SectionCard>

            <SectionCard icon={<Calendar className="w-5 h-5" />} title="Antritte für Finaltag">
              <SubCard>
                Jeder <strong>EMD – LION CUP-Teilnehmer</strong>, der am Finaltag teilnehmen möchte, benötigt{" "}
                <strong>20 Antritte</strong>.
              </SubCard>
            </SectionCard>

            <SectionCard icon={<Trophy className="w-5 h-5" />} title="Wertung & Tabellensystem">
              <div className="space-y-3">
                <SubCard title="Tabellenverlauf">
                  <p>
                    Eine Tabelle bis zur Vollendung der <strong>34 Turniertage + 1 Finaltag</strong>
                  </p>
                  <div className="mt-3 grid sm:grid-cols-2 gap-3">
                    <div className="rounded-xl bg-white border border-gray-200 p-4">
                      <div className="font-black text-orange-700">Nach 17 Turniertagen</div>
                      <div className="text-sm text-gray-700 mt-1">
                        Punkte werden bei allen Teilnehmern <strong>geteilt</strong>
                      </div>
                    </div>
                    <div className="rounded-xl bg-white border border-gray-200 p-4">
                      <div className="font-black text-orange-700">Nach 24 Turniertagen</div>
                      <div className="text-sm text-gray-700 mt-1">
                        Tabelle wird <strong>halbiert</strong>. Ab dann <strong>keine neuen Teilnehmer</strong> mehr möglich.
                      </div>
                    </div>
                  </div>
                </SubCard>

                <SubCard title="Qualifikation (1.–5. Plätze je Tabelle)">
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div className="rounded-xl bg-white border border-gray-200 p-4">
                      <div className="font-black text-orange-700">Tabelle 1 (Obere Tabelle)</div>
                      <div className="text-sm mt-1">Erspielte Platzierungen der 24 Turniertage</div>
                    </div>
                    <div className="rounded-xl bg-white border border-gray-200 p-4">
                      <div className="font-black text-orange-700">Tabelle 2 (Untere Tabelle)</div>
                      <div className="text-sm mt-1">
                        Erste fünf der geteilten Tabelle des unteren Feldes
                        <div className="text-xs text-orange-700 mt-1">
                          Beispiel: 20 Teilnehmer / 2 → Platz 11–15 werden zu Platz 1–5
                        </div>
                      </div>
                    </div>
                  </div>
                </SubCard>

                <SubCard tone="warn">
                  <strong>Hinweis:</strong> Sollten in Gruppe 1 und Gruppe 2 die ersten 5 Plätze mit den Antrittstagen nicht erreicht werden,
                  wird bis zum Finaltag entschieden.
                </SubCard>
              </div>
            </SectionCard>

            <SectionCard icon={<Target className="w-5 h-5" />} title="Spielmodus & Spielregeln">
              <div className="space-y-3">
                <SubCard title="Spielmodus">
                  <p>
                    Der Spielmodus ist <strong>abwechselnd</strong> beginnend mit:
                  </p>
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <div className="rounded-xl bg-white border border-gray-200 p-3 text-center">
                      <div className="font-black text-orange-700">1. Turniertag</div>
                      <div className="text-sm text-gray-700">501 Master Out</div>
                    </div>
                    <div className="rounded-xl bg-white border border-gray-200 p-3 text-center">
                      <div className="font-black text-orange-700">2. Turniertag</div>
                      <div className="text-sm text-gray-700">501 Double Out</div>
                    </div>
                  </div>
                  <div className="text-xs text-gray-600 mt-2">usw. (abwechselnd)</div>
                </SubCard>

                <SubCard title="Ausbullen & Spielbeginn">
                  <ul className="space-y-2">
                    <li>• Vor Beginn des Spieles wird <strong>ausgebullt</strong></li>
                    <li>• Sieger ist derjenige, dessen Pfeil näher im Bull ist oder steckt</li>
                    <li>• Bei beiden Pfeilen im Innenbull oder Außenbull muss wiederholt werden</li>
                    <li>• Sieger entscheidet, wer das <strong>1. Leg</strong> beginnt</li>
                    <li>• Ein etwaiges <strong>3. Leg</strong> beginnt derjenige, der das 1. Leg begonnen hat</li>
                  </ul>
                </SubCard>

                <SubCard title="Übungswürfe">
                  <ul className="space-y-2">
                    <li>• Jeder Teilnehmer kann sich vor Turnierbeginn <strong>einwerfen</strong></li>
                    <li>• Vor dem Ausbullen: maximal <strong>9 Übungspfeile</strong> pro Teilnehmer</li>
                  </ul>
                </SubCard>
              </div>
            </SectionCard>

            <SectionCard icon={<Users className="w-5 h-5" />} title="Teilnahmebedingungen">
              <div className="space-y-3">
                <SubCard title="Allgemeine Bedingungen">
                  <ul className="space-y-2">
                    <li>• Teilnehmen darf jeder Spieler, der das <strong>16. Lebensjahr vollendet</strong> hat</li>
                    <li>• Gesamtpunkteanzahl kommt in die Wertung</li>
                    <li>• Jeder Spieler darf pro Turnier nur <strong>einmal genannt</strong> werden</li>
                    <li>• Persönliches Erscheinen vor Turnierbeginn ist <strong>Pflicht</strong></li>
                    <li>• Mindestens <strong>gegen zwei Gegner</strong> gespielt haben für Wertung</li>
                    <li>• <strong>Freilos</strong> gilt nicht als Gegner</li>
                  </ul>
                </SubCard>

                <SubCard title="Regelakzeptanz & Veröffentlichung">
                  <ul className="space-y-2">
                    <li>• Mit der Anmeldung werden die aktuellen <strong>EMD – LION Cup Regeln</strong> akzeptiert</li>
                    <li>• Verstoß kann zu einem <strong>Ausschluss</strong> führen</li>
                    <li>• Zustimmung zur <strong>Namensveröffentlichung</strong> in sämtlichen Publikationen</li>
                  </ul>
                </SubCard>

                <SubCard title="Wurfregeln">
                  Die Pfeile müssen mit <strong>einer Hand</strong>, auf den <strong>Füßen stehend</strong> und{" "}
                  <strong>ohne Hilfsmittel</strong> eigenständig geworfen werden. Die <strong>Abwurflinie darf nicht übertreten</strong> werden.
                </SubCard>
              </div>
            </SectionCard>

            <SectionCard icon={<Gavel className="w-5 h-5" />} title="Turnierregeln">
              <div className="space-y-3">
                <SubCard title="Auslosung & Paarungen">
                  <ul className="space-y-2">
                    <li>• Vor Turnierbeginn wird <strong>EINE</strong> angekündigte öffentliche Auslosung vorgenommen</li>
                    <li>• Es gibt <strong>keine gesetzten Spieler</strong></li>
                    <li>• Paarungen werden von der Turnierleitung eingetragen</li>
                  </ul>
                </SubCard>

                <SubCard title="Spielaufgabe & Weiterschreibung">
                  <ul className="space-y-2">
                    <li>• Aufgabe muss auf Turnierplan eingetragen werden (mit Zeitpunkt)</li>
                    <li>• Verlierer darf <strong>nicht als gewonnen</strong> weitergeschrieben werden</li>
                    <li>• Gegner ohne zu spielen weiterschreiben = <strong>Aufgabe für das Turnier</strong></li>
                    <li>• Aufgabe gegen die ersten zwei Gegner = Turnier <strong>nicht gewertet</strong></li>
                    <li>• <strong>Freilos</strong> gilt nicht als Gegner</li>
                  </ul>
                </SubCard>

                <SubCard title="Ergebnisse & Veröffentlichung">
                  Ergebnisse und Ranglisten werden <strong>fortlaufend</strong> geführt und <strong>einmal wöchentlich</strong> auf der Homepage veröffentlicht.
                </SubCard>
              </div>
            </SectionCard>

            <SectionCard icon={<Clock className="w-5 h-5" />} title="Spielablauf">
              <div className="space-y-3">
                <SubCard title="Pünktlichkeit & Spielbeginn">
                  <ul className="space-y-2">
                    <li>• Rechtzeitig vor Spielbeginn am Board einfinden</li>
                    <li>• Nichterscheinen innerhalb von <strong>5 Minuten</strong> = Match verloren</li>
                    <li>• Nicht zu Ende gespieltes Match = Match verloren</li>
                    <li>• Vorzeitiger Abbruch: <strong>Verlust aller Ansprüche</strong></li>
                  </ul>
                </SubCard>

                <SubCard title="Spielbereich & Verhalten">
                  <ul className="space-y-2">
                    <li>• Im Spielbereich: nur Spieler, Turnierleitung oder Schiedsrichter</li>
                    <li>• Gegenspieler in angemessenem Abstand hinter dem Werfer</li>
                    <li>• Störung des Werfers ist nicht erlaubt</li>
                    <li>• Max. <strong>20 Sekunden</strong> Zeit für 3 Pfeile</li>
                  </ul>
                </SubCard>

                <SubCard title="Pausen & Unterbrechungen">
                  <ul className="space-y-2">
                    <li>• Bei Pfeilschäden: max. <strong>5-minütige Pause</strong> (mit Zustimmung)</li>
                    <li>• Gleiches gilt für andere Gründe zum kurzfristigen Verlassen</li>
                  </ul>
                </SubCard>
              </div>
            </SectionCard>

            <SectionCard icon={<Shield className="w-5 h-5" />} title="Verhaltensregeln">
              <div className="space-y-3">
                <SubCard title="Allgemeine Verhaltensregeln">
                  <ul className="space-y-2">
                    <li>• Unsportliches Verhalten jeglicher Art ist strikt untersagt</li>
                    <li>• Selbst verantwortlich, sich informiert zu halten</li>
                    <li>• Absprachen / Preisgeldaufteilungen strikt untersagt</li>
                    <li>• Jegliche Wetten im EMD-LION Cup untersagt</li>
                  </ul>
                </SubCard>

                <SubCard title="Spielbereich-Regeln">
                  <ul className="space-y-2">
                    <li>• Während des Matches auf der Linie: Alkohol-, Ess- und Rauchverbot</li>
                    <li>• Spielbetrieb darf nicht negativ beeinflusst werden</li>
                    <li>• Hausordnung des Austragungslokals einhalten</li>
                  </ul>
                </SubCard>

                <SubCard tone="warn" title="Schwerwiegende Verstöße">
                  <ul className="space-y-2">
                    <li>• Androhung und Anwendung von Gewalt → strafrechtliche Verfolgung</li>
                    <li>• Diskriminierendes Verhalten untersagt</li>
                    <li>• Kann zu Ausschluss vom EMD – LION CUP führen</li>
                  </ul>
                </SubCard>
              </div>
            </SectionCard>

            <SectionCard icon={<Trophy className="w-5 h-5" />} title="Punktegleichstand">
              <SubCard tone="warn">
                Sollten die <strong>1.–5. Platzierten nach dem Finaltag punktegleich</strong> sein, werden diese zu einem{" "}
                <strong>Entscheidungsmatch</strong> eingeladen.
                <div className="mt-3 rounded-xl border border-yellow-200 bg-white p-3 text-sm text-yellow-900 font-semibold">
                  Spielmodus: 2 gewonnene Legs 501 Master Out
                </div>
              </SubCard>
            </SectionCard>

            <SectionCard icon={<Target className="w-5 h-5" />} title="Spielspezifische Regelung">
              <div className="space-y-3">
                <SubCard title="Dartspfeil-Spezifikationen">
                  <ul className="space-y-2">
                    <li>• Maximale Länge: <strong>20 cm</strong></li>
                    <li>• Maximales Gewicht: <strong>19 Gramm</strong></li>
                    <li>• Bestandteile: Plastikspitze, Barrel, Schaft und Flight</li>
                  </ul>
                </SubCard>

                <SubCard title="Automatenwertung">
                  <ul className="space-y-2">
                    <li>• Jeder Wurf, der vom Automaten gewertet wird, zählt</li>
                    <li>• Im Zweifelsfall hat der Automat Recht</li>
                    <li>• Ausnahme: Check-Darts, wenn Pfeil steckt, Automat nicht erkennt</li>
                  </ul>
                </SubCard>

                <SubCard title="Weitere Spielregeln">
                  <ul className="space-y-2">
                    <li>• Nach Ablauf der 20. Runde muss ausgebullt werden</li>
                    <li>• Gegenspieler darf weder werfen noch Wurfstellung einnehmen, solange Werfer im Bereich ist</li>
                  </ul>
                </SubCard>
              </div>
            </SectionCard>

            <SectionCard icon={<Camera className="w-5 h-5" />} title="Presse & Medienrechte">
              <div className="space-y-3">
                <SubCard title="Aufzeichnung & Veröffentlichung">
                  Einzelne Ranglisten- und Qualifikationsturniere sowie die <strong>Finalturniere</strong> werden via Video aufgezeichnet und veröffentlicht.
                  Dieses Material dient zur Auswertung des Events.
                </SubCard>

                <SubCard title="Einverständniserklärung">
                  Der Teilnehmer willigt ein, dass der Veranstalter (bis auf Widerruf) gemäß §78 KunstUrhG Fotos und Videos veröffentlicht.
                  <div className="mt-3 rounded-xl border border-gray-200 bg-white p-3">
                    <div className="font-black text-gray-900 mb-2">Rechte umfassen:</div>
                    <ul className="text-sm text-gray-700 space-y-1">
                      <li>• Sendung, Vortrag, Dokumentation</li>
                      <li>• Vor-/Aufführung & öffentliche Zugänglichkeit</li>
                      <li>• Vervielfältigung, Verbreitung, Wiedergabe</li>
                      <li>• Wiedergabe von Funksendungen</li>
                    </ul>
                  </div>
                </SubCard>
              </div>
            </SectionCard>

            <SectionCard icon={<Gavel className="w-5 h-5" />} title="Turnierleitung / Veranstalter">
              <div className="space-y-3">
                <SubCard title="Befugnisse & Verantwortlichkeiten">
                  <ul className="space-y-2">
                    <li>• Turnierleitung agiert selbstständig und fungiert auch als Schiedsrichter</li>
                    <li>• Entscheidungen sind bindend</li>
                    <li>• Rechtzeitig vor Ort anmelden</li>
                  </ul>
                </SubCard>

                <SubCard title="Turnierstart & Proteste">
                  <ul className="space-y-2">
                    <li>• Pünktlicher Start</li>
                    <li>• Proteste prompt melden, sonst ungültig</li>
                  </ul>
                </SubCard>
              </div>
            </SectionCard>

            <SectionCard icon={<Euro className="w-5 h-5" />} title="Wertung und Auszahlung">
              <div className="space-y-3">
                <SubCard title="Preispool-Zusammensetzung">
                  <ul className="space-y-2">
                    <li>• Pro Turnier/Teilnehmer gesammelte <strong>€ 4,00</strong></li>
                    <li>• Teilnahmebeitrag einmalig <strong>€ 5,00</strong></li>
                    <li>• Qualifizierte Teilnehmer einmalig <strong>€ 5,00</strong></li>
                    <li>• Wirt-Sponsoring bis 500 Teilnahmen: <strong>€ 100,00</strong></li>
                    <li>• Wirt-Sponsoring ab 501 Teilnahmen: <strong>€ 250,00</strong></li>
                  </ul>
                </SubCard>

                <SubCard title="Auszahlungsübersicht">
                  <div className="rounded-xl bg-white border border-gray-200 p-4">
                    <div className="font-black text-gray-900">100% Auszahlung nach Final-Spieltag</div>
                    <div className="text-sm text-gray-700 mt-1">1.–5. Platz obere & untere Tabelle</div>
                  </div>

                  <div className="mt-3 grid sm:grid-cols-2 gap-3">
                    <div className="rounded-xl bg-white border border-gray-200 p-4">
                      <div className="font-black text-gray-900 mb-2">Obere Tabelle (70%)</div>
                      <div className="space-y-1 text-sm text-gray-700">
                        {[
                          ["1. Platz", "30%"],
                          ["2. Platz", "25%"],
                          ["3. Platz", "20%"],
                          ["4. Platz", "15%"],
                          ["5. Platz", "10%"],
                        ].map(([l, r]) => (
                          <div key={l} className="flex justify-between">
                            <span>{l}:</span>
                            <span className="font-black">{r}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-xl bg-white border border-gray-200 p-4">
                      <div className="font-black text-gray-900 mb-2">Untere Tabelle (30%)</div>
                      <div className="space-y-1 text-sm text-gray-700">
                        {[
                          ["1. Platz", "30%"],
                          ["2. Platz", "25%"],
                          ["3. Platz", "20%"],
                          ["4. Platz", "15%"],
                          ["5. Platz", "10%"],
                        ].map(([l, r]) => (
                          <div key={l} className="flex justify-between">
                            <span>{l}:</span>
                            <span className="font-black">{r}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </SubCard>

                <SubCard tone="warn" title="Entscheidung bei Punktegleichheit">
                  <div className="text-sm">
                    <strong>Reihenfolge:</strong> 1. Tabellenpunkte → 2. Check-Punkte → 3. Antritte (zuletzt)
                  </div>
                </SubCard>
              </div>
            </SectionCard>

            {/* Footer Hinweis */}
            <motion.div variants={itemVariants} className="pb-6">
              <div className="rounded-2xl border border-gray-200/70 bg-white shadow-sm ring-1 ring-black/5 p-5 text-center">
                <p className="text-gray-600 text-xs sm:text-sm">
                  <strong>Druck- und Satzfehler vorbehalten!</strong>
                  <br />
                  Stand: Herbst 2025
                </p>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </main>

      <MobileBottomNav />
    </div>
  )
}