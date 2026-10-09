"use client"

import Link from "next/link"
import { useState } from "react"
import { TournamentDaysManagement } from "./turniertage-betrieb"
import { AdminTournamentSeriesManagement } from "./serien-verwaltung"
import { CentralTournamentRegistrationHub } from "./zentrale-anmeldungen"
import { EventsManagement } from "../veranstaltungen"
import { EinzelturnierSetup } from "./einzelturnier/einzelturnier-setup"
import { KratzerAdminEmbedded } from "./kratzer/kratzer-admin"
import { SpontanesTurnierStart, type SpontaneousTournamentDraft } from "./spontanes-turnier-start"
import { useAuth } from "@/hooks/use-auth"
import {
  ArrowRight,
  CalendarDays,
  FolderKanban,
  Play,
  Sparkles,
  Target,
  Trophy,
  UserPlus,
  Users,
} from "lucide-react"

type AdminTournamentCenterProps = {
  onOpen: (view: string) => void
  canOpen: (view: string) => boolean
}

type CenterTab = "betrieb" | "spontan" | "verwaltung"

const tabs: Array<{
  id: CenterTab
  label: string
  icon: typeof Play
}> = [
  { id: "betrieb", label: "Turnierbetrieb", icon: Play },
  { id: "spontan", label: "Spontanes Turnier", icon: Sparkles },
  { id: "verwaltung", label: "Verwaltung", icon: FolderKanban },
]

const operationCards = [
  {
    title: "Turnierserien",
    description: "Serien-Spieltage heute, geplant und vergangen anzeigen und durchführen.",
    internal: "turniertage" as const,
    icon: CalendarDays,
    tone: "orange",
  },
  {
    title: "Turniere",
    description: "Geplantes Turnier öffnen und direkt zur Anmeldung dieses Turniers wechseln.",
    internal: "turniere" as const,
    icon: Target,
    tone: "sky",
  },
] as const

const spontaneousCards = [
  {
    title: "Neues spontanes Turnier",
    description: "Turniername eingeben, Spielmodus wählen und direkt Spieler registrieren.",
    internal: "spontan-setup" as const,
    icon: Sparkles,
    tone: "orange",
  },
] as const

const managementCards = [
  {
    title: "Turnierserien anlegen & bearbeiten",
    description: "Serien anlegen, bearbeiten, Regeln festlegen und Spieltage konfigurieren.",
    internal: "serienverwaltung" as const,
    icon: Trophy,
  },
  {
    title: "Turniere anlegen & bearbeiten",
    description: "Neue Turniere anlegen und alle geplanten Veranstaltungen verwalten.",
    internal: "veranstaltungen" as const,
    icon: FolderKanban,
  },
  {
    title: "Turnier transferieren",
    description: "Bestehende Turniere oder Serien übertragen und bearbeiten.",
    href: "/admin/turnierserie-bearbeiten",
    icon: ArrowRight,
  },
] as const

const internalCards = [
  {
    view: "dart-competition",
    title: "Lion Cup",
    description: "Historie, Spieler und Einstellungen des Lion Cups.",
    icon: Trophy,
  },
  {
    view: "members-levels",
    title: "Members Cup",
    description: "Bestehenden Members-Cup-Bereich öffnen.",
    icon: Trophy,
  },
  {
    view: "internal-events",
    title: "Interne Events",
    description: "Interne Turniere, Specials und Anmeldungen verwalten.",
    icon: UserPlus,
  },
  {
    view: "player-database",
    title: "Spielerdatenbank",
    description: "Spielerdaten für Turniere und Wettbewerbe verwalten.",
    icon: Users,
  },
] as const

const toneClasses = {
  orange: {
    border: "border-orange-300/[0.16] hover:border-orange-300/35",
    icon: "border-orange-300/[0.16] bg-orange-500/[0.09] text-orange-200",
    glow: "bg-orange-500/[0.12]",
  },
  sky: {
    border: "border-sky-300/[0.14] hover:border-sky-300/35",
    icon: "border-sky-300/[0.16] bg-sky-500/[0.09] text-sky-200",
    glow: "bg-sky-500/[0.10]",
  },
  emerald: {
    border: "border-emerald-300/[0.14] hover:border-emerald-300/35",
    icon: "border-emerald-300/[0.16] bg-emerald-500/[0.09] text-emerald-200",
    glow: "bg-emerald-500/[0.10]",
  },
  red: {
    border: "border-red-300/[0.14] hover:border-red-300/35",
    icon: "border-red-300/[0.16] bg-red-500/[0.09] text-red-200",
    glow: "bg-red-500/[0.10]",
  },
} as const

