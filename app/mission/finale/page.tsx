"use client"

import Link from "next/link"
import Image from "next/image"
import { useState } from "react"
import { Header } from "@/components/header"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { motion, AnimatePresence } from "framer-motion"
import { ArrowLeft, Sparkles, X } from "lucide-react"

const FINAL_CODE = "OSTEREI"

const eggs = [
  {
    id: 1,
    src: "/easter/egg-1.png",
    alt: "Osterei",
    className:
      "absolute -left-2 top-24 w-8 sm:-left-3 sm:top-24 sm:w-10 lg:-left-5 lg:w-11",
    correct: false,
  },
  {
    id: 2,
    src: "/easter/egg-2.png",
    alt: "Osterei",
    className:
      "absolute -right-2 top-24 w-8 sm:-right-3 sm:top-24 sm:w-10 lg:-right-5 lg:w-11",
    correct: false,
  },
  {
    id: 3,
    src: "/easter/egg-3.png",
    alt: "Osterei",
    className:
      "absolute -left-2 top-[54%] w-8 -translate-y-1/2 sm:-left-3 sm:w-10 lg:-left-5 lg:w-11",
    correct: false,
  },
  {
    id: 4,
    src: "/easter/egg-4.png",
    alt: "Osterei",
    className:
      "absolute -right-2 top-[54%] w-8 -translate-y-1/2 sm:-right-3 sm:w-10 lg:-right-5 lg:w-11",
    correct: true,
  },
  {
    id: 5,
    src: "/easter/egg-5.png",
    alt: "Osterei",
    className:
      "absolute left-6 bottom-3 w-8 sm:left-8 sm:bottom-4 sm:w-10 lg:left-10 lg:w-11",
    correct: false,
  },
  {
    id: 6,
    src: "/easter/egg-6.png",
    alt: "Osterei",
    className:
      "absolute right-6 bottom-3 w-8 sm:right-8 sm:bottom-4 sm:w-10 lg:right-10 lg:w-11",
    correct: false,
  },
  {
    id: 7,
    src: "/easter/egg-7.png",
    alt: "Osterei",
    className:
      "absolute right-16 top-14 hidden w-8 sm:block sm:right-20 sm:top-14 sm:w-9 lg:right-24 lg:w-10",
    correct: false,
  },
]

