"use client"

import React, { useEffect, useMemo, useRef, useState } from "react"
import type { User } from "@supabase/supabase-js"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { vv } from "../vereinsverwaltung-styles"
import {
  ArrowLeft,
  Folder,
  FileText,
  Upload,
  Plus,
  Trash2,
  Pencil,
  Download,
  RefreshCcw,
  LayoutGrid,
  List,
  MoreVertical,
  Search,
  Loader2,
  CheckCircle2,
  XCircle,
  Eye,
  Copy,
  MoveRight,
  X,
} from "lucide-react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import { useClubDocuments, type ClubDocumentItem } from "@/hooks/vereinsverwaltung/useClubDocuments"

function formatBytes(bytes?: number) {
  if (!bytes && bytes !== 0) return "–"
  const sizes = ["B", "KB", "MB", "GB", "TB"]
  let v = bytes
  let i = 0
  while (v >= 1024 && i < sizes.length - 1) {
    v = v / 1024
    i++
  }
  const num = i === 0 ? String(v) : v.toFixed(v < 10 ? 1 : 0)
  return `${num} ${sizes[i]}`
}

type ViewMode = "list" | "grid"
type SortKey = "name" | "type" | "size"
type SortDir = "asc" | "desc"

type UploadJob = {
  id: string
  name: string
  size: number
  status: "queued" | "uploading" | "done" | "error"
  error?: string
}

function sortItems(items: ClubDocumentItem[], key: SortKey, dir: SortDir) {
  const mult = dir === "asc" ? 1 : -1
  return [...items].sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === "folder" ? -1 : 1

    if (key === "type") {
      const at = a.kind === "folder" ? "folder" : a.contentType || "file"
      const bt = b.kind === "folder" ? "folder" : b.contentType || "file"
      return at.localeCompare(bt) * mult
    }

    if (key === "size") {
      const as = a.kind === "file" ? a.size ?? 0 : -1
      const bs = b.kind === "file" ? b.size ?? 0 : -1
      if (as !== bs) return (as - bs) * mult
      return a.name.localeCompare(b.name) * mult
    }

    return a.name.localeCompare(b.name) * mult
  })
}

function isPreviewable(item: ClubDocumentItem) {
  if (item.kind !== "file") return false
  const ct = (item.contentType || "").toLowerCase()
  if (ct.startsWith("image/")) return true
  if (ct.includes("pdf")) return true
  const name = item.name.toLowerCase()
  if (name.endsWith(".pdf")) return true
  if (/\.(png|jpg|jpeg|gif|webp|svg)$/.test(name)) return true
  return false
}

/** Simple modern dialog (no extra dependency) */
function Modal({
  open,
  title,
  children,
  onClose,
  footer,
  widthClass = "max-w-3xl",
}: {
  open: boolean
  title: string
  children: React.ReactNode
  onClose: () => void
  footer?: React.ReactNode
  widthClass?: string
}) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-[2px]" onClick={onClose} />
      <div
        className={cn(
          "absolute inset-x-2 bottom-2 sm:left-1/2 sm:right-auto sm:top-1/2 sm:bottom-auto sm:w-[min(920px,calc(100vw-2rem))] sm:-translate-x-1/2 sm:-translate-y-1/2",
          widthClass,
        )}
      >
        <div className="flex max-h-[calc(100dvh-1rem)] min-h-0 flex-col overflow-hidden rounded-[26px] border border-[#2a323d] bg-[#090c11] text-white shadow-[0_32px_110px_-38px_rgba(0,0,0,.98)] sm:max-h-[88dvh] sm:rounded-[28px]">
          <div className={cn(vv.modalHeader, "flex items-center justify-between gap-3")}>
            <div className="min-w-0 truncate text-base font-black text-white">{title}</div>
            <button type="button" onClick={onClose} className={vv.iconButton} aria-label="Schließen">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className={vv.modalBody}>{children}</div>
          {footer ? <div className={vv.modalFooter}>{footer}</div> : null}
        </div>
      </div>
    </div>
  )
}

