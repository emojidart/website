"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { Header } from "@/components/header"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { motion, AnimatePresence } from "framer-motion"
import { Eye, ScanSearch, ShieldAlert, ArrowLeft, Sparkles } from "lucide-react"

const SECRET_WORD = "BULL"

const NOISE_LINES = [
  "ARCHIVFRAGMENT_04",
  "SIGIL_NODE_VI",
  "NUR_DAS_ZENTRUM_SIEHT_ZURUECK",
  "PROTOKOLL_UNVOLLSTAENDIG",
  "BLICK_NICHT_AUF_DEN_RAND",
  "VIER_IST_NUR_DIE_FORM",
  "DIE_ANTWORT_LIEGT_IM_KERN",
  "SEKTOR_25_NICHT_VERGESSEN",
  "NICHT_ALLES_IST_EIN_CODE",
]

export default function ProtokollVierPage() {
  const [answer, setAnswer] = useState("")
  const [message, setMessage] = useState("")
  const [solved, setSolved] = useState(false)

  const shuffledNoise = useMemo(() => {
    return [...NOISE_LINES].sort(() => Math.random() - 0.5)
  }, [])

  const handleCheck = () => {
    const normalized = answer.trim().toUpperCase()

    if (!normalized) {
      setSolved(false)
      setMessage("Das Protokoll reagiert nicht.")
      return
    }

    if (normalized === SECRET_WORD) {
      setSolved(true)
      setMessage("Erkannt. Das Zentrum wurde benannt.")
      return
    }

    setSolved(false)
    setMessage("Falsch. Du siehst noch auf den Rand.")
  }

  return (
    <div className="min-h-screen bg-black text-zinc-100 pb-20 overflow-x-hidden">
      <Header />

      <main className="relative isolate">
        <div className="pointer-events-none absolute inset-0 -z-10 opacity-[0.09]">
          <div className="h-full w-full bg-[radial-gradient(circle_at_center,white_0,transparent_55%)]" />
        </div>

        <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute left-[8%] top-24 h-24 w-24 rounded-full bg-orange-500/10 blur-3xl" />
          <div className="absolute right-[12%] top-44 h-32 w-32 rounded-full bg-red-500/10 blur-3xl" />
          <div className="absolute bottom-24 left-[20%] h-28 w-28 rounded-full bg-orange-400/10 blur-3xl" />
        </div>

        <motion.div
          className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 sm:py-14"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
        >
          <section className="overflow-hidden rounded-3xl border border-orange-500/20 bg-zinc-950/90 shadow-2xl">
            <div className="relative border-b border-orange-500/10 bg-gradient-to-br from-orange-950 via-zinc-950 to-black p-6 sm:p-8">
              <div className="absolute right-6 top-6 z-20">
                <Link href="/oster-mission">
                  <Button
                    variant="outline"
                    className="rounded-2xl border-orange-500/30 bg-zinc-950/90 text-white shadow-lg backdrop-blur-md hover:bg-zinc-900 hover:text-orange-200"
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Zurück
                  </Button>
                </Link>
              </div>

              <div className="inline-flex items-center gap-2 rounded-full border border-orange-500/20 bg-orange-500/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.25em] text-orange-400">
                <ShieldAlert className="h-3.5 w-3.5" />
                Verstecktes Protokoll
              </div>

              <h1 className="mt-4 text-3xl font-black leading-tight text-white sm:text-5xl">
                Protokoll IV
              </h1>

              <p className="mt-4 max-w-2xl text-sm leading-relaxed text-zinc-300 sm:text-base">
                Wer hier angekommen ist, hat bereits erkannt, dass Zahlen lügen können.
                Die Vier war nur eine Tür.
                Der nächste Schlüssel ist kein Ort, kein Datum und keine Platzierung.
                Er ist näher, als er wirkt.
              </p>

              <div className="mt-5 inline-flex items-center gap-2 rounded-2xl border border-zinc-800 bg-black/30 px-3 py-2 text-xs text-zinc-400">
                <Sparkles className="h-3.5 w-3.5 text-orange-400" />
                Manchmal sagen Zahlen nur, wie lang ein Wort ist.
              </div>
            </div>

            <div className="grid gap-5 p-5 sm:grid-cols-[1fr_0.9fr] sm:p-8">
              <Card className="rounded-3xl border border-orange-500/10 bg-black/50 shadow-none">
                <CardContent className="p-5 sm:p-6">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-orange-500/20 bg-orange-500/10">
                      <Eye className="h-5 w-5 text-orange-400" />
                    </div>

                    <div>
                      <h2 className="text-lg font-black text-white">
                        Die Botschaft
                      </h2>
                      <p className="text-sm text-zinc-400">
                        Lies langsam. Nicht alles ist zufällig.
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 space-y-4 rounded-3xl border border-zinc-800 bg-zinc-950 p-5">
                    <p className="text-sm leading-relaxed text-zinc-300">
                      Viele suchen am Rand.
                      Viele zählen Plätze, Punkte und Namen.
                      Viele sehen Zahlen und glauben, sie hätten verstanden.
                    </p>

                    <p className="text-sm leading-relaxed text-zinc-300">
                      Doch das Ziel zeigt sich nie außen.
                      Nicht in der Liste.
                      Nicht im Lärm.
                      Nicht im Schatten.
                    </p>

                    <p className="text-sm font-semibold leading-relaxed text-zinc-100">
                      Wer das Zentrum benennt, öffnet die nächste Tür.
                    </p>

                    <div className="rounded-2xl border border-orange-500/10 bg-orange-500/5 p-4">
                      <p className="text-[10px] uppercase tracking-[0.25em] text-orange-400">
                        Hinweis
                      </p>

                      <p className="mt-2 text-sm leading-relaxed text-zinc-300">
                        Vier war nie die Antwort.
                        Vier sagt dir nur, wie viele Buchstaben der nächste Schlüssel hat.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-5">
                <Card className="rounded-3xl border border-orange-500/10 bg-black/50 shadow-none">
                  <CardContent className="p-5 sm:p-6">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-orange-500/20 bg-orange-500/10">
                        <ScanSearch className="h-5 w-5 text-orange-400" />
                      </div>

                      <div>
                        <h2 className="text-lg font-black text-white">
                          Eingabe
                        </h2>
                        <p className="text-sm text-zinc-400">
                          Was liegt im Zentrum?
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 flex gap-2">
                      <Input
                        value={answer}
                        onChange={(e) => setAnswer(e.target.value)}
                        placeholder="Vier Buchstaben"
                        className="h-12 rounded-2xl border-zinc-800 bg-zinc-950 text-white placeholder:text-zinc-500"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleCheck()
                        }}
                      />

                      <Button
                        onClick={handleCheck}
                        className="h-12 rounded-2xl bg-orange-600 font-black hover:bg-orange-700"
                      >
                        Prüfen
                      </Button>
                    </div>

                    {message && (
                      <div className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-950 p-4 text-sm font-semibold text-zinc-200">
                        {message}
                      </div>
                    )}

                    <AnimatePresence>
                      {solved && (
                        <motion.div
                          initial={{ opacity: 0, y: 10, scale: 0.98 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 10, scale: 0.98 }}
                          className="mt-4 rounded-2xl border border-green-500/20 bg-green-500/10 p-4"
                        >
                          <p className="text-[10px] uppercase tracking-[0.25em] text-green-400">
                            Zugriff erweitert
                          </p>

                          <p className="mt-2 text-sm font-semibold text-green-100">
                            Richtig. Das Zentrum wurde erkannt:{" "}
                            <span className="font-black text-green-300">0074</span>
                          </p>

                          <p className="mt-2 text-sm leading-relaxed text-green-200/90">
                            Du kannst jetzt zur Mission zurückkehren und den nächsten Code eingeben.
                          </p>

                          <div className="mt-4">
                            <Link href="/oster-mission">
                              <Button className="rounded-2xl bg-green-600 font-black hover:bg-green-700">
                                Zur Mission zurück
                              </Button>
                            </Link>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </CardContent>
                </Card>

                <Card className="rounded-3xl border border-zinc-800 bg-zinc-950 shadow-none">
                  <CardContent className="p-5 sm:p-6">
                    <p className="text-[10px] uppercase tracking-[0.25em] text-zinc-500">
                      Fragmentrauschen
                    </p>

                    <div className="mt-4 space-y-2 font-mono text-xs text-zinc-500">
                      {shuffledNoise.map((line) => (
                        <motion.div
                          key={line}
                          initial={{ opacity: 0.65 }}
                          animate={{ opacity: [0.5, 0.9, 0.6] }}
                          transition={{
                            duration: 2.4,
                            repeat: Infinity,
                            delay: Math.random(),
                          }}
                        >
                          {line}
                        </motion.div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </section>
        </motion.div>
      </main>

      <MobileBottomNav />
    </div>
  )
}