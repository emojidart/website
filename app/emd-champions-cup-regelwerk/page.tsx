"use client"

import type React from "react"
import { Header } from "@/components/header"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"
import { motion } from "framer-motion"
import Image from "next/image"
import {
  Crown,
  Calendar,
  Clock,
  MapPin,
  Trophy,
  Euro,
  Users,
  Target,
  Shield,
  Camera,
  Gavel,
  ArrowLeft,
  FileText,
  BadgeCheck,
  Ban,
  ListChecks,
  Coins,
  Eye,
  Star,
  Shuffle,
  BarChart3,
  Smartphone,
  Bell,
  UserCheck,
  UserX,
  Swords,
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
  tone?: "neutral" | "info" | "warn" | "success" | "danger"
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
          : tone === "danger"
            ? "bg-red-50 border-red-100"
            : "bg-gray-50 border-gray-100"

  const titleCls =
    tone === "info"
      ? "text-blue-900"
      : tone === "warn"
        ? "text-yellow-900"
        : tone === "success"
          ? "text-emerald-900"
          : tone === "danger"
            ? "text-red-900"
            : "text-gray-900"

  return (
    <div className={`rounded-xl border p-4 ${toneCls}`}>
      {title ? <div className={`font-black mb-2 ${titleCls}`}>{title}</div> : null}
      <div className="text-sm text-gray-700 leading-relaxed">{children}</div>
    </div>
  )
}

