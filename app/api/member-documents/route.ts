import { NextResponse } from "next/server"
import { createHash } from "node:crypto"
import { createClient } from "@supabase/supabase-js"
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const bucket = "member-document-archives"

if (!supabaseUrl || !serviceRoleKey) throw new Error("Missing Supabase server environment variables")

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

type AcceptanceSnapshot = {
  document_id: string
  title: string
  category: string
  version: string
  storage_path: string
  opened_at: string
  accepted_at: string
}

function tokenFrom(request: Request) {
  const auth = request.headers.get("authorization") || ""
  return auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : ""
}

async function currentUser(request: Request) {
  const token = tokenFrom(request)
  if (!token) throw new Error("Nicht angemeldet.")
  const { data, error } = await admin.auth.getUser(token)
  if (error || !data.user) throw new Error("Sitzung ungültig oder abgelaufen.")
  return data.user
}

function calcAge(birthdate?: string | null) {
  if (!birthdate) return null
  const birth = new Date(`${birthdate}T00:00:00`)
  if (Number.isNaN(birth.getTime())) return null
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
  return age
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

function splitLines(text: string, font: PDFFont, size: number, maxWidth: number) {
  const out: string[] = []
  for (const paragraph of pdfSafe(text).split(/\n/)) {
    const words = paragraph.split(/\s+/).filter(Boolean)
    if (!words.length) {
      out.push("")
      continue
    }
    let line = ""
    for (const word of words) {
      const next = line ? `${line} ${word}` : word
      if (font.widthOfTextAtSize(next, size) <= maxWidth) line = next
      else {
        if (line) out.push(line)
        line = word
      }
    }
    if (line) out.push(line)
  }
  return out
}

async function embedSignature(pdf: PDFDocument, dataUrl?: string | null) {
  if (!dataUrl) return null
  const match = dataUrl.match(/^data:image\/(png|jpeg|jpg);base64,(.+)$/i)
  if (!match) return null
  const bytes = Buffer.from(match[2], "base64")
  return match[1].toLowerCase() === "png" ? pdf.embedPng(bytes) : pdf.embedJpg(bytes)
}

async function buildPdf(args: {
  member: any
  docs: AcceptanceSnapshot[]
  signature: string
  signedAt: string
  guardianName?: string | null
  guardianSignature?: string | null
  guardianSignedAt?: string | null
  acceptanceId: string
}) {
  const { member, docs, signature, signedAt, guardianName, guardianSignature, guardianSignedAt, acceptanceId } = args
  const pdf = await PDFDocument.create()
  const regular = await pdf.embedFont(StandardFonts.Helvetica)
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold)
  const sig = await embedSignature(pdf, signature)
  const guardianSig = await embedSignature(pdf, guardianSignature)

  const W = 595.28
  const H = 841.89
  const margin = 48
  const contentW = W - margin * 2
  const orange = rgb(0.95, 0.31, 0.03)
  const navy = rgb(0.06, 0.09, 0.16)
  const gray = rgb(0.38, 0.42, 0.48)
  let page: PDFPage
  let y = 0

  const newPage = () => {
    page = pdf.addPage([W, H])
    y = H - 44
    page.drawRectangle({ x: 0, y: H - 9, width: W, height: 9, color: orange })
    page.drawText("EMD VereinsApp", { x: margin, y, size: 10, font: bold, color: orange })
    page.drawText("DIGITALE BESTAETIGUNG VEREINSUNTERLAGEN", { x: margin, y: y - 25, size: 17, font: bold, color: navy })
    y -= 56
  }
  const ensure = (n = 36) => { if (y - n < 52) newPage() }
  const heading = (text: string) => { ensure(32); page.drawText(text, { x: margin, y, size: 12, font: bold, color: navy }); y -= 20 }
  const line = (label: string, value?: string | null) => {
    ensure(22)
    const l = `${label}:`
    page.drawText(l, { x: margin, y, size: 9.5, font: bold, color: gray })
    const x = margin + bold.widthOfTextAtSize(l, 9.5) + 8
    const parts = splitLines(value || "-", regular, 9.5, W - margin - x)
    for (const [idx, part] of parts.entries()) {
      if (idx > 0) ensure(14)
      page.drawText(part || " ", { x, y, size: 9.5, font: regular, color: navy })
      y -= 14
    }
  }

  newPage()
  page.drawRectangle({ x: margin, y: y - 38, width: contentW, height: 38, color: rgb(0.96, 0.97, 0.98) })
  page.drawText("NACHTRAEGLICHE / AKTUELLE DOKUMENTBESTAETIGUNG", { x: margin + 12, y: y - 17, size: 9.5, font: bold, color: orange })
  page.drawText(`Nachweis-ID: ${acceptanceId}`, { x: margin + 12, y: y - 30, size: 8, font: regular, color: gray })
  y -= 54

  heading("1. Mitglied")
  line("Name", member.name)
  line("Geburtsdatum", fmtDate(member.birthdate))
  line("E-Mail", member.email)
  line("Telefon", member.phone)
  line("Adresse", [member.street, member.house_number, member.postal_code, member.city].filter(Boolean).join(" ") || "-")
  line("Bestaetigt am", fmtDateTime(signedAt))
  y -= 8

  heading("2. Bestaetigte Dokumente")
  if (!docs.length) line("Dokumente", "Keine")
  docs.forEach((doc, i) => {
    ensure(42)
    page.drawText(`${i + 1}. ${pdfSafe(doc.title)}`, { x: margin, y, size: 10, font: bold, color: navy })
    y -= 14
    page.drawText(`Version ${pdfSafe(doc.version)} | bestaetigt ${pdfSafe(fmtDateTime(doc.accepted_at))}`, { x: margin + 12, y, size: 8.5, font: regular, color: gray })
    y -= 18
  })

  heading("3. Digitale Unterschrift")
  if (sig) {
    const scaled = sig.scaleToFit(contentW, 95)
    ensure(scaled.height + 32)
    page.drawRectangle({ x: margin, y: y - scaled.height - 8, width: contentW, height: scaled.height + 16, borderColor: rgb(0.82,0.84,0.88), borderWidth: 1 })
    page.drawImage(sig, { x: margin + 8, y: y - scaled.height, width: scaled.width, height: scaled.height })
    y -= scaled.height + 24
  }
  line("Unterschrieben am", fmtDateTime(signedAt))

  if (guardianName || guardianSig) {
    y -= 8
    heading("4. Gesetzliche Vertretung")
    line("Name", guardianName)
    if (guardianSig) {
      const scaled = guardianSig.scaleToFit(contentW, 90)
      ensure(scaled.height + 28)
      page.drawRectangle({ x: margin, y: y - scaled.height - 8, width: contentW, height: scaled.height + 16, borderColor: rgb(0.82,0.84,0.88), borderWidth: 1 })
      page.drawImage(guardianSig, { x: margin + 8, y: y - scaled.height, width: scaled.width, height: scaled.height })
      y -= scaled.height + 24
    }
    line("Unterschrieben am", fmtDateTime(guardianSignedAt))
  }

  ensure(55)
  y -= 12
  page.drawText("Dieser Nachweis dokumentiert, welche Vereinsunterlagen in welcher Version digital bestaetigt wurden.", { x: margin, y, size: 8.5, font: regular, color: gray })
  y -= 14
  page.drawText("Die Originaldokumente bleiben getrennt in der Vereinsdokumentenablage gespeichert.", { x: margin, y, size: 8.5, font: regular, color: gray })

  return Buffer.from(await pdf.save())
}

