"use client"

import { useCallback, useEffect, useRef, useState } from "react"

type DescriptorRecord = { name: string; vector: number[]; createdAt: string }
type FaceApi = typeof import("face-api.js")
const DB = "emd-face-id-local-test"
const STORE = "faces"
const MODEL_URL = "/models"
const MAX_DISTANCE = 0.43 // Conservative demo threshold, not an authentication guarantee

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1)
    req.onupgradeneeded = () => { if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE) }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}
async function readFaces(): Promise<DescriptorRecord[]> {
  const db = await openDB()
  try {
    return await new Promise((resolve, reject) => {
      const req = db.transaction(STORE, "readonly").objectStore(STORE).getAll()
      req.onsuccess = () => resolve((req.result as DescriptorRecord[]).filter(r => r?.name && Array.isArray(r.vector)))
      req.onerror = () => reject(req.error)
    })
  } finally { db.close() }
}
async function writeFace(value: DescriptorRecord): Promise<void> {
  const db = await openDB()
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite")
      tx.objectStore(STORE).put(value, value.name.toLocaleLowerCase('de').trim())
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
      tx.onabort = () => reject(tx.error)
    })
  } finally { db.close() }
}
async function removeFace(name: string): Promise<void> {
  const db = await openDB()
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite")
      tx.objectStore(STORE).delete(name.toLocaleLowerCase('de').trim())
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
      tx.onabort = () => reject(tx.error)
    })
  } finally { db.close() }
}
function distance(a: number[], b: Float32Array) {
  if (a.length !== b.length) return Infinity
  return Math.sqrt(a.reduce((sum, x, i) => sum + (x - b[i]) ** 2, 0))
}
const VOICE_KEY = 'emd-face-lab-voice'
function preferredVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | undefined {
  return voices.find(v => v.name.includes('Google Deutsch')) ||
    voices.find(v => v.name.includes('Google') && v.lang === 'de-DE') ||
    voices.find(v => v.lang === 'de-DE' && !v.name.includes('Hedda')) ||
    voices.find(v => v.lang.startsWith('de') && !v.name.includes('Hedda'))
}
export default function FaceLab() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const apiRef = useRef<FaceApi | null>(null)
  const [camera, setCamera] = useState(false)
  const [modelsReady, setModelsReady] = useState(false)
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState<DescriptorRecord[]>([])
  const [enrollName, setEnrollName] = useState('')
  const [recognized, setRecognized] = useState('')
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])
  const [voiceName, setVoiceName] = useState('')
  const [status, setStatus] = useState("Starte mit deiner Frontkamera.")
  const [verified, setVerified] = useState(false)
  const [consent, setConsent] = useState(false)
  const [progress, setProgress] = useState(0)
  const [score, setScore] = useState<number | null>(null)
  const busyRef = useRef(false)

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(track => track.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
    setCamera(false)
  }, [])
  useEffect(() => {
    readFaces().then(setSaved).catch(() => setStatus('Lokale Speicherung ist nicht verfügbar.'))
    const loadVoices = () => setVoices(window.speechSynthesis?.getVoices() ?? [])
    loadVoices()
    window.speechSynthesis?.addEventListener('voiceschanged', loadVoices)
    try { setVoiceName(localStorage.getItem(VOICE_KEY) || '') } catch { /* storage unavailable */ }
    return () => {
      streamRef.current?.getTracks().forEach(t => t.stop())
      window.speechSynthesis?.cancel()
      window.speechSynthesis?.removeEventListener('voiceschanged', loadVoices)
    }
  }, [])
  function speak(message: string) {
    if (!('speechSynthesis' in window)) { setStatus('Auf diesem Gerät ist keine Sprachausgabe verfügbar.'); return }
    const engine = window.speechSynthesis
    const available = engine.getVoices()
    const chosen = (voiceName ? available.find(v => `${v.name}|${v.lang}` === voiceName && v.lang.startsWith('de')) : undefined) || preferredVoice(available)
    if (!chosen) { setStatus('Keine passende deutsche Stimme gefunden. Bitte auf dem Tablet eine deutsche TTS-Stimme installieren.'); return }
    engine.cancel()
    const messageSpeech = new SpeechSynthesisUtterance(message)
    messageSpeech.lang = chosen.lang
    messageSpeech.voice = chosen
    messageSpeech.rate = 0.9
    messageSpeech.pitch = 1
    messageSpeech.volume = 1
    engine.speak(messageSpeech)
  }
  function selectVoice(value: string) {
    setVoiceName(value)
    try { localStorage.setItem(VOICE_KEY, value) } catch { /* storage unavailable */ }
  }
  async function loadModels() {
    if (apiRef.current) return apiRef.current
    setStatus("Gesichtsmodelle werden einmalig geladen (Internet erforderlich)…")
    const api = await import("face-api.js")
    await Promise.all([
      api.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
      api.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
      api.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
    ])
    apiRef.current = api; setModelsReady(true)
    return api
  }
  async function startCamera() {
    setVerified(false); setScore(null); setRecognized('')
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw Error("Kamera benötigt HTTPS oder localhost.")
      const stream = await navigator.mediaDevices.getUserMedia({video:{facingMode:"user",width:{ideal:1280},height:{ideal:720}},audio:false})
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      setCamera(true)
      setStatus("Kamera bereit. Schau mittig ins Bild, mit gutem Licht.")
    } catch (e) { setStatus(e instanceof Error ? e.message : "Kamera konnte nicht gestartet werden.") }
  }
  async function capture(): Promise<Float32Array> {
    const api = await loadModels()
    const video = videoRef.current
    if (!video || video.readyState < 2) throw Error("Kamera ist noch nicht bereit.")
    const faces = await api.detectAllFaces(video, new api.TinyFaceDetectorOptions({inputSize:416, scoreThreshold:0.55}))
      .withFaceLandmarks().withFaceDescriptors()
    if (faces.length !== 1) throw Error(faces.length === 0 ? "Kein Gesicht erkannt. Mehr Licht und gerade in die Kamera schauen." : "Mehrere Gesichter im Bild. Bitte alleine vor das Tablet stellen.")
    return faces[0].descriptor
  }
  async function enroll() {
    if (!consent || !camera || busyRef.current || !enrollName.trim()) return
    busyRef.current = true; setLoading(true); setVerified(false); setProgress(0)
    try {
      const vectors: Float32Array[] = []
      for (let i = 0; i < 5; i++) {
        setStatus(`Gesicht aufnehmen: ${i + 1} von 5 – Kopf leicht bewegen…`)
        vectors.push(await capture())
        setProgress(i+1)
        await new Promise(resolve => setTimeout(resolve, 550))
      }
      const avg = Array.from(vectors[0], (_, d) => vectors.reduce((sum, v) => sum + v[d], 0) / vectors.length)
      const name = enrollName.trim().slice(0, 60)
      const records = await readFaces()
      const conflicting = records.map(r => ({ name: r.name, d: distance(r.vector, new Float32Array(avg)) }))
        .find(r => r.name.toLocaleLowerCase('de') !== name.toLocaleLowerCase('de') && r.d < MAX_DISTANCE)
      if (conflicting) throw Error(`Dieses Gesicht ähnelt einem bereits gespeicherten Profil (${conflicting.name}). Registrierung abgebrochen.`)
      const record: DescriptorRecord = { name, vector:avg, createdAt:new Date().toISOString() }
      await writeFace(record)
      setSaved(await readFaces()); setStatus(`${name} wurde auf diesem Gerät registriert. Jetzt Wiedererkennung testen!`); setConsent(false)
      speak(`${name} ist gespeichert. Mal sehen, ob ich dich wiedererkenne!`)
    } catch (e) { setStatus(e instanceof Error ? e.message : "Registrierung fehlgeschlagen.") }
    finally { setLoading(false); busyRef.current=false }
  }
  async function recognize() {
    if (!camera || busyRef.current) return
    busyRef.current = true; setLoading(true); setVerified(false); setScore(null)
    try {
      const records = await readFaces()
      if (!records.length) throw Error('Zuerst mindestens eine Person registrieren.')
      setStatus('Vergleiche Gesicht mit allen lokalen Profilen…')
      const descriptor = await capture()
      const sorted = records.map(record => ({record, d: distance(record.vector, descriptor)})).sort((a,b) => a.d-b.d)
      const best = sorted[0]
      setScore(best.d)
      const runnerUp = sorted[1]
      if (best.d <= MAX_DISTANCE && (!runnerUp || runnerUp.d - best.d >= 0.08)) {
        setVerified(true); setRecognized(best.record.name)
        setStatus(`Wiedererkennung: ${best.record.name} (nur Demo, keine sichere Identitätsprüfung).`)
        speak(`Servus ${best.record.name}! Schön, dass du da bist. Bereit für deine nächste Partie?`)
      } else {
        setStatus(best.d > MAX_DISTANCE ? 'Kein Treffer – unbekannte Person.' : 'Nicht eindeutig – bitte noch einmal versuchen.')
      }
    } catch(e) { setStatus(e instanceof Error ? e.message : "Erkennung fehlgeschlagen.") }
    finally { setLoading(false); busyRef.current=false }
  }
  async function forget(name: string) {
    if (busyRef.current || !window.confirm(`Gesichtsprofil von ${name} auf diesem Gerät löschen?`)) return
    try {
      await removeFace(name)
      setSaved(await readFaces()); setVerified(false); setRecognized(''); setScore(null); setProgress(0)
      setStatus(`${name} wurde lokal gelöscht.`)
    } catch { setStatus('Löschen nicht möglich. Bitte Browserdaten prüfen.') }
  }
  return <main className="min-h-screen bg-[#060910] px-4 py-8 text-white"><div className="mx-auto max-w-3xl space-y-5">
    <div><p className="text-xs font-bold uppercase tracking-[.2em] text-orange-400">EMD Autopilot · Privates Testlabor</p><h1 className="mt-2 text-3xl font-black">FACE ID – Wiedererkennung</h1><p className="mt-2 text-sm text-slate-400">Unverlinkte Testseite · keine Turnierdaten · kein Gesichtsupload</p></div>
    <section className="rounded-2xl border border-orange-500/30 bg-[#101722] p-4 sm:p-6 space-y-4">
      <div className="overflow-hidden rounded-xl bg-black aspect-video flex items-center justify-center relative">
        <video ref={videoRef} autoPlay muted playsInline className="h-full w-full object-cover scale-x-[-1]" />
        {!camera && <span className="absolute text-slate-400">Kamera ausgeschaltet</span>}
      </div>
      <div className="flex flex-wrap gap-3"><button onClick={camera?stopCamera:startCamera} disabled={loading} className="rounded-xl bg-orange-600 px-5 py-3 font-bold disabled:opacity-40">{camera?"Kamera ausschalten":"Frontkamera starten"}</button><span className="self-center text-xs text-slate-400">{modelsReady?"Gesichtserkennung bereit":"Modelle werden beim ersten Scan geladen"}</span></div>
      <p role="status" className="rounded-lg bg-white/5 px-4 py-3 text-sm text-orange-200">{status}</p>
      {loading && <p className="text-sm text-slate-400">Bitte warten… {progress > 0 && progress < 5 ? `${progress}/5 Aufnahmen` : ""}</p>}
    </section>
    <section className="rounded-2xl border border-white/10 bg-[#101722] p-5 space-y-3">
      <h2 className="text-xl font-bold">1 · Spieler freiwillig registrieren</h2>
      <p className="text-sm text-slate-300">Fünf Gesichtsaufnahmen werden in einen numerischen Gesichtsabdruck umgerechnet und nur in diesem Browser (IndexedDB) gespeichert. Kein Foto wird gespeichert. Auch dieser Abdruck ist ein sensibles biometrisches Datum.</p>
      <input className="w-full rounded-xl border border-white/20 bg-[#070D15] p-3 text-white" placeholder="Vorname (z. B. Jimmy oder Anna)" value={enrollName} maxLength={60} onChange={e => setEnrollName(e.target.value)} />
      <label className="flex gap-3 text-sm text-slate-300"><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)} className="accent-orange-500"/>Die Person vor der Kamera stimmt der lokalen Speicherung ihres Gesichtsabdrucks freiwillig zu.</label>
      <button onClick={enroll} disabled={!camera||!consent||!enrollName.trim()||loading} className="rounded-xl bg-orange-600 px-5 py-3 font-bold disabled:opacity-40">{saved.some(p => p.name.toLocaleLowerCase('de') === enrollName.trim().toLocaleLowerCase('de')) ? "Profil neu aufnehmen" : "Gesicht speichern"}</button>
      {saved.length > 0 && <p className="text-sm text-green-300">✓ Gespeichert: {saved.map(p => p.name).join(', ')}</p>}
    </section>
    <section className="rounded-2xl border border-white/10 bg-[#101722] p-5 space-y-3">
      <h2 className="text-xl font-bold">2 · Wiedererkennung testen</h2>
      <p className="text-sm text-slate-300">Kamera neu starten, davorstellen und auf „Mich erkennen“ drücken. Das System spricht nur bei einem Treffer.</p>
      <button onClick={recognize} disabled={!saved.length||!camera||loading} className="rounded-xl bg-orange-600 px-5 py-3 font-bold disabled:opacity-40">🔎 Wer steht vor dem Tablet?</button>
      {score !== null && <p className="text-xs text-slate-400">Vergleichsdistanz: {score.toFixed(3)} (Schwelle: {MAX_DISTANCE.toFixed(2)}, kleiner = ähnlicher)</p>}
      {verified && <div className="rounded-xl border border-green-500/30 bg-green-500/10 p-4"><p className="text-2xl font-black text-green-300">SERVUS {recognized.toLocaleUpperCase("de")}! 🎯</p><p className="text-sm text-white/80">Erkannt – jetzt kann der Spaß mit der Sprachausgabe losgehen.</p></div>}
    </section>
    <section className="rounded-2xl border border-white/10 bg-[#101722] p-5 space-y-3">
      <h2 className="font-bold">3 · Turniersprecher-Stimme</h2>
      <p className="text-sm text-slate-300">Wie in deinen Turnieraufrufen: bevorzugt Google Deutsch, Geschwindigkeit 0,9. Nur deutsche Stimmen zur Auswahl, Hedda wird nicht automatisch gewählt.</p>
      <select aria-label="Deutsche Stimme" className="w-full rounded-xl border border-white/20 bg-[#070D15] p-3" value={voiceName} onChange={e => selectVoice(e.target.value)}>
        <option value="">Automatisch (Google Deutsch bevorzugen)</option>
        {voices.filter(v => v.lang.startsWith('de')).map(v => <option key={`${v.name}|${v.lang}`} value={`${v.name}|${v.lang}`}>{v.name} ({v.lang})</option>)}
      </select>
      <button type="button" onClick={() => speak('Servus! Willkommen bei EMD. Die nächste Partie wird gleich aufgerufen!')} className="rounded-xl bg-orange-600 px-5 py-3 font-bold">🔊 Stimme testen</button>
    </section>
    <section className="rounded-2xl border border-rose-400/20 bg-[#101722] p-5 space-y-3">
      <h2 className="font-bold">4 · Testprofile verwalten</h2>
      <p className="text-sm text-slate-400">Gesichtsabdrücke bleiben nur in diesem Browser. Jede Person kann ihr Profil hier wieder löschen.</p>
      {saved.length === 0 ? <p className="text-sm text-slate-400">Noch kein Profil vorhanden.</p> : saved.map(p => <div key={p.name} className="flex items-center justify-between gap-3 rounded-xl bg-white/5 px-3 py-2"><span>{p.name}</span><button type="button" disabled={loading} onClick={() => forget(p.name)} className="rounded-lg border border-rose-500/50 px-3 py-2 text-sm text-rose-200">Löschen</button></div>)}
    </section>
    <p className="text-xs text-slate-500">Nur Vorführung: Das ist biometrische Verarbeitung. Registrierung nur mit freiwilliger Einwilligung; Zugang zur unverlinkten Seite ist nicht geschützt. Die Erkennung kann sich irren oder mit einem Foto getäuscht werden. Niemals zur Anmeldung, Auszahlung, PIN-Ersatz oder Ergebnisfreigabe benutzen. Die URL ist nicht verlinkt, aber ohne Zugangssperre öffentlich erreichbar.</p>
  </div></main>
}
