import type { LucideIcon } from "lucide-react"
import {
  Building2,
  Settings2,
  Target,
  Trophy,
  Users,
} from "lucide-react"

export type AdminAreaKey =
  | "turniere"
  | "spieler"
  | "liga"
  | "verein"
  | "system"

export type AdminAreaDefinition = {
  key: AdminAreaKey
  title: string
  shortTitle: string
  description: string
  icon: LucideIcon
  pageKeys: readonly string[]
}

export const ADMIN_AREAS: readonly AdminAreaDefinition[] = [
  {
    key: "turniere",
    title: "Turnierbereich",
    shortTitle: "Turniere",
    description: "Turnier-Zentrale und Spielerdatenbank.",
    icon: Trophy,
    pageKeys: [
      "tournament-center",
      "dart-competition",
      "history",
      "results",
      "player-database",
      "members-levels",
      "internal-events",
      "tournaments",
      "tournament-management",
      "tournament-series",
      "lion-cup-settings",
      "lion-cup-registrations",
    ],
  },
  {
    key: "spieler",
    title: "Spieler & Mitglieder",
    shortTitle: "Spieler",
    description: "Benutzer, Mitglieder, Vereinsverwaltung, Guthaben, Bonus und Bewerbungen.",
    icon: Users,
    pageKeys: [
      "users",
      "players",
      "management",
      "club",
      "membership-management",
      "recruitment",
      "approvals",
      "credit-loader",
      "bonus-system",
      "bonus-vergabe",
      "praemien-redemptions",
    ],
  },
  {
    key: "liga",
    title: "Ligabereich",
    shortTitle: "Liga",
    description: "Ligaspiele, Saisons, Aufstellungen, Zusagen und Spielbetrieb.",
    icon: Target,
    pageKeys: [
      "leagues",
      "member-availability-all",
    ],
  },
  {
    key: "verein",
    title: "Vereinsbereich",
    shortTitle: "Verein",
    description: "Veranstaltungen, Vereinsheim, Sitzungen und vereinsinterne Organisation.",
    icon: Building2,
    pageKeys: [
      "events",
      "clubhouse",
      "club-meeting",
      "campus-registrations",
      "advent-quiz",
    ],
  },
  {
    key: "system",
    title: "Organisation & System",
    shortTitle: "System",
    description: "Kommunikation, Support, Rechte und zentrale Administration.",
    icon: Settings2,
    pageKeys: [
      "admin-push",
      "support-tickets",
      "role-permissions",
    ],
  },
] as const

export const ADMIN_AREA_BY_PAGE: Record<string, AdminAreaKey> = Object.fromEntries(
  ADMIN_AREAS.flatMap((area) => area.pageKeys.map((pageKey) => [pageKey, area.key])),
) as Record<string, AdminAreaKey>

export function getAdminAreaForPage(pageKey: string): AdminAreaKey {
  return ADMIN_AREA_BY_PAGE[pageKey] ?? "system"
}

export function getAdminArea(areaKey: AdminAreaKey) {
  return ADMIN_AREAS.find((area) => area.key === areaKey) ?? ADMIN_AREAS[0]
}
