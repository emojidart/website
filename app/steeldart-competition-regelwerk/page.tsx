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
  BadgeCheck,
  Ban,
  ListChecks,
  Coins,
  Eye,
  Star,
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

export default function SummerSpecialRegelwerkPage() {
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
            <div className="rounded-3xl border border-gray-200/70 bg-white shadow-md ring-1 ring-black/5 overflow-hidden">
              <div className="p-5 sm:p-7">
                <div className="flex items-start gap-4">
                  <div className="shrink-0 rounded-2xl bg-orange-600 text-white p-3 shadow-sm">
                    <Crown className="w-6 h-6" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="inline-flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-black bg-orange-50 text-orange-700 border border-orange-100">
                        EMD – SUMMER SPECIAL K26
                      </span>
                      <span className="text-xs text-gray-500">Stand Sommer 2026</span>
                    </div>

                    <h1 className="mt-2 text-2xl sm:text-3xl font-black leading-tight">
                      Regelwerk & Prämierungsliste
                    </h1>

                    <p className="mt-1 text-sm sm:text-base text-gray-600">
                      Steeldart Tournament Competition Cup K26{" "}
                      <span className="font-semibold text-gray-900">09.06.2026 – 01.09.2026</span>
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

          <div className="space-y-4">
            <SectionCard icon={<FileText className="w-5 h-5" />} title="EMD Summer Special – Überblick">
              <div className="space-y-3">
                <SubCard tone="info" title="Where Champions are Made!">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white px-3 py-1 text-xs font-bold text-blue-900">
                      <Trophy className="w-4 h-4" />
                      13 Turniertage + 1 Mega-Finaltag
                    </span>
                    <span className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white px-3 py-1 text-xs font-bold text-blue-900">
                      <Calendar className="w-4 h-4" />
                      Jeden Dienstag
                    </span>
                    <span className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white px-3 py-1 text-xs font-bold text-blue-900">
                      <Clock className="w-4 h-4" />
                      19:00 Uhr
                    </span>
                  </div>
                </SubCard>

                <SubCard title="Finaltag">
                  <p>
                    Der <strong>Finaltag</strong> findet am <strong>Freitag, 04.09.2026</strong> um{" "}
                    <strong>19:00 Uhr</strong> statt.
                  </p>
                </SubCard>
              </div>
            </SectionCard>

            <SectionCard icon={<Star className="w-5 h-5" />} title="Bewerb – Eigenschaften EMD Summer Special">
              <div className="grid sm:grid-cols-2 gap-3">
                <SubCard>
                  <ul className="space-y-2">
                    <li>• <strong>Innovativ – Kreativ – Attraktiv</strong></li>
                    <li>• <strong>Competence – Focus – Win</strong></li>
                    <li>• <strong>Precision is Power</strong></li>
                  </ul>
                </SubCard>

                <SubCard>
                  <ul className="space-y-2">
                    <li>• <strong>Players – Passion – Performance</strong></li>
                    <li>• <strong>One Cup – One Champion – Your Moment</strong></li>
                    <li>• <strong>The combination of self-confidence and creativity</strong></li>
                  </ul>
                </SubCard>
              </div>
            </SectionCard>

            <SectionCard icon={<MapPin className="w-5 h-5" />} title="Austragungsort & Termine">
              <div className="grid sm:grid-cols-2 gap-3">
                <SubCard tone="info" title="Austragungsort">
                  <strong>Dart & Freizeit Vereinsheim „Pfeil-OK“ e.V.</strong>
                  <br />
                  Linzer Bundesstraße 16
                  <br />
                  5020 Salzburg
                </SubCard>

                <div className="space-y-3">
                  <SubCard tone="info" title="Periode des Bewerbes">
                    <div className="inline-flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-blue-700" />
                      <span className="font-semibold">09. Juni 2026 bis 01. September 2026</span>
                    </div>
                  </SubCard>

                  <SubCard tone="info" title="Spielzeit & Prozess">
                    <div className="space-y-2">
                      <div className="inline-flex items-center gap-2">
                        <Clock className="w-4 h-4 text-blue-700" />
                        <span>
                          <strong>Jeden Dienstag</strong> – 19:00 Uhr
                        </span>
                      </div>
                      <div className="inline-flex items-center gap-2">
                        <Trophy className="w-4 h-4 text-blue-700" />
                        <span className="font-semibold">13 Turniertage + 1 Mega-Finaltag</span>
                      </div>
                    </div>
                  </SubCard>
                </div>
              </div>
            </SectionCard>

            <SectionCard icon={<Users className="w-5 h-5" />} title="Leveleinstufung">
              <SubCard tone="success">
                <p className="text-sm">
                  <strong>Jeder kann teilnehmen</strong>, ausgenommen <strong>„A-Level Spieler“</strong>, um
                  unterschiedliche Spielstärken zu fördern und zu motivieren.
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
                    <li>• <strong>Turnierstartgeld pro Teilnahme:</strong> € 5,00</li>
                    <li>• <strong>Teilnahmebeitrag einmalig:</strong> € 10,00</li>
                    <li className="text-xs text-gray-600">Berechtigung für 13 Turniertage</li>
                  </ul>
                </SubCard>

                <SubCard title="Finaltag">
                  <ul className="space-y-2">
                    <li>• <strong>Qualifizierte Teilnehmer einmalig:</strong> € 5,00</li>
                    <li className="text-xs text-gray-600">Berechtigung für den Finaltag</li>
                  </ul>
                </SubCard>
              </div>
            </SectionCard>

            <SectionCard icon={<Target className="w-5 h-5" />} title="Starterfeld & Anmeldung">
              <SubCard>
                <p>
                  Um ein <strong>EMD Summer Special Steeldart Tournament Competition Serie Cup K26 Turnier</strong> zu
                  organisieren, müssen mindestens <strong>4 Teilnehmer</strong> mitspielen.
                </p>
                <p className="mt-2">
                  Die Spieler müssen sich mit <strong>vollem Namen anmelden</strong> und eingetragen werden.
                </p>
              </SubCard>
            </SectionCard>

            <SectionCard icon={<Trophy className="w-5 h-5" />} title="Punkte - Tabellenwertung">
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

                <SubCard title="Bonus Gewinner-Seite">
                  <strong>1. Platzierter von Gewinner-Seite:</strong> +5 Bonuspunkte zusätzlich
                </SubCard>

                <SubCard title="Teilnahme-Bonuspunkte">
                  <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="rounded-xl bg-white border border-gray-200 p-4 text-center">
                      <div className="text-2xl font-black text-orange-600">+2</div>
                      <div className="text-sm font-semibold text-gray-900 mt-1">5 Teilnahmen</div>
                    </div>

                    <div className="rounded-xl bg-white border border-gray-200 p-4 text-center">
                      <div className="text-2xl font-black text-orange-600">+5</div>
                      <div className="text-sm font-semibold text-gray-900 mt-1">8 Teilnahmen</div>
                    </div>

                    <div className="rounded-xl bg-white border border-gray-200 p-4 text-center">
                      <div className="text-2xl font-black text-orange-600">+8</div>
                      <div className="text-sm font-semibold text-gray-900 mt-1">11 Teilnahmen</div>
                    </div>

                    <div className="rounded-xl bg-white border border-gray-200 p-4 text-center">
                      <div className="text-2xl font-black text-orange-600">+12</div>
                      <div className="text-sm font-semibold text-gray-900 mt-1">Alle 13 gespielt</div>
                    </div>
                  </div>

                  <div className="mt-4 rounded-xl border border-orange-100 bg-orange-50 p-4">
                    <p className="text-sm text-orange-900 leading-relaxed">
                      Die Teilnahme-Bonuspunkte werden zusätzlich zur regulären Punktewertung vergeben und in die
                      Gesamttabelle eingerechnet.
                    </p>
                  </div>
                </SubCard>

                <SubCard tone="info" title="Tabellensystem">
                  Eine Tabelle bis zur Vollendung der <strong>13 Turniertage + 1 Finaltag</strong>.
                </SubCard>
              </div>
            </SectionCard>

            <SectionCard icon={<Calendar className="w-5 h-5" />} title="Antritte für Finaltag">
              <SubCard tone="success">
                Jeder <strong>EMD Summer Special Steeldart Tournament Competition Serie Cup K26 Teilnehmer</strong> kann
                jederzeit teilnehmen. Es gibt <strong>keine Mindestantritte</strong>. Jeder darf am Finaltag teilnehmen.
              </SubCard>
            </SectionCard>

            <SectionCard icon={<Target className="w-5 h-5" />} title="Spielmodus & Spielregeln">
              <div className="space-y-3">
                <SubCard title="Spielmodus">
                  Der Spielmodus am Turniertag ist <strong>501 Double Out</strong>.
                </SubCard>

                <SubCard title="Ausbullen & Spielbeginn">
                  <ul className="space-y-2">
                    <li>• Vor Beginn des Spieles wird <strong>ausgebullt</strong></li>
                    <li>• Sieger ist derjenige, dessen Pfeil näher im Bull ist oder steckt</li>
                    <li>• Bei beiden Pfeilen im Innenbull oder Außenbull muss wiederholt werden</li>
                    <li>• Sieger entscheidet, wer das <strong>1. Leg</strong> beginnt</li>
                    <li>• Ein etwaiges <strong>3. Leg</strong> beginnt wiederum mit Ausbullen</li>
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
                    <li>• Mit der Anmeldung werden die aktuellen <strong>EMD Summer Special K26 Regeln</strong> akzeptiert</li>
                    <li>• Verstoß kann zu einem <strong>Ausschluss</strong> führen</li>
                    <li>• Zustimmung zur <strong>Namensveröffentlichung</strong> in sämtlichen Publikationen</li>
                  </ul>
                </SubCard>

                <SubCard title="Wurfregeln">
                  Die Pfeile müssen mit <strong>einer Hand</strong>, auf den <strong>Füßen stehend</strong> und{" "}
                  <strong>ohne Hilfsmittel</strong> eigenständig geworfen werden. Die <strong>Abwurflinie darf nicht
                  übertreten</strong> werden.
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
                    <li>• Aufgabe muss auf Turnierplan eingetragen werden, inklusive genauem Zeitpunkt</li>
                    <li>• Verlierer darf <strong>nicht als gewonnen</strong> weitergeschrieben werden</li>
                    <li>• Gegner ohne zu spielen weiterschreiben = <strong>Aufgabe für das Turnier</strong></li>
                    <li>• Aufgabe gegen die ersten zwei Gegner = Turnier <strong>nicht gewertet</strong></li>
                    <li>• <strong>Freilos</strong> gilt nicht als Gegner</li>
                  </ul>
                </SubCard>

                <SubCard title="Ergebnisse & Veröffentlichung">
                  Ergebnisse und Ranglisten werden <strong>fortlaufend</strong> geführt und <strong>einmal wöchentlich</strong>{" "}
                  auf der Homepage veröffentlicht.
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
                    <li>• Maximal <strong>20 Sekunden</strong> Zeit für 3 Pfeile</li>
                  </ul>
                </SubCard>

                <SubCard title="Pausen & Unterbrechungen">
                  <ul className="space-y-2">
                    <li>• Bei Pfeilschäden: maximal <strong>5-minütige Pause</strong> mit Zustimmung</li>
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
                    <li>• Jeder Teilnehmer ist selbst verantwortlich, sich informiert zu halten</li>
                    <li>• Absprachen über Spielausgänge oder Preisgeldaufteilungen sind strikt untersagt</li>
                    <li>• Jegliche Wetten in puncto Spielausgang sind untersagt</li>
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
                    <li>• Kann zu Ausschluss vom EMD Summer Special K26 führen</li>
                  </ul>
                </SubCard>
              </div>
            </SectionCard>

            <SectionCard icon={<Trophy className="w-5 h-5" />} title="Punktegleichstand">
              <SubCard tone="warn">
                Sollten die <strong>1.–5. Platzierten nach dem Finaltag punktegleich</strong> sein, gilt folgende
                Reihenfolge:
                <div className="mt-3 rounded-xl border border-yellow-200 bg-white p-3 text-sm text-yellow-900 font-semibold">
                  1. Tabellenpunkte → 2. Check-Punkte → 3. Direktes Duell → 4. Antritte
                </div>
              </SubCard>
            </SectionCard>

            <SectionCard icon={<Target className="w-5 h-5" />} title="Spielspezifische Regelung">
              <div className="space-y-3">
                <SubCard title="Dartpfeil-Spezifikationen">
                  <ul className="space-y-2">
                    <li>• Maximale Länge: <strong>20 cm</strong></li>
                    <li>• Maximales Gewicht: <strong>30 Gramm</strong></li>
                    <li>• Bestandteile: Stahlspitze, Barrel, Schaft und Flight</li>
                  </ul>
                </SubCard>

                <SubCard title="Automatenwertung">
                  <ul className="space-y-2">
                    <li>• Jeder Wurf, der vom Automaten falsch gewertet wird, kann ausgebessert werden</li>
                    <li>• Dies gilt auch bei Check-Darts</li>
                    <li>• Nach Ablauf der 20. Runde muss ausgebullt werden</li>
                  </ul>
                </SubCard>

                <SubCard title="Weitere Spielregeln">
                  Solange sich ein Spieler im Wurfbereich befindet, darf sein Gegenspieler weder werfen noch eine
                  Wurfstellung einnehmen.
                </SubCard>
              </div>
            </SectionCard>

            <SectionCard icon={<Camera className="w-5 h-5" />} title="Presse & Medienrechte">
              <div className="space-y-3">
                <SubCard title="Aufzeichnung & Veröffentlichung">
                  Einzelne Ranglisten- und Qualifikationsturniere sowie die <strong>Finalturniere</strong> werden via
                  Video und fotografisch aufgezeichnet und veröffentlicht. Dieses Material dient zur Auswertung des
                  Events.
                </SubCard>

                <SubCard title="Einverständniserklärung">
                  Der Teilnehmer willigt ein, dass der Veranstalter, bis auf Widerruf, gemäß §78 KunstUrhG Fotos und
                  Videos veröffentlicht.
                  <div className="mt-3 rounded-xl border border-gray-200 bg-white p-3">
                    <div className="font-black text-gray-900 mb-2">Rechte umfassen:</div>
                    <ul className="text-sm text-gray-700 space-y-1">
                      <li>• Sendung, Vortrag, Dokumentation</li>
                      <li>• Vor-/Aufführung & öffentliche Zugänglichkeit</li>
                      <li>• Vervielfältigung, Verbreitung, Wiedergabe</li>
                      <li>• Wiedergabe von Bild- und Tonträgern sowie Funksendungen</li>
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
                    <li>• Pünktlicher Start laut Uhrzeit des Veranstalters</li>
                    <li>• Proteste müssen prompt gemeldet werden, sonst sind sie ungültig</li>
                  </ul>
                </SubCard>
              </div>
            </SectionCard>

            <SectionCard icon={<Euro className="w-5 h-5" />} title="Wertung und Auszahlung">
              <div className="space-y-3">
                <SubCard title="Preispool-Zusammensetzung">
                  <ul className="space-y-2">
                    <li>• Pro Qualifikationsturniertag und Finaltag pro Teilnehmer gesammelte <strong>€ 5,00</strong></li>
                    <li>• Teilnahmebeitrag einmalig <strong>€ 10,00</strong></li>
                    <li>• Qualifizierte Teilnehmer einmalig <strong>€ 5,00</strong></li>
                  </ul>
                </SubCard>

                <SubCard title="Auszahlungsübersicht">
                  <div className="rounded-xl bg-white border border-gray-200 p-4">
                    <div className="font-black text-gray-900">100% Auszahlung nach Finalspiel am Finaltag</div>
                    <div className="text-sm text-gray-700 mt-1">1.–3. Platzierung</div>
                  </div>

                  <div className="mt-3 grid sm:grid-cols-3 gap-3">
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

                  <div className="mt-3 grid sm:grid-cols-3 gap-3">
                    {["4.–5. Platzierung: Sachpreise", "Urkunden", "Überraschung"].map((item) => (
                      <div key={item} className="rounded-xl bg-orange-50 border border-orange-100 p-4 text-center">
                        <div className="text-sm font-black text-orange-900">{item}</div>
                      </div>
                    ))}
                  </div>
                </SubCard>
              </div>
            </SectionCard>

            <motion.div variants={itemVariants} className="pb-6">
              <div className="rounded-2xl border border-gray-200/70 bg-white shadow-sm ring-1 ring-black/5 p-5 text-center">
                <p className="text-gray-600 text-xs sm:text-sm">
                  <strong>Druck- und Satzfehler vorbehalten!</strong>
                  <br />
                  Stand: Sommer 2026
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
