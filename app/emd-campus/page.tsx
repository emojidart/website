"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { Header } from "@/components/header"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"
import { CampusRegistrationModal } from "@/components/campus-registration-modal"
import { motion } from "framer-motion"
import {
  Target,
  Users,
  Trophy,
  Calendar,
  MapPin,
  Clock,
  Info,
  CheckCircle2,
  ArrowRight,
  CalendarDays,
} from "lucide-react"

/* ---------------- animations ---------------- */

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
}

const itemVariants = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 120, damping: 14 } },
}

/* ---------------- small ui helpers ---------------- */

function Chip({
  children,
  tone = "gray",
}: {
  children: React.ReactNode
  tone?: "gray" | "orange" | "blue" | "emerald" | "amber" | "slate" | "purple" | "red" | "green"
}) {
  const cls =
    tone === "orange"
      ? "bg-orange-50 text-orange-900 border-orange-200"
      : tone === "blue"
        ? "bg-blue-50 text-blue-900 border-blue-200"
        : tone === "emerald"
          ? "bg-emerald-50 text-emerald-900 border-emerald-200"
          : tone === "green"
            ? "bg-green-50 text-green-900 border-green-200"
            : tone === "purple"
              ? "bg-purple-50 text-purple-900 border-purple-200"
              : tone === "red"
                ? "bg-red-50 text-red-900 border-red-200"
                : tone === "amber"
                  ? "bg-amber-50 text-amber-900 border-amber-200"
                  : tone === "slate"
                    ? "bg-slate-50 text-slate-800 border-slate-200"
                    : "bg-gray-50 text-gray-800 border-gray-200"

  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-black px-2.5 py-1 rounded-full border ${cls}`}>
      {children}
    </span>
  )
}

function SectionTitle({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: any
  title: string
  subtitle?: string
}) {
  return (
    <div className="flex items-start justify-between gap-3 mb-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-2xl bg-orange-50 border border-orange-200 flex items-center justify-center">
            <Icon className="w-4.5 h-4.5 text-orange-700" />
          </div>
          <h2 className="text-base sm:text-lg font-black text-gray-900">{title}</h2>
        </div>
        {subtitle ? <p className="text-xs sm:text-sm text-gray-500 mt-1">{subtitle}</p> : null}
      </div>
    </div>
  )
}

function AgeTab({
  active,
  label,
  onClick,
  tone,
}: {
  active: boolean
  label: string
  onClick: () => void
  tone: "red" | "blue" | "purple"
}) {
  const activeCls =
    tone === "red"
      ? "bg-gradient-to-r from-red-500 to-red-600 text-white border-red-200"
      : tone === "blue"
        ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white border-blue-200"
        : "bg-gradient-to-r from-purple-500 to-purple-600 text-white border-purple-200"

  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "h-10 px-4 rounded-xl border text-sm font-black transition active:scale-[0.98]",
        active ? `${activeCls} shadow-sm` : "bg-white text-gray-800 border-gray-200 hover:bg-gray-50",
      ].join(" ")}
    >
      {label}
    </button>
  )
}

/* ---------------- page ---------------- */

export default function App() {
  const [selectedAge, setSelectedAge] = useState<"kids" | "junior" | "teens">("kids")
  const [isRegistrationOpen, setIsRegistrationOpen] = useState(false)

  const kidsModules = [
    {
      modul: 1,
      thema: "Grundhaltung & Spaß",
      inhalte: "Begrüßungsrunde, Sicherheitsregeln, Grundhaltung, lockere Wurfspiele",
      ablauf:
        "10min. Begrüßung & Warm-up • 15min. Sicherheits- & Haltungs-Basics • 25min. Wurf- & Fangspiel mit Softbällen + erste Dartwürfe • 10min. Wer trifft Farbe?",
      lernziele: "Sicherheit, Spaß, Bewegung, erste Wurferfahrung",
      dauer: "60 Min",
    },
    {
      modul: 2,
      thema: "Zieltraining Basis",
      inhalte: "Board-Basics, Zahlen & Felder, Zielpunkte-Spiel, Konzentration",
      ablauf:
        "5min. Warm-up • 10min. Board zeigen/lernen • 20min. Zielpunkte-Spiel (20-5-1) • 15min. Fokus-Übung (3 ruhige Würfe/Kind) • 10min. Abschlussrunde",
      lernziele: "Zonen kennen, kontrolliertes Werfen, Fokus",
      dauer: "60 Min",
    },
    {
      modul: 3,
      thema: "Scoring Einstieg",
      inhalte: "Zahlen 1–10, 10er-Ziele, Wurfserien",
      ablauf:
        "5min. Warm-up • 10min. Zahlenquiz • 20min. 10-20-30 Spiel • 15min. Wurfserien (3 Würfe) • 10min. Mini-Challenge",
      lernziele: "Zahlen merken, Punktsystem, Serien werfen",
      dauer: "60 Min",
    },
    {
      modul: 4,
      thema: "Doppel spielerisch",
      inhalte: "Doppel-Fangspiel, Doppel-Ringe, Rhythmus",
      ablauf:
        "5min. Warm-up Spiel • 10min. Doppel-Jagd (Bodenmarken) • 20min. Doppel-Ringe werfen • 15min. Rhythmus-Würfe • 10min. Team-Miniwettbewerb",
      lernziele: "Doppel-Zonen, Teamgefühl, Rhythmus",
      dauer: "60 Min",
    },
    {
      modul: 5,
      thema: "Technik Mini",
      inhalte: "Stand, Armbewegung, Routinen",
      ablauf:
        "5min. Warm-up • 15min. Stand (Markierung) • 15min. Armtechnik • 15min. Routine '3 gute Würfe' • 10min. Technik-Detektiv",
      lernziele: "Haltung, Basiswurf, Routine",
      dauer: "60 Min",
    },
    {
      modul: 6,
      thema: "Mini-Matchphase",
      inhalte: "301 Soft, Punkte-Rennen, Fair Play",
      ablauf:
        "5min. Warm-up • 10min. Punkte-Rennen (Start 50) • 30min. Mini-301 (mit Hilfestellung) • 15min. Fair-Play-Rituale & Team lob",
      lernziele: "Matchgefühl, Punkte reduzieren, Fairness",
      dauer: "60 Min",
    },
    {
      modul: 7,
      thema: "Sommer-Cup",
      inhalte: "Fun-Cup, Teamspiele, Medaillen",
      ablauf: "5min. Warm-up • 15min. Zielstaffel • 30min. Fun-Cup Stationen • 10min. Medaillen & Teamfoto",
      lernziele: "Wettbewerb mit Spaß, Teamstärke",
      dauer: "60 Min",
    },
    {
      modul: 8,
      thema: "Feinschliff",
      inhalte: "Balance, Wiederholung, Spieldisziplin",
      ablauf: "5min. Balance-Warm-up • 15min. Balance-Würfe • 25min. Lieblings-Drills • 15min. Disziplin-Challenges",
      lernziele: "Körpergefühl, Wiederholung, Disziplin",
      dauer: "60 Min",
    },
    {
      modul: 9,
      thema: "Ziel & Konzentration",
      inhalte: "Zielstrecken, Fokus, Mentalspiele",
      ablauf:
        "5min. ruhiges Warm-up • 15min. Zielreihen (Farben/Zahlen) • 20min. 3-Wurf-Fokus-Duell • 10min. Atem/Visualisierung • 10min. Reflexion",
      lernziele: "Konzentration, Reihenfolgen, mentale Stärke",
      dauer: "60 Min",
    },
    {
      modul: 10,
      thema: "Leg-Einstieg",
      inhalte: "Mini-Legs, Zählen, Teamduelle",
      ablauf: "5min. Warm-up • 10min. Zähl-Basics • 25min. Mini-Legs (101) • 15min. Team-Duels",
      lernziele: "Legs verstehen, rechnen üben",
      dauer: "60 Min",
    },
    {
      modul: 11,
      thema: "Turnier",
      inhalte: "Kids-League, Motivation, Selbstbewusstsein",
      ablauf: "10min. Warm-up • 10min. Turniererklärung • 35min. Turnier (Gruppen/KO) • 10min. Lobkarten/Feedback",
      lernziele: "Wettbewerbserfahrung, Selbstvertrauen",
      dauer: "60 Min",
    },
    {
      modul: 12,
      thema: "Abschluss",
      inhalte: "Skill-Test, Feedback, Urkunden",
      ablauf: "5min. Warm-up • 15min. Skill-Test • 25min. Kids-Wunsch-Mini-Turnier • 10min. Urkunden & Feedback Runde",
      lernziele: "Erfolg erleben, Stolz, Motivation",
      dauer: "60 Min",
    },
  ]

  const juniorModules = [
    {
      modul: 1,
      thema: "Grundlagen & Analyse",
      inhalte: "Stand, Griff, erste Wurfanalyse, Sicherheit",
      ablauf: "10min. Warm-up & Regeln • 10min. Technikcheck • 25min. Wurfstationen • 20min. Testspiel • 10min. Feedback",
      lernziele: "Grundlagen kennen, Startniveau erfassen",
      dauer: "75 Min",
    },
    {
      modul: 2,
      thema: "Ziel & Rhythmus",
      inhalte: "Zielstationen, Farben/Nummern, Wurfrhythmus",
      ablauf: "10min. Warm-up Spiele • 15min. Zielstationen • 30min. Rhythmuswürfe • 15min. Challenge • 5min. Cooldown",
      lernziele: "Zielkontrolle, ruhiger Rhythmus",
      dauer: "75 Min",
    },
    {
      modul: 3,
      thema: "Scoring-System",
      inhalte: "60+ Spiel, Zahlen, Scoring-Serien",
      ablauf:
        "10min. Warm-up Zahlen • 15min. 60+/80/100-Game • 25min. Serien 3×3 • 20min. Punkte-Race • 5min. Reflexion",
      lernziele: "Punkte erkennen, Scoring-Tempo",
      dauer: "75 Min",
    },
    {
      modul: 4,
      thema: "Checkout Basics",
      inhalte: "Doppel-Grundlagen, Wege 32-80",
      ablauf: "10min. Warm-up Doppel • 15min. Wege 32-80 • 30min. Doppel-Ringe • 15min. Doppel-Challenge • 5min. Abschluss",
      lernziele: "Checkout-Wege verstehen, Doppel treffen",
      dauer: "75 Min",
    },
    {
      modul: 5,
      thema: "Match Grundlagen",
      inhalte: "Druckspiele, Routine, Basics",
      ablauf: "10min. Warm-up • 15min. Druckspiel (3für1) • 30min. Routine • 15min. Mini-Match • 5min. Fair-Play-Feedback",
      lernziele: "Wettkampfdruck üben, Routine",
      dauer: "75 Min",
    },
    {
      modul: 6,
      thema: "Liga Vorbereitung",
      inhalte: "Matcharten, Team, Shot-Clock",
      ablauf: "10min. Warm-up Team • 10min. Matchformen • 35min. Team-Matches • 15min. Shot-Clock • 5min. Reflexion",
      lernziele: "Liga-Abläufe kennen, Zeitmanagement",
      dauer: "75 Min",
    },
    {
      modul: 7,
      thema: "Sommer-Liga",
      inhalte: "Gruppenspiele, Turnier-Feeling",
      ablauf: "10min. Warm-up • 10min. Gruppenwahl • 45min. Liga-Runs • 10min. Medaillen/Sticker • 5min. Fotos",
      lernziele: "Fairer Wettkampf, Motivation",
      dauer: "75 Min",
    },
    {
      modul: 8,
      thema: "Technik-Feinschliff",
      inhalte: "Videoanalyse, Technikstationen",
      ablauf: "10min. Balance-Warm-up • 15min. Video • 25min. Stationen • 20min. Wiederholungsdrills • 5min. Talk",
      lernziele: "Technik stabilisieren, Selbstkorrektur",
      dauer: "75 Min",
    },
    {
      modul: 9,
      thema: "Check-out Aufbau",
      inhalte: "2-Dart-Wege, Finish-Training",
      ablauf: "10min. Warm-up • 10min. 2-Dart Wege • 25min. Checkout-Runden • 25min. Finish-Race • 5min. Feedback",
      lernziele: "Effiziente Finishs, Clutch-Fokus",
      dauer: "75 Min",
    },
    {
      modul: 10,
      thema: "Taktik",
      inhalte: "Leg-Planung, Gegner lesen",
      ablauf: "10min. Warm-up • 15min. Taktikboard • 30min. Taktik-Matches • 15min. Gegneranalyse • 5min. Feedback",
      lernziele: "Strategisches Spielen",
      dauer: "75 Min",
    },
    {
      modul: 11,
      thema: "Turnierphase",
      inhalte: "Turnierablauf, Mentalrituale",
      ablauf: "10min. Warm-up • 10min. Erklärung • 45min. Gruppen/KO • 10min. Mental-Routine • 5min. Fair-Play",
      lernziele: "Wettkampfroutine, mentale Stärke",
      dauer: "75 Min",
    },
    {
      modul: 12,
      thema: "Abschluss",
      inhalte: "Skill-Test, Feedback, Zertifikate",
      ablauf: "10min. Warm-up • 15min. Skill Tests • 35min. Mini-Turnier • 10min. Urkunden • 5min. Fotos",
      lernziele: "Erfolg zeigen, Motivation, Stolz",
      dauer: "75 Min",
    },
  ]

  const teensModules = [
    {
      modul: 1,
      thema: "Analyse & Zielsetting",
      inhalte: "Technik-Videoanalyse, persönliche Saisonziele",
      ablauf: "10min. Warm-up Games • 20min. Video Technik Check • 30min. Wurf-Analyse & Übungen • 20min. Zielplan • 10min. Reflexion",
      lernziele: "Technikbasis & Leistungsziele definieren",
      dauer: "90 Min",
    },
    {
      modul: 2,
      thema: "Technik Foundation",
      inhalte: "Stand, Arm-Timing, Wurf-Sequenz",
      ablauf: "10min. Warm-up • 20min. Stand/Balance Drills • 30min. Arm-Routinen • 20min. Wiederholung • 10min. Stretch",
      lernziele: "Bewegungsökonomie & Konstanz",
      dauer: "90 Min",
    },
    {
      modul: 3,
      thema: "Scoring Aufbau",
      inhalte: "80+ Training, Serien, Tempokontrolle",
      ablauf: "10min. Warm-up Zahlen • 20min. 80+/100+ Drills • 40min. Scoring-Serien Spiele • 15min. Tempo-Sprints • 5min. Review",
      lernziele: "Kontrolle unter Tempo & Druck",
      dauer: "90 Min",
    },
    {
      modul: 4,
      thema: "Finishing Basics",
      inhalte: "Doppel-Ziele, Finish-System 40–80",
      ablauf: "10min. Warm-up Doppel • 20min. Checkout Theorie • 40min. Doppel/Finish Drills • 15min. Pressure-Games • 5min. Feedback",
      lernziele: "Strukturiertes Finishing",
      dauer: "90 Min",
    },
    {
      modul: 5,
      thema: "Matchroutine",
      inhalte: "Pre-Shot Routine, Fokus-Reset",
      ablauf: "5min. Aktivierung • 15min. Mental Warm-Up • 30min. Routine-Training • 30min. Match-Simulation • 10min. Talk",
      lernziele: "Mentale Stabilität & Match-Rituale",
      dauer: "90 Min",
    },
    {
      modul: 6,
      thema: "Taktik & Scoring Routes",
      inhalte: "Wegeplanung, Risiko-/Sicherheitsspiel",
      ablauf: "10min. Warm-up • 20min. Taktikboard • 40min. Strategie-Legs • 15min. Team-Analyse • 5min. Fazit",
      lernziele: "Smarte Entscheidung im Match",
      dauer: "90 Min",
    },
    {
      modul: 7,
      thema: "Liga-Simulation",
      inhalte: "Shot-Clock, Gruppenphase, KO",
      ablauf: "10min. Warm-up • 10min. Regeln • 60min. Liga-Runde • 10min. Review",
      lernziele: "Wettkampfroutine & Disziplin",
      dauer: "90 Min",
    },
    {
      modul: 8,
      thema: "Technik-Feinschliff",
      inhalte: "Slow-Motion Video, Feinkorrektur",
      ablauf: "10min. Warm-up Balance • 20min. Video Slow-Mo • 40min. Technik-Stationen • 15min. Progress-Check • 5min. Cooldown",
      lernziele: "Präzision & Stabilität",
      dauer: "90 Min",
    },
    {
      modul: 9,
      thema: "Check Out Advance",
      inhalte: "2-Dart & 3-Dart Wege",
      ablauf: "10min. Warm-up • 20min. Finish-Pläne • 40min. Endgame-Sets • 15min. Finish-Duelle • 5min. Reset",
      lernziele: "Effiziente Wege + Druckfinishes",
      dauer: "90 Min",
    },
    {
      modul: 10,
      thema: "Peak & Power Session",
      inhalte: "High-Intensity Training",
      ablauf: "10min. Warm-up • 60min. Hoch intensive Serien & Challenges • 15min. Cooldown • 5min. Atemtechnik",
      lernziele: "Wettkampf-Peak erzeugen",
      dauer: "90 Min",
    },
    {
      modul: 11,
      thema: "Turnierphase",
      inhalte: "Academy Cup – Pro Format",
      ablauf: "10min. Warm-up • 70min. Gruppen & KO Matches • 10min. Analyse",
      lernziele: "Turnierstärke, Ergebnisse abrufen",
      dauer: "90 Min",
    },
    {
      modul: 12,
      thema: "Abschluss & Bewertung",
      inhalte: "Skill-Tests, Feedback, Zertifikate",
      ablauf: "10min. Warm-up • 20min. Skill Tests • 50min. Final Matches • 10min. Awards & Reflection",
      lernziele: "Entwicklung sichtbar, Motivation, Goals next cycle",
      dauer: "90 Min",
    },
  ]

  const modules = useMemo(() => {
    if (selectedAge === "kids") return kidsModules
    if (selectedAge === "junior") return juniorModules
    return teensModules
  }, [selectedAge])

  const ageInfo = useMemo(() => {
    if (selectedAge === "kids")
      return { title: "Kids (6–10 Jahre)", subtitle: "Mini-Darters", tone: "red" as const, duration: "60 Minuten" }
    if (selectedAge === "junior")
      return { title: "Junior (11–15 Jahre)", subtitle: "Young-Talents", tone: "blue" as const, duration: "75 Minuten" }
    return { title: "Teens (15–18 Jahre)", subtitle: "Future-Pros", tone: "purple" as const, duration: "90 Minuten" }
  }, [selectedAge])

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <Header />
      <div className="h-12 sm:h-14" aria-hidden="true" />

      <motion.main
        className="mx-auto w-full px-4 py-6 sm:py-8 max-w-2xl lg:max-w-screen-xl 2xl:max-w-screen-2xl"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* HERO */}
        <motion.section variants={itemVariants} className="rounded-3xl border border-orange-200 bg-white shadow-2xl overflow-hidden">
          <div className="relative bg-gradient-to-br from-orange-500 via-orange-600 to-orange-700 text-white">
            <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_25%_20%,rgba(255,255,255,0.35),transparent_55%),radial-gradient(circle_at_70%_30%,rgba(255,255,255,0.18),transparent_55%),radial-gradient(circle_at_50%_90%,rgba(255,255,255,0.20),transparent_60%)]" />
            <div className="relative p-5 sm:p-8">
              <div className="flex items-center justify-center mb-5">
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white/10 border border-white/20 backdrop-blur flex items-center justify-center">
                  <Target className="w-8 h-8 sm:w-9 sm:h-9 text-white" />
                </div>
              </div>

              <div className="text-center">
                <div className="inline-flex items-center gap-2 bg-yellow-400 text-orange-950 px-3 py-1.5 rounded-full font-black text-xs mb-3">
                  <Trophy className="w-3.5 h-3.5" />
                  <span>YOUNG TALENT PROGRAMM 2026</span>
                </div>

                <h1 className="text-2xl sm:text-3xl lg:text-5xl font-black leading-tight">
                  EMD – CAMPUS
                  <span className="block text-orange-200">NACHWUCHS AKADEMIE</span>
                </h1>

                <p className="mt-3 text-sm sm:text-base text-orange-100 font-semibold">
                  Dein Weg zum Dart-Champion – strukturiert, modern & vereinsnah.
                </p>

                <div className="mt-5 flex flex-wrap justify-center gap-2">
                  <Chip tone="orange">
                    <Calendar className="w-3.5 h-3.5" />
                    Jänner – Dezember 2026
                  </Chip>
                  <Chip tone="gray">
                    <MapPin className="w-3.5 h-3.5" />
                    Vereinsheim Pfeil-OK • Salzburg
                  </Chip>
                  <Chip tone="emerald">
                    <Users className="w-3.5 h-3.5" />
                    Kids • Junior • Teens
                  </Chip>
                </div>

                <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
                  <button
                    type="button"
                    onClick={() => setIsRegistrationOpen(true)}
                    className="h-12 px-5 rounded-2xl bg-white text-orange-700 font-black shadow-sm active:scale-[0.99]"
                  >
                    Jetzt anmelden
                  </button>

                  <a
                    href="#moduleplan"
                    className="h-12 px-5 rounded-2xl border border-white/30 bg-white/10 text-white font-black flex items-center justify-center active:scale-[0.99]"
                  >
                    Modulplan ansehen
                  </a>
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 sm:p-6 bg-white">
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 sm:p-5">
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-2xl bg-orange-50 border border-orange-200 flex items-center justify-center">
                  <Info className="w-5 h-5 text-orange-700" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-black text-gray-900">Kurz erklärt</p>
                  <p className="text-sm text-gray-700 mt-1 leading-relaxed">
                    12 Module über 12 Monate – je Altersgruppe angepasst. Fokus auf Technik, Zieltraining, mentale Stärke
                    und faire Wettkampfroutine.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </motion.section>

        {/* TERMIN-HIGHLIGHT OBEN */}
        <motion.section variants={itemVariants} className="mt-6">
          <div className="rounded-3xl overflow-hidden border border-orange-300 bg-white shadow-xl">
            <div className="bg-gradient-to-r from-orange-500 via-orange-600 to-red-500 p-4 sm:p-6 text-white">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                  <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-[11px] font-black uppercase tracking-wider backdrop-blur">
                    <CalendarDays className="h-3.5 w-3.5" />
                    Wichtige Termine 2026
                  </div>

                  <h2 className="mt-3 text-xl sm:text-2xl lg:text-3xl font-black leading-tight">
                    Infotag: Samstag, 10. Januar 2026
                  </h2>

                  <div className="mt-3 flex flex-col gap-2 text-sm sm:text-base text-orange-50 font-semibold">
                    <span className="inline-flex items-center gap-2">
                      <Clock className="h-4 w-4 shrink-0" />
                      14:00 Uhr
                    </span>
                    <span className="inline-flex items-center gap-2">
                      <MapPin className="h-4 w-4 shrink-0" />
                      Vereinsheim Pfeil-OK e.V. • Linzer Bundesstraße 16 • 5020 Salzburg
                    </span>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Chip tone="green">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Gratis & unverbindlich
                    </Chip>
                    <Chip tone="orange">
                      <Calendar className="w-3.5 h-3.5" />
                      Starttraining ab 18. Januar 2026
                    </Chip>
                  </div>
                </div>

                <div className="shrink-0">
                  <Link
                    href="/emd-campus/termine"
                    className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-black text-orange-700 shadow-sm transition hover:bg-orange-50"
                  >
                    Alle Termine ansehen
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            </div>

            <div className="grid gap-3 border-t border-orange-100 bg-orange-50/60 p-4 sm:grid-cols-3 sm:p-5">
              <div className="rounded-2xl border border-orange-200 bg-white p-4">
                <p className="text-[11px] font-black uppercase tracking-wider text-gray-500">Infotag</p>
                <p className="mt-1 text-sm font-black text-gray-900">10. Januar 2026</p>
                <p className="mt-1 text-sm text-orange-700 font-semibold">14:00 Uhr</p>
              </div>

              <div className="rounded-2xl border border-orange-200 bg-white p-4">
                <p className="text-[11px] font-black uppercase tracking-wider text-gray-500">Trainingsstart</p>
                <p className="mt-1 text-sm font-black text-gray-900">18. Januar 2026</p>
                <p className="mt-1 text-sm text-orange-700 font-semibold">ab 14:00 Uhr</p>
              </div>

              <div className="rounded-2xl border border-orange-200 bg-white p-4">
                <p className="text-[11px] font-black uppercase tracking-wider text-gray-500">Terminübersicht</p>
                <p className="mt-1 text-sm font-black text-gray-900">alle geplanten Sonntage</p>
                <p className="mt-1 text-sm text-orange-700 font-semibold">weitere Folgen</p>
              </div>
            </div>
          </div>
        </motion.section>

        {/* INFOTAG */}
        <motion.section variants={itemVariants} className="mt-6">
          <SectionTitle
            icon={Info}
            title="Infotag"
            subtitle="Kennenlernen, Fragen klären, Programm erleben – alle Eltern/Erziehungsberechtigten willkommen."
          />

          <div className="rounded-3xl border border-green-200 bg-white shadow-sm overflow-hidden">
            <div className="p-4 sm:p-6 bg-gradient-to-br from-green-500 to-green-700 text-white">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-wider text-green-100">Termin</p>
                  <p className="text-lg sm:text-2xl font-black">Samstag, 10. Januar 2026 • 14:00 Uhr</p>
                </div>
                <Chip tone="green">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Gratis & unverbindlich
                </Chip>
              </div>

              <div className="mt-3 flex flex-wrap gap-2 text-sm text-green-50">
                <span className="inline-flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  Vereinsheim Pfeil-OK e.V. • Linzer Bundesstraße 16 • 5020 Salzburg
                </span>
              </div>
            </div>

            <div className="p-4 sm:p-6 bg-gray-50">
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="rounded-2xl border border-gray-200 bg-white p-4">
                  <p className="text-[11px] font-black uppercase tracking-wider text-gray-500">Themen</p>
                  <ul className="mt-2 space-y-2 text-sm text-gray-700">
                    {[
                      "Besichtigung Trainingsräume",
                      "Vorstellung 12-Monats Programm",
                      "Ablauf & Struktur der Module",
                      "Trainer & Team kennenlernen",
                      "Fragen & Antworten",
                      "Erste Wurfversuche für Kids/Juniors/Teens",
                    ].map((x) => (
                      <li key={x} className="flex items-start gap-2">
                        <span className="mt-0.5 w-5 h-5 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                        </span>
                        <span className="leading-snug">{x}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-2xl border border-gray-200 bg-white p-4">
                  <p className="text-[11px] font-black uppercase tracking-wider text-gray-500">Für wen?</p>
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-center">
                      <p className="text-xs font-black text-red-900">KIDS</p>
                      <p className="text-[11px] text-red-800 mt-0.5 font-semibold">6–10</p>
                    </div>
                    <div className="rounded-2xl border border-blue-200 bg-blue-50 p-3 text-center">
                      <p className="text-xs font-black text-blue-900">JUNIOR</p>
                      <p className="text-[11px] text-blue-800 mt-0.5 font-semibold">11–15</p>
                    </div>
                    <div className="rounded-2xl border border-purple-200 bg-purple-50 p-3 text-center">
                      <p className="text-xs font-black text-purple-900">TEENS</p>
                      <p className="text-[11px] text-purple-800 mt-0.5 font-semibold">15–18</p>
                    </div>
                  </div>

                  <div className="mt-3 rounded-2xl border border-green-200 bg-green-50 p-3 text-sm text-green-900 font-semibold">
                    Alle Kinder & Jugendlichen mit Erziehungsberechtigten sind herzlich willkommen.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.section>

        {/* STARTTERMINE */}
        <motion.section variants={itemVariants} className="mt-6">
          <SectionTitle icon={Calendar} title="Starttermine" subtitle="Fixe Trainingssonntage – Zeiten je Altersgruppe." />

          <div className="rounded-3xl border border-orange-200 bg-white shadow-sm overflow-hidden">
            <div className="p-4 sm:p-6 bg-gradient-to-br from-orange-500 to-orange-700 text-white">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-wider text-orange-100">Start ab</p>
                  <p className="text-lg sm:text-2xl font-black">Sonntag, 18. Januar 2026</p>
                  <div className="mt-2 flex flex-wrap gap-2 text-sm text-orange-50">
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      Vereinsheim Pfeil-OK e.V. • Salzburg
                    </span>
                  </div>
                </div>

                <Link
                  href="/emd-campus/termine"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-black text-orange-700 shadow-sm transition hover:bg-orange-50"
                >
                  Termine als Tabelle
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>

            <div className="p-4 sm:p-6 bg-gray-50">
              <div className="grid sm:grid-cols-3 gap-3">
                <div className="rounded-2xl border border-red-200 bg-white shadow-sm p-4">
                  <p className="text-[11px] font-black uppercase tracking-wider text-gray-500">Kids</p>
                  <p className="mt-1 text-sm font-bold text-gray-900">6–10 Jahre</p>
                  <div className="mt-2 inline-flex items-center gap-2 text-sm font-black text-red-700">
                    <Clock className="w-4 h-4" />
                    14:00 – 15:00
                  </div>
                  <p className="mt-1 text-[11px] text-gray-600 font-semibold">60 Minuten</p>
                </div>

                <div className="rounded-2xl border border-blue-200 bg-white shadow-sm p-4">
                  <p className="text-[11px] font-black uppercase tracking-wider text-gray-500">Junior</p>
                  <p className="mt-1 text-sm font-bold text-gray-900">11–14 Jahre</p>
                  <div className="mt-2 inline-flex items-center gap-2 text-sm font-black text-blue-700">
                    <Clock className="w-4 h-4" />
                    15:15 – 16:30
                  </div>
                  <p className="mt-1 text-[11px] text-gray-600 font-semibold">75 Minuten</p>
                </div>

                <div className="rounded-2xl border border-purple-200 bg-white shadow-sm p-4">
                  <p className="text-[11px] font-black uppercase tracking-wider text-gray-500">Teens</p>
                  <p className="mt-1 text-sm font-bold text-gray-900">15–18 Jahre</p>
                  <div className="mt-2 inline-flex items-center gap-2 text-sm font-black text-purple-700">
                    <Clock className="w-4 h-4" />
                    16:45 – 18:15
                  </div>
                  <p className="mt-1 text-[11px] text-gray-600 font-semibold">90 Minuten</p>
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-gray-200 bg-white p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-black text-gray-900">Weitere Termine</p>
                    <p className="text-sm text-gray-700 mt-1">
                      Sonntag, 15. Februar 2026 • Sonntag, 22. März 2026 • Sonntag, 19. April 2026
                    </p>
                    <p className="text-[11px] text-gray-500 mt-2 font-semibold">Weitere Termine folgen in Kürze.</p>
                  </div>

                  <Link
                    href="/emd-campus/termine"
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-orange-200 bg-orange-50 px-4 py-2.5 text-sm font-black text-orange-700 hover:bg-orange-100"
                  >
                    Ganze Übersicht
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </motion.section>

        {/* ÜBERBLICK */}
        <motion.section variants={itemVariants} className="mt-6">
          <SectionTitle icon={Target} title="Programm-Überblick" subtitle="Worum es geht und was ihr bekommt." />

          <div className="rounded-3xl border border-gray-200 bg-white shadow-sm p-4 sm:p-6">
            <p className="text-sm text-gray-700 leading-relaxed">
              Beim <span className="font-black text-gray-900">EMD-CAMPUS</span> steht die Entwicklung junger
              Dart-Spielerinnen und Spieler im Mittelpunkt. Unser 12-monatiges Programm begleitet euch von 6 bis 18
              Jahren – vom spielerischen Einstieg bis zur Turnier- und Liga-Teilnahme.
            </p>

            <div className="mt-4 grid sm:grid-cols-2 gap-3">
              {[
                "Technikanalyse & Wurftechnik-Coaching",
                "Konzentrations- & Mentaltraining",
                "Zielorientierte Trainingspläne",
                "Turnier- & Liga-Vorbereitung",
                "Begleitung durch qualifizierte Trainer",
                "Individuelles Feedback & Dokumentation",
              ].map((x) => (
                <div key={x} className="rounded-2xl border border-gray-200 bg-gray-50 p-3 flex items-start gap-2">
                  <span className="mt-0.5 w-5 h-5 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                  </span>
                  <p className="text-sm text-gray-700 leading-snug">{x}</p>
                </div>
              ))}
            </div>
          </div>
        </motion.section>

        {/* ZEITRAUM & ORT */}
        <motion.section variants={itemVariants} className="mt-6">
          <SectionTitle icon={MapPin} title="Zeitraum & Ort" subtitle="Organisatorische Eckdaten auf einen Blick." />

          <div className="grid sm:grid-cols-2 gap-3">
            <div className="rounded-3xl border border-gray-200 bg-white shadow-sm p-4 sm:p-6">
              <p className="text-[11px] font-black uppercase tracking-wider text-gray-500">Programmzeitraum</p>
              <p className="mt-1 text-sm font-black text-gray-900">Jänner – Dezember 2026</p>

              <div className="mt-4 rounded-2xl border border-gray-200 bg-gray-50 p-4">
                <p className="text-[11px] font-black uppercase tracking-wider text-gray-500">Teilnahmemodell</p>
                <p className="mt-1 text-sm text-gray-700">
                  12 Monate • 12 Module • Training pro Altersgruppe (Kids/Junior/Teens)
                </p>
              </div>
            </div>

            <div className="rounded-3xl border border-gray-200 bg-white shadow-sm p-4 sm:p-6">
              <p className="text-[11px] font-black uppercase tracking-wider text-gray-500">Austragungsort</p>
              <p className="mt-1 text-sm font-black text-gray-900">Vereinsheim Pfeil-OK e.V.</p>
              <p className="mt-1 text-sm text-gray-700">
                Linzer Bundesstraße 16
                <br />
                5020 Salzburg
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                <Chip tone="gray">
                  <MapPin className="w-3.5 h-3.5" />
                  Salzburg
                </Chip>
                <Chip tone="orange">
                  <Target className="w-3.5 h-3.5" />
                  Training vor Ort
                </Chip>
              </div>
            </div>
          </div>
        </motion.section>

        {/* MODULPLAN */}
        <motion.section id="moduleplan" variants={itemVariants} className="mt-6">
          <SectionTitle icon={Trophy} title="12-Monats Modulplan" subtitle="Wähle deine Altersgruppe – scroll & fertig." />

          <div className="rounded-3xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="p-4 sm:p-6 border-b border-gray-100 bg-white">
              <div className="flex flex-wrap gap-2">
                <AgeTab active={selectedAge === "kids"} label="Kids (6–10)" tone="red" onClick={() => setSelectedAge("kids")} />
                <AgeTab active={selectedAge === "junior"} label="Junior (11–15)" tone="blue" onClick={() => setSelectedAge("junior")} />
                <AgeTab active={selectedAge === "teens"} label="Teens (15–18)" tone="purple" onClick={() => setSelectedAge("teens")} />
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Chip tone={ageInfo.tone === "red" ? "red" : ageInfo.tone === "blue" ? "blue" : "purple"}>
                  <Users className="w-3.5 h-3.5" />
                  {ageInfo.title}
                </Chip>
                <Chip tone="gray">
                  <Clock className="w-3.5 h-3.5" />
                  {ageInfo.duration}
                </Chip>
                <Chip tone="orange">
                  <Trophy className="w-3.5 h-3.5" />
                  12 Module
                </Chip>
              </div>
            </div>

            <div className="p-4 sm:p-6 bg-gray-50">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {modules.map((m) => (
                  <div key={m.modul} className="rounded-3xl border border-gray-200 bg-white shadow-sm p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-2xl bg-orange-50 border border-orange-200 flex items-center justify-center font-black text-orange-700">
                          {m.modul}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-black text-gray-900 line-clamp-2">{m.thema}</p>
                          <p className="text-[11px] text-gray-500 font-semibold mt-0.5">{m.dauer}</p>
                        </div>
                      </div>
                      <Chip tone="orange">Modul</Chip>
                    </div>

                    <div className="mt-3 space-y-3">
                      <div className="rounded-2xl border border-gray-200 bg-gray-50 p-3">
                        <p className="text-[11px] font-black uppercase tracking-wider text-gray-500">Inhalte</p>
                        <p className="mt-1 text-sm text-gray-700">{m.inhalte}</p>
                      </div>

                      <div className="rounded-2xl border border-gray-200 bg-gray-50 p-3">
                        <p className="text-[11px] font-black uppercase tracking-wider text-gray-500">Ablauf</p>
                        <p className="mt-1 text-sm text-gray-700">{m.ablauf}</p>
                      </div>

                      <div className="rounded-2xl border border-gray-200 bg-gray-50 p-3">
                        <p className="text-[11px] font-black uppercase tracking-wider text-gray-500">Lernziele</p>
                        <p className="mt-1 text-sm text-gray-700">{m.lernziele}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 rounded-2xl border border-orange-200 bg-orange-50 p-4">
                <p className="text-sm text-gray-800">
                  <span className="font-black">Hinweis:</span> Jedes Modul beinhaltet Training, Pausen und kurze
                  Reflexionsphasen.
                </p>
              </div>
            </div>
          </div>
        </motion.section>

        {/* HIGHLIGHTS */}
        <motion.section variants={itemVariants} className="mt-6">
          <SectionTitle icon={Target} title="Was euch erwartet" subtitle="Kurz, klar und motivierend." />

          <div className="grid sm:grid-cols-2 gap-3">
            {[
              { title: "Technik, Präzision, mentale Stärke", text: "Von Grundlagen bis Wettkampftechnik – Schritt für Schritt." },
              { title: "Progressives Training mit klaren Zielen", text: "Trainingsplan, Feedback & messbare Entwicklung." },
              { title: "Teamgeist – respektvoll & pädagogisch", text: "Fair-Play, Motivation und gemeinsamer Fortschritt." },
              { title: "Talente gesucht! Future Players 2026", text: "Potenzial entdecken und gezielt fördern." },
            ].map((x) => (
              <div key={x.title} className="rounded-3xl border border-gray-200 bg-white shadow-sm p-4 sm:p-6">
                <div className="flex items-start gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-purple-50 border border-purple-200 flex items-center justify-center">
                    <Target className="w-5 h-5 text-purple-700" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-black text-gray-900">{x.title}</p>
                    <p className="text-sm text-gray-700 mt-1">{x.text}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.section>

        {/* CTA */}
        <motion.section variants={itemVariants} className="mt-6">
          <div className="rounded-3xl border border-orange-200 bg-gradient-to-br from-orange-500 via-orange-600 to-orange-700 text-white shadow-2xl overflow-hidden">
            <div className="p-5 sm:p-8">
              <p className="text-xs font-black uppercase tracking-wider text-orange-100">Jetzt starten</p>
              <p className="mt-1 text-xl sm:text-2xl font-black">Sei dabei – Anmeldung in 30 Sekunden</p>
              <p className="mt-2 text-sm text-orange-100">
                Wähle Altersgruppe, trage Kontaktdaten ein, fertig. Wir melden uns mit allen Details.
              </p>

              <div className="mt-5 flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={() => setIsRegistrationOpen(true)}
                  className="h-12 px-5 rounded-2xl bg-white text-orange-700 font-black shadow-sm active:scale-[0.99]"
                >
                  Jetzt anmelden
                </button>
                <a
                  href="#moduleplan"
                  className="h-12 px-5 rounded-2xl border border-white/30 bg-white/10 text-white font-black flex items-center justify-center active:scale-[0.99]"
                >
                  Modulplan ansehen
                </a>
              </div>
            </div>
          </div>

          <div className="mt-4 text-center">
            <div className="inline-block rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-600 shadow-sm">
              <span className="font-black">© 2026 EMD CAMPUS</span> • Erstellt von <span className="font-black">Grafikguru</span>
            </div>
          </div>
        </motion.section>
      </motion.main>

      <MobileBottomNav />

      <CampusRegistrationModal
        isOpen={isRegistrationOpen}
        onClose={() => setIsRegistrationOpen(false)}
        preselectedAgeGroup={selectedAge}
      />
    </div>
  )
}