function ItemMenu({
  item,
  disabled,
  onOpenFolder,
  onDownload,
  onPreview,
  onRename,
  onMove,
  onCopy,
  onDelete,
}: {
  item: ClubDocumentItem
  disabled?: boolean
  onOpenFolder: () => void
  onDownload: () => void
  onPreview: () => void
  onRename: () => void
  onMove: () => void
  onCopy: () => void
  onDelete: () => void
}) {
  const previewEnabled = isPreviewable(item)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" disabled={disabled} className={vv.iconButton}>
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-52 border-[#2a323d] bg-[#0b0e13] text-white">
        {item.kind === "folder" ? (
          <DropdownMenuItem onClick={onOpenFolder} disabled={disabled}>
            <Folder className="h-4 w-4 mr-2" />
            Öffnen
          </DropdownMenuItem>
        ) : (
          <>
            <DropdownMenuItem onClick={onDownload} disabled={disabled}>
              <Download className="h-4 w-4 mr-2" />
              Download
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onPreview} disabled={disabled || !previewEnabled}>
              <Eye className="h-4 w-4 mr-2" />
              Vorschau
            </DropdownMenuItem>
          </>
        )}

        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={onMove} disabled={disabled}>
          <MoveRight className="h-4 w-4 mr-2" />
          Verschieben…
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onCopy} disabled={disabled}>
          <Copy className="h-4 w-4 mr-2" />
          Kopieren…
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={onRename} disabled={disabled}>
          <Pencil className="h-4 w-4 mr-2" />
          Umbenennen
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={onDelete} disabled={disabled} className="text-rose-300 focus:bg-rose-500/10 focus:text-rose-200">
          <Trash2 className="h-4 w-4 mr-2" />
          Löschen
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function DocumentsTab({ user }: { user: User | null }) {
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const docs = useClubDocuments(user)

  const [viewMode, setViewMode] = useState<ViewMode>("list")
  const [search, setSearch] = useState("")
  const [sortKey, setSortKey] = useState<SortKey>("name")
  const [sortDir, setSortDir] = useState<SortDir>("asc")

  // Drag&Drop
  const [dragActive, setDragActive] = useState(false)

  // Upload Queue
  const [jobs, setJobs] = useState<UploadJob[]>([])

  const hasParent = useMemo(() => (docs.currentPath || "").trim().length > 0, [docs.currentPath])

  // ✅ Preview state
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewItem, setPreviewItem] = useState<ClubDocumentItem | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)

  // ✅ Move/Copy state
  const [actionOpen, setActionOpen] = useState(false)
  const [actionMode, setActionMode] = useState<"move" | "copy">("move")
  const [actionItem, setActionItem] = useState<ClubDocumentItem | null>(null)
  const [folders, setFolders] = useState<{ label: string; path: string }[]>([{ label: "Dokumente (Root)", path: "" }])
  const [targetFolder, setTargetFolder] = useState<string>("")
  const [targetName, setTargetName] = useState<string>("")
  const [actionBusy, setActionBusy] = useState(false)

  // ✅ Delete confirm modal
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteItem, setDeleteItem] = useState<ClubDocumentItem | null>(null)
  const [deleteBusy, setDeleteBusy] = useState(false)

  // ✅ Create folder modal (NEU)
  const [createFolderOpen, setCreateFolderOpen] = useState(false)
  const [createFolderName, setCreateFolderName] = useState("")
  const [createFolderBusy, setCreateFolderBusy] = useState(false)

  const openDelete = (item: ClubDocumentItem) => {
    setDeleteItem(item)
    setDeleteOpen(true)
    setDeleteBusy(false)
  }

  const closeDelete = () => {
    if (deleteBusy) return
    setDeleteOpen(false)
    setDeleteItem(null)
  }

  const runDelete = async () => {
    if (!deleteItem) return
    setDeleteBusy(true)
    try {
      await docs.deleteItem(deleteItem)
      setDeleteOpen(false)
      setDeleteItem(null)
    } finally {
      setDeleteBusy(false)
    }
  }

  const openCreateFolder = () => {
    setCreateFolderName("")
    setCreateFolderBusy(false)
    setCreateFolderOpen(true)
  }

  const closeCreateFolder = () => {
    if (createFolderBusy) return
    setCreateFolderOpen(false)
  }

  const runCreateFolder = async () => {
    const name = createFolderName.trim()
    if (!name) return
    setCreateFolderBusy(true)
    try {
      await docs.createFolder(name)
      setCreateFolderOpen(false)
      setCreateFolderName("")
    } finally {
      setCreateFolderBusy(false)
    }
  }

  useEffect(() => {
    const key = "club-docs-viewmode"
    const saved = typeof window !== "undefined" ? (window.localStorage.getItem(key) as ViewMode | null) : null
    if (saved === "grid" || saved === "list") setViewMode(saved)
  }, [])

  useEffect(() => {
    const key = "club-docs-viewmode"
    if (typeof window !== "undefined") window.localStorage.setItem(key, viewMode)
  }, [viewMode])

  const filteredSorted = useMemo(() => {
    const q = search.trim().toLowerCase()
    const filtered = q
      ? docs.items.filter((i) => i.name.toLowerCase().includes(q) || (i.contentType || "").toLowerCase().includes(q))
      : docs.items
    return sortItems(filtered, sortKey, sortDir)
  }, [docs.items, search, sortKey, sortDir])

  const handleUploadClick = () => fileInputRef.current?.click()

  const enqueueUploads = async (files: FileList | File[]) => {
    if (!user) return
    const list = Array.from(files)
    if (list.length === 0) return

    const now = Date.now()
    const newJobs: UploadJob[] = list.map((f, idx) => ({
      id: `${now}-${idx}-${f.name}`,
      name: f.name,
      size: f.size,
      status: "queued",
    }))
    setJobs((prev) => [...newJobs, ...prev])

    for (const f of list) {
      const id = `${now}-${list.indexOf(f)}-${f.name}`
      setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, status: "uploading" } : j)))

      try {
        await docs.uploadFiles([f], { upsert: true, silent: true })
        setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, status: "done" } : j)))
      } catch (e: any) {
        setJobs((prev) =>
          prev.map((j) =>
            j.id === id ? { ...j, status: "error", error: String(e?.message || "Upload fehlgeschlagen") } : j,
          ),
        )
      }
    }
  }

  const handleUploadFiles = async (files: FileList | null) => {
    if (!files) return
    await enqueueUploads(files)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const promptRename = async (item: ClubDocumentItem) => {
    const next = window.prompt("Neuer Name:", item.name)
    if (!next) return
    await docs.renameItem(item, next)
  }

  const download = async (item: ClubDocumentItem) => {
    try {
      const url = await docs.getSignedUrl(item, 120)
      if (!url) return
      window.open(url, "_blank", "noopener,noreferrer")
    } catch (e: any) {
      console.error(e)
    }
  }

  // ✅ Preview open
  const openPreview = async (item: ClubDocumentItem) => {
    if (item.kind !== "file") return
    if (!isPreviewable(item)) return

    setPreviewItem(item)
    setPreviewUrl(null)
    setPreviewOpen(true)
    setPreviewLoading(true)
    try {
      const url = await docs.getSignedUrl(item, 300)
      setPreviewUrl(url)
    } catch {
      setPreviewUrl(null)
    } finally {
      setPreviewLoading(false)
    }
  }

  const closePreview = () => {
    setPreviewOpen(false)
    setPreviewItem(null)
    setPreviewUrl(null)
    setPreviewLoading(false)
  }

  // ✅ Move/Copy open
  const openAction = async (mode: "move" | "copy", item: ClubDocumentItem) => {
    setActionMode(mode)
    setActionItem(item)
    setTargetFolder(docs.currentPath || "")
    setTargetName(item.name)
    setActionOpen(true)
    setActionBusy(false)

    const f = await docs.listFolders()
    setFolders(f)

    const exists = f.some((x) => x.path === (docs.currentPath || ""))
    setTargetFolder(exists ? (docs.currentPath || "") : "")
  }

  const closeAction = () => {
    setActionOpen(false)
    setActionItem(null)
    setActionBusy(false)
  }

  const runAction = async () => {
    if (!actionItem) return
    if (!user) return
    setActionBusy(true)
    try {
      if (actionMode === "move") {
        await docs.moveItem(actionItem, targetFolder, targetName)
      } else {
        await docs.copyItem(actionItem, targetFolder, targetName)
      }
      closeAction()
    } finally {
      setActionBusy(false)
    }
  }

  const confirmDelete = async (item: ClubDocumentItem) => {
    openDelete(item)
  }

  // Drag & drop handlers
  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!user) return
    setDragActive(true)
  }
  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
  }
  const onDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (!user) return
    const files = e.dataTransfer.files
    if (files && files.length > 0) {
      await enqueueUploads(files)
    }
  }

  const clearFinishedJobs = () => {
    setJobs((prev) => prev.filter((j) => j.status === "queued" || j.status === "uploading"))
  }

  return (
    <div className="space-y-5 text-white">
      <section className={cn(vv.surfaceLg, "w-full max-w-full overflow-hidden")}>
        <div className="border-b border-[#202731] px-4 py-5 sm:px-5">
          <div className="flex flex-col gap-3">
            <div className="min-w-0">
              <div className="text-[11px] font-black uppercase tracking-[0.18em] text-sky-200/50">Vereinsdateien</div>
              <h3 className="mt-1 text-2xl font-black tracking-[-0.02em] text-white sm:text-[28px]">Dokumente</h3>
              <p className="mt-1 text-sm leading-6 text-white/42">Dateien, Ordner und Vereinsunterlagen zentral organisieren.</p>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1 [-webkit-overflow-scrolling:touch]">
              <Button
                variant="outline"
                onClick={docs.listCurrent}
                disabled={!user || docs.loading}
                className={cn(vv.buttonSecondary, "flex-none")}
              >
                <RefreshCcw className="h-4 w-4 mr-2" />
                <span className="whitespace-nowrap">Aktualisieren</span>
              </Button>

              <Button
                variant="outline"
                onClick={openCreateFolder}
                disabled={!user || docs.loading}
                className={cn(vv.buttonSecondary, "flex-none")}
              >
                <Plus className="h-4 w-4 mr-2" />
                <span className="whitespace-nowrap">Neuer Ordner</span>
              </Button>

              <Button
                onClick={handleUploadClick}
                disabled={!user || docs.loading}
                className={cn(vv.buttonPrimary, "flex-none")}
              >
                <Upload className="h-4 w-4 mr-2" />
                <span className="whitespace-nowrap">Upload</span>
              </Button>

              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="*/*"
                className="hidden"
                onChange={(e) => handleUploadFiles(e.target.files)}
              />
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2 text-sm text-white/42">
              {docs.breadcrumbs.map((c, idx) => (
                <button
                  key={c.path}
                  type="button"
                  onClick={() => docs.goTo(c.path)}
                  className={cn(
                    "max-w-full truncate rounded-full border px-2.5 py-1.5 transition",
                    idx === docs.breadcrumbs.length - 1 ? "border-orange-300/20 bg-orange-500/10 font-black text-orange-100" : "border-[#2b333e] bg-[#11161d] text-white/45 hover:border-[#3a4552] hover:text-white/70",
                  )}
                >
                  {c.label}
                </button>
              ))}

              {hasParent && (
                <Button
                  variant="ghost"
                  onClick={docs.goUp}
                  disabled={!user || docs.loading}
                  className={cn(vv.buttonSecondary, "ml-auto h-10")}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Hoch
                </Button>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <div className="relative w-full max-w-full">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/25" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Suchen nach Name oder Typ…"
                  className={cn(vv.input, "pl-9")}
                  disabled={!user}
                />
              </div>

              <div className="flex gap-2 overflow-x-auto pb-1 [-webkit-overflow-scrolling:touch]">
                <Button
                  variant={viewMode === "list" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("list")}
                  disabled={!user}
                  className={cn(vv.buttonSecondary, "h-10 flex-none")}
                >
                  <List className="h-4 w-4 mr-2" />
                  <span className="whitespace-nowrap">Liste</span>
                </Button>
                <Button
                  variant={viewMode === "grid" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("grid")}
                  disabled={!user}
                  className={cn(vv.buttonSecondary, "h-10 flex-none")}
                >
                  <LayoutGrid className="h-4 w-4 mr-2" />
                  <span className="whitespace-nowrap">Grid</span>
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  disabled={!user}
                  onClick={() => setSortKey((k) => (k === "name" ? "type" : k === "type" ? "size" : "name"))}
                  className={cn(vv.buttonSecondary, "h-10 flex-none")}
                >
                  <span className="whitespace-nowrap">Sort: {sortKey.toUpperCase()}</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!user}
                  onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
                  className={cn(vv.buttonSecondary, "h-10 flex-none")}
                >
                  <span className="whitespace-nowrap">{sortDir === "asc" ? "↑" : "↓"}</span>
                </Button>
              </div>
            </div>

            {/* ✅ MOBILE: Tap öffnet Dateiauswahl. Drag&Drop bleibt für PC. */}
            <button
              type="button"
              onClick={() => {
                if (!user || docs.loading) return
                handleUploadClick()
              }}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              className={cn(
                "w-full max-w-full rounded-[22px] border border-dashed p-4 text-left transition",
                !user || docs.loading ? "border-[#2a323d] bg-[#0d1117] opacity-60" : "border-[#343d49] bg-[#10141b]",
                dragActive && user ? "border-orange-300/40 bg-orange-500/10" : "",
              )}
            >
              <div className="flex flex-col gap-2">
                <div className="text-sm">
                  <div className="font-black text-white">Upload</div>
                  <div className="text-white/45">
                    Tippe hier, um Dateien auszuwählen. (Ordner:{" "}
                    <span className="font-black text-white/65">{docs.currentPath || "Root"}</span>)
                  </div>
                </div>
                <div className="text-xs text-white/30">
                  Am PC kannst du auch Dateien hier reinziehen (Drag & Drop).
                </div>
              </div>
            </button>

            {docs.message && (
              <div
                className={cn(
                  "w-full max-w-full break-words rounded-[18px] border px-4 py-3 text-sm font-bold",
                  docs.messageType === "success"
                    ? "border-emerald-300/20 bg-emerald-500/10 text-emerald-100"
                    : "border-rose-300/20 bg-rose-500/10 text-rose-100",
                )}
              >
                {docs.message}
              </div>
            )}

            {jobs.length > 0 && (
              <div className={cn(vv.card, "w-full max-w-full p-3")}>
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm font-black text-white">Uploads</div>
                  <Button variant="ghost" size="sm" onClick={clearFinishedJobs} className={cn(vv.buttonSecondary, "h-9")}>
                    Aufräumen
                  </Button>
                </div>
                <div className="mt-2 space-y-2">
                  {jobs.slice(0, 6).map((j) => (
                    <div key={j.id} className="flex items-center gap-3 rounded-[16px] border border-[#252c36] bg-[#0d1117] px-3 py-2">
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-bold text-white/70">{j.name}</div>
                        <div className="text-xs text-white/30">{formatBytes(j.size)}</div>
                        {j.status === "error" && <div className="text-xs text-rose-300 mt-1 break-words">{j.error}</div>}
                      </div>
                      <div className="flex items-center gap-2 flex-none">
                        {j.status === "queued" && <div className="text-xs text-white/30">wartet…</div>}
                        {j.status === "uploading" && (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin text-orange-300" />
                            <div className="text-xs text-white/40">upload…</div>
                          </>
                        )}
                        {j.status === "done" && (
                          <>
                            <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                            <div className="text-xs text-white/40">fertig</div>
                          </>
                        )}
                        {j.status === "error" && (
                          <>
                            <XCircle className="h-4 w-4 text-rose-300" />
                            <div className="text-xs text-white/40">fehler</div>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                  {jobs.length > 6 && <div className="text-xs text-white/30">… {jobs.length - 6} weitere</div>}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="p-0">
          {!user && (
            <div className="px-4 py-10 text-center text-sm font-semibold text-white/40 break-words">Bitte einloggen, um Dokumente zu verwalten.</div>
          )}
          {user && docs.loading && <div className="px-4 py-10 text-center text-sm font-semibold text-white/40">Lade…</div>}
          {user && !docs.loading && filteredSorted.length === 0 && (
            <div className="px-4 py-10 text-center text-sm font-semibold text-white/40">Keine Einträge in diesem Ordner.</div>
          )}

          {user && !docs.loading && filteredSorted.length > 0 && viewMode === "list" && (
            <div className="w-full max-w-full">
              <div className="divide-y divide-[#202731]">
                {filteredSorted.map((item) => (
                  <div key={item.path} className="flex items-center gap-3 px-3 py-3.5 transition hover:bg-[#10141b] sm:px-4">
                    <button
                      type="button"
                      className="min-w-0 flex-1 text-left"
                      onClick={() => (item.kind === "folder" ? docs.goInto(item.name) : download(item))}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {item.kind === "folder" ? (
                          <Folder className="h-5 w-5 flex-none text-orange-300" />
                        ) : (
                          <FileText className="h-5 w-5 flex-none text-white/55" />
                        )}
                        <div className="min-w-0">
                          <div className={cn("truncate", item.kind === "folder" ? "font-medium text-white" : "text-white")}>
                            {item.name}
                          </div>
                          <div className="text-xs text-white/30 truncate">
                            {item.kind === "folder" ? "Ordner" : `${item.contentType || "Datei"} · ${formatBytes(item.size)}`}
                          </div>
                        </div>
                      </div>
                    </button>

                    <ItemMenu
                      item={item}
                      disabled={docs.loading}
                      onOpenFolder={() => docs.goInto(item.name)}
                      onDownload={() => download(item)}
                      onPreview={() => openPreview(item)}
                      onRename={() => promptRename(item)}
                      onMove={() => openAction("move", item)}
                      onCopy={() => openAction("copy", item)}
                      onDelete={() => confirmDelete(item)}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {user && !docs.loading && filteredSorted.length > 0 && viewMode === "grid" && (
            <div className="grid grid-cols-1 gap-3 p-3 sm:grid-cols-2 sm:p-4 lg:grid-cols-3 xl:grid-cols-4">
              {filteredSorted.map((item) => (
                <div
                  key={item.path}
                  className={cn(vv.cardHover, "group w-full min-w-0 p-3")}
                >
                  <div className="flex items-start justify-between gap-2">
                    <button
                      type="button"
                      className="min-w-0 flex-1 text-left"
                      onClick={() => (item.kind === "folder" ? docs.goInto(item.name) : download(item))}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {item.kind === "folder" ? (
                          <Folder className="h-5 w-5 flex-none text-orange-300" />
                        ) : (
                          <FileText className="h-5 w-5 flex-none text-white/55" />
                        )}
                        <div className="truncate font-medium text-white">{item.name}</div>
                      </div>
                      <div className="mt-1 truncate text-xs text-white/30">
                        {item.kind === "folder" ? "Ordner" : `${item.contentType || "Datei"} · ${formatBytes(item.size)}`}
                      </div>
                    </button>

                    <div className="opacity-100 md:opacity-0 md:group-hover:opacity-100 transition flex-none">
                      <ItemMenu
                        item={item}
                        disabled={docs.loading}
                        onOpenFolder={() => docs.goInto(item.name)}
                        onDownload={() => download(item)}
                        onPreview={() => openPreview(item)}
                        onRename={() => promptRename(item)}
                        onMove={() => openAction("move", item)}
                        onCopy={() => openAction("copy", item)}
                        onDelete={() => confirmDelete(item)}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Restliche Modals unverändert */}
      <Modal
        open={createFolderOpen}
        title="Neuen Ordner erstellen"
        onClose={closeCreateFolder}
        widthClass="max-w-xl"
        footer={
          <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-xs text-white/30 break-words">
              Wird im aktuellen Ordner erstellt: {docs.currentPath || "Root"}
            </div>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
              <Button variant="outline" onClick={closeCreateFolder} disabled={createFolderBusy} className={vv.buttonSecondary}>
                Abbrechen
              </Button>
              <Button
                onClick={runCreateFolder}
                disabled={createFolderBusy || !createFolderName.trim()}
                className={vv.buttonPrimary}
              >
                {createFolderBusy ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Erstelle…
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Erstellen
                  </>
                )}
              </Button>
            </div>
          </div>
        }
      >
        <div className="space-y-2">
          <div className={vv.label}>Ordnername</div>
          <Input
            value={createFolderName}
            onChange={(e) => setCreateFolderName(e.target.value)}
            placeholder="z.B. Protokolle, Verträge, Sponsoren…"
            disabled={createFolderBusy}
            autoFocus
            className={vv.input}
            onKeyDown={(e) => {
              if (e.key === "Enter") runCreateFolder()
            }}
          />
          <div className="text-xs text-white/30">Tipp: Kurze, klare Namen (ohne Sonderzeichen) sind am besten.</div>
        </div>
      </Modal>

      <Modal
        open={previewOpen}
        title={previewItem ? `Vorschau: ${previewItem.name}` : "Vorschau"}
        onClose={closePreview}
        footer={
          <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
            {previewItem?.kind === "file" && (
              <Button
                variant="outline"
                onClick={() => previewItem && download(previewItem)}
                disabled={!previewItem}
                className={vv.buttonSecondary}
              >
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            )}
            <Button onClick={closePreview} className={vv.buttonPrimary}>
              Schließen
            </Button>
          </div>
        }
        widthClass="max-w-5xl"
      >
        {previewLoading && (
          <div className="flex items-center gap-2 text-sm text-white/40">
            <Loader2 className="h-4 w-4 animate-spin" />
            Lade Vorschau…
          </div>
        )}

        {!previewLoading && !previewUrl && <div className="text-sm text-white/40">Keine Vorschau verfügbar.</div>}

        {!previewLoading && previewUrl && previewItem && (
          <>
            {String(previewItem.contentType || "").toLowerCase().includes("pdf") ||
            previewItem.name.toLowerCase().endsWith(".pdf") ? (
              <div className="overflow-hidden rounded-[18px] border border-[#252c36] bg-[#0d1117]">
                <iframe title="pdf-preview" src={previewUrl} className="w-full h-[70vh]" />
              </div>
            ) : (
              <div className="overflow-hidden rounded-[18px] border border-[#252c36] bg-[#0d1117]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={previewUrl} alt={previewItem.name} className="max-h-[70vh] w-full object-contain" />
              </div>
            )}
          </>
        )}
      </Modal>

      <Modal
        open={actionOpen}
        title={
          actionItem
            ? `${actionMode === "move" ? "Verschieben" : "Kopieren"}: ${actionItem.name}`
            : actionMode === "move"
              ? "Verschieben"
              : "Kopieren"
        }
        onClose={closeAction}
        footer={
          <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-xs text-white/30">Tipp: Zielordner wählen + optional neuen Namen vergeben.</div>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
              <Button variant="outline" onClick={closeAction} disabled={actionBusy} className={vv.buttonSecondary}>
                Abbrechen
              </Button>
              <Button onClick={runAction} disabled={actionBusy || !actionItem} className={vv.buttonPrimary}>
                {actionBusy ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Bitte warten…
                  </>
                ) : (
                  <>
                    {actionMode === "move" ? <MoveRight className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
                    {actionMode === "move" ? "Verschieben" : "Kopieren"}
                  </>
                )}
              </Button>
            </div>
          </div>
        }
        widthClass="max-w-xl"
      >
        {!actionItem ? (
          <div className="text-sm text-white/40">Kein Element gewählt.</div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-1">
              <div className={vv.label}>Zielordner</div>
              <select
                value={targetFolder}
                onChange={(e) => setTargetFolder(e.target.value)}
                className={cn(vv.select, "w-full px-3")}
                disabled={actionBusy}
              >
                {folders.map((f) => (
                  <option key={f.path} value={f.path}>
                    {f.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <div className={vv.label}>Name</div>
              <Input
                value={targetName}
                onChange={(e) => setTargetName(e.target.value)}
                placeholder="Neuer Name (optional)"
                disabled={actionBusy}
                className={vv.input}
              />
              <div className="text-xs text-white/30">Wenn leer: Standardname wird verwendet.</div>
            </div>

            {actionItem.kind === "folder" && (
              <div className="rounded-[18px] border border-orange-300/20 bg-orange-500/10 px-3 py-2.5 text-xs font-semibold text-orange-100/80">
                Bei Ordnern werden alle Inhalte {actionMode === "move" ? "verschoben" : "kopiert"}.
              </div>
            )}
          </div>
        )}
      </Modal>

      <Modal
        open={deleteOpen}
        title={deleteItem ? `Löschen: ${deleteItem.name}` : "Löschen"}
        onClose={closeDelete}
        widthClass="max-w-xl"
        footer={
          <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-xs text-white/30">Diese Aktion kann nicht rückgängig gemacht werden.</div>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
              <Button variant="outline" onClick={closeDelete} disabled={deleteBusy} className={vv.buttonSecondary}>
                Abbrechen
              </Button>
              <Button variant="outline" onClick={runDelete} disabled={deleteBusy || !deleteItem} className={vv.buttonDanger}>
                {deleteBusy ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Lösche…
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Wirklich löschen
                  </>
                )}
              </Button>
            </div>
          </div>
        }
      >
        {!deleteItem ? (
          <div className="text-sm text-white/40">Kein Element gewählt.</div>
        ) : (
          <div className="space-y-3">
            <div className="rounded-[18px] border border-rose-300/20 bg-rose-500/10 px-3.5 py-3 text-sm text-rose-100">
              <div className="font-semibold">Achtung</div>
              <div className="text-rose-100/75">
                {deleteItem.kind === "folder"
                  ? "Du löschst einen Ordner inklusive aller enthaltenen Dateien und Unterordner."
                  : "Du löschst eine Datei dauerhaft."}
              </div>
            </div>

            <div className="text-sm text-white/55 break-words">
              <span className="font-black text-white">Element:</span> {deleteItem.name}
            </div>

            {deleteItem.kind === "folder" && (
              <div className="text-xs text-white/30">
                Tipp: Wenn du nur aufräumen willst, kannst du zuerst Inhalte verschieben und danach den Ordner löschen.
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}
