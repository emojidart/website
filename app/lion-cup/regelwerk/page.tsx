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
    <div className="min-h-screen overflow-x-hidden bg-[#f5f6f8] pb-24 text-slate-950 font-sans md:pb-0">
      <Header />

      <main className="pt-14 sm:pt-16">
        <motion.div
          className="w-full max-w-none px-2 py-3 sm:px-4 sm:py-5 lg:px-5 xl:px-6 2xl:px-8"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.div variants={itemVariants} className="mb-4 sm:mb-5">
            <section className="relative overflow-hidden rounded-[24px] border border-slate-800/10 bg-slate-950 shadow-[0_24px_80px_-42px_rgba(15,23,42,0.62)] sm:rounded-[28px] xl:rounded-[30px]">
              <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-orange-500/20 blur-3xl" />
              <div className="relative p-4 sm:p-6 lg:p-8 xl:p-9">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.07]">
                    <Crown className="h-6 w-6 text-orange-400" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-orange-300">
                        EMD – LION CUP Part 3
                      </span>
                      <span className="text-xs font-medium text-white/45">Herbst 2026 · New Edition</span>
                    </div>

                    <h1 className="mt-3 text-3xl font-black tracking-[-0.04em] text-white sm:text-4xl lg:text-5xl">
                      Regelwerk & Prämierung
                    </h1>

                    <p className="mt-3 max-w-3xl text-sm font-medium leading-6 text-white/55 sm:text-base">
                      Qualifikationsserie vom 08.09.2026 bis 08.12.2026 mit 14 Qualifikationsturnieren und einem Mega-Finaltag.
                    </p>
                  </div>
                </div>
              </div>
            </section>
          </motion.div>

          <div className="space-y-4">
            <SectionCard icon={<Calendar className="h-5 w-5" />} title="Zeitraum, Termine & Austragungsort">
              <div className="grid gap-3 lg:grid-cols-3">
                <SubCard tone="info" title="Zeitraum">
                  <strong>08.09.2026 – 08.12.2026</strong>
                </SubCard>

                <SubCard tone="info" title="Spieltag">
                  Jeden <strong>Dienstag um 19:30 Uhr</strong>
                </SubCard>

                <SubCard tone="info" title="Austragungsort">
                  <strong>Dart & Freizeit Vereinsheim „Pfeil-OK“</strong>
                  <br />
                  Linzer Bundesstraße 16
                  <br />
                  5020 Salzburg
                </SubCard>
              </div>

              <div className="mt-3 rounded-[18px] border border-orange-100 bg-orange-50 p-4">
                <div className="flex items-center gap-2 font-black text-orange-900">
                  <Trophy className="h-4 w-4" />
                  14 Qualifikationsturniere + 1 Mega-Finaltag
                </div>
              </div>
            </SectionCard>

            <SectionCard icon={<Users className="h-5 w-5" />} title="Teilnahme">
              <div className="grid gap-3 md:grid-cols-2">
                <SubCard title="Teilnahmebedingungen">
                  <ul className="space-y-2">
                    <li>• Teilnahme ab <strong>16 Jahren</strong></li>
                    <li>• <strong>A-Level-Spieler</strong> grundsätzlich ausgeschlossen</li>
                    <li>• Ausnahmen nur durch Entscheidung der Turnierleitung</li>
                    <li>• Mindestens <strong>4 Teilnehmer</strong> pro Turnier</li>
                    <li>• Persönliches Erscheinen vor Turnierbeginn ist erforderlich</li>
                  </ul>
                </SubCard>

                <SubCard tone="success" title="Final-Qualifikation">
                  <ul className="space-y-2">
                    <li>• Für die Finalwertung sind mindestens <strong>3 Antritte</strong> erforderlich.</li>
                    <li>• Es gibt nur <strong>eine Gesamttabelle</strong>.</li>
                    <li>• Eine Aufteilung in Tabelle A und Tabelle B findet nicht mehr statt.</li>
                  </ul>
                </SubCard>
              </div>
            </SectionCard>

            <SectionCard icon={<Euro className="h-5 w-5" />} title="Startgeld & Serienbeitrag">
              <div className="grid gap-3 md:grid-cols-3">
                <SubCard title="Serienanmeldung">
                  <div className="text-2xl font-black text-slate-950">€ 10</div>
                  <p className="mt-1 text-xs text-slate-500">einmalig für die Serie</p>
                </SubCard>

                <SubCard title="Je Spieltag">
                  <div className="text-2xl font-black text-slate-950">€ 5</div>
                  <p className="mt-1 text-xs text-slate-500">Startgeld pro Qualifikationsturnier</p>
                </SubCard>

                <SubCard title="Finaltag">
                  <div className="text-2xl font-black text-slate-950">€ 10 + € 5</div>
                  <p className="mt-1 text-xs text-slate-500">Finalbeitrag + Startgeld</p>
                </SubCard>
              </div>
            </SectionCard>

            <SectionCard icon={<Target className="h-5 w-5" />} title="Spielmodus">
              <div className="grid gap-3 md:grid-cols-2">
                <SubCard title="Qualifikation">
                  <ul className="space-y-2">
                    <li>• Abwechselnd <strong>501 Double Out</strong> und <strong>501 Master Out</strong></li>
                    <li>• Vor jedem Spiel wird <strong>ausgebullt</strong></li>
                  </ul>
                </SubCard>

                <SubCard title="Finaltag">
                  <ul className="space-y-2">
                    <li>• Finaltag: <strong>Best of 5 · 501 Double Out</strong></li>
                    <li>• Die am Finaltag erspielten Punkte fließen zusätzlich in die <strong>Turnierserien-Gesamtwertung</strong> ein.</li>
                  </ul>
                </SubCard>
              </div>
            </SectionCard>

            <SectionCard icon={<Trophy className="h-5 w-5" />} title="Punktewertung">
              <div className="space-y-3">
                <SubCard title="Grundwertung">
                  <ul className="space-y-2">
                    <li>• Letzter Platz: <strong>10 Punkte</strong></li>
                    <li>• Jede bessere Platzierung: <strong>+2 Punkte</strong></li>
                    <li>• Ergebnis-Punkte kommen zusätzlich dazu</li>
                    <li>• Sieger der Gewinnerseite: <strong>+5 Bonuspunkte</strong></li>
                  </ul>
                </SubCard>

                <SubCard tone="warn" title="Einmalige Punkteteilung">
                  Nach dem <strong>7. Spieltag</strong> werden die bis dahin erspielten Gesamtpunkte aller Teilnehmer
                  <strong> einmalig halbiert</strong>. Danach läuft dieselbe Gesamttabelle ohne weitere Teilung weiter.
                </SubCard>
              </div>
            </SectionCard>

            <SectionCard icon={<ListChecks className="h-5 w-5" />} title="Gesamttabelle & Serienwertung">
              <div className="grid gap-3 md:grid-cols-2">
                <SubCard title="Eine Gesamttabelle">
                  <ul className="space-y-2">
                    <li>• Es gibt während der gesamten Serie nur <strong>eine Tabelle</strong>.</li>
                    <li>• Es gibt keine Aufteilung in obere und untere Tabelle.</li>
                    <li>• Die Finalpunkte werden in die Serienwertung übernommen.</li>
                  </ul>
                </SubCard>

                <SubCard tone="success" title="Preisgeldberechtigte Gesamtwertung">
                  Für die LION-CUP-Serienauszahlung nach dem Finaltag werden die <strong>ersten 8 Plätze der Gesamttabelle</strong> berücksichtigt.
                </SubCard>
              </div>
            </SectionCard>

            <SectionCard icon={<Flag className="h-5 w-5" />} title="Finaltag & Anwesenheitspflicht">
              <div className="space-y-3">
                <SubCard tone="warn" title="Finaltag ist verpflichtend">
                  Für qualifizierte Spieler ist die Teilnahme am Finaltag grundsätzlich <strong>verpflichtend</strong>.
                  Bei nachweisbaren gesundheitlichen Gründen kann die Turnierleitung eine Ausnahme akzeptieren.
                </SubCard>

                <div className="grid gap-3 md:grid-cols-2">
                  <SubCard title="Platz 1 bis 4">
                    Wer ohne anerkannten gesundheitlichen Grund nicht zum Finaltag erscheint, erhält einen Abzug von
                    <strong> 20 % der Gesamtpunkte</strong>.
                  </SubCard>

                  <SubCard title="Alle weiteren qualifizierten Spieler">
                    Wer ohne anerkannten gesundheitlichen Grund nicht zum Finaltag erscheint, erhält einen Abzug von
                    <strong> 10 % der Gesamtpunkte</strong>.
                  </SubCard>
                </div>
              </div>
            </SectionCard>

            <SectionCard icon={<Coins className="h-5 w-5" />} title="Preisgeld am Finaltag">
              <div className="space-y-3">
                <SubCard tone="info" title="Finaltag – Teilnahme & Startgeld">
                  Am Finaltag kann <strong>jeder Spieler teilnehmen</strong>. Pro Teilnehmer werden am Finaltag
                  <strong> € 10 Finalbeitrag + € 5 Startgeld</strong> bezahlt.
                </SubCard>

                <SubCard tone="success" title="Tagespreisgeld aus den Startgeldern">
                  Die am Finaltag eingenommenen <strong>€ 5 Startgelder</strong> bilden den Tages-Preispool.
                  Dieser wird noch am Finaltag zu <strong>100 %</strong> an die ersten drei Plätze ausgeschüttet:
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {[
                      ["1. Platz", "50 %"],
                      ["2. Platz", "30 %"],
                      ["3. Platz", "20 %"],
                    ].map(([place, share]) => (
                      <div key={place} className="rounded-[16px] border border-emerald-100 bg-white p-3 text-center">
                        <div className="text-xs font-bold text-slate-500">{place}</div>
                        <div className="mt-1 text-xl font-black text-emerald-700">{share}</div>
                      </div>
                    ))}
                  </div>
                </SubCard>

                <SubCard title="Zusätzliche Vereinsprämie – Platz 4 bis 12">
                  Zusätzlich stellt der Verein einen Prämienbetrag von <strong>bis zu € 250</strong> bereit.
                  Für die Finalplatzierungen <strong>4 bis 12</strong> sind jeweils <strong>€ 25 pro Spieler</strong> vorgesehen.
                </SubCard>

                <SubCard tone="warn" title="Wichtig: Finaltag und Serienauszahlung sind getrennt">
                  Das Tagespreisgeld des Finaltags und die Vereinsprämien sind <strong>nicht</strong> die Auszahlung der
                  LION-CUP-Gesamtserie. Die Serienauszahlung und Siegerehrung erfolgen <strong>im Anschluss an den Finaltag</strong>.
                </SubCard>
              </div>
            </SectionCard>

            <SectionCard icon={<Crown className="h-5 w-5" />} title="LION CUP – Serienauszahlung & Siegerehrung">
              <div className="space-y-3">
                <SubCard tone="success" title="Top 8 der Gesamttabelle">
                  Nach Abschluss des Finaltags werden die <strong>ersten 8 Plätze der Gesamttabelle</strong> ausgezeichnet
                  und aus dem für die Turnierserie vorgesehenen Gesamt-Preispool ausbezahlt.
                </SubCard>

                <SubCard title="Faire Verteilung des Serien-Preispools">
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {[
                      ["1. Platz", "22 %"],
                      ["2. Platz", "18 %"],
                      ["3. Platz", "15 %"],
                      ["4. Platz", "13 %"],
                      ["5. Platz", "11 %"],
                      ["6. Platz", "9 %"],
                      ["7. Platz", "7 %"],
                      ["8. Platz", "5 %"],
                    ].map(([place, share]) => (
                      <div key={place} className="rounded-[16px] border border-slate-200 bg-white p-3 text-center">
                        <div className="text-xs font-bold text-slate-500">{place}</div>
                        <div className="mt-1 text-lg font-black text-slate-950">{share}</div>
                      </div>
                    ))}
                  </div>

                  <p className="mt-3 text-xs text-slate-500">
                    Die Prozentwerte beziehen sich auf den tatsächlich vorhandenen Serien-Preispool und ergeben zusammen 100 %.
                  </p>
                </SubCard>
              </div>
            </SectionCard>

            <SectionCard icon={<Gavel className="h-5 w-5" />} title="Turnier- & Verhaltensregeln">
              <div className="grid gap-3 lg:grid-cols-2">
                <SubCard title="Spielbetrieb">
                  <ul className="space-y-2">
                    <li>• Vor Turnierbeginn gibt es eine öffentliche Auslosung.</li>
                    <li>• Es gibt keine gesetzten Spieler.</li>
                    <li>• Freilose gelten nicht als gespielter Gegner.</li>
                    <li>• Ergebnisse und Ranglisten werden fortlaufend geführt.</li>
                  </ul>
                </SubCard>

                <SubCard title="Fair Play">
                  <ul className="space-y-2">
                    <li>• Unsportliches Verhalten ist untersagt.</li>
                    <li>• Absprachen und Preisgeldaufteilungen sind nicht erlaubt.</li>
                    <li>• Entscheidungen der Turnierleitung sind bindend.</li>
                    <li>• Die Hausordnung des Austragungslokals ist einzuhalten.</li>
                  </ul>
                </SubCard>
              </div>
            </SectionCard>

            <SectionCard icon={<Camera className="h-5 w-5" />} title="Presse & Medien">
              <SubCard>
                Im Rahmen der Turnierserie können Fotos und Videos erstellt und für Vereins- und Veranstaltungszwecke
                veröffentlicht werden. Bestehende Widerrufs- und Persönlichkeitsrechte bleiben unberührt.
              </SubCard>
            </SectionCard>

            <motion.div variants={itemVariants} className="pb-6">
              <div className="rounded-[22px] border border-slate-200 bg-white p-5 text-center shadow-[0_14px_42px_-36px_rgba(15,23,42,0.45)]">
                <p className="text-xs text-slate-500 sm:text-sm">
                  <strong>Druck- und Satzfehler vorbehalten.</strong>
                  <br />
                  Stand: Herbst 2026
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
