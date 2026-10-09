"use client"

import { useEffect, useRef, useState } from "react"
import type { TerminalIdentity } from "./TerminalIdentityAuth"

type FaceRecord = { name: string; vector: number[]; identity_kind?: "member" | "guest"; identity_id?: string; player_id?: string | null; spieldatenbank_id?: string | null; photo_url?: string | null }
export default function TerminalFaceCandidate({ onCandidate, onClose }: { onCandidate: (person: TerminalIdentity) => void; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const apiRef = useRef<typeof import("face-api.js") | null>(null)
  const busy = useRef(false)
  const cancelled = useRef(false)
  const started = useRef(false)
  const [status, setStatus] = useState("Kamera starten und Gesicht vergleichen.")
  const [running, setRunning] = useState(false)
  const [loading, setLoading] = useState(false)
  const stop = () => { streamRef.current?.getTracks().forEach(t => t.stop()); streamRef.current = null; if (videoRef.current) videoRef.current.srcObject = null; setRunning(false) }
  useEffect(() => {
    cancelled.current = false
    if (!started.current) { started.current = true; void startAuto() }
    return () => { cancelled.current = true; streamRef.current?.getTracks().forEach(t => t.stop()) }
  }, [])
  async function startAuto() {
    if (busy.current) return
    busy.current = true
    setLoading(true)
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw Error("Kamera braucht HTTPS oder localhost.")
      setStatus("Kamera wird gestartet …")
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false })
      if (cancelled.current) { stream.getTracks().forEach(t => t.stop()); return }
      streamRef.current = stream
      if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play() }
      if (cancelled.current) return
      setRunning(true)
      setStatus("Bitte alleine und gut sichtbar in die Kamera schauen …")
      const api = apiRef.current || await import("face-api.js")
      if (!apiRef.current) {
        await Promise.all([api.nets.tinyFaceDetector.loadFromUri("/models"), api.nets.faceLandmark68Net.loadFromUri("/models"), api.nets.faceRecognitionNet.loadFromUri("/models")])
        apiRef.current = api
      }
      const video = videoRef.current
      if (!video) throw Error("Kamera ist nicht bereit.")
      // Mehrere Versuche: niemand muss einen zweiten Button drücken.
      // Bei falschem/uneindeutigem Gesicht nicht automatisch einen Zugang öffnen.
      for (let attempt = 0; attempt < 12 && !cancelled.current; attempt++) {
        if (video.readyState < 2) { await new Promise(r => setTimeout(r, 550)); continue }
        const detections = await api.detectAllFaces(video, new api.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.55 })).withFaceLandmarks().withFaceDescriptors()
        if (cancelled.current) return
        if (detections.length === 1) {
          const descriptor = detections[0].descriptor
          const result=await fetch("/api/face-id",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"match",vector:Array.from(descriptor)}),cache:"no-store"})
          const data=await result.json()
          if(!result.ok) throw Error(data.error||"Face ID nicht erreichbar.")
          const record=data.match
          if(record?.identity_kind && record?.identity_id){
            stop()
            onCandidate({identity_kind:record.identity_kind,identity_id:record.identity_id,player_id:record.player_id??null,spieldatenbank_id:record.spieldatenbank_id??null,name:record.name,photo_url:record.photo_url??null,auth_method:"pin",has_terminal_auth:true})
            return
          }
          setStatus("Kein eindeutiger Treffer. Bitte gerade in die Kamera schauen oder manuell anmelden.")
        } else {
          setStatus(detections.length > 1 ? "Bitte nur eine Person vor die Kamera stellen." : "Bitte in die Kamera schauen – Gesicht wird gesucht …")
        }
        await new Promise(r => setTimeout(r, 700))
      }
      if (!cancelled.current) setStatus("Keine eindeutige Erkennung. Noch einmal versuchen oder mit PIN/Muster anmelden.")
    } catch (e) {
      if (!cancelled.current) setStatus(e instanceof Error ? e.message : "Erkennung fehlgeschlagen.")
    } finally { busy.current = false; if (!cancelled.current) setLoading(false) }
  }
  const retry = () => { if (!busy.current) { stop(); void startAuto() } }
  return <div className="mx-auto max-w-2xl rounded-3xl border border-orange-400/20 bg-black/50 p-5 text-white space-y-4">
    <h2 className="text-3xl font-black">Face ID · Spieler erkennen</h2>
    <p className="text-sm text-white/60">Dein Gesicht wird automatisch erkannt. Für geschützte Aktionen brauchst du weiterhin deine PIN oder dein Muster.</p>
    <div className="relative overflow-hidden rounded-2xl bg-black"><video ref={videoRef} autoPlay muted playsInline className="w-full aspect-video object-cover scale-x-[-1]" /><div className="pointer-events-none absolute inset-x-3 bottom-3 rounded-xl bg-black/70 px-4 py-3 text-center text-lg font-black text-white">{running ? "BITTE IN DIE KAMERA SCHAUEN" : "KAMERA WIRD VORBEREITET"}</div></div>
    <p role="status" className="text-sm text-orange-200">{status}</p>
    <div className="flex flex-wrap gap-3">
      <button type="button" onClick={retry} disabled={loading} className="rounded-xl bg-orange-500 px-5 py-3 font-bold disabled:opacity-50">{loading ? "Erkennung läuft automatisch …" : "Erkennung erneut starten"}</button>
      <button type="button" onClick={() => { stop(); onClose() }} className="rounded-xl border border-white/20 px-5 py-3">Zurück zur Anmeldung</button>
    </div>
  </div>
}
