"use client"

import { useState } from "react"
import { Header } from "@/components/header"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"
import { CampusRegistrationModal } from "@/components/campus-registration-modal"
import { motion } from "framer-motion"
import { Target, Users, Trophy, Calendar, MapPin, Clock } from "lucide-react"

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
      ablauf:
        "10min. Warm-up & Regeln • 10min. Technikcheck • 25min. Wurfstationen • 20min. Testspiel • 10min. Feedback",
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
      ablauf:
        "10min. Warm-up Doppel • 15min. Wege 32-80 • 30min. Doppel-Ringe • 15min. Doppel-Challenge • 5min. Abschluss",
      lernziele: "Checkout-Wege verstehen, Doppel treffen",
      dauer: "75 Min",
    },
    {
      modul: 5,
      thema: "Match Grundlagen",
      inhalte: "Druckspiele, Routine, Basics",
      ablauf:
        "10min. Warm-up • 15min. Druckspiel (3für1) • 30min. Routine • 15min. Mini-Match • 5min. Fair-Play-Feedback",
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
      ablauf:
        "10min. Warm-up Games • 20min. Video Technik Check • 30min. Wurf-Analyse & Übungen • 20min. Zielplan • 10min. Reflexion",
      lernziele: "Technikbasis & Leistungsziele definieren",
      dauer: "90 Min",
    },
    {
      modul: 2,
      thema: "Technik Foundation",
      inhalte: "Stand, Arm-Timing, Wurf-Sequenz",
      ablauf:
        "10min. Warm-up • 20min. Stand/Balance Drills • 30min. Arm-Routinen • 20min. Wiederholung • 10min. Stretch",
      lernziele: "Bewegungsökonomie & Konstanz",
      dauer: "90 Min",
    },
    {
      modul: 3,
      thema: "Scoring Aufbau",
      inhalte: "80+ Training, Serien, Tempokontrolle",
      ablauf:
        "10min. Warm-up Zahlen • 20min. 80+/100+ Drills • 40min. Scoring-Serien Spiele • 15min. Tempo-Sprints • 5min. Review",
      lernziele: "Kontrolle unter Tempo & Druck",
      dauer: "90 Min",
    },
    {
      modul: 4,
      thema: "Finishing Basics",
      inhalte: "Doppel-Ziele, Finish-System 40–80",
      ablauf:
        "10min. Warm-up Doppel • 20min. Checkout Theorie • 40min. Doppel/Finish Drills • 15min. Pressure-Games • 5min. Feedback",
      lernziele: "Strukturiertes Finishing",
      dauer: "90 Min",
    },
    {
      modul: 5,
      thema: "Matchroutine",
      inhalte: "Pre-Shot Routine, Fokus-Reset",
      ablauf:
        "5min. Aktivierung • 15min. Mental Warm-Up • 30min. Routine-Training • 30min. Match-Simulation • 10min. Talk",
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
      ablauf:
        "10min. Warm-up Balance • 20min. Video Slow-Mo • 40min. Technik-Stationen • 15min. Progress-Check • 5min. Cooldown",
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

  const getCurrentModules = () => {
    switch (selectedAge) {
      case "kids":
        return kidsModules
      case "junior":
        return juniorModules
      case "teens":
        return teensModules
    }
  }

  const getAgeGroupInfo = () => {
    switch (selectedAge) {
      case "kids":
        return {
          title: "Kids (6-10 Jahre)",
          subtitle: "Mini-Darters",
          color: "from-red-500 to-red-600",
          duration: "60 Minuten",
        }
      case "junior":
        return {
          title: "Junior (11-15 Jahre)",
          subtitle: "Young-Talents",
          color: "from-blue-500 to-blue-600",
          duration: "75 Minuten",
        }
      case "teens":
        return {
          title: "Teens (15-18 Jahre)",
          subtitle: "Future-Pros",
          color: "from-purple-500 to-purple-600",
          duration: "90 Minuten",
        }
    }
  }

  const ageInfo = getAgeGroupInfo()
  const modules = getCurrentModules()

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Header />

      <motion.div
        className="container mx-auto px-4 md:px-6 py-8"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Hero Section */}
        <motion.div variants={itemVariants} className="text-center mb-12">
          <div className="bg-gradient-to-br from-orange-500 to-orange-700 rounded-2xl shadow-xl border border-orange-200 p-8 md:p-12 text-white">
            <div className="bg-white/10 rounded-full p-4 w-20 h-20 mx-auto mb-6 backdrop-blur-sm">
              <Target className="h-12 w-12 text-white mx-auto" />
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-6xl font-extrabold uppercase leading-tight tracking-tighter mb-4 text-balance">
              <span className="block text-white">EMD - CAMPUS</span>
              <span className="block text-orange-200">NACHWUCHS</span>
              <span className="block text-orange-200">AKADEMIE</span>
            </h1>
            <p className="text-base md:text-xl font-bold uppercase text-orange-100 mb-4 text-balance">
              Young Talent Programm - Dein Weg zum Dart-Champion
            </p>
            <div className="bg-orange-600/30 rounded-xl p-4 text-orange-100">
              <p className="text-sm italic text-balance">
                Der Weg zum Dart-Talent beginnt hier - Willkommen im EMD-CAMPUS Nachwuchsprogramm!
              </p>
            </div>
          </div>
        </motion.div>

        {/* Start Termin Section */}
        <motion.div
          variants={itemVariants}
          className="bg-gradient-to-br from-orange-500 to-orange-700 rounded-2xl shadow-xl border border-orange-200 p-6 md:p-8 mb-8 text-white"
        >
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="bg-white/10 rounded-lg p-2">
              <Calendar className="h-8 w-8 text-white" />
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-center">START AM 18.01.2026</h2>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 mb-6">
            <div className="text-center mb-6">
              <p className="text-xl md:text-2xl font-bold mb-2">Sonntag, 18. Januar 2026</p>
              <p className="text-orange-100 text-sm md:text-base">
                Vereinsheim Pfeil-OK e.V. • Linzer Bundesstraße 16 • 5020 Salzburg
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <div className="bg-red-500 rounded-xl p-5 text-center shadow-lg">
                <div className="flex items-center justify-center gap-2 mb-3">
                  <Clock className="h-5 w-5" />
                  <h3 className="text-lg font-bold">KIDS</h3>
                </div>
                <p className="text-sm mb-2">6-10 Jahre</p>
                <p className="text-2xl font-extrabold">14:00 - 15:00</p>
                <p className="text-xs mt-2 text-red-100">60 Minuten</p>
              </div>

              <div className="bg-blue-500 rounded-xl p-5 text-center shadow-lg">
                <div className="flex items-center justify-center gap-2 mb-3">
                  <Clock className="h-5 w-5" />
                  <h3 className="text-lg font-bold">JUNIOR</h3>
                </div>
                <p className="text-sm mb-2">11-14 Jahre</p>
                <p className="text-2xl font-extrabold">15:15 - 16:30</p>
                <p className="text-xs mt-2 text-blue-100">75 Minuten</p>
              </div>

              <div className="bg-purple-500 rounded-xl p-5 text-center shadow-lg">
                <div className="flex items-center justify-center gap-2 mb-3">
                  <Clock className="h-5 w-5" />
                  <h3 className="text-lg font-bold">TEENS</h3>
                </div>
                <p className="text-sm mb-2">15-18 Jahre</p>
                <p className="text-2xl font-extrabold">16:45 - 18:15</p>
                <p className="text-xs mt-2 text-purple-100">90 Minuten</p>
              </div>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 mb-6">
            <div className="text-center mb-6">
              <p className="text-xl md:text-2xl font-bold mb-2">Sonntag, 15. Februar 2026</p>
              <p className="text-orange-100 text-sm md:text-base">
                Vereinsheim Pfeil-OK e.V. • Linzer Bundesstraße 16 • 5020 Salzburg
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <div className="bg-red-500 rounded-xl p-5 text-center shadow-lg">
                <div className="flex items-center justify-center gap-2 mb-3">
                  <Clock className="h-5 w-5" />
                  <h3 className="text-lg font-bold">KIDS</h3>
                </div>
                <p className="text-sm mb-2">6-10 Jahre</p>
                <p className="text-2xl font-extrabold">14:00 - 15:00</p>
                <p className="text-xs mt-2 text-red-100">60 Minuten</p>
              </div>

              <div className="bg-blue-500 rounded-xl p-5 text-center shadow-lg">
                <div className="flex items-center justify-center gap-2 mb-3">
                  <Clock className="h-5 w-5" />
                  <h3 className="text-lg font-bold">JUNIOR</h3>
                </div>
                <p className="text-sm mb-2">11-14 Jahre</p>
                <p className="text-2xl font-extrabold">15:15 - 16:30</p>
                <p className="text-xs mt-2 text-blue-100">75 Minuten</p>
              </div>

              <div className="bg-purple-500 rounded-xl p-5 text-center shadow-lg">
                <div className="flex items-center justify-center gap-2 mb-3">
                  <Clock className="h-5 w-5" />
                  <h3 className="text-lg font-bold">TEENS</h3>
                </div>
                <p className="text-sm mb-2">15-18 Jahre</p>
                <p className="text-2xl font-extrabold">16:45 - 18:15</p>
                <p className="text-xs mt-2 text-purple-100">90 Minuten</p>
              </div>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 mb-6">
            <div className="text-center mb-6">
              <p className="text-xl md:text-2xl font-bold mb-2">Sonntag, 22. März 2026</p>
              <p className="text-orange-100 text-sm md:text-base">
                Vereinsheim Pfeil-OK e.V. • Linzer Bundesstraße 16 • 5020 Salzburg
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <div className="bg-red-500 rounded-xl p-5 text-center shadow-lg">
                <div className="flex items-center justify-center gap-2 mb-3">
                  <Clock className="h-5 w-5" />
                  <h3 className="text-lg font-bold">KIDS</h3>
                </div>
                <p className="text-sm mb-2">6-10 Jahre</p>
                <p className="text-2xl font-extrabold">14:00 - 15:00</p>
                <p className="text-xs mt-2 text-red-100">60 Minuten</p>
              </div>

              <div className="bg-blue-500 rounded-xl p-5 text-center shadow-lg">
                <div className="flex items-center justify-center gap-2 mb-3">
                  <Clock className="h-5 w-5" />
                  <h3 className="text-lg font-bold">JUNIOR</h3>
                </div>
                <p className="text-sm mb-2">11-14 Jahre</p>
                <p className="text-2xl font-extrabold">15:15 - 16:30</p>
                <p className="text-xs mt-2 text-blue-100">75 Minuten</p>
              </div>

              <div className="bg-purple-500 rounded-xl p-5 text-center shadow-lg">
                <div className="flex items-center justify-center gap-2 mb-3">
                  <Clock className="h-5 w-5" />
                  <h3 className="text-lg font-bold">TEENS</h3>
                </div>
                <p className="text-sm mb-2">15-18 Jahre</p>
                <p className="text-2xl font-extrabold">16:45 - 18:15</p>
                <p className="text-xs mt-2 text-purple-100">90 Minuten</p>
              </div>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 mb-6">
            <div className="text-center mb-6">
              <p className="text-xl md:text-2xl font-bold mb-2">Sonntag, 19. April 2026</p>
              <p className="text-orange-100 text-sm md:text-base">
                Vereinsheim Pfeil-OK e.V. • Linzer Bundesstraße 16 • 5020 Salzburg
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <div className="bg-red-500 rounded-xl p-5 text-center shadow-lg">
                <div className="flex items-center justify-center gap-2 mb-3">
                  <Clock className="h-5 w-5" />
                  <h3 className="text-lg font-bold">KIDS</h3>
                </div>
                <p className="text-sm mb-2">6-10 Jahre</p>
                <p className="text-2xl font-extrabold">14:00 - 15:00</p>
                <p className="text-xs mt-2 text-red-100">60 Minuten</p>
              </div>

              <div className="bg-blue-500 rounded-xl p-5 text-center shadow-lg">
                <div className="flex items-center justify-center gap-2 mb-3">
                  <Clock className="h-5 w-5" />
                  <h3 className="text-lg font-bold">JUNIOR</h3>
                </div>
                <p className="text-sm mb-2">11-14 Jahre</p>
                <p className="text-2xl font-extrabold">15:15 - 16:30</p>
                <p className="text-xs mt-2 text-blue-100">75 Minuten</p>
              </div>

              <div className="bg-purple-500 rounded-xl p-5 text-center shadow-lg">
                <div className="flex items-center justify-center gap-2 mb-3">
                  <Clock className="h-5 w-5" />
                  <h3 className="text-lg font-bold">TEENS</h3>
                </div>
                <p className="text-sm mb-2">15-18 Jahre</p>
                <p className="text-2xl font-extrabold">16:45 - 18:15</p>
                <p className="text-xs mt-2 text-purple-100">90 Minuten</p>
              </div>
            </div>
          </div>

          <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 text-center border-2 border-white/30">
            <p className="text-lg md:text-xl font-bold">📅 Weitere Termine folgen in Kürze</p>
          </div>
        </motion.div>

        {/* Überblick */}
        <motion.div variants={itemVariants} className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8 mb-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-orange-100 rounded-lg p-2">
              <Target className="h-6 w-6 text-orange-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Das EMD-CAMPUS Programm</h2>
          </div>
          <p className="text-gray-700 leading-relaxed mb-4">
            Beim EMD-CAMPUS steht die Entwicklung junger Dart-Spielerinnen und Spieler im Mittelpunkt. Unser
            12-monatiges Nachwuchsprogramm begleitet Kinder und Jugendliche von 6 bis 18 Jahren auf ihrem sportlichen
            Weg - vom spielerischen Einstieg bis hin zur Turnier- und Liga-Teilnahme.
          </p>
          <p className="text-gray-700 leading-relaxed">
            <strong>Unsere leistungsorientierte Förderung beinhaltet:</strong> Technikanalyse & Wurftechnik-Coaching,
            Konzentrations- & Mentaltrainings, Zielorientierte Trainingspläne, Turnier- und Liga-Vorbereitung,
            Begleitung durch qualifizierte Trainer, Individuelles Feedback & Leistungsdokumentation
          </p>
        </motion.div>

        {/* Grunddaten */}
        <motion.div variants={itemVariants} className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8 mb-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-blue-100 rounded-lg p-2">
              <MapPin className="h-6 w-6 text-blue-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Zeitraum & Ort</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                <h3 className="font-bold text-blue-700 mb-2 flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Programmzeitraum
                </h3>
                <p className="text-gray-700 font-semibold">Jänner – Dezember 2026</p>
              </div>
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                <h3 className="font-bold text-blue-700 mb-2 flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Teilnahmemodell
                </h3>
                <p className="text-gray-700">12 Monate, 12 Module mit spezialisiertem Training pro Altersgruppe</p>
              </div>
            </div>
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                <h3 className="font-bold text-blue-700 mb-2 flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Austragungsort
                </h3>
                <p className="text-gray-700">
                  <strong>Vereinsheim Pfeil-OK e.V.</strong>
                  <br />
                  Linzer Bundesstraße 16
                  <br />
                  5020 Salzburg
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* 12-Monats Modulplan */}
        <motion.div
          variants={itemVariants}
          className="bg-white rounded-2xl shadow-xl border border-gray-200 p-4 md:p-8 mb-8 overflow-hidden"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-orange-100 rounded-lg p-2">
              <Trophy className="h-6 w-6 text-orange-600" />
            </div>
            <h2 className="text-xl md:text-2xl font-bold text-gray-900">12-Monats Modulplan</h2>
          </div>

          <div className="flex gap-2 mb-4 flex-wrap">
            <button
              onClick={() => setSelectedAge("kids")}
              className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${
                selectedAge === "kids"
                  ? "bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              Kids (6-10)
            </button>
            <button
              onClick={() => setSelectedAge("junior")}
              className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${
                selectedAge === "junior"
                  ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              Junior (11-15)
            </button>
            <button
              onClick={() => setSelectedAge("teens")}
              className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${
                selectedAge === "teens"
                  ? "bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-lg"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              Teens (15-18)
            </button>
          </div>

          <div className={`bg-gradient-to-r ${ageInfo.color} text-white p-3 rounded-lg mb-4`}>
            <h3 className="text-center font-bold text-sm md:text-base text-balance">
              {ageInfo.title} - {ageInfo.subtitle} • {ageInfo.duration}
            </h3>
          </div>

          <div className="md:hidden space-y-4">
            {modules.map((item) => (
              <div key={item.modul} className="bg-white border-2 border-orange-200 rounded-xl p-4 shadow-md">
                <div className="flex items-center gap-3 mb-3">
                  <div className="bg-orange-600 text-white font-bold text-sm rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0">
                    {item.modul}
                  </div>
                  <h3 className="font-bold text-gray-900 text-sm">{item.thema}</h3>
                </div>

                <div className="space-y-3">
                  <div>
                    <h4 className="text-xs font-bold text-orange-600 uppercase mb-1">Inhalte</h4>
                    <p className="text-xs text-gray-700">{item.inhalte}</p>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-orange-600 uppercase mb-1">Ablauf ({ageInfo.duration})</h4>
                    <p className="text-xs text-gray-700">{item.ablauf}</p>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-orange-600 uppercase mb-1">Lernziele</h4>
                    <p className="text-xs text-gray-700">{item.lernziele}</p>
                  </div>

                  <div className="pt-2 border-t border-gray-200">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-orange-600" />
                      <span className="text-xs font-bold text-gray-900">{item.dauer}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="hidden md:block overflow-x-auto">
            <div className="inline-block min-w-full align-middle">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-gray-200">
                    <th className="text-left py-2 px-3 text-sm font-bold text-gray-700 w-auto">Modul</th>
                    <th className="text-left py-2 px-3 text-sm font-bold text-gray-700">Thema</th>
                    <th className="text-left py-2 px-3 text-sm font-bold text-gray-700">Inhalte</th>
                    <th className="text-left py-2 px-3 text-sm font-bold text-gray-700 hidden xl:table-cell">Ablauf</th>
                    <th className="text-left py-2 px-3 text-sm font-bold text-gray-700 hidden lg:table-cell">
                      Lernziele
                    </th>
                    <th className="text-left py-2 px-3 text-sm font-bold text-gray-700 w-20">Dauer</th>
                  </tr>
                </thead>
                <tbody>
                  {modules.map((item) => (
                    <tr key={item.modul} className="border-b border-gray-100 hover:bg-orange-50 transition-colors">
                      <td className="py-2 px-3 text-sm font-bold text-orange-600">{item.modul}</td>
                      <td className="py-2 px-3 text-sm font-semibold text-gray-900 break-words">{item.thema}</td>
                      <td className="py-2 px-3 text-sm text-gray-700 break-words">{item.inhalte}</td>
                      <td className="py-2 px-3 text-sm text-gray-700 break-words hidden xl:table-cell">
                        {item.ablauf}
                      </td>
                      <td className="py-2 px-3 text-sm text-gray-700 break-words hidden lg:table-cell">
                        {item.lernziele}
                      </td>
                      <td className="py-2 px-3 text-sm font-semibold text-gray-900">{item.dauer}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-6 p-4 bg-orange-50 border border-orange-200 rounded-lg">
            <p className="text-xs md:text-sm text-gray-700">
              <strong>Hinweis:</strong> Jedes Modul beinhaltet spezialisierte Trainingseinheiten, Pausen und
              Reflexionsphasen.
            </p>
          </div>
        </motion.div>

        {/* Highlights */}
        <motion.div variants={itemVariants} className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8 mb-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-purple-100 rounded-lg p-2">
              <Target className="w-5 h-5 text-purple-600 flex-shrink-0 mt-1" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Was dich im EMD-CAMPUS erwartet</h2>
          </div>
          <p className="text-gray-700 text-center mb-6">12 Monate, 12 Abenteuer im Vereinsheim Pfeil-OK</p>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="flex items-start gap-3 p-4 bg-purple-50 rounded-xl border border-purple-100">
              <Target className="w-5 h-5 text-purple-600 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-bold text-gray-900 mb-1">Technik, Präzision, mentale Stärke</h3>
                <p className="text-sm text-gray-700">Von den Grundlagen bis zur professionellen Wettkampftechnik</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 bg-purple-50 rounded-xl border border-purple-100">
              <Trophy className="w-5 h-5 text-purple-600 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-bold text-gray-900 mb-1">Vom Spaßspieler zum Team-Champion</h3>
                <p className="text-sm text-gray-700">Progressives Training mit klaren Zielen</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 bg-purple-50 rounded-xl border border-purple-100">
              <Users className="w-5 h-5 text-purple-600 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-bold text-gray-900 mb-1">Teamgeist – respektvoll & pädagogisch</h3>
                <p className="text-sm text-gray-700">Fair-Play und Sportsgeist im Fokus</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 bg-purple-50 rounded-xl border border-purple-100">
              <Trophy className="w-5 h-5 text-purple-600 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-bold text-gray-900 mb-1">Talente gesucht! Dart Future Players 2026</h3>
                <p className="text-sm text-gray-700">Dein Potenzial entdecken und nutzen</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Vision */}
        <motion.div
          variants={itemVariants}
          className="bg-gradient-to-br from-orange-500 to-orange-700 rounded-2xl shadow-xl border border-orange-200 p-8 mb-8 text-white"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-white/10 rounded-lg p-2">
              <Target className="h-6 w-6 text-white" />
            </div>
            <h2 className="text-2xl font-bold">Unsere Vision</h2>
          </div>
          <p className="text-lg font-semibold mb-6 text-orange-100">
            Kinder und Jugendliche bestmöglich auf den Dart-Sport vorbereiten, Talente fördern und Freude am Spiel
            vermitteln – fair, motivierend und professionell.
          </p>
          <div className="space-y-3">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/20">
              <p className="text-sm font-bold">✓ Dein Kind liebt Zielspiele? Dann ist Dart genau richtig!</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/20">
              <p className="text-sm font-bold">✓ Der EMD-Verein baut seine Jugend auf – sei dabei!</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/20">
              <p className="text-sm font-bold">✓ Dein Pfeil. Dein Ziel. Deine Zukunft – EMD CAMPUS!</p>
            </div>
          </div>
        </motion.div>

        {/* Call to Action */}
        <motion.div variants={itemVariants} className="text-center">
          <button
            onClick={() => setIsRegistrationOpen(true)}
            className="bg-orange-600 hover:bg-orange-700 text-white font-bold px-8 py-4 rounded-xl shadow-xl hover:shadow-2xl transition-all hover:scale-105 text-lg"
          >
            JETZT ANMELDEN – SEI DABEI!
          </button>
        </motion.div>

        <motion.div variants={itemVariants} className="text-center mt-12">
          <div className="bg-gray-100 border border-gray-200 rounded-xl p-6">
            <p className="text-gray-600 text-sm">
              <strong>© 2026 EMD CAMPUS – Young Talent Programm</strong>
              <br />
              Erstellt von <strong>Grafikguru</strong>
            </p>
          </div>
        </motion.div>
      </motion.div>

      <MobileBottomNav />

      <CampusRegistrationModal
        isOpen={isRegistrationOpen}
        onClose={() => setIsRegistrationOpen(false)}
        preselectedAgeGroup={selectedAge}
      />
    </div>
  )
}
