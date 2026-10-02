import type { LucideIcon } from "lucide-react"
import {
  BellRing,
  Calendar,
  CalendarCheck,
  CreditCard,
  HelpCircle,
  History,
  Home,
  List,
  Mail,
  PackageCheck,
  PartyPopper,
  Shield,
  Target,
  Trophy,
  UserPlus,
  Users,
  Video,
  Zap,
} from "lucide-react"

export type AdminCategoryKey =
  | "overview"
  | "league"
  | "tournaments"
  | "club"
  | "communication"
  | "system"

export type AdminPageKey =
  | "dashboard"
  | "users"
  | "support-tickets"
  | "advent-quiz"
  | "campus-registrations"
  | "credit-loader"
  | "attendance"
  | "leagues"
  | "events"
  | "recruitment"
  | "club"
  | "create-event"
  | "tournaments"
  | "tournament-management"
  | "tournament-center"
  | "player-database"
  | "dart-competition"
  | "admin-push"
  | "bonus-system"
  | "member-availability-all"
  | "members-levels"
  | "membership-management"
  | "internal-events"
  | "bonus-vergabe"
  | "praemien-redemptions"
  | "approvals"
  | "role-permissions"
  | "club-meeting"
  | "clubhouse"
  | "history"
  | "results"

export type AdminPageDefinition = {
  key: AdminPageKey
  title: string
  description: string
  category: AdminCategoryKey
  icon: LucideIcon
  showInNavigation?: boolean
  showOnDashboard?: boolean
  permissionManaged?: boolean
  adminOnly?: boolean
  superAdminOnly?: boolean
  searchTerms?: string[]
}

export const ADMIN_CATEGORY_LABELS: Record<AdminCategoryKey, string> = {
  overview: "Übersicht",
  league: "Ligabetrieb",
  tournaments: "Turnierbetrieb",
  club: "Verein",
  communication: "Kommunikation",
  system: "System",
}