export async function POST(request: Request) {
  try {
    const user = await currentUser(request)
    const body = await request.json().catch(() => ({}))
    const signature = String(body?.signature || "")
    const guardianName = String(body?.guardianName || "").trim() || null
    const guardianSignature = String(body?.guardianSignature || "") || null
    const suppliedDocs = Array.isArray(body?.documents) ? body.documents as AcceptanceSnapshot[] : []

    if (!signature.startsWith("data:image/")) return NextResponse.json({ error: "Unterschrift fehlt." }, { status: 400 })

    const [{ data: settings, error: settingsError }, { data: profile, error: profileError }] = await Promise.all([
      admin.from("club_join_settings").select("documents_enabled,existing_members_must_accept").eq("id", "default").single(),
      admin.from("user_profiles").select("player_id").eq("user_id", user.id).maybeSingle(),
    ])
    if (settingsError) throw settingsError
    if (profileError) throw profileError
    if (!settings?.documents_enabled) return NextResponse.json({ error: "Der Dokumentenprozess ist derzeit nicht freigeschaltet." }, { status: 409 })
    if (!profile?.player_id) return NextResponse.json({ error: "Kein Mitgliederprofil gefunden." }, { status: 404 })

    const [{ data: member, error: memberError }, { data: activeDocs, error: docsError }] = await Promise.all([
      admin.from("club_players").select("id,name,birthdate,email,phone,street,house_number,postal_code,city").eq("id", profile.player_id).single(),
      admin.from("club_join_documents").select("id,storage_path,title,category,version,is_required,minors_only,is_active,sort_order").eq("is_active", true).order("sort_order"),
    ])
    if (memberError) throw memberError
    if (docsError) throw docsError

    const age = calcAge(member.birthdate)
    const minor = age !== null && age < 18
    const applicable = (activeDocs || []).filter((d: any) => !d.minors_only || minor)
    const required = applicable.filter((d: any) => d.is_required)
    const byId = new Map(suppliedDocs.map((d) => [d.document_id, d]))

    for (const doc of required) {
      const accepted = byId.get(doc.id)
      if (!accepted || accepted.version !== doc.version || !accepted.accepted_at) {
        return NextResponse.json({ error: `Pflichtdokument noch nicht vollständig bestätigt: ${doc.title}` }, { status: 400 })
      }
    }

    if (minor && (!guardianName || !guardianSignature?.startsWith("data:image/"))) {
      return NextResponse.json({ error: "Bei Minderjährigen fehlt die Unterschrift der gesetzlichen Vertretung." }, { status: 400 })
    }

    const snapshot = applicable
      .filter((d: any) => byId.has(d.id))
      .map((d: any) => {
        const x = byId.get(d.id)!
        return {
          document_id: d.id,
          title: d.title,
          category: d.category,
          version: d.version,
          storage_path: d.storage_path,
          opened_at: x.opened_at,
          accepted_at: x.accepted_at,
        }
      })

    const now = new Date().toISOString()
    const { data: acceptance, error: insertError } = await admin
      .from("member_document_acceptances")
      .insert({
        user_id: user.id,
        player_id: member.id,
        document_acceptances: snapshot,
        signature_data_url: signature,
        signed_at: now,
        guardian_full_name: minor ? guardianName : null,
        guardian_signature_data_url: minor ? guardianSignature : null,
        guardian_signed_at: minor ? now : null,
      })
      .select("id")
      .single()
    if (insertError) throw insertError

    const pdf = await buildPdf({
      member,
      docs: snapshot,
      signature,
      signedAt: now,
      guardianName: minor ? guardianName : null,
      guardianSignature: minor ? guardianSignature : null,
      guardianSignedAt: minor ? now : null,
      acceptanceId: acceptance.id,
    })
    const hash = createHash("sha256").update(pdf).digest("hex")
    const fileName = `Vereinsunterlagen-${safeFilename(member.name || "Mitglied")}-${now.slice(0,10)}.pdf`
    const path = `${user.id}/${acceptance.id}/${fileName}`
    const { error: uploadError } = await admin.storage.from(bucket).upload(path, pdf, { contentType: "application/pdf", upsert: false })
    if (uploadError) throw uploadError

    const { error: updateError } = await admin.from("member_document_acceptances").update({
      archive_file_name: fileName,
      archive_storage_path: path,
      archive_sha256: hash,
    }).eq("id", acceptance.id)
    if (updateError) throw updateError

    const { data: signed } = await admin.storage.from(bucket).createSignedUrl(path, 300)
    return NextResponse.json({ ok: true, acceptanceId: acceptance.id, fileName, sha256: hash, url: signed?.signedUrl || null })
  } catch (error: any) {
    console.error("member documents submit error:", error)
    return NextResponse.json({ error: error?.message || "Vereinsunterlagen konnten nicht gespeichert werden." }, { status: 500 })
  }
}

export async function GET(request: Request) {
  try {
    const user = await currentUser(request)
    const url = new URL(request.url)
    const id = url.searchParams.get("id") || ""
    if (!id) return NextResponse.json({ error: "id fehlt." }, { status: 400 })

    const { data: row, error } = await admin
      .from("member_document_acceptances")
      .select("id,user_id,archive_file_name,archive_storage_path,archive_sha256")
      .eq("id", id)
      .single()
    if (error) throw error
    if (row.user_id !== user.id) return NextResponse.json({ error: "Nicht erlaubt." }, { status: 403 })
    if (!row.archive_storage_path) return NextResponse.json({ error: "Kein PDF-Archiv vorhanden." }, { status: 404 })

    const { data, error: signError } = await admin.storage.from(bucket).createSignedUrl(row.archive_storage_path, 300)
    if (signError) throw signError
    return NextResponse.json({ url: data?.signedUrl || null, fileName: row.archive_file_name, sha256: row.archive_sha256 })
  } catch (error: any) {
    console.error("member documents download error:", error)
    return NextResponse.json({ error: error?.message || "PDF konnte nicht geöffnet werden." }, { status: 500 })
  }
}
