import { NextResponse } from "next/server"
import { createHash } from "node:crypto"
import { createClient } from "@supabase/supabase-js"
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const archiveBucket = "club-join-archives"

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Missing Supabase server environment variables")
}

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

type Stage = "submitted" | "approved"
type Action = "generate" | "download"

type Acceptance = {
  document_id?: string
  title?: string
  category?: string
  version?: string
  storage_path?: string
  opened_at?: string
  accepted_at?: string
}

type JoinRequest = {
  id: string
  user_id: string
  full_name: string
  email: string | null
  birthdate: string | null
  street: string | null
  house_number: string | null
  postal_code: string | null
  city: string | null
  phone: string | null
  jersey_size: string | null
  note: string | null
  admin_note: string | null
  status: string
  created_at: string
  approved_at: string | null
  decided_by: string | null
  trial_requested: boolean | null
  trial_granted_at: string | null
  trial_ends_on: string | null
  signature_data_url: string | null
  signed_at: string | null
  document_acceptances: Acceptance[] | null
  documents_accepted_at: string | null
  guardian_full_name: string | null
  guardian_signature_data_url: string | null
  guardian_signed_at: string | null
}

function safeFilename(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80)
}

function fmtDate(value?: string | null) {
  if (!value) return "-"
  const d = new Date(value.length === 10 ? `${value}T00:00:00` : value)
  if (Number.isNaN(d.getTime())) return value
  return new Intl.DateTimeFormat("de-AT", { day: "2-digit", month: "2-digit", year: "numeric" }).format(d)
}

function fmtDateTime(value?: string | null) {
  if (!value) return "-"
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return new Intl.DateTimeFormat("de-AT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Vienna",
  }).format(d)
}


function pdfSafe(value: string) {
  return String(value ?? "")
    .replace(/[–—]/g, "-")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/…/g, "...")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, "?")
}

function splitLines(text: string, font: PDFFont, size: number, maxWidth: number) {
  const paragraphs = pdfSafe(text).split(/\n/)
  const lines: string[] = []
  for (const paragraph of paragraphs) {
    const words = paragraph.split(/\s+/).filter(Boolean)
    if (!words.length) {
      lines.push("")
      continue
    }
    let line = ""
    for (const word of words) {
      const next = line ? `${line} ${word}` : word
      if (font.widthOfTextAtSize(next, size) <= maxWidth) {
        line = next
      } else {
        if (line) lines.push(line)
        line = word
      }
    }
    if (line) lines.push(line)
  }
  return lines
}

async function embedSignature(pdf: PDFDocument, dataUrl: string | null) {
  if (!dataUrl) return null
  const match = dataUrl.match(/^data:image\/(png|jpeg|jpg);base64,(.+)$/i)
  if (!match) return null
  const bytes = Buffer.from(match[2], "base64")
  return match[1].toLowerCase() === "png" ? pdf.embedPng(bytes) : pdf.embedJpg(bytes)
}

