"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import TerminalIdentityAuth, { type VerifiedTerminalIdentity } from "@/app/terminal/_components/TerminalIdentityAuth"

type DescriptorRecord = { name: string; vector: number[]; createdAt: string; identity_kind?: "member" | "guest"; identity_id?: string; player_id?: string | null; spieldatenbank_id?: string | null; photo_url?: string | null }
type LinkedIdentity = VerifiedTerminalIdentity
type FaceApi = typeof import("face-api.js")
const MODEL_URL = "/models";
const MAX_DISTANCE = 0.43;
async function faceCall(body: Record<string, unknown>) {
 const response = await fetch("/api/face-id", {method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(body),cache:"no-store"});
 const data=await response.json();if(!response.ok)throw Error(data.error||"Face-ID-Dienst nicht erreichbar.");return data;
}
async function readFaces():Promise<DescriptorRecord[]> {const r=await fetch("/api/face-id",{cache:"no-store"});const d=await r.json();if(!r.ok)throw Error(d.error||"Fehler");return d.faces||[];}
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
    const [identityPicker, setIdentityPicker] = useState(false)
  const [linkedIdentity, setLinkedIdentity] = useState<LinkedIdentity | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<DescriptorRecord | null>(null)
  const [deleteError, setDeleteError] = useState("")
  const [recognizedProfile, setRecognizedProfile] = useState<DescriptorRecord | null>(null)
  const [recognized, setRecognized] = useState('')
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])
  const [voiceName, setVoiceName] = useState('')
  const [status, setStatus] = useState("Starte mit deiner Frontkamera.")
  const [verified, setVerified] = useState(false)
  const [consent, setConsent] = useState(false)
  const [progress, setProgress] = useState(0)
  const [countdown, setCountdown] = useState<number | null>(null)
  const [score, setScore] = useState<number | null>(null)
  const busyRef = useRef(false)

  // Unattended shared tablets must not remain on the biometric management page.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>
    const leave = () => window.location.replace("/terminal")
    const reset = () => { window.clearTimeout(timer); timer = window.setTimeout(leave, 60_000) }
    const events: Array<keyof WindowEventMap> = ["pointerdown", "keydown", "touchstart", "wheel"]
    for (const event of events) window.addEventListener(event, reset, { passive: true })
    reset()
    return () => {
      window.clearTimeout(timer)
      for (const event of events) window.removeEventListener(event, reset)
    }
  }, [])

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(track => track.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
    setCamera(false)
  }, [])
  useEffect(() => {
    readFaces().then(setSaved).catch(() => setStatus('Supabase Face ID ist nicht verfügbar.'))
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
    setVerified(false); setScore(null); setRecognized(''); setRecognizedProfile(null)
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
    if (!consent || !camera || busyRef.current || !linkedIdentity) return
    busyRef.current = true; setLoading(true); setVerified(false); setProgress(0)
    try {
      await loadModels()
      for (const n of [3, 2, 1]) {
        setCountdown(n)
        setStatus(`Bitte gerade in die Kamera schauen. Aufnahme startet in ${n} …`)
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
      setCountdown(null)
      const vectors: Float32Array[] = []
      for (let i = 0; i < 5; i++) {
        setStatus(`Gesicht aufnehmen: ${i + 1} von 5 – Kopf leicht bewegen…`)
        vectors.push(await capture())
        setProgress(i+1)
        await new Promise(resolve => setTimeout(resolve, 550))
      }
      const avg = Array.from(vectors[0], (_, d) => vectors.reduce((sum, v) => sum + v[d], 0) / vectors.length)
      const name = linkedIdentity.name.trim().slice(0, 60)
      await faceCall({action:"enroll",...linkedIdentity,vector:avg,consent:true})
      setSaved(await readFaces()); setStatus(`${name} ist zentral mit dem EMD-Profil verknüpft. Jetzt Wiedererkennung testen!`); setConsent(false); setLinkedIdentity(null)
      speak(`${name} ist gespeichert. Mal sehen, ob ich dich wiedererkenne!`)
    } catch (e) { setStatus(e instanceof Error ? e.message : "Registrierung fehlgeschlagen.") }
    finally { setCountdown(null); setLoading(false); busyRef.current=false }
  }
  async function recognize() {
    if (!camera || busyRef.current) return
    busyRef.current = true; setLoading(true); setVerified(false); setScore(null)
    try {
      setStatus('Vergleiche Gesicht zentral über Supabase…')
      const descriptor = await capture()
      const result = await faceCall({action:"match",vector:Array.from(descriptor)})
      const profile:DescriptorRecord|null = result.match ? {...result.match,vector:[],createdAt:new Date().toISOString()} : null
      setScore(typeof result.distance === "number" ? result.distance : null)
      if(profile){setVerified(true);setRecognized(profile.name);setRecognizedProfile(profile);setStatus(`Wiedererkennung: ${profile.name} (PIN/Muster für geschützte Aktionen erforderlich).`);speak(`Servus ${profile.name}! Schön, dass du da bist.`)}
      else setStatus('Kein eindeutiger Treffer – bitte mit PIN/Muster anmelden oder neu versuchen.')
    } catch(e) { setStatus(e instanceof Error ? e.message : "Erkennung fehlgeschlagen.") }
    finally { setLoading(false); busyRef.current=false }
  }
  async function forgetVerified(identity: VerifiedTerminalIdentity) {
    const target = deleteTarget
    if (!target) return
    // Crucial: a verified *different* account may never remove this face profile.
    if (!target.identity_kind || !target.identity_id ||
        target.identity_kind !== identity.identity_kind || target.identity_id !== identity.identity_id) {
      setDeleteError("Falsches Profil bestätigt. Bitte PIN/Muster des gespeicherten Spielers verwenden.")
      return
    }
    if (!window.confirm(`Face ID von ${target.name} jetzt wirklich von diesem Gerät löschen?`)) {
      setDeleteTarget(null)
      return
    }
    try {
      await faceCall({action:"delete",identity_kind:identity.identity_kind,identity_id:identity.identity_id,auth_method:identity.auth_method,secret:identity.secret})
      setSaved(await readFaces())
      setVerified(false); setRecognized(''); setRecognizedProfile(null); setScore(null); setProgress(0)
      setStatus(`${target.name}: Face ID zentral gelöscht.`)
      setDeleteTarget(null); setDeleteError("")
    } catch { setDeleteError("Löschen fehlgeschlagen. Bitte erneut versuchen.") }
  }
  return <main className="min-h-screen bg-[#060910] px-4 py-8 text-white"><div className="mx-auto max-w-3xl space-y-5">
    <div><p className="text-xs font-bold uppercase tracking-[.2em] text-orange-400">EMD Autopilot · Privates Testlabor</p><h1 className="mt-2 text-3xl font-black">FACE ID – Wiedererkennung</h1><p className="mt-2 text-sm text-slate-400">Unverlinkte Testseite · keine Turnierdaten · kein Gesichtsupload</p></div>
    <section className="rounded-2xl border border-orange-500/30 bg-[#101722] p-4 sm:p-6 space-y-4">
      <div className="overflow-hidden rounded-xl bg-black aspect-video flex items-center justify-center relative">
        <video ref={videoRef} autoPlay muted playsInline className="h-full w-full object-cover scale-x-[-1]" />
        {!camera && <span className="absolute text-slate-400">Kamera ausgeschaltet</span>}
        {countdown !== null && <div role="status" aria-live="assertive" className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/65 text-white"><span className="text-[100px] font-black leading-none text-orange-400 sm:text-[150px]">{countdown}</span><span className="mt-3 text-center text-lg font-black">BITTE IN DIE KAMERA SCHAUEN</span></div>}
      </div>
      <div className="flex flex-wrap gap-3"><button onClick={camera?stopCamera:startCamera} disabled={loading} className="rounded-xl bg-orange-600 px-5 py-3 font-bold disabled:opacity-40">{camera?"Kamera ausschalten":"Frontkamera starten"}</button><span className="self-center text-xs text-slate-400">{modelsReady?"Gesichtserkennung bereit":"Modelle werden beim ersten Scan geladen"}</span></div>
      <p role="status" className="rounded-lg bg-white/5 px-4 py-3 text-sm text-orange-200">{status}</p>
      {loading && <p className="text-sm text-slate-400">Bitte warten… {progress > 0 && progress < 5 ? `${progress}/5 Aufnahmen` : ""}</p>}
    </section>
    <section className="rounded-2xl border border-white/10 bg-[#101722] p-5 space-y-3">
      <h2 className="text-xl font-bold">1 · Spieler freiwillig registrieren</h2>
      <p className="text-sm text-slate-300">Vor der Registrierung erscheint ein großer Countdown 3 · 2 · 1. Danach werden automatisch fünf Aufnahmen gemacht. Fünf Gesichtsaufnahmen werden in einen numerischen Gesichtsabdruck umgerechnet und zentral in Supabase gespeichert. Kein Foto wird gespeichert. Das Gesichtsmuster wird für alle EMD-Geräte hinterlegt. Auch dieser Abdruck ist ein sensibles biometrisches Datum.</p>
      {identityPicker ? <div className="rounded-xl border border-orange-500/20 bg-black/20 p-2"><TerminalIdentityAuth title="EMD-Profil auswählen" subtitle="Spieler auswählen und persönlich mit PIN oder Muster bestätigen. Die PIN wird nicht für Face ID gespeichert." compact onCancel={() => setIdentityPicker(false)} onVerified={(identity) => { const { name } = identity; setLinkedIdentity(identity); setIdentityPicker(false); setConsent(false); setStatus(`${name}: Profil bestätigt. Jetzt freiwillig Gesicht aufnehmen.`) }} /></div> : <button type="button" onClick={() => {setLinkedIdentity(null);setIdentityPicker(true)}} disabled={loading} className="rounded-xl border border-orange-500/50 px-5 py-3 font-bold">{linkedIdentity ? "Anderes EMD-Profil auswählen" : "EMD-Profil mit PIN/Muster auswählen"}</button>}
      {linkedIdentity && <div className="rounded-xl border border-green-400/20 bg-green-500/10 p-4 text-sm"><div className="font-black">✓ {linkedIdentity.name}</div><div className="text-green-100/80">{linkedIdentity.identity_kind === 'member' ? 'EMD-Mitglied' : 'Gast'} · Identität bestätigt · {linkedIdentity.player_id ? 'Spieler-ID vorhanden' : 'Noch keine Spieler-ID zugeordnet'}</div></div>}
      <label className="flex gap-3 text-sm text-slate-300"><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)} className="accent-orange-500"/>Ich bin die gerade bestätigte Person und stimme freiwillig zu, dass mein biometrischer Gesichtsabdruck zentral in Supabase gespeichert wird.</label>
      <button onClick={enroll} disabled={!camera||!consent||!linkedIdentity||loading} className="rounded-xl bg-orange-600 px-5 py-3 font-bold disabled:opacity-40">Gesicht mit EMD-Profil verknüpfen</button>
      {linkedIdentity && saved.some(p => p.identity_id === linkedIdentity.identity_id && p.identity_kind === linkedIdentity.identity_kind) && <p className="text-sm text-amber-200">Dieses Profil hat bereits eine Face ID. Bei neuer Aufnahme wird der bisherige Abdruck erst nach erfolgreicher Aufnahme ersetzt.</p>}
      {saved.length > 0 && <p className="text-sm text-green-300">✓ Zentral gespeichert: {saved.map(p => p.name).join(', ')}</p>}
    </section>
    <section className="rounded-2xl border border-white/10 bg-[#101722] p-5 space-y-3">
      <h2 className="text-xl font-bold">2 · Wiedererkennung testen</h2>
      <p className="text-sm text-slate-300">Kamera neu starten, davorstellen und auf „Mich erkennen“ drücken. Das System spricht nur bei einem Treffer.</p>
      <button onClick={recognize} disabled={!saved.length||!camera||loading} className="rounded-xl bg-orange-600 px-5 py-3 font-bold disabled:opacity-40">🔎 Wer steht vor dem Tablet?</button>
      {score !== null && <p className="text-xs text-slate-400">Vergleichsdistanz: {score.toFixed(3)} (Schwelle: {MAX_DISTANCE.toFixed(2)}, kleiner = ähnlicher)</p>}
      {verified && <div className="rounded-xl border border-green-500/30 bg-green-500/10 p-4 space-y-3"><p className="text-2xl font-black text-green-300">SERVUS {recognized.toLocaleUpperCase("de")}! 🎯</p>{recognizedProfile ? <div className="flex gap-3 items-center">{recognizedProfile.photo_url && <img alt="" src={recognizedProfile.photo_url} className="h-16 w-16 rounded-xl object-cover" />}<div><p className="font-bold">{recognizedProfile.name}</p><p className="text-sm text-slate-300">{recognizedProfile.identity_kind === 'member' ? 'EMD-Mitglied' : 'Gast'} · Spieleransicht</p></div></div> : <p className="text-sm text-yellow-200">Altes Testprofil ohne bestätigte EMD-Verknüpfung. Bitte neu registrieren.</p>}<p className="text-xs text-slate-400">Face ID erkennt nur ein Profil als Kandidaten. Die geschützten Bereiche von „Mein EMD“ bleiben ohne echte Anmeldung gesperrt.</p></div>}
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
      <p className="text-sm text-slate-400">Gesichtsabdrücke werden zentral in Supabase gespeichert. Löschen und Neu-Einlernen nur nach erneuter PIN-/Musterbestätigung des betroffenen EMD-Profils. Alte unverknüpfte Testprofile sind hier gesperrt; sie können durch Löschen der Browser-Websitedaten entfernt werden.</p>
      {saved.length === 0 ? <p className="text-sm text-slate-400">Noch kein Profil vorhanden.</p> : saved.map(p => <div key={p.identity_kind && p.identity_id ? `${p.identity_kind}:${p.identity_id}` : p.name} className="flex items-center justify-between gap-3 rounded-xl bg-white/5 px-3 py-2"><div><div>{p.name}</div><div className="text-xs text-slate-400">{p.identity_id ? `${p.identity_kind === 'member' ? 'Mitglied' : 'Gast'} · EMD-verknüpft` : 'Altes Testprofil – nicht verknüpft'}</div></div><div className="flex flex-wrap gap-2"><button type="button" disabled={loading || !p.identity_id} onClick={() => { setLinkedIdentity(null); setIdentityPicker(true); setStatus(`Zum Neu-Einlernen ${p.name} mit PIN/Muster auswählen.`); window.scrollTo({top: 0, behavior: 'smooth'}) }} className="rounded-lg border border-orange-500/50 px-3 py-2 text-sm text-orange-100 disabled:opacity-40">Neu einlernen</button><button type="button" disabled={loading || !p.identity_id} onClick={() => { setDeleteError(''); setDeleteTarget(p) }} className="rounded-lg border border-rose-500/50 px-3 py-2 text-sm text-rose-200 disabled:opacity-40">Löschen</button></div></div>)}
    </section>
    {deleteTarget && <div className="fixed inset-0 z-50 overflow-y-auto bg-black/90 p-3 sm:p-8"><div className="mx-auto max-w-3xl rounded-3xl border border-rose-400/30 bg-[#0b1019] p-4 sm:p-6"><h2 className="mb-2 text-2xl font-black">Face ID löschen · {deleteTarget.name}</h2><p className="mb-4 text-sm text-slate-300">Aus Sicherheitsgründen musst du genau dieses EMD-Profil erneut mit PIN oder Muster bestätigen. Ein anderes Profil darf die Daten nicht löschen.</p>{deleteError && <p role="alert" className="mb-3 rounded-xl bg-red-950 p-3 text-red-200">{deleteError}</p>}<TerminalIdentityAuth key={`${deleteTarget.identity_kind}:${deleteTarget.identity_id}`} title="Identität bestätigen" subtitle={`Bitte ${deleteTarget.name} auswählen und PIN oder Muster eingeben.`} allowedKinds={deleteTarget.identity_kind ? [deleteTarget.identity_kind] : ['member','guest']} compact onCancel={() => {setDeleteTarget(null);setDeleteError('')}} onVerified={forgetVerified} /><button type="button" onClick={() => {setDeleteTarget(null);setDeleteError('')}} className="mt-4 rounded-xl border border-white/20 px-5 py-3 font-bold">Abbrechen</button></div></div>}
    <p className="text-xs text-slate-500">Biometrische Verarbeitung: Registrierung nur mit freiwilliger Einwilligung; Zugang zur unverlinkten Seite ist nicht geschützt. Die Erkennung kann sich irren oder mit einem Foto getäuscht werden. Niemals zur Anmeldung, Auszahlung, PIN-Ersatz oder Ergebnisfreigabe benutzen. Die URL ist nicht verlinkt, aber ohne Zugangssperre öffentlich erreichbar.</p>
  </div></main>
}
