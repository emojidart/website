import { supabase } from "@/lib/supabase"

export type EmdSpeaker = "nero" | "volt"
export const EMD_SPEAKER_KEY = "emd_survival_speaker"
export const selectedEmdSpeaker = (): EmdSpeaker =>
  typeof window !== "undefined" && localStorage.getItem(EMD_SPEAKER_KEY) === "volt" ? "volt" : "nero"

const names = new Map<string, string>()
let loading: Promise<void> | null = null
async function loadNames() {
  if (!loading) loading = (async () => {
    const { data } = await supabase.from("spieldatenbank").select("name,tts_pronunciation")
    for (const row of data || []) if (row.name && row.tts_pronunciation)
      names.set(String(row.name).trim().toLocaleLowerCase("de"), String(row.tts_pronunciation).trim())
  })().catch(() => { loading = null })
  await loading
}
const spoken = (name: string) => names.get(name.trim().toLocaleLowerCase("de")) || name
const numberWords = ["null","eins","zwei","drei","vier","fünf","sechs","sieben","acht","neun","zehn","elf","zwölf"]
function boardNumber(n: number) { return numberWords[n] || String(n) }
export async function requestVolt(players: string[], machine: number, call: number): Promise<Blob> {
  await loadNames()
  const who = players.length === 4
    ? `${spoken(players[0])} und ${spoken(players[1])} gegen ${spoken(players[2])} und ${spoken(players[3])}`
    : `${spoken(players[0])} gegen ${spoken(players[1])}`
  const intro = call === 2 ? "Zweiter Aufruf! " : call === 3 ? "Letzter Aufruf! " : ""
  const text = `${intro}Auf Automat Nummer ${boardNumber(machine)}. ${who}.`
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) throw new Error("VOLT-Anmeldung fehlt")
  const response = await fetch("/api/volt/speak", { method: "POST", headers: {
    "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}`
  }, body: JSON.stringify({ text }) })
  if (!response.ok) throw new Error(`VOLT HTTP ${response.status}`)
  return response.blob()
}