export default function FinalePage() {
  const [foundCode, setFoundCode] = useState(false)

  const handleEggClick = (correct: boolean) => {
    if (correct) {
      setFoundCode(true)
    }
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-black pb-20 text-zinc-100">
      <Header />

      <main className="relative pt-24 sm:pt-28">
        <motion.div
          className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 sm:py-14"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
        >
          <div className="mb-8 mt-2">
            <Link href="/oster-mission">
              <Button
                variant="outline"
                className="rounded-2xl border-zinc-700 bg-transparent text-zinc-200 hover:bg-zinc-900"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Zurück zur Oster Mission
              </Button>
            </Link>
          </div>

          <Card className="relative overflow-hidden rounded-3xl border border-orange-500/20 bg-zinc-950 shadow-2xl">
            <CardContent className="relative px-8 py-8 sm:px-14 sm:py-10">
              <div className="relative z-20 max-w-2xl">
                <div className="inline-flex items-center gap-2 rounded-full border border-orange-500/20 bg-orange-500/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.25em] text-orange-400">
                  <Sparkles className="h-3.5 w-3.5" />
                  Finale freigeschaltet
                </div>

                <h1 className="mt-4 text-3xl font-black leading-tight text-white sm:text-5xl">
                  Die letzte Prüfung
                </h1>

                <p className="mt-5 text-sm leading-relaxed text-zinc-300 sm:text-base">
                  Du suchst den letzten Buchstaben.
                  <br />
                  <br />
                  Doch er wird nicht ausgesprochen.
                  <br />
                  Er wird nicht geschrieben.
                  <br />
                  <br />
                  Sieh dich um.
                  <br />
                  <br />
                  Manchmal ist das Wichtigste
                  <br />
                  nicht im Rätsel versteckt,
                  <br />
                  sondern direkt vor dir.
                </p>

                <div className="mt-8 rounded-2xl border border-zinc-800 bg-black/40 p-5">
                  <p className="text-sm leading-relaxed text-zinc-400">
                    Nicht jede Spur sieht wie eine Spur aus.
                  </p>
                </div>
              </div>

              <div className="pointer-events-none absolute inset-0 z-10">
                {eggs.map((egg) => (
                  <button
                    key={egg.id}
                    type="button"
                    onClick={() => handleEggClick(egg.correct)}
                    className={`${egg.className} pointer-events-auto transition-transform duration-200 hover:scale-110`}
                    aria-label={egg.alt}
                  >
                    <Image
                      src={egg.src}
                      alt={egg.alt}
                      width={80}
                      height={110}
                      className="h-auto w-full select-none drop-shadow-[0_8px_18px_rgba(0,0,0,0.45)]"
                    />
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </main>

      <AnimatePresence>
        {foundCode && (
          <>
            <motion.div
              className="fixed inset-0 z-[80] bg-black/70 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setFoundCode(false)}
            />

            <motion.div
              className="fixed inset-0 z-[90] flex items-center justify-center px-4 pt-24 pb-24 sm:px-6"
              initial={{ opacity: 0, scale: 0.96, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 16 }}
              transition={{ duration: 0.22 }}
            >
              <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-green-400/20 bg-zinc-950 shadow-[0_20px_80px_rgba(0,0,0,0.55)]">
                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-green-300 via-emerald-400 to-green-300" />

                <button
                  type="button"
                  onClick={() => setFoundCode(false)}
                  className="absolute right-3 top-3 z-10 rounded-full border border-white/10 bg-white/5 p-2 text-zinc-300 transition hover:bg-white/10 hover:text-white"
                  aria-label="Modal schließen"
                >
                  <X className="h-4 w-4" />
                </button>

                <div className="px-5 pb-6 pt-8 sm:px-7 sm:pb-7 sm:pt-9">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-green-400/20 bg-green-500/10 shadow-[0_0_40px_rgba(74,222,128,0.18)]">
                    <Sparkles className="h-6 w-6 text-green-300" />
                  </div>

                  <div className="mt-5 text-center">
                    <p className="text-[11px] font-black uppercase tracking-[0.28em] text-green-300">
                      Fund entdeckt
                    </p>

                    <h2 className="mt-3 text-2xl font-black leading-tight text-white sm:text-3xl">
                      Du hast das richtige Ei gefunden
                    </h2>

                    <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-zinc-300 sm:text-base">
                      Stark. Der finale Code wurde entdeckt und ist jetzt bereit
                      für die Mission-Seite.
                    </p>
                  </div>

                  <div className="mt-6 rounded-2xl border border-green-500/20 bg-green-500/10 px-4 py-4 text-center">
                    <p className="text-[11px] font-black uppercase tracking-[0.24em] text-green-200/80">
                      Finaler Code
                    </p>
                    <p className="mt-2 text-3xl font-black tracking-[0.3em] text-white sm:text-4xl">
                      {FINAL_CODE}
                    </p>
                  </div>

                  <p className="mt-5 text-center text-sm leading-relaxed text-zinc-400">
                    Gib den Code auf der Mission-Seite ein, um den letzten
                    Buchstaben zu erhalten.
                  </p>

                  <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                    <Link href="/oster-mission" className="flex-1">
                      <Button className="w-full rounded-2xl bg-green-500 font-black text-black hover:bg-green-400">
                        Zur Mission
                      </Button>
                    </Link>

                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setFoundCode(false)}
                      className="flex-1 rounded-2xl border-zinc-700 bg-transparent text-zinc-200 hover:bg-zinc-900"
                    >
                      Weiter ansehen
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <MobileBottomNav />
    </div>
  )
}