async function buildPdf(row: JoinRequest, stage: Stage, generatedByName: string | null) {
  const pdf = await PDFDocument.create()
  const regular = await pdf.embedFont(StandardFonts.Helvetica)
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold)
  const applicantSignature = await embedSignature(pdf, row.signature_data_url)
  const guardianSignature = await embedSignature(pdf, row.guardian_signature_data_url)

  const pageWidth = 595.28
  const pageHeight = 841.89
  const margin = 48
  const contentWidth = pageWidth - margin * 2
  const orange = rgb(0.95, 0.31, 0.03)
  const navy = rgb(0.06, 0.09, 0.16)
  const gray = rgb(0.38, 0.42, 0.48)
  const light = rgb(0.96, 0.97, 0.98)
  const green = rgb(0.05, 0.50, 0.25)

  let page: PDFPage
  let y: number

  const newPage = () => {
    page = pdf.addPage([pageWidth, pageHeight])
    y = pageHeight - 44
    page.drawRectangle({ x: 0, y: pageHeight - 9, width: pageWidth, height: 9, color: orange })
    page.drawText("EMD VereinsApp", { x: margin, y, size: 10, font: bold, color: orange })
    page.drawText(stage === "submitted" ? "DIGITALE BEITRITTSANFRAGE" : "DIGITALE AUFNAHMEBESTAETIGUNG", {
      x: margin,
      y: y - 25,
      size: 19,
      font: bold,
      color: navy,
    })
    y -= 52
  }

  const ensure = (needed = 40) => {
    if (y - needed < 52) newPage()
  }

  const rule = () => {
    ensure(18)
    page.drawLine({ start: { x: margin, y }, end: { x: pageWidth - margin, y }, thickness: 0.8, color: rgb(0.84, 0.86, 0.89) })
    y -= 18
  }

  const heading = (text: string) => {
    ensure(34)
    page.drawText(text, { x: margin, y, size: 12, font: bold, color: navy })
    y -= 20
  }

  const line = (label: string, value: string | null | undefined) => {
    ensure(22)
    const labelText = `${label}:`
    page.drawText(labelText, { x: margin, y, size: 9.5, font: bold, color: gray })
    const labelWidth = bold.widthOfTextAtSize(labelText, 9.5)
    const max = contentWidth - labelWidth - 10
    const wrapped = splitLines(value || "-", regular, 9.5, max)
    wrapped.forEach((part, idx) => {
      if (idx > 0) ensure(14)
      page.drawText(part, { x: margin + labelWidth + 8, y, size: 9.5, font: regular, color: navy })
      y -= 14
    })
  }

  const paragraph = (text: string, color = navy, font = regular, size = 9.5) => {
    const lines = splitLines(text, font, size, contentWidth)
    for (const part of lines) {
      ensure(14)
      page.drawText(part || " ", { x: margin, y, size, font, color })
      y -= 14
    }
  }

  newPage()

  page.drawRectangle({ x: margin, y: y - 39, width: contentWidth, height: 39, color: stage === "approved" ? rgb(0.92, 0.98, 0.94) : light })
  page.drawText(stage === "approved" ? "STATUS: AUFGENOMMEN" : "STATUS: EINGEREICHT", {
    x: margin + 12,
    y: y - 17,
    size: 10.5,
    font: bold,
    color: stage === "approved" ? green : orange,
  })
  page.drawText(`Antrags-ID: ${row.id}`, { x: margin + 12, y: y - 31, size: 8.5, font: regular, color: gray })
  y -= 55

  heading("1. Antragsteller/in")
  line("Vor- und Nachname", row.full_name)
  line("Geburtsdatum", fmtDate(row.birthdate))
  line("E-Mail", row.email)
  line("Telefon", row.phone)
  line("Adresse", [row.street, row.house_number, row.postal_code, row.city].filter(Boolean).join(" ") || "-")
  line("Trikotgroesse", row.jersey_size)
  if (row.note) line("Nachricht an den Verein", row.note)
  rule()

  heading("2. Bestaetigte Vereinsdokumente")
  const docs = Array.isArray(row.document_acceptances) ? row.document_acceptances : []
  if (!docs.length) {
    paragraph("Keine Dokumentbestaetigungen gespeichert.", rgb(0.72, 0.12, 0.12), bold)
  } else {
    docs.forEach((doc, index) => {
      ensure(42)
      page.drawText(pdfSafe(`${index + 1}. ${doc.title || "Vereinsdokument"}`), { x: margin, y, size: 10, font: bold, color: navy })
      y -= 14
      paragraph(`Version ${doc.version || "-"} | akzeptiert am ${fmtDateTime(doc.accepted_at)} | geoeffnet am ${fmtDateTime(doc.opened_at)}`, gray, regular, 8.5)
    })
  }
  line("Dokumente gesammelt bestaetigt", fmtDateTime(row.documents_accepted_at))
  rule()

  heading("3. Digitale Erklaerung und Unterschrift")
  paragraph("Mit der digitalen Unterschrift wurde bestaetigt, dass die im Antrag gemachten Angaben richtig sind und die oben angefuehrten Vereinsdokumente gelesen und akzeptiert wurden.")
  line("Unterschrieben am", fmtDateTime(row.signed_at))

  if (applicantSignature) {
    ensure(115)
    page.drawRectangle({ x: margin, y: y - 88, width: contentWidth, height: 88, borderColor: rgb(0.78, 0.80, 0.84), borderWidth: 0.8, color: rgb(1, 1, 1) })
    const scale = Math.min(220 / applicantSignature.width, 70 / applicantSignature.height)
    const width = applicantSignature.width * scale
    const height = applicantSignature.height * scale
    page.drawImage(applicantSignature, { x: margin + 12, y: y - 78, width, height })
    page.drawText("Unterschrift Antragsteller/in", { x: margin + 250, y: y - 48, size: 9, font: bold, color: gray })
    y -= 104
  }

  if (row.guardian_full_name || guardianSignature) {
    heading("4. Gesetzliche Vertretung")
    line("Name", row.guardian_full_name)
    line("Unterschrieben am", fmtDateTime(row.guardian_signed_at))
    if (guardianSignature) {
      ensure(115)
      page.drawRectangle({ x: margin, y: y - 88, width: contentWidth, height: 88, borderColor: rgb(0.78, 0.80, 0.84), borderWidth: 0.8, color: rgb(1, 1, 1) })
      const scale = Math.min(220 / guardianSignature.width, 70 / guardianSignature.height)
      const width = guardianSignature.width * scale
      const height = guardianSignature.height * scale
      page.drawImage(guardianSignature, { x: margin + 12, y: y - 78, width, height })
      page.drawText("Unterschrift gesetzliche Vertretung", { x: margin + 250, y: y - 48, size: 9, font: bold, color: gray })
      y -= 104
    }
    rule()
  }

  heading(row.guardian_full_name || guardianSignature ? "5. Testphase und Bearbeitung" : "4. Testphase und Bearbeitung")
  line("Kostenlose Testphase gewuenscht", row.trial_requested ? "Ja" : "Nein")
  if (stage === "approved") {
    line("Aufgenommen am", fmtDateTime(row.approved_at))
    line("Bearbeitet durch", generatedByName || "Vereinsleitung")
    line("Admin-Notiz", row.admin_note)
    if (row.trial_granted_at) line("Testphase aktiviert am", fmtDateTime(row.trial_granted_at))
    if (row.trial_ends_on) line("Testphase gueltig bis", fmtDate(row.trial_ends_on))
  } else {
    line("Antrag eingereicht am", fmtDateTime(row.created_at))
  }

  rule()
  paragraph(
    stage === "approved"
      ? "Dieses PDF dokumentiert die vom Verein genehmigte Aufnahme auf Basis der digital eingereichten Beitrittsanfrage. Die im Antrag bestaetigten Dokumenttitel und Versionen entsprechen dem zum Zeitpunkt der Antragstellung gespeicherten Nachweis."
      : "Dieses PDF ist die Archivkopie der digital eingereichten Beitrittsanfrage. Die im Antrag bestaetigten Dokumenttitel und Versionen entsprechen dem zum Zeitpunkt der Antragstellung gespeicherten Nachweis.",
    gray,
    regular,
    8.5,
  )

  const pages = pdf.getPages()
  pages.forEach((p, index) => {
    p.drawText(`Seite ${index + 1} von ${pages.length}`, { x: pageWidth - margin - 58, y: 25, size: 7.5, font: regular, color: gray })
    p.drawText(`Erstellt: ${fmtDateTime(new Date().toISOString())}`, { x: margin, y: 25, size: 7.5, font: regular, color: gray })
  })

  return Buffer.from(await pdf.save())
}

async function authenticate(req: Request) {
  const authHeader = req.headers.get("authorization") || ""
  const token = authHeader.toLowerCase().startsWith("bearer ") ? authHeader.slice(7).trim() : ""
  if (!token) throw new Error("Nicht authentifiziert.")

  const { data, error } = await admin.auth.getUser(token)
  if (error || !data.user) throw new Error("Ungueltige oder abgelaufene Sitzung.")

  const { data: profile } = await admin
    .from("user_profiles")
    .select("is_admin,player_id")
    .eq("user_id", data.user.id)
    .maybeSingle()

  return { user: data.user, isAdmin: !!profile?.is_admin }
}

async function loadRequest(requestId: string) {
  const { data, error } = await admin
    .from("club_join_requests")
    .select("*")
    .eq("id", requestId)
    .single()
  if (error || !data) throw new Error("Beitrittsanfrage wurde nicht gefunden.")
  return data as JoinRequest
}

async function adminDisplayName(userId: string | null) {
  if (!userId) return null
  const { data } = await admin
    .from("user_profiles")
    .select("player_id,club_players:player_id(name)")
    .eq("user_id", userId)
    .maybeSingle()
  const clubPlayer = Array.isArray((data as any)?.club_players) ? (data as any).club_players[0] : (data as any)?.club_players
  return clubPlayer?.name || null
}

