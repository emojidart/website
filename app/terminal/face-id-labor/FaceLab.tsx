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
async function readFace(): Promise<DescriptorRecord | null> {
  const db = await openDB()
  try { return await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly"), req = tx.objectStore(STORE).get("jimmy")
    req.onsuccess = () => resolve((req.result as DescriptorRecord | undefined) ?? null)
    req.onerror = () => reject(req.error)
  }) } finally { db.close() }
}
async function writeFace(value: DescriptorRecord | null): Promise<void> {
  const db = await openDB()
  try { await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite")
    if (value) tx.objectStore(STORE).put(value, "jimmy")
    else tx.objectStore(STORE).delete("jimmy")
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error)
  }) } finally { db.close() }
}
function distance(a: number[], b: Float32Array) {
  if (a.length !== b.length) return Infinity
  return Math.sqrt(a.reduce((sum, x, i) => sum + (x - b[i]) ** 2, 0))
}
function speak(message: string) {
  if (!("speechSynthesis" in window)) return
  window.speechSynthesis.cancel()
  const voice = new SpeechSynthesisUtterance(message)
  voice.lang = "de-DE"; voice.rate = 0.94
  window.speechSynthesis.speak(voice)
}
export default function FaceLab() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const apiRef = useRef<FaceApi | null>(null)
  const [camera, setCamera] = useState(false)
  const [modelsReady, setModelsReady] = useState(false)
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState<DescriptorRecord | null>(null)
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
    readFace().then(setSaved).catch(() => setStatus("Lokale Speicherung ist in diesem Browser nicht verfügbar."))
    return () => { streamRef.current?.getTracks().forEach(t => t.stop()); window.speechSynthesis?.cancel() }
  }, [])
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
    setVerified(false); setScore(null)
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
    if (!consent || !camera || busyRef.current) return
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
      const record: DescriptorRecord = { name:"Jimmy", vector:avg, createdAt:new Date().toISOString() }
      await writeFace(record)
      setSaved(record); setStatus("Jimmy wurde auf diesem Gerät registriert. Kamera ausschalten und Wiedererkennung testen!")
      speak("Jimmy ist gespeichert. Jetzt schauen wir, ob ich dich wiedererkenne!")
    } catch (e) { setStatus(e instanceof Error ? e.message : "Registrierung fehlgeschlagen.") }
    finally { setLoading(false); busyRef.current=false }
  }
  async function recognize() {
    if (!camera || busyRef.current) return
    busyRef.current = true; setLoading(true); setVerified(false); setScore(null)
    try {
      const record = await readFace()
      if (!record) throw Error("Zuerst Jimmy registrieren.")
      setStatus("Vergleiche dein Gesicht mit der lokalen Registrierung…")
      const descriptor = await capture()
      const d = distance(record.vector,descriptor)
      setScore(d)
      if (d <= MAX_DISTANCE) {
        setVerified(true); setStatus("Wiedererkennung erfolgreich – Jimmy (nur Test, keine sichere Identitätsprüfung).")
        speak("Servus Jimmy! Ich hab dich erkannt. Na, schon wieder gewonnen?")
      } else { setStatus("Kein sicherer Treffer. Bitte Licht und Position ändern oder erneut registrieren.") }
    } catch(e) { setStatus(e instanceof Error ? e.message : "Erkennung fehlgeschlagen.") }
    finally { setLoading(false); busyRef.current=false }
  }
  async function forget() {
    if (busyRef.current || !window.confirm("Gesichtsprofil auf diesem Tablet löschen?")) return
    try { await writeFace(null); setSaved(null);setVerified(false);setScore(null);setProgress(0);setStatus("Lokales Gesichtsprofil gelöscht.") }
    catch { setStatus("Löschen nicht möglich. Bitte Browserdaten dieses Geräts prüfen.") }
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
      <h2 className="text-xl font-bold">1 · Jimmy einmal registrieren</h2>
      <p className="text-sm text-slate-300">Fünf Gesichtsaufnahmen werden in einen numerischen Gesichtsabdruck umgerechnet und nur in diesem Browser (IndexedDB) gespeichert. Kein Foto wird gespeichert. Auch dieser Abdruck ist ein sensibles biometrisches Datum.</p>
      <label className="flex gap-3 text-sm text-slate-300"><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)} className="accent-orange-500"/>Ich möchte mein eigenes Gesicht freiwillig auf diesem Testgerät registrieren.</label>
      <button onClick={enroll} disabled={!camera||!consent||loading} className="rounded-xl bg-orange-600 px-5 py-3 font-bold disabled:opacity-40">{saved?"Jimmy neu registrieren":"Gesicht speichern"}</button>
      {saved && <p className="text-sm text-green-300">✓ Jimmy auf diesem Gerät gespeichert</p>}
    </section>
    <section className="rounded-2xl border border-white/10 bg-[#101722] p-5 space-y-3">
      <h2 className="text-xl font-bold">2 · Wiedererkennung testen</h2>
      <p className="text-sm text-slate-300">Kamera neu starten, davorstellen und auf „Mich erkennen“ drücken. Das System spricht nur bei einem Treffer.</p>
      <button onClick={recognize} disabled={!saved||!camera||loading} className="rounded-xl bg-orange-600 px-5 py-3 font-bold disabled:opacity-40">🔎 Mich erkennen</button>
      {score !== null && <p className="text-xs text-slate-400">Vergleichsdistanz: {score.toFixed(3)} (Schwelle: {MAX_DISTANCE.toFixed(2)}, kleiner = ähnlicher)</p>}
      {verified && <div className="rounded-xl border border-green-500/30 bg-green-500/10 p-4"><p className="text-2xl font-black text-green-300">SERVUS JIMMY! 🎯</p><p className="text-sm text-white/80">Erkannt – jetzt kann der Spaß mit der Sprachausgabe losgehen.</p></div>}
    </section>
    <section className="rounded-2xl border border-rose-400/20 bg-[#101722] p-5 space-y-3"><h2 className="font-bold">3 · Testprofil löschen</h2><p className="text-sm text-slate-400">Nur auf diesem Gerät. Browserdaten löschen entfernt es ebenfalls. Kein Transfer auf andere Tablets.</p><button onClick={forget} disabled={!saved||loading} className="rounded-xl border border-rose-500/50 px-5 py-3 text-rose-200 disabled:opacity-40">Lokales Gesichtsprofil löschen</button></section>
    <p className="text-xs text-slate-500">Nur Vorführung: Die Erkennung kann sich irren oder mit einem Foto getäuscht werden. Niemals zur Anmeldung, Auszahlung, PIN-Ersatz oder Ergebnisfreigabe benutzen. Die URL ist nicht verlinkt, aber ohne Zugangssperre öffentlich erreichbar.</p>
  </div></main>
}
