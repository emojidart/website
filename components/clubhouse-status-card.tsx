"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { ChevronRight } from "lucide-react"

type Opening = {
  status: "planned" | "open" | "closed"
  opens_at: string | null
  closes_at: string | null
  note: string | null
}

function todayVienna() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Vienna",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date())

  const get = (type: string) => parts.find((part) => part.type === type)?.value || ""
  return `${get("year")}-${get("month")}-${get("day")}`
}

export function ClubhouseStatusCard() {
  const [row, setRow] = useState<Opening | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const date = todayVienna()

    const load = async () => {
      const { data, error } = await supabase
        .from("clubhouse_openings")
        .select("status,opens_at,closes_at,note")
        .eq("open_date", date)
        .maybeSingle()

      if (error) {
        console.warn("Pfeil OK Status konnte nicht geladen werden:", error)
        setRow(null)
      } else {
        setRow((data as Opening | null) || null)
      }

      setLoaded(true)
    }

    void load()

    const channel = supabase
      .channel("home_clubhouse_status")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "clubhouse_openings" },
        () => void load(),
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [])

  const status = !loaded ? "loading" : row?.status || "unknown"

  const label =
    status === "open"
      ? "Heute geöffnet"
      : status === "planned"
        ? "Heute geplant geöffnet"
        : status === "closed"
          ? "Heute geschlossen"
          : status === "loading"
            ? "Status wird geladen…"
            : "Heute noch keine Info"

  const time =
    row?.opens_at
      ? `${row.opens_at.slice(0, 5)}${row.closes_at ? `–${row.closes_at.slice(0, 5)}` : ""} Uhr`
      : ""

  const dotClass =
    status === "open"
      ? "bg-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,0.12)]"
      : status === "planned"
        ? "bg-sky-500 shadow-[0_0_0_4px_rgba(14,165,233,0.12)]"
        : status === "closed"
          ? "bg-red-500 shadow-[0_0_0_4px_rgba(239,68,68,0.10)]"
          : "bg-slate-400"

  const textClass =
    status === "open"
      ? "text-emerald-700"
      : status === "planned"
        ? "text-sky-700"
        : status === "closed"
          ? "text-red-700"
          : "text-slate-600"

  return (
    <div className="mx-auto w-full max-w-[1800px] px-3 pt-2 sm:px-5 sm:pt-3 lg:px-8 xl:px-10">
      <Link
        href="/vereinsheim"
        className="group flex min-h-11 w-full items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm transition hover:border-orange-200 hover:shadow-md sm:min-h-12 sm:px-4"
        aria-label={`Pfeil OK: ${label}${time ? `, ${time}` : ""}`}
      >
        <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${dotClass}`} />

        <div className="flex min-w-0 flex-1 items-center gap-x-2 gap-y-0.5 overflow-hidden">
          <span className="shrink-0 text-sm font-black text-slate-950 sm:text-[15px]">
            Pfeil OK
          </span>

          <span className="shrink-0 text-slate-300">·</span>

          <span className={`min-w-0 truncate text-sm font-extrabold sm:text-[15px] ${textClass}`}>
            {label}
          </span>

          {time ? (
            <>
              <span className="hidden shrink-0 text-slate-300 xs:inline sm:inline">·</span>
              <span className="hidden shrink-0 whitespace-nowrap text-sm font-bold text-slate-500 xs:inline sm:inline">
                {time}
              </span>
            </>
          ) : null}
        </div>

        {time ? (
          <span className="shrink-0 whitespace-nowrap text-xs font-bold text-slate-500 sm:hidden">
            {time}
          </span>
        ) : null}

        <ChevronRight className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-orange-500" />
      </Link>
    </div>
  )
}