async function generateArchive(row: JoinRequest, stage: Stage, actorId: string) {
  if (!row.signature_data_url || !row.signed_at || !row.documents_accepted_at) {
    throw new Error("Die digitalen Unterlagen sind noch nicht vollstaendig.")
  }
  if (stage === "approved" && row.status !== "approved") {
    throw new Error("Eine Aufnahmebestaetigung kann erst nach der Genehmigung erstellt werden.")
  }

  const actorName = stage === "approved" ? await adminDisplayName(row.decided_by || actorId) : null
  const bytes = await buildPdf(row, stage, actorName)
  const sha256 = createHash("sha256").update(bytes).digest("hex")
  const baseName = safeFilename(row.full_name || "mitglied") || "mitglied"
  const fileName = stage === "approved"
    ? `Aufnahmebestaetigung_${baseName}_${row.id.slice(0, 8)}.pdf`
    : `Beitrittsanfrage_${baseName}_${row.id.slice(0, 8)}.pdf`
  const storagePath = `${row.user_id}/${row.id}/${stage}.pdf`

  const { error: uploadError } = await admin.storage
    .from(archiveBucket)
    .upload(storagePath, bytes, { contentType: "application/pdf", upsert: true })
  if (uploadError) throw uploadError

  const { error: archiveError } = await admin
    .from("club_join_archives")
    .upsert({
      request_id: row.id,
      user_id: row.user_id,
      stage,
      file_name: fileName,
      storage_path: storagePath,
      sha256,
      generated_at: new Date().toISOString(),
      generated_by: actorId,
    }, { onConflict: "request_id,stage" })
  if (archiveError) throw archiveError

  return { fileName, storagePath, sha256 }
}

export async function POST(req: Request) {
  try {
    const { user, isAdmin } = await authenticate(req)
    const body = await req.json().catch(() => ({}))
    const requestId = String(body?.requestId || "")
    const stage = body?.stage as Stage
    const action = (body?.action || "download") as Action

    if (!requestId) return NextResponse.json({ error: "requestId fehlt." }, { status: 400 })
    if (stage !== "submitted" && stage !== "approved") {
      return NextResponse.json({ error: "Ungueltige Archivstufe." }, { status: 400 })
    }
    if (action !== "generate" && action !== "download") {
      return NextResponse.json({ error: "Ungueltige Aktion." }, { status: 400 })
    }

    const row = await loadRequest(requestId)
    const isOwner = row.user_id === user.id
    if (!isOwner && !isAdmin) return NextResponse.json({ error: "Keine Berechtigung." }, { status: 403 })

    if (action === "generate" && stage === "approved" && !isAdmin) {
      return NextResponse.json({ error: "Nur die Vereinsleitung kann die Aufnahmebestaetigung erzeugen." }, { status: 403 })
    }

    let { data: archive } = await admin
      .from("club_join_archives")
      .select("file_name,storage_path,sha256")
      .eq("request_id", requestId)
      .eq("stage", stage)
      .maybeSingle()

    if (action === "generate" || !archive) {
      const generated = await generateArchive(row, stage, user.id)
      archive = {
        file_name: generated.fileName,
        storage_path: generated.storagePath,
        sha256: generated.sha256,
      }
    }

    if (action === "generate") {
      return NextResponse.json({ ok: true, fileName: archive.file_name, sha256: archive.sha256 })
    }

    const { data: signed, error: signedError } = await admin.storage
      .from(archiveBucket)
      .createSignedUrl(archive.storage_path, 300, { download: archive.file_name })
    if (signedError || !signed?.signedUrl) throw signedError || new Error("Download-Link konnte nicht erstellt werden.")

    return NextResponse.json({
      ok: true,
      url: signed.signedUrl,
      fileName: archive.file_name,
      sha256: archive.sha256,
    })
  } catch (error: any) {
    console.error("club join archive error:", error)
    return NextResponse.json({ error: error?.message || "Beitrittsakte konnte nicht verarbeitet werden." }, { status: 500 })
  }
}