export default function MembersChampionCupRegelwerkPage() {
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
          <motion.div variants={itemVariants} className="mb-4">
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-bold text-gray-700 shadow-sm hover:bg-gray-50"
            >
              <ArrowLeft className="w-4 h-4" />
              Zurück
            </Link>
          </motion.div>
		  
		  
		  
		  
		  
		  
		  


  {/* HERO */}
<motion.div variants={itemVariants} className="mb-6">
  <div className="relative rounded-3xl border border-gray-200/70 bg-white shadow-md ring-1 ring-black/5 overflow-hidden">
    
{/* LOGO */}
<div className="flex justify-center pt-6 pb-2">
  <Image
    src="/images/logo5.png"
    alt="EMD Logo"
    width={170}
    height={170}
    className="object-contain drop-shadow-xl"
    priority
  />
</div>

    <div className="p-5 sm:p-7 pt-2">
      <div className="flex items-start gap-4">
        <div className="shrink-0 rounded-2xl bg-orange-600 text-white p-3 shadow-sm">
          <Crown className="w-6 h-6" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="inline-flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-black bg-orange-50 text-orange-700 border border-orange-100">
              EMD – MEMBERS CHAMPION CUP
            </span>
            <span className="text-xs text-gray-500">Saison 2026/27</span>
          </div>

          <h1 className="mt-2 text-2xl sm:text-3xl font-black leading-tight">
            Offizielles Turnier- & Jahresreglement
          </h1>

          <p className="mt-1 text-sm sm:text-base text-gray-600">
            Vereinsinterne Turnierserie{" "}
            <span className="font-semibold text-gray-900">Juli 2026 – Juni 2027</span>
          </p>

          <div className="mt-4 rounded-2xl border border-orange-100 bg-orange-50 p-4">
            <p className="text-xs sm:text-sm text-orange-900 leading-relaxed">
              Der EMD Members Champion Cup ist eine ganzjährige, strukturierte Vereinsserie mit
              Steeldart, E-Dart, Partner-Zulosung, Einzelwertung und Finaltag.
            </p>
          </div>
        </div>
      </div>
    </div>

    <div className="h-1.5 w-full bg-gradient-to-r from-orange-500 via-orange-600 to-orange-700" />
  </div>
</motion.div>
		  
		  
		  
		  

          <div className="space-y-4">
            <SectionCard icon={<FileText className="w-5 h-5" />} title="Allgemeines">
              <div className="space-y-3">
                <SubCard tone="info" title="EMD Members Champion Cup 2026/27">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white px-3 py-1 text-xs font-bold text-blue-900">
                      <Calendar className="w-4 h-4" />
                      Juli 2026 – Juni 2027
                    </span>
                    <span className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white px-3 py-1 text-xs font-bold text-blue-900">
                      <Trophy className="w-4 h-4" />
                      Finale Juli 2027
                    </span>
                    <span className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white px-3 py-1 text-xs font-bold text-blue-900">
                      <Clock className="w-4 h-4" />
                      Monatlich
                    </span>
                  </div>
                </SubCard>

                <SubCard title="Grundidee">
                  <p>
                    Der <strong>EMD Members Champion Cup</strong> ist eine vereinsinterne kombinierte Dart-Turnierserie
                    zur Ermittlung des besten und konstantesten Spielers über ein gesamtes Jahr.
                  </p>
                  <p className="mt-2">
                    Das System verbindet <strong>Partner-Zulosung</strong>, <strong>Team League</strong>,{" "}
                    <strong>Einzelwertung</strong>, <strong>Jahresrangliste</strong> und einen abschließenden{" "}
                    <strong>Finaltag</strong>.
                  </p>
                </SubCard>

                <SubCard title="Disziplinen">
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div className="rounded-xl border border-gray-200 bg-white p-4">
                      <div className="font-black text-gray-900">Steeldart</div>
                      <div className="text-sm text-gray-700 mt-1">501 Double Out Team League</div>
                    </div>

                    <div className="rounded-xl border border-gray-200 bg-white p-4">
                      <div className="font-black text-gray-900">E-Dart</div>
                      <div className="text-sm text-gray-700 mt-1">501 Master Out Team League</div>
                    </div>
                  </div>
                </SubCard>
              </div>
            </SectionCard>

            <SectionCard icon={<Smartphone className="w-5 h-5" />} title="Anmeldung & Abmeldung">
              <div className="space-y-3">
                <SubCard tone="info" title="Anmeldung nur online">
                  <p>
                    Die Anmeldung erfolgt ausschließlich über die <strong>Vereins-Webseite</strong> oder die{" "}
                    <strong>VereinsApp</strong>.
                  </p>
                  <p className="mt-2">
                    Die Anmeldung wird am Turniertag mit einer <strong>Freischaltung</strong> aktiviert. Zusätzlich kann
                    eine <strong>Push-Benachrichtigung</strong> zur Erinnerung ausgesendet werden.
                  </p>
                </SubCard>

                <div className="grid sm:grid-cols-2 gap-3">
                  <SubCard tone="success" title="Anmeldezeitraum">
                    <div className="flex items-start gap-2">
                      <Bell className="w-4 h-4 mt-0.5 text-emerald-700" />
                      <div>
                        <strong>Am Turniertag von 07:00 Uhr bis 17:00 Uhr</strong>
                        <br />
                        Anmeldung über Vereins-Webseite oder VereinsApp.
                      </div>
                    </div>
                  </SubCard>

                  <SubCard tone="warn" title="Abmeldung">
                    <div className="flex items-start gap-2">
                      <UserX className="w-4 h-4 mt-0.5 text-yellow-700" />
                      <div>
                        <strong>Am Turniertag bis spätestens 14:00 Uhr</strong>
                        <br />
                        Abmeldung über Vereins-Webseite oder VereinsApp.
                      </div>
                    </div>
                  </SubCard>
                </div>

                <SubCard tone="danger" title="Anmeldung ohne Antritt">
                  <p>
                    Meldet sich ein Spieler über die Vereins-Webseite oder VereinsApp an und tritt am Turniertag nicht
                    an, wird als Sanktion <strong>einmalig seine schlechteste Platzierung gelöscht</strong>.
                  </p>
                  <p className="mt-2">
                    Diese Regel dient der Planungssicherheit und soll verhindern, dass Startplätze blockiert werden.
                  </p>
                </SubCard>

                <SubCard tone="warn" title="Ungerade Teilnehmeranzahl">
                  <p>
                    Bei einer ungeraden Anzahl an Anmeldungen kann es vorkommen, dass der zuletzt angemeldete Spieler
                    nicht teilnehmen kann. Ein Anspruch auf Teilnahme besteht in diesem Fall nicht.
                  </p>
                </SubCard>
              </div>
            </SectionCard>

            <SectionCard icon={<BarChart3 className="w-5 h-5" />} title="Leistungstabelle & Einteilung">
              <div className="space-y-3">
                <SubCard tone="info" title="Grundlage der Leistungstabelle">
                  <p>
                    Die Einteilung erfolgt anhand der <strong>letzten zwei Sport-Darts-Meisterschaft-Saisonen</strong>{" "}
                    sowie der vereinseigenen <strong>EMD Statistiktabellen</strong> auf der Vereins-Webseite.
                  </p>
                  <p className="mt-2">
                    Dadurch sollen faire Teams entstehen und deutliche Leistungsunterschiede bestmöglich ausgeglichen
                    werden.
                  </p>
                </SubCard>

                <div className="grid sm:grid-cols-3 gap-3">
                  <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4 text-center">
                    <div className="font-black text-emerald-900">Anfänger</div>
                    <div className="text-xs text-gray-700 mt-1">Einsteiger / Aufbauklasse</div>
                  </div>

                  <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-center">
                    <div className="font-black text-blue-900">Fortgeschrittene</div>
                    <div className="text-xs text-gray-700 mt-1">solide Turniererfahrung</div>
                  </div>

                  <div className="rounded-xl border border-orange-100 bg-orange-50 p-4 text-center">
                    <div className="font-black text-orange-900">Experten</div>
                    <div className="text-xs text-gray-700 mt-1">starke Leistungsgruppe</div>
                  </div>
                </div>

                <SubCard title="Ziel der Einteilung">
                  <ul className="space-y-2">
                    <li>• faire Partner-Zulosung</li>
                    <li>• ausgeglichene Teams</li>
                    <li>• keine festen Leistungscluster</li>
                    <li>• mehr Spannung und Chancengleichheit im Wettbewerb</li>
                  </ul>
                </SubCard>
              </div>
            </SectionCard>

            <SectionCard icon={<Shuffle className="w-5 h-5" />} title="Turnierstruktur & Partner-Zulosung">
              <div className="space-y-3">
                <SubCard title="Monatsturniere">
                  <ul className="space-y-2">
                    <li>• Insgesamt <strong>12 Turniere</strong></li>
                    <li>• <strong>6 × Steeldart</strong></li>
                    <li>• <strong>6 × E-Dart</strong></li>
                    <li>• Abwechselnd gespielt</li>
                    <li>• Teilnahme offen für alle EMD Vereinsmitglieder</li>
                  </ul>
                </SubCard>

                <SubCard tone="success" title="Partner-Zulosung">
                  <p>
                    Zu Beginn jedes Turniers werden die Teilnehmer neu zu <strong>Zweierteams</strong> zusammengestellt.
                    Die Zulosung erfolgt unter Berücksichtigung der offiziellen EMD Leistungstabellen.
                  </p>
                </SubCard>

                <SubCard tone="info" title="Offizielle Zulosungsregel">
                  <p>
                    Die Partner-Zulosung erfolgt auf Basis der offiziellen <strong>EMD Leistungstabellen</strong>.
                  </p>

                  <p className="mt-2">
                    Spieler der höchsten Leistungstabelle werden grundsätzlich Spielern der niedrigeren Leistungsgruppen
                    zugelost, um möglichst ausgeglichene Teams zu gewährleisten.
                  </p>

                  <p className="mt-2">
                    Die mittlere Leistungstabelle dient dabei als <strong>flexible Ausgleichsgruppe</strong>. Spieler
                    dieser Tabelle können – abhängig von Teilnehmeranzahl und Verteilung der Leistungsgruppen – sowohl der
                    stärkeren als auch der schwächeren Gruppe zugeordnet werden.
                  </p>

                  <p className="mt-2">Vor jeder Auslosung wird daher geprüft:</p>

                  <ul className="mt-2 space-y-1">
                    <li>• Anzahl der starken Spieler</li>
                    <li>• Anzahl der schwächeren Spieler</li>
                    <li>• Anzahl der Spieler der mittleren Tabelle</li>
                  </ul>

                  <p className="mt-2">
                    Die mittlere Tabelle wird anschließend entsprechend aufgeteilt, um möglichst ausgeglichene
                    Partner-Konstellationen zu ermöglichen.
                  </p>

                  <p className="mt-2">
                    Erst danach erfolgt die zufällige Partner-Zulosung innerhalb der gebildeten Gruppen.
                  </p>

                  <p className="mt-2">
                    Die Turnierleitung behält sich organisatorische Anpassungen vor, sofern diese zur Sicherstellung eines
                    fairen Wettbewerbs erforderlich sind.
                  </p>
                </SubCard>

                <SubCard tone="info" title="Zulosungsgruppen">
                  <div className="grid sm:grid-cols-3 gap-3">
                    <div className="rounded-xl border border-orange-100 bg-white p-4 text-center">
                      <div className="font-black text-orange-900">Tabelle 1</div>
                      <div className="text-sm font-bold text-gray-900 mt-1">Stark</div>
                      <div className="text-xs text-gray-700 mt-1">höchste Leistungsgruppe</div>
                    </div>

                    <div className="rounded-xl border border-blue-100 bg-white p-4 text-center">
                      <div className="font-black text-blue-900">Tabelle 2</div>
                      <div className="text-sm font-bold text-gray-900 mt-1">Mitte</div>
                      <div className="text-xs text-gray-700 mt-1">flexible Ausgleichsgruppe</div>
                    </div>

                    <div className="rounded-xl border border-emerald-100 bg-white p-4 text-center">
                      <div className="font-black text-emerald-900">Tabelle 3</div>
                      <div className="text-sm font-bold text-gray-900 mt-1">Schwach</div>
                      <div className="text-xs text-gray-700 mt-1">niedrigere Leistungsgruppe</div>
                    </div>
                  </div>
                </SubCard>

                <SubCard title="Ablauf der Zulosung">
                  <ol className="space-y-2 list-decimal list-inside">
                    <li>Alle angemeldeten Spieler werden nach ihrer Leistungstabelle erfasst.</li>
                    <li>Die Anzahl der starken, mittleren und schwächeren Spieler wird geprüft.</li>
                    <li>Spieler aus Tabelle 2 werden bei Bedarf der stärkeren oder schwächeren Gruppe zugeteilt.</li>
                    <li>Danach werden zwei möglichst gleich große Zulosungsgruppen gebildet.</li>
                    <li>Aus jeder Gruppe wird anschließend per Zufall ein Spieler zu einem Doppelteam gelost.</li>
                  </ol>
                </SubCard>

                <SubCard tone="success" title="Beispiel 1 – ausgeglichene Verteilung">
                  <p>
                    Sind zum Beispiel <strong>4 starke</strong>, <strong>4 mittlere</strong> und{" "}
                    <strong>4 schwächere</strong> Spieler angemeldet, werden die 4 mittleren Spieler per Zufall
                    aufgeteilt.
                  </p>

                  <ul className="mt-2 space-y-2">
                    <li>• 2 mittlere Spieler werden der stärkeren Gruppe zugeordnet</li>
                    <li>• 2 mittlere Spieler werden der schwächeren Gruppe zugeordnet</li>
                    <li>• danach wird jeweils ein Spieler aus Gruppe A mit einem Spieler aus Gruppe B zusammengelost</li>
                  </ul>
                </SubCard>
				
				
				
				

                <SubCard tone="warn" title="Beispiel 2 – zu wenig schwächere Spieler">
  <p>
    Sind zum Beispiel <strong>6 starke</strong>, <strong>4 mittlere</strong> und{" "}
    <strong>2 schwächere</strong> Spieler angemeldet, werden alle Spieler der mittleren Tabelle
    der schwächeren Gruppe zugeteilt.
  </p>

  <p className="mt-2">
    Dadurch entstehen zwei gleich große Zulosungsgruppen:
  </p>

  <ul className="mt-2 space-y-1">
    <li>• Gruppe A: 6 starke Spieler</li>
    <li>• Gruppe B: 2 schwächere + 4 mittlere Spieler</li>
  </ul>

  <p className="mt-2">
    Anschließend erfolgt die zufällige Partner-Zulosung zwischen beiden Gruppen.
  </p>
</SubCard>
				
				
				
				

                <SubCard title="Zielsetzung">
                  <ul className="space-y-2">
                    <li>• faire und ausgeglichene Doppel-Teams</li>
                    <li>• stärkere Spieler werden möglichst mit schwächeren Spielern kombiniert</li>
                    <li>• mittlere Spieler gleichen fehlende Teilnehmergruppen flexibel aus</li>
                    <li>• keine festen Partner oder fixen Leistungscluster</li>
                    <li>• mehr Spannung und Chancengleichheit im Wettbewerb</li>
                    <li>• jeder Spieler sammelt trotzdem Punkte für seine Einzelwertung</li>
                  </ul>
                </SubCard>
              </div>
            </SectionCard>

            <SectionCard icon={<Users className="w-5 h-5" />} title="Gruppenphase">
              <div className="space-y-3">
                <SubCard title="Round Robin">
                  <ul className="space-y-2">
                    <li>• Gruppenphase im Round-Robin-System</li>
                    <li>• <strong>3–5 Teams pro Gruppe</strong></li>
                    <li>• Jeder gegen jeden</li>
                    <li>• Modus: <strong>Best of 3 Legs</strong></li>
                  </ul>
                </SubCard>

                <SubCard title="Aufstieg">
                  <p>
                    Die Anzahl der aufsteigenden Teams richtet sich nach der Gesamtteilnehmerzahl und der daraus
                    resultierenden Gruppengröße.
                  </p>
                  <p className="mt-2">
                    Pro Gruppe qualifizieren sich entsprechend viele Teams für die <strong>DKO-Phase</strong>.
                  </p>
                </SubCard>

                <SubCard tone="warn" title="Ausscheiden in der Gruppenphase">
                  <p>
                    Die letztplatzierten Teams einer Gruppe scheiden aus. Je nach Gruppengröße betrifft das das letzte
                    Team oder die letzten zwei Teams.
                  </p>
                  <p className="mt-2">
                    Ausgeschiedene Teams werden leistungsgerecht gemäß Gruppenplatzierung in der Turnierwertung
                    eingestuft.
                  </p>
                </SubCard>
              </div>
            </SectionCard>

            <SectionCard icon={<Swords className="w-5 h-5" />} title="DKO-Phase">
              <div className="space-y-3">
                <SubCard title="Double-Knockout-System">
                  <p>
                    Die DKO-Phase besteht aus zwei parallelen Turnierbäumen:
                  </p>

                  <div className="mt-3 grid sm:grid-cols-2 gap-3">
                    <div className="rounded-xl border border-gray-200 bg-white p-4">
                      <div className="font-black text-gray-900">Winners Bracket</div>
                      <div className="text-sm text-gray-700 mt-1">Gewinnerseite</div>
                    </div>

                    <div className="rounded-xl border border-gray-200 bg-white p-4">
                      <div className="font-black text-gray-900">Losers Bracket</div>
                      <div className="text-sm text-gray-700 mt-1">Verliererseite</div>
                    </div>
                  </div>
                </SubCard>

                <SubCard title="Grundregel">
                  <ul className="space-y-2">
                    <li>• Alle qualifizierten Teilnehmer starten im Winners Bracket</li>
                    <li>• Verlierer wechseln ins Losers Bracket</li>
                    <li>• Erst die zweite Niederlage bedeutet das endgültige Ausscheiden</li>
                    <li>• Gewinner im Losers Bracket kämpfen sich Richtung Finale zurück</li>
                  </ul>
                </SubCard>

                <SubCard tone="info" title="Finale & Reset-Match">
                  <ul className="space-y-2">
                    <li>• Sieger Winners Bracket gegen Sieger Losers Bracket</li>
                    <li>• Gewinnt der Winners-Bracket-Spieler das erste Finale, ist er Turniersieger</li>
                    <li>• Gewinnt der Losers-Bracket-Spieler, kommt es zum Reset-Match</li>
                    <li>• Das zweite Finale entscheidet endgültig</li>
                  </ul>
                </SubCard>

                <SubCard title="Matchformat">
                  <strong>Best of 5</strong> in der DKO-Phase, inklusive Halbfinale und Finale.
                </SubCard>
              </div>
            </SectionCard>

            <SectionCard icon={<Trophy className="w-5 h-5" />} title="Jahreswertung">
  <div className="space-y-3">
    <SubCard title="Grundprinzip">
      <p>
        Jeder Spieler sammelt im Laufe der Saison Punkte aus den gewerteten Turnieren. Für die Jahreswertung
        zählen jedoch nur die <strong>besten 8 Ergebnisse</strong> eines Spielers.
      </p>
    </SubCard>

    <SubCard title="Platzierungspunkte">
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {[
          ["1. Platz", "100 Punkte"],
          ["2. Platz", "95 Punkte"],
          ["3. Platz", "85 Punkte"],
          ["4. Platz", "70 Punkte"],
          ["alle 5. Platzierten", "50 Punkte"],
          ["alle 7. Platzierten", "35 Punkte"],
          ["alle 9. Platzierten", "25 Punkte"],
          ["alle 13. Platzierten", "15 Punkte"],
          ["alle 17. Platzierten", "10 Punkte"],
        ].map(([platz, punkte]) => (
          <div key={platz} className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="text-sm font-black text-gray-900">{platz}</div>
            <div className="mt-1 text-xl font-black text-orange-600">{punkte}</div>
          </div>
        ))}
      </div>
    </SubCard>

    <SubCard tone="success" title="Top-8-Regel">
      <ul className="space-y-2">
        <li>• Spieler können an beliebig vielen Turnieren teilnehmen</li>
        <li>• Nur die 8 punktbesten Resultate fließen in die Jahreswertung ein</li>
        <li>• Schwächere Ergebnisse werden automatisch gestrichen</li>
        <li>• Qualität und Konstanz werden stärker belohnt als reine Teilnahmehäufigkeit</li>
      </ul>
    </SubCard>

    <SubCard title="Laufende Rangliste">
      <ul className="space-y-2">
        <li>• Rangliste wird auf der EMD Vereins-Webseite / VereinsApp geführt</li>
        <li>• Nach jedem Turnier erfolgt ein Update</li>
        <li>• Neue starke Ergebnisse können ältere schwächere Resultate verdrängen</li>
        <li>• Spieler können sich laufend verbessern</li>
      </ul>
    </SubCard>
  </div>
</SectionCard>
			
			
			
			
			
			
			
			
			

            <SectionCard icon={<ListChecks className="w-5 h-5" />} title="Kriterien bei Punktegleichheit">
              <SubCard tone="warn">
                <ol className="space-y-2 list-decimal list-inside">
                  <li>Anzahl der Turniersiege</li>
                  <li>Beste Einzelplatzierung</li>
                  <li>Direkter Vergleich</li>
                  <li>Gesamt-Leg-Differenz</li>
                  <li>3-Dart-Average als Saisondurchschnitt</li>
                  <li>Anzahl der Teilnahmen als letzter Faktor</li>
                </ol>
              </SubCard>
            </SectionCard>

            <SectionCard icon={<Euro className="w-5 h-5" />} title="Startgeld & Preisverteilung">
              <div className="space-y-3">
                <SubCard title="Qualifikationsturniere">
                  <p>
                    Für die Teilnahme an den Qualifikationsturnieren wird ein Startgeld von{" "}
                    <strong>€ 15,00 pro Spieler und Turniertag</strong> erhoben.
                  </p>

                  <div className="mt-3 grid sm:grid-cols-2 gap-3">
                    <div className="rounded-xl border border-gray-200 bg-white p-4">
                      <div className="font-black text-gray-900">€ 10,00</div>
                      <div className="text-sm text-gray-700 mt-1">fließen in den Finalpreisfonds</div>
                    </div>

                    <div className="rounded-xl border border-gray-200 bg-white p-4">
                      <div className="font-black text-gray-900">€ 5,00</div>
                      <div className="text-sm text-gray-700 mt-1">werden am jeweiligen Turniertag ausgeschüttet</div>
                    </div>
                  </div>
                </SubCard>

                <SubCard title="Monatliche Ausschüttung">
                  <div className="grid sm:grid-cols-3 gap-3">
                    {[
                      ["1. Platz", "50%"],
                      ["2. Platz", "30%"],
                      ["3. Platz", "20%"],
                    ].map(([place, percent]) => (
                      <div key={place} className="rounded-xl bg-white border border-gray-200 p-4 text-center">
                        <div className="text-2xl font-black text-orange-600">{percent}</div>
                        <div className="text-sm font-bold text-gray-900 mt-1">{place}</div>
                      </div>
                    ))}
                  </div>
                </SubCard>

                <SubCard title="Finaltag">
                  <ul className="space-y-2">
                    <li>• Startgeld am Finaltag: <strong>€ 10,00 pro Spieler</strong></li>
                    <li>• Dieses Startgeld wird zu <strong>100%</strong> in den Finalpreisfonds eingebracht</li>
                    <li>• Der Finalpreisfonds besteht aus Qualifikationsbeiträgen plus Finaltag-Beiträgen</li>
                  </ul>
                </SubCard>

                <SubCard title="Finalpreisfonds – Ausschüttung">
                  <div className="grid sm:grid-cols-3 gap-3">
                    {[
                      ["1. Platz", "50%"],
                      ["2. Platz", "30%"],
                      ["3. Platz", "20%"],
                    ].map(([place, percent]) => (
                      <div key={place} className="rounded-xl bg-white border border-gray-200 p-4 text-center">
                        <div className="text-2xl font-black text-orange-600">{percent}</div>
                        <div className="text-sm font-bold text-gray-900 mt-1">{place}</div>
                      </div>
                    ))}
                  </div>
                </SubCard>
              </div>
            </SectionCard>

            <SectionCard icon={<Coins className="w-5 h-5" />} title="Auszeichnungen">
              <div className="grid sm:grid-cols-3 gap-3">
                <SubCard tone="success" title="Top 3">
                  Pokale für die Top 3 Spieler des gesamten EMD Members Champion Cup 2026/27.
                </SubCard>

                <SubCard tone="info" title="Top 5">
                  Urkunden für die Top 5 Spieler des gesamten EMD Members Champion Cup 2026/27.
                </SubCard>

                <SubCard tone="warn" title="Offizieller Titel">
                  EMD Members Champion Cup Sieger 2026/27.
                </SubCard>
              </div>
            </SectionCard>

            <SectionCard icon={<Shield className="w-5 h-5" />} title="Teilnahmebedingungen & Verhalten">
              <div className="space-y-3">
                <SubCard title="Teilnahmevoraussetzungen">
                  <ul className="space-y-2">
                    <li>• Teilnahme offen für EMD Vereinsmitglieder</li>
                    <li>• Anmeldung über Vereins-Webseite oder VereinsApp erforderlich</li>
                    <li>• Mit Anmeldung werden Vereins- und Turnierregeln akzeptiert</li>
                    <li>• Fairer und sportlicher Umgang mit Mitspielern und Veranstaltern ist Pflicht</li>
                  </ul>
                </SubCard>

                <SubCard title="Haftung & Organisation">
                  <p>
                    Der Veranstalter behält sich organisatorische Änderungen vor, sofern diese für einen reibungslosen
                    Ablauf erforderlich sind. Dazu zählen Spielmodus, Zeitplan oder organisatorische Anpassungen.
                  </p>
                </SubCard>
              </div>
            </SectionCard>

            <SectionCard icon={<Camera className="w-5 h-5" />} title="Medien & Veröffentlichung">
              <SubCard>
                Mit der Teilnahme erklären sich die Spieler damit einverstanden, dass Ergebnisse sowie gegebenenfalls
                Bild- und Videoaufnahmen im Rahmen der Turnierberichterstattung veröffentlicht werden dürfen.
              </SubCard>
            </SectionCard>

            <SectionCard icon={<Gavel className="w-5 h-5" />} title="Schlussbestimmungen">
              <div className="space-y-3">
                <SubCard title="Verbindlichkeit">
                  <p>
                    Mit der Anmeldung und Teilnahme am <strong>EMD Members Champion Cup 2026/27</strong> erkennt jeder
                    Spieler dieses Regelwerk in vollem Umfang als verbindlich an.
                  </p>
                </SubCard>

                <SubCard title="Änderungen">
                  <p>
                    Der Veranstalter behält sich das Recht vor, Anpassungen oder Ergänzungen des Regelwerks vorzunehmen,
                    sofern dies aus organisatorischen, sportlichen oder sonstigen wichtigen Gründen erforderlich ist.
                  </p>
                </SubCard>

                <SubCard tone="warn" title="Turnierleitung">
                  <p>
                    Bei Punktgleichheit, strittigen Fällen oder organisatorischen Fragen entscheidet die Turnierleitung
                    unter Berücksichtigung der festgelegten Regeln.
                  </p>
                </SubCard>
              </div>
            </SectionCard>

            <motion.div variants={itemVariants} className="pb-6">
              <div className="rounded-2xl border border-gray-200/70 bg-white shadow-sm ring-1 ring-black/5 p-5 text-center">
                <p className="text-gray-600 text-xs sm:text-sm">
                  <strong>Druck- und Satzfehler vorbehalten!</strong>
                  <br />
                  Stand: Saison 2026/27
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
