"use client"

import { Cake, CalendarDays, Sparkles, Target, Trophy } from "lucide-react"

export type TodayLeagueGame = {
  id: string
  homeTeam: string
  awayTeam: string
  division: string
  weekNumber: number
  live: boolean
  homeScore?: number | null
  awayScore?: number | null
}

export type TodayItem = {
  id: string
  title: string
  subtitle?: string | null
  time?: string | null
}

export type TodayBirthday = { id: string; name: string }

export default function TodayTv({
  leagueGames,
  tournaments,
  series,
  events,
  birthdays,
}: {
  leagueGames: TodayLeagueGame[]
  tournaments: TodayItem[]
  series: TodayItem[]
  events: TodayItem[]
  birthdays: TodayBirthday[]
}) {
  const blocks = [
    {
      key: "league",
      title: "Ligaspiele",
      icon: Target,
      accent: "orange",
      items: leagueGames.slice(0, 3).map((g) => ({
        id: g.id,
        title: `${g.homeTeam}  ${g.live ? `${g.homeScore ?? "–"} : ${g.awayScore ?? "–"}` : "VS"}  ${g.awayTeam}`,
        subtitle: `${g.division} · ST ${g.weekNumber || "–"}${g.live ? " · LIVE" : ""}`,
      })),
    },
    {
      key: "tournaments",
      title: "Turniere",
      icon: Trophy,
      accent: "cyan",
      items: tournaments.slice(0, 3),
    },
    {
      key: "series",
      title: "Turnierserien",
      icon: CalendarDays,
      accent: "orange",
      items: series.slice(0, 3),
    },
    {
      key: "events",
      title: "Veranstaltungen",
      icon: Sparkles,
      accent: "cyan",
      items: events.slice(0, 3),
    },
  ].filter((block) => block.items.length)

  const totalBlocks = blocks.length + (birthdays.length ? 1 : 0)
  const gridClass = totalBlocks >= 5 ? "grid-cols-3" : "grid-cols-2"

  return (
    <section className="relative h-full overflow-hidden px-[3.8vw] pb-[3.8vh] pt-[3.3vh]">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[url('/terminal/hero-startscreen.png')] bg-cover bg-[66%_50%] opacity-[.20]" />
        <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(3,5,8,.97),rgba(4,6,9,.90)_48%,rgba(3,5,8,.95))]" />
        <div className="absolute -left-[10vw] bottom-[-20vh] h-[44vw] w-[44vw] rounded-full bg-orange-500/[.10] blur-[9vw]" />
        <div className="absolute -right-[8vw] top-[-16vh] h-[38vw] w-[38vw] rounded-full bg-cyan-400/[.075] blur-[8vw]" />
        <div className="absolute bottom-[3vh] right-[3vw] text-[clamp(5rem,11vw,12rem)] font-black tracking-[-.08em] text-white/[.018]">HEUTE</div>
      </div>

      <div className="relative z-10 flex h-full flex-col">
        <header className="flex items-end justify-between gap-8 border-b border-white/[.06] pb-[2.2vh]">
          <div>
            <div className="text-[clamp(.68rem,.82vw,.9rem)] font-black uppercase tracking-[.32em] text-orange-300/80">EMD Club TV</div>
            <h1 className="mt-[.8vh] text-[clamp(3rem,5vw,5.8rem)] font-black leading-[.88] tracking-[-.065em] text-white">HEUTE <span className="text-orange-400">IM EMD</span></h1>
          </div>
          <div className="rounded-full border border-white/[.08] bg-black/30 px-[1.1vw] py-[.75vh] text-[clamp(.58rem,.7vw,.76rem)] font-black uppercase tracking-[.17em] text-white/45 backdrop-blur-xl">Alles Wichtige auf einen Blick</div>
        </header>

        <div className={`mt-[2.4vh] grid min-h-0 flex-1 gap-[1.2vw] ${gridClass}`}>
          {blocks.map((block) => {
            const Icon = block.icon
            const orange = block.accent === "orange"
            return (
              <article key={block.key} className="relative overflow-hidden rounded-[1.7vw] border border-white/[.085] bg-black/30 px-[1.6vw] py-[1.7vh] shadow-[0_24px_70px_rgba(0,0,0,.25)] backdrop-blur-xl">
                <div className={`absolute left-0 top-[18%] h-[64%] w-[3px] rounded-r-full ${orange ? "bg-orange-400" : "bg-cyan-300"}`} />
                <div className="flex items-center gap-3">
                  <div className={`grid h-[2.7vw] w-[2.7vw] min-h-[42px] min-w-[42px] place-items-center rounded-[.9vw] border ${orange ? "border-orange-300/15 bg-orange-500/[.08] text-orange-200" : "border-cyan-300/15 bg-cyan-400/[.07] text-cyan-100"}`}>
                    <Icon className="h-[1.35vw] w-[1.35vw] min-h-[20px] min-w-[20px]" />
                  </div>
                  <h2 className="text-[clamp(1.1rem,1.55vw,1.8rem)] font-black tracking-[-.035em] text-white">{block.title}</h2>
                </div>
                <div className="mt-[1.4vh] divide-y divide-white/[.055]">
                  {block.items.map((item) => (
                    <div key={item.id} className="py-[1.15vh] first:pt-0 last:pb-0">
                      <div className="flex items-center justify-between gap-4">
                        <div className="min-w-0 text-[clamp(.92rem,1.18vw,1.32rem)] font-black leading-tight text-white/88 line-clamp-1">{item.title}</div>
                        {item.time ? <div className={`shrink-0 text-[clamp(.62rem,.72vw,.78rem)] font-black ${orange ? "text-orange-200" : "text-cyan-100"}`}>{item.time}</div> : null}
                      </div>
                      {item.subtitle ? <div className="mt-[.45vh] truncate text-[clamp(.56rem,.68vw,.74rem)] font-bold uppercase tracking-[.12em] text-white/30">{item.subtitle}</div> : null}
                    </div>
                  ))}
                </div>
              </article>
            )
          })}

          {birthdays.length ? (
            <article className="relative overflow-hidden rounded-[1.7vw] border border-pink-300/[.10] bg-black/30 px-[1.6vw] py-[1.7vh] shadow-[0_24px_70px_rgba(0,0,0,.25)] backdrop-blur-xl">
              <div className="absolute left-0 top-[18%] h-[64%] w-[3px] rounded-r-full bg-pink-300" />
              <div className="flex items-center gap-3"><Cake className="h-[1.5vw] w-[1.5vw] min-h-[22px] min-w-[22px] text-pink-200" /><h2 className="text-[clamp(1.1rem,1.55vw,1.8rem)] font-black tracking-[-.035em]">Geburtstag</h2></div>
              <div className="mt-[1.6vh] text-[clamp(1.2rem,1.8vw,2.15rem)] font-black leading-tight text-white">{birthdays.map((b) => b.name).join(" · ")}</div>
              <div className="mt-[.65vh] text-[clamp(.56rem,.68vw,.74rem)] font-black uppercase tracking-[.16em] text-pink-200/65">Happy Birthday vom EMD-Team</div>
            </article>
          ) : null}
        </div>
      </div>
    </section>
  )
}