function ActionGrid({
  cards,
  onInternalOpen,
}: {
  cards: ReadonlyArray<{
    title: string
    description: string
    href?: string
    internal?: "turniertage" | "turniere" | "serienverwaltung" | "veranstaltungen" | "einzelturnier" | "kratzer" | "spontan-setup"
    icon: typeof Play
    tone: keyof typeof toneClasses
  }>
  onInternalOpen?: (target: "turniertage" | "turniere" | "serienverwaltung" | "veranstaltungen" | "einzelturnier" | "kratzer" | "spontan-setup") => void
}) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {cards.map((item) => {
        const Icon = item.icon
        const tone = toneClasses[item.tone]

        return (
          item.internal ? (
            <button
              key={`${item.title}-${item.internal}`}
              type="button"
              onClick={() => onInternalOpen?.(item.internal!)}
              className={`group relative min-h-[188px] overflow-hidden rounded-[24px] border ${tone.border} bg-[#0b0d11] p-5 text-left text-white shadow-[0_20px_60px_-44px_rgba(0,0,0,.92)] transition duration-300 hover:-translate-y-0.5`}
            >
              <div className={`pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full ${tone.glow} blur-[55px]`} />
              <div className="relative flex h-full flex-col">
                <div className={`flex h-11 w-11 items-center justify-center rounded-2xl border ${tone.icon}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="mt-5 text-lg font-black tracking-tight">{item.title}</div>
                <p className="mt-1.5 text-sm font-semibold leading-5 text-white/45">{item.description}</p>
                <div className="mt-auto flex items-center gap-2 pt-5 text-xs font-black uppercase tracking-[0.12em] text-white/55 transition group-hover:text-white">
                  Öffnen
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </div>
              </div>
            </button>
          ) : (
            <Link
              key={`${item.title}-${item.href}`}
              href={item.href!}
              className={`group relative min-h-[188px] overflow-hidden rounded-[24px] border ${tone.border} bg-[#0b0d11] p-5 text-white shadow-[0_20px_60px_-44px_rgba(0,0,0,.92)] transition duration-300 hover:-translate-y-0.5`}
            >
              <div className={`pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full ${tone.glow} blur-[55px]`} />
              <div className="relative flex h-full flex-col">
                <div className={`flex h-11 w-11 items-center justify-center rounded-2xl border ${tone.icon}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="mt-5 text-lg font-black tracking-tight">{item.title}</div>
                <p className="mt-1.5 text-sm font-semibold leading-5 text-white/45">{item.description}</p>
                <div className="mt-auto flex items-center gap-2 pt-5 text-xs font-black uppercase tracking-[0.12em] text-white/55 transition group-hover:text-white">
                  Öffnen
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </div>
              </div>
            </Link>
          )
        )
      })}
    </div>
  )
}

export function AdminTournamentCenter({ onOpen, canOpen }: AdminTournamentCenterProps) {
  const { user } = useAuth()
  const [tab, setTab] = useState<CenterTab>("betrieb")
  const [embeddedView, setEmbeddedView] = useState<"home" | "turniertage" | "turniere" | "serienverwaltung" | "veranstaltungen" | "einzelturnier" | "kratzer" | "spontan-setup">("home")
  const [spontaneousDraft, setSpontaneousDraft] = useState<SpontaneousTournamentDraft | null>(null)
  const visibleInternalCards = internalCards.filter((item) => canOpen(item.view))

  if (embeddedView === "turniertage") {
    return <TournamentDaysManagement onBack={() => setEmbeddedView("home")} />
  }

  if (embeddedView === "turniere") {
    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => setEmbeddedView("home")}
          className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/[0.08] bg-[#0b0d11] px-4 text-sm font-black text-white/65 transition hover:border-orange-300/20 hover:bg-orange-500/[0.06] hover:text-white"
        >
          <ArrowRight className="h-4 w-4 rotate-180" />
          Turnier-Zentrale
        </button>
        <CentralTournamentRegistrationHub initialEventId={spontaneousDraft?.id || null} />
      </div>
    )
  }

  if (embeddedView === "serienverwaltung") {
    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => setEmbeddedView("home")}
          className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/[0.08] bg-[#0b0d11] px-4 text-sm font-black text-white/65 transition hover:border-orange-300/20 hover:bg-orange-500/[0.06] hover:text-white"
        >
          <ArrowRight className="h-4 w-4 rotate-180" />
          Turnier-Zentrale
        </button>
        <AdminTournamentSeriesManagement />
      </div>
    )
  }

  if (embeddedView === "veranstaltungen") {
    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => setEmbeddedView("home")}
          className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/[0.08] bg-[#0b0d11] px-4 text-sm font-black text-white/65 transition hover:border-orange-300/20 hover:bg-orange-500/[0.06] hover:text-white"
        >
          <ArrowRight className="h-4 w-4 rotate-180" />
          Turnier-Zentrale
        </button>
        <EventsManagement user={user} />
      </div>
    )
  }

  if (embeddedView === "spontan-setup") {
    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => setEmbeddedView("home")}
          className="emd-admin-button-secondary inline-flex items-center gap-2 px-4 text-sm"
        >
          <ArrowRight className="h-4 w-4 rotate-180" />
          Turnier-Zentrale
        </button>
        <SpontanesTurnierStart
          onCreated={(draft) => {
            setSpontaneousDraft(draft)
            setEmbeddedView("turniere")
          }}
        />
      </div>
    )
  }

  if (embeddedView === "einzelturnier") {
    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => setEmbeddedView("home")}
          className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/[0.08] bg-[#0b0d11] px-4 text-sm font-black text-white/65 transition hover:border-orange-300/20 hover:bg-orange-500/[0.06] hover:text-white"
        >
          <ArrowRight className="h-4 w-4 rotate-180" />
          Turnier-Zentrale
        </button>
        <EinzelturnierSetup />
      </div>
    )
  }

  if (embeddedView === "kratzer") {
    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => setEmbeddedView("home")}
          className="emd-admin-button-secondary inline-flex items-center gap-2 px-4 text-sm"
        >
          <ArrowRight className="h-4 w-4 rotate-180" />
          Turnier-Zentrale
        </button>
        <KratzerAdminEmbedded onExitToCenter={() => setEmbeddedView("home")} />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-[30px] border border-white/[0.08] bg-[#090b0f] p-5 text-white shadow-[0_30px_90px_-54px_rgba(0,0,0,.95)] sm:p-7 lg:p-8">
        <div className="pointer-events-none absolute -left-20 bottom-[-90px] h-64 w-64 rounded-full bg-orange-500/[0.13] blur-[90px]" />
        <div className="pointer-events-none absolute right-[8%] top-[-100px] h-64 w-64 rounded-full bg-sky-500/[0.10] blur-[95px]" />

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-white/45">
              <Trophy className="h-3.5 w-3.5 text-orange-300" />
              Turnierbereich
            </div>

            <h1 className="mt-4 text-3xl font-black tracking-[-0.045em] text-white sm:text-4xl lg:text-5xl">
              Turnier-Zentrale
            </h1>

            <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-white/48 sm:text-base">
              Geplante Turniere, spontane Turniere und Verwaltung sauber in einem Ablauf.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setEmbeddedView("turniertage")}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-orange-300/25 bg-orange-500 px-5 text-sm font-black text-white shadow-[0_0_34px_rgba(249,115,22,.13)] transition hover:bg-orange-400"
          >
            <Play className="h-4 w-4" />
            Turnierserien öffnen
          </button>
        </div>
      </section>

      <div className="rounded-[26px] border border-white/[0.08] bg-[#090b0f]/95 p-2 shadow-[0_24px_70px_-50px_rgba(0,0,0,.98)]">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {tabs.map((item) => {
            const Icon = item.icon
            const active = tab === item.id

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={`flex min-h-12 items-center justify-center gap-2 rounded-2xl border px-3 text-sm font-black transition ${
                  active
                    ? "border-orange-300/25 bg-orange-500/[0.12] text-orange-100 shadow-[0_14px_32px_-24px_rgba(249,115,22,.45)]"
                    : "border-transparent bg-white/[0.025] text-white/45 hover:border-white/[0.08] hover:bg-white/[0.045] hover:text-white/75"
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </button>
            )
          })}
        </div>
      </div>

      {tab === "betrieb" ? (
        <section>
          <div className="mb-4">
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-400">Durchführung</div>
            <h2 className="mt-1 text-xl font-black tracking-tight text-white">Turnierbetrieb</h2>
            <p className="mt-1 text-sm font-medium text-white/40">
              Geplante Turniere und Turnierserien öffnen. Beim Turnier kommst du direkt zur passenden Anmeldung.
            </p>
          </div>
          <ActionGrid cards={operationCards} onInternalOpen={(target) => setEmbeddedView(target)} />
        </section>
      ) : null}

      {tab === "spontan" ? (
        <section>
          <div className="mb-4">
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-300">Sofort starten</div>
            <h2 className="mt-1 text-xl font-black tracking-tight text-white">Spontanes Turnier</h2>
            <p className="mt-1 text-sm font-medium text-white/40">
              Turniername festlegen, Modus wählen und danach direkt Spieler registrieren.
            </p>
          </div>
          <ActionGrid cards={spontaneousCards} onInternalOpen={(target) => setEmbeddedView(target)} />

        </section>
      ) : null}

      {tab === "verwaltung" ? (
        <div className="space-y-5">
          <section>
            <div className="mb-4">
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-300">Konfiguration</div>
              <h2 className="mt-1 text-xl font-black tracking-tight text-white">Verwaltung</h2>
              <p className="mt-1 text-sm font-medium text-white/40">
                Serien, Turniere und Termine konfigurieren. Hier wird nichts gestartet.
              </p>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {managementCards.map((item) => {
                const Icon = item.icon
                const commonClass =
                  "group min-h-[178px] rounded-[22px] border border-white/[0.08] bg-[#0b0d11] p-4 text-left text-white transition hover:-translate-y-0.5 hover:border-violet-300/20 hover:bg-violet-500/[0.035]"

                if ("internal" in item) {
                  return (
                    <button
                      key={item.title}
                      type="button"
                      onClick={() => setEmbeddedView(item.internal)}
                      className={commonClass}
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-violet-300/15 bg-violet-500/[0.07] text-violet-200">
                        <Icon className="h-4.5 w-4.5" />
                      </div>
                      <div className="mt-4 font-black">{item.title}</div>
                      <p className="mt-1.5 text-sm font-medium leading-5 text-white/40">{item.description}</p>
                      <div className="mt-4 flex items-center gap-1.5 text-xs font-black text-violet-200/70">
                        Öffnen <ArrowRight className="h-3.5 w-3.5" />
                      </div>
                    </button>
                  )
                }

                if ("view" in item) {
                  return (
                    <button
                      key={item.title}
                      type="button"
                      onClick={() => onOpen(item.view)}
                      className={commonClass}
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-violet-300/15 bg-violet-500/[0.07] text-violet-200">
                        <Icon className="h-4.5 w-4.5" />
                      </div>
                      <div className="mt-4 font-black">{item.title}</div>
                      <p className="mt-1.5 text-sm font-medium leading-5 text-white/40">{item.description}</p>
                      <div className="mt-4 flex items-center gap-1.5 text-xs font-black text-violet-200/70">
                        Öffnen <ArrowRight className="h-3.5 w-3.5" />
                      </div>
                    </button>
                  )
                }

                return (
                  <Link key={item.href} href={item.href} className={commonClass}>
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-violet-300/15 bg-violet-500/[0.07] text-violet-200">
                      <Icon className="h-4.5 w-4.5" />
                    </div>
                    <div className="mt-4 font-black">{item.title}</div>
                    <p className="mt-1.5 text-sm font-medium leading-5 text-white/40">{item.description}</p>
                    <div className="mt-4 flex items-center gap-1.5 text-xs font-black text-violet-200/70">
                      Öffnen <ArrowRight className="h-3.5 w-3.5" />
                    </div>
                  </Link>
                )
              })}
            </div>
          </section>

          {visibleInternalCards.length > 0 ? (
            <section>
              <div className="mb-4">
                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-300">Weitere Bereiche</div>
                <h2 className="mt-1 text-xl font-black tracking-tight text-white">Vereinswettbewerbe</h2>
              </div>

              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {visibleInternalCards.map((item) => {
                  const Icon = item.icon
                  return (
                    <button
                      key={item.view}
                      type="button"
                      onClick={() => onOpen(item.view)}
                      className="group min-h-[168px] rounded-[22px] border border-white/[0.08] bg-[#0b0d11] p-4 text-left text-white transition hover:-translate-y-0.5 hover:border-emerald-300/20"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-300/15 bg-emerald-500/[0.07] text-emerald-200">
                        <Icon className="h-4.5 w-4.5" />
                      </div>
                      <div className="mt-4 font-black">{item.title}</div>
                      <p className="mt-1.5 text-sm font-medium leading-5 text-white/40">{item.description}</p>
                    </button>
                  )
                })}
              </div>
            </section>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