export const ADMIN_PAGES: AdminPageDefinition[] = [
  {
    key: "dashboard",
    title: "Dashboard",
    description: "Admin-Übersicht",
    category: "overview",
    icon: Home,
    permissionManaged: false,
    showOnDashboard: false,
  },

  {
    key: "leagues",
    title: "Ligaspiele",
    description: "Saisons, Spieltage und Liga-Spiele verwalten",
    category: "league",
    icon: Target,
  },
  {
    key: "member-availability-all",
    title: "Aufstellungen & Zusagen",
    description: "Spielerverfügbarkeiten und Zusagen verwalten",
    category: "league",
    icon: CalendarCheck,
  },

  {
    key: "tournament-center",
    title: "Turnier-Zentrale",
    description: "Turniere, Serien und Spieltage verwalten",
    category: "tournaments",
    icon: Trophy,
    permissionManaged: false,
  },
  {
    key: "dart-competition",
    title: "Lion Cup",
    description: "Ergebnisse, Historie und Verwaltung",
    category: "tournaments",
    icon: Trophy,
  },
  {
    key: "history",
    title: "Historie",
    description: "Turnierhistorie ansehen",
    category: "tournaments",
    icon: History,
    showOnDashboard: false,
    permissionManaged: false,
  },
  {
    key: "player-database",
    title: "Spielerdatenbank",
    description: "Spielerdaten einsehen und verwalten",
    category: "tournaments",
    icon: List,
  },
  {
    key: "members-levels",
    title: "Members Cup Einstufung",
    description: "Einstufungen für den Members Cup verwalten",
    category: "tournaments",
    icon: Trophy,
  },
  {
    key: "internal-events",
    title: "Interne Events & Anmeldungen",
    description: "Interne Specials und Anmeldungen verwalten",
    category: "tournaments",
    icon: UserPlus,
  },

  {
    key: "users",
    title: "Benutzerverwaltung",
    description: "Konten, Rollen und Registrierungen verwalten",
    category: "club",
    icon: Users,
  },
  {
    key: "membership-management",
    title: "Mitgliedschaften",
    description: "Pakete, Module und Zahlungsarten verwalten",
    category: "club",
    icon: CreditCard,
  },
  {
    key: "recruitment",
    title: "Rekrutierung",
    description: "Spielerbewerbungen und Bedarf verwalten",
    category: "club",
    icon: Mail,
  },
  {
    key: "approvals",
    title: "Freigaben",
    description: "Freigaben und Prüfungen bearbeiten",
    category: "club",
    icon: Shield,
    adminOnly: true,
  },
  {
    key: "events",
    title: "Veranstaltungen",
    description: "Turniere, Partys und Events verwalten",
    category: "club",
    icon: PartyPopper,
  },
  {
    key: "clubhouse",
    title: "Vereinsheim",
    description: "Öffnungszeiten und Berechtigungen verwalten",
    category: "club",
    icon: Home,
  },
  {
    key: "club-meeting",
    title: "Vereinssitzung",
    description: "Sitzungen vorbereiten, starten und teilen",
    category: "club",
    icon: Video,
  },
  {
    key: "admin-push",
    title: "Push Nachrichten",
    description: "Push-Nachrichten versenden",
    category: "communication",
    icon: BellRing,
  },
  {
    key: "bonus-system",
    title: "Bonussystem",
    description: "Bonusregeln und Punkteverwaltung",
    category: "club",
    icon: Trophy,
  },
  {
    key: "bonus-vergabe",
    title: "Bonusvergabe",
    description: "Bonuspunkte an Spieler vergeben",
    category: "club",
    icon: Trophy,
  },
  {
    key: "praemien-redemptions",
    title: "Prämien-Ausgabe",
    description: "Eingelöste Prämien prüfen und abschließen",
    category: "club",
    icon: PackageCheck,
  },
  {
    key: "club",
    title: "Vereinsverwaltung",
    description: "Spieler, Gastzugänge, Beitritte und Vereinsdaten",
    category: "club",
    icon: Users,
  },
  {
    key: "support-tickets",
    title: "Support Tickets",
    description: "Support-Anfragen bearbeiten",
    category: "communication",
    icon: HelpCircle,
  },
  {
    key: "campus-registrations",
    title: "Campus-Registrierungen",
    description: "EMD-CAMPUS Anmeldungen einsehen",
    category: "club",
    icon: Users,
  },
  {
    key: "credit-loader",
    title: "Credit-Loader",
    description: "Gutscheine und Credits verwalten",
    category: "club",
    icon: Zap,
  },
  {
    key: "role-permissions",
    title: "Rechteverwaltung",
    description: "Zugriffsrechte für Admin-Bereiche verwalten",
    category: "system",
    icon: Shield,
    superAdminOnly: true,
    showOnDashboard: true,
  },
  {
    key: "advent-quiz",
    title: "Adventskalender Auswertung",
    description: "Quiz-Antworten und Rangliste ansehen",
    category: "system",
    icon: Calendar,
  },

  // Bestehende Permission-Keys, die aktuell nicht als eigene Hauptkachel benötigt werden.
  {
    key: "attendance",
    title: "Anwesenheitsliste",
    description: "Anwesenheiten verwalten",
    category: "club",
    icon: Users,
    showInNavigation: false,
    showOnDashboard: false,
  },
  {
    key: "create-event",
    title: "Veranstaltung erstellen",
    description: "Veranstaltungen anlegen",
    category: "club",
    icon: PartyPopper,
    showInNavigation: false,
    showOnDashboard: false,
  },
  {
    key: "tournaments",
    title: "Turniere",
    description: "Turniere verwalten",
    category: "tournaments",
    icon: Trophy,
    showInNavigation: false,
    showOnDashboard: false,
  },
  {
    key: "tournament-management",
    title: "Turnier verwalten",
    description: "Turnierdaten und Ablauf verwalten",
    category: "tournaments",
    icon: Trophy,
    showInNavigation: false,
    showOnDashboard: false,
  },
  {
    key: "results",
    title: "Ergebnisse",
    description: "Ergebnisse verwalten",
    category: "tournaments",
    icon: Trophy,
    showInNavigation: false,
    showOnDashboard: false,
    permissionManaged: false,
  },
]

export const ADMIN_PERMISSION_PAGES = ADMIN_PAGES.filter(
  (page) => page.permissionManaged !== false && page.key !== "dashboard",
)

export function getAdminPage(key: string) {
  return ADMIN_PAGES.find((page) => page.key === key)
}
