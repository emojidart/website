"use client"

import React, { useEffect, useMemo, useRef, useState } from "react"
import type { User } from "@supabase/supabase-js"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
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
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className={cn("absolute left-1/2 top-1/2 w-[92vw] -translate-x-1/2 -translate-y-1/2", widthClass)}>
        <div className="rounded-2xl bg-white shadow-xl border border-gray-200 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <div className="font-semibold text-gray-900">{title}</div>
            <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="p-4">{children}</div>
          {footer && <div className="px-4 py-3 border-t bg-gray-50">{footer}</div>}
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
        <Button variant="ghost" size="icon" disabled={disabled} className="h-8 w-8">
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-52">
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

        <DropdownMenuItem onClick={onDelete} disabled={disabled} className="text-red-600 focus:text-red-600">
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
    <>
      <Card className="border-gray-200 shadow-sm rounded-xl overflow-hidden">
        <CardHeader className="bg-white border-b">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <CardTitle className="text-lg">Dokumentenablage</CardTitle>
              <CardDescription>
                Vorschau (PDF/Bilder) · Verschieben/Kopieren · Drag&Drop · Grid/Liste · Suche & Sortierung
              </CardDescription>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={docs.listCurrent} disabled={!user || docs.loading}>
                <RefreshCcw className="h-4 w-4 mr-2" />
                Aktualisieren
              </Button>

              <Button variant="outline" onClick={openCreateFolder} disabled={!user || docs.loading}>
                <Plus className="h-4 w-4 mr-2" />
                Neuer Ordner
              </Button>

              <Button onClick={handleUploadClick} disabled={!user || docs.loading}>
                <Upload className="h-4 w-4 mr-2" />
                Upload
              </Button>

              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={(e) => handleUploadFiles(e.target.files)}
              />
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-3">
            <div className="flex items-center gap-2 text-sm text-gray-600 flex-wrap">
              {docs.breadcrumbs.map((c, idx) => (
                <button
                  key={c.path}
                  type="button"
                  onClick={() => docs.goTo(c.path)}
                  className={cn(
                    "rounded-full px-2 py-1 transition hover:bg-gray-100",
                    idx === docs.breadcrumbs.length - 1 ? "font-semibold text-gray-900 bg-gray-100" : "text-gray-600",
                  )}
                >
                  {c.label}
                </button>
              ))}

              {hasParent && (
                <Button variant="ghost" onClick={docs.goUp} disabled={!user || docs.loading} className="ml-auto h-8">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Hoch
                </Button>
              )}
            </div>

            <div className="flex flex-col md:flex-row md:items-center gap-2">
              <div className="relative w-full md:w-[420px]">
                <Search className="h-4 w-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Suchen nach Name oder Typ…"
                  className="pl-9"
                  disabled={!user}
                />
              </div>

              <div className="flex items-center gap-2 md:ml-auto">
                <Button
                  variant={viewMode === "list" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("list")}
                  disabled={!user}
                >
                  <List className="h-4 w-4 mr-2" />
                  Liste
                </Button>
                <Button
                  variant={viewMode === "grid" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("grid")}
                  disabled={!user}
                >
                  <LayoutGrid className="h-4 w-4 mr-2" />
                  Grid
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  disabled={!user}
                  onClick={() => setSortKey((k) => (k === "name" ? "type" : k === "type" ? "size" : "name"))}
                >
                  Sort: {sortKey.toUpperCase()}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!user}
                  onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
                >
                  {sortDir === "asc" ? "↑" : "↓"}
                </Button>
              </div>
            </div>

            <div
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              className={cn(
                "rounded-xl border border-dashed p-4 transition",
                !user ? "bg-gray-50 border-gray-200" : "bg-white border-gray-200",
                dragActive && user ? "border-orange-500 bg-orange-50" : "",
              )}
            >
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                <div className="text-sm">
                  <div className="font-medium text-gray-900">Drag & Drop Upload</div>
                  <div className="text-gray-600">
                    Zieh Dateien hier rein. (Ordner: <span className="font-medium">{docs.currentPath || "Root"}</span>)
                  </div>
                </div>
                <div className="text-xs text-gray-500">Mehrere Dateien gleichzeitig möglich.</div>
              </div>
            </div>

            {docs.message && (
              <div
                className={cn(
                  "rounded-lg border px-3 py-2 text-sm",
                  docs.messageType === "success"
                    ? "border-green-200 bg-green-50 text-green-800"
                    : "border-red-200 bg-red-50 text-red-800",
                )}
              >
                {docs.message}
              </div>
            )}

            {jobs.length > 0 && (
              <div className="rounded-xl border border-gray-200 bg-white p-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium text-gray-900">Uploads</div>
                  <Button variant="ghost" size="sm" onClick={clearFinishedJobs}>
                    Aufräumen
                  </Button>
                </div>
                <div className="mt-2 space-y-2">
                  {jobs.slice(0, 6).map((j) => (
                    <div key={j.id} className="flex items-center gap-3 rounded-lg border border-gray-100 px-3 py-2">
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm text-gray-900">{j.name}</div>
                        <div className="text-xs text-gray-500">{formatBytes(j.size)}</div>
                        {j.status === "error" && <div className="text-xs text-red-600 mt-1">{j.error}</div>}
                      </div>
                      <div className="flex items-center gap-2">
                        {j.status === "queued" && <div className="text-xs text-gray-500">wartet…</div>}
                        {j.status === "uploading" && (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin text-orange-600" />
                            <div className="text-xs text-gray-600">upload…</div>
                          </>
                        )}
                        {j.status === "done" && (
                          <>
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                            <div className="text-xs text-gray-600">fertig</div>
                          </>
                        )}
                        {j.status === "error" && (
                          <>
                            <XCircle className="h-4 w-4 text-red-600" />
                            <div className="text-xs text-gray-600">fehler</div>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                  {jobs.length > 6 && <div className="text-xs text-gray-500">… {jobs.length - 6} weitere</div>}
                </div>
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {!user && <div className="px-4 py-8 text-sm text-gray-600">Bitte einloggen, um Dokumente zu verwalten.</div>}
          {user && docs.loading && <div className="px-4 py-8 text-sm text-gray-600">Lade…</div>}
          {user && !docs.loading && filteredSorted.length === 0 && (
            <div className="px-4 py-8 text-sm text-gray-600">Keine Einträge in diesem Ordner.</div>
          )}

          {user && !docs.loading && filteredSorted.length > 0 && viewMode === "list" && (
            <div className="w-full overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr className="border-b">
                    <th className="text-left font-medium px-4 py-3">Name</th>
                    <th className="text-left font-medium px-4 py-3 hidden md:table-cell">Typ</th>
                    <th className="text-left font-medium px-4 py-3 hidden lg:table-cell">Größe</th>
                    <th className="text-right font-medium px-4 py-3">Aktionen</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSorted.map((item) => (
                    <tr key={item.path} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {item.kind === "folder" ? (
                            <Folder className="h-4 w-4 text-orange-700" />
                          ) : (
                            <FileText className="h-4 w-4 text-gray-700" />
                          )}

                          <button
                            type="button"
                            className={cn(
                              "text-left truncate",
                              item.kind === "folder" ? "font-medium text-gray-900 hover:underline" : "text-gray-900",
                            )}
                            onClick={() => (item.kind === "folder" ? docs.goInto(item.name) : download(item))}
                          >
                            {item.name}
                          </button>
                        </div>
                      </td>

                      <td className="px-4 py-3 hidden md:table-cell">
                        {item.kind === "folder" ? "Ordner" : item.contentType || "Datei"}
                      </td>

                      <td className="px-4 py-3 hidden lg:table-cell">
                        {item.kind === "file" ? formatBytes(item.size) : "–"}
                      </td>

                      <td className="px-4 py-3 text-right">
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
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {user && !docs.loading && filteredSorted.length > 0 && viewMode === "grid" && (
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {filteredSorted.map((item) => (
                <div
                  key={item.path}
                  className="group rounded-xl border border-gray-200 bg-white p-3 shadow-sm hover:shadow-md transition"
                >
                  <div className="flex items-start justify-between gap-2">
                    <button
                      type="button"
                      className="min-w-0 flex-1 text-left"
                      onClick={() => (item.kind === "folder" ? docs.goInto(item.name) : download(item))}
                    >
                      <div className="flex items-center gap-2">
                        {item.kind === "folder" ? (
                          <Folder className="h-5 w-5 text-orange-700" />
                        ) : (
                          <FileText className="h-5 w-5 text-gray-700" />
                        )}
                        <div className="truncate font-medium text-gray-900">{item.name}</div>
                      </div>
                      <div className="mt-1 text-xs text-gray-500">
                        {item.kind === "folder"
                          ? "Ordner"
                          : `${item.contentType || "Datei"} · ${formatBytes(item.size)}`}
                      </div>
                    </button>

                    <div className="opacity-100 md:opacity-0 md:group-hover:opacity-100 transition">
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
        </CardContent>
      </Card>

      {/* ✅ CREATE FOLDER MODAL (NEU, ersetzt window.prompt) */}
      <Modal
        open={createFolderOpen}
        title="Neuen Ordner erstellen"
        onClose={closeCreateFolder}
        widthClass="max-w-xl"
        footer={
          <div className="flex items-center justify-between">
            <div className="text-xs text-gray-500">Wird im aktuellen Ordner erstellt: {docs.currentPath || "Root"}</div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={closeCreateFolder} disabled={createFolderBusy}>
                Abbrechen
              </Button>
              <Button onClick={runCreateFolder} disabled={createFolderBusy || !createFolderName.trim()}>
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
          <div className="text-sm font-medium text-gray-900">Ordnername</div>
          <Input
            value={createFolderName}
            onChange={(e) => setCreateFolderName(e.target.value)}
            placeholder="z.B. Protokolle, Verträge, Sponsoren…"
            disabled={createFolderBusy}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") runCreateFolder()
            }}
          />
          <div className="text-xs text-gray-500">Tipp: Kurze, klare Namen (ohne Sonderzeichen) sind am besten.</div>
        </div>
      </Modal>

      {/* ✅ PREVIEW MODAL */}
      <Modal
        open={previewOpen}
        title={previewItem ? `Vorschau: ${previewItem.name}` : "Vorschau"}
        onClose={() => {
          setPreviewOpen(false)
          setPreviewItem(null)
          setPreviewUrl(null)
          setPreviewLoading(false)
        }}
        footer={
          <div className="flex items-center justify-end gap-2">
            {previewItem?.kind === "file" && (
              <Button variant="outline" onClick={() => previewItem && download(previewItem)} disabled={!previewItem}>
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            )}
            <Button onClick={() => {
              setPreviewOpen(false)
              setPreviewItem(null)
              setPreviewUrl(null)
              setPreviewLoading(false)
            }}>Schließen</Button>
          </div>
        }
        widthClass="max-w-5xl"
      >
        {previewLoading && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Loader2 className="h-4 w-4 animate-spin" />
            Lade Vorschau…
          </div>
        )}

        {!previewLoading && !previewUrl && <div className="text-sm text-gray-600">Keine Vorschau verfügbar.</div>}

        {!previewLoading && previewUrl && previewItem && (
          <>
            {String(previewItem.contentType || "").toLowerCase().includes("pdf") ||
            previewItem.name.toLowerCase().endsWith(".pdf") ? (
              <div className="rounded-xl overflow-hidden border border-gray-200">
                <iframe title="pdf-preview" src={previewUrl} className="w-full h-[70vh]" />
              </div>
            ) : (
              <div className="rounded-xl overflow-hidden border border-gray-200 bg-gray-50">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={previewUrl} alt={previewItem.name} className="max-h-[70vh] w-full object-contain" />
              </div>
            )}
          </>
        )}
      </Modal>

      {/* ✅ MOVE/COPY MODAL */}
      <Modal
        open={actionOpen}
        title={
          actionItem
            ? `${actionMode === "move" ? "Verschieben" : "Kopieren"}: ${actionItem.name}`
            : actionMode === "move"
              ? "Verschieben"
              : "Kopieren"
        }
        onClose={() => {
          setActionOpen(false)
          setActionItem(null)
          setActionBusy(false)
        }}
        footer={
          <div className="flex items-center justify-between">
            <div className="text-xs text-gray-500">Tipp: Zielordner wählen + optional neuen Namen vergeben.</div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => {
                setActionOpen(false)
                setActionItem(null)
                setActionBusy(false)
              }} disabled={actionBusy}>
                Abbrechen
              </Button>
              <Button onClick={async () => {
                if (!actionItem) return
                if (!user) return
                setActionBusy(true)
                try {
                  if (actionMode === "move") {
                    await docs.moveItem(actionItem, targetFolder, targetName)
                  } else {
                    await docs.copyItem(actionItem, targetFolder, targetName)
                  }
                  setActionOpen(false)
                  setActionItem(null)
                } finally {
                  setActionBusy(false)
                }
              }} disabled={actionBusy || !actionItem}>
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
          <div className="text-sm text-gray-600">Kein Element gewählt.</div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-1">
              <div className="text-sm font-medium text-gray-900">Zielordner</div>
              <select
                value={targetFolder}
                onChange={(e) => setTargetFolder(e.target.value)}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-200"
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
              <div className="text-sm font-medium text-gray-900">Name</div>
              <Input
                value={targetName}
                onChange={(e) => setTargetName(e.target.value)}
                placeholder="Neuer Name (optional)"
                disabled={actionBusy}
              />
              <div className="text-xs text-gray-500">Wenn leer: Standardname wird verwendet.</div>
            </div>

            {actionItem.kind === "folder" && (
              <div className="rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-xs text-orange-900">
                Bei Ordnern werden alle Inhalte {actionMode === "move" ? "verschoben" : "kopiert"}.
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* ✅ DELETE CONFIRM MODAL */}
      <Modal
        open={deleteOpen}
        title={deleteItem ? `Löschen: ${deleteItem.name}` : "Löschen"}
        onClose={closeDelete}
        widthClass="max-w-xl"
        footer={
          <div className="flex items-center justify-between">
            <div className="text-xs text-gray-500">Diese Aktion kann nicht rückgängig gemacht werden.</div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={closeDelete} disabled={deleteBusy}>
                Abbrechen
              </Button>
              <Button variant="destructive" onClick={runDelete} disabled={deleteBusy || !deleteItem}>
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
          <div className="text-sm text-gray-600">Kein Element gewählt.</div>
        ) : (
          <div className="space-y-3">
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">
              <div className="font-semibold">Achtung</div>
              <div className="text-red-800">
                {deleteItem.kind === "folder"
                  ? "Du löschst einen Ordner inklusive aller enthaltenen Dateien und Unterordner."
                  : "Du löschst eine Datei dauerhaft."}
              </div>
            </div>

            <div className="text-sm text-gray-700">
              <span className="font-medium">Element:</span> {deleteItem.name}
            </div>

            {deleteItem.kind === "folder" && (
              <div className="text-xs text-gray-500">
                Tipp: Wenn du nur aufräumen willst, kannst du zuerst Inhalte verschieben und danach den Ordner löschen.
              </div>
            )}
          </div>
        )}
      </Modal>
    </>
  )
}
