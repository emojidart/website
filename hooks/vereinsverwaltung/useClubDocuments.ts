"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import type { User } from "@supabase/supabase-js"
import { supabase } from "@/lib/supabase"

export type ClubDocumentKind = "file" | "folder"

export interface ClubDocumentItem {
  kind: ClubDocumentKind
  name: string
  path: string
  // file only
  size?: number
  contentType?: string
  createdAt?: string | null
  updatedAt?: string | null
}

function normalizePath(p: string) {
  return p.replace(/^\/+/, "").replace(/\/+$/, "")
}

function joinPath(...parts: string[]) {
  return normalizePath(parts.filter(Boolean).join("/"))
}

function sanitizeSegment(name: string) {
  return name
    .trim()
    .replace(/[\\?%*:|"<>]/g, "-")
    .replace(/\s+/g, " ")
    .slice(0, 120)
}

async function collectAllPaths(
  bucket: string,
  prefix: string,
): Promise<{ files: string[]; folders: string[] }> {
  const files: string[] = []
  const folders: string[] = []

  const walk = async (p: string) => {
    const { data, error } = await supabase.storage.from(bucket).list(p, {
      limit: 1000,
      sortBy: { column: "name", order: "asc" },
    })
    if (error) throw error

    for (const e of data ?? []) {
      const full = joinPath(p, e.name)
      const isFolder = !e.metadata
      if (isFolder) {
        folders.push(full)
        await walk(full)
      } else {
        files.push(full)
      }
    }
  }

  await walk(prefix)
  return { files, folders }
}

export function useClubDocuments(user: User | null) {
  const bucket = "club-documents"
  const rootPrefix = useMemo(() => (user ? joinPath("clubs", user.id) : ""), [user])

  const [currentPath, setCurrentPath] = useState<string>("") // relative to rootPrefix
  const [items, setItems] = useState<ClubDocumentItem[]>([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [messageType, setMessageType] = useState<"success" | "error" | null>(null)

  const fullPath = useMemo(() => joinPath(rootPrefix, currentPath), [rootPrefix, currentPath])

  const setFlash = useCallback((type: "success" | "error", msg: string) => {
    setMessageType(type)
    setMessage(msg)
    window.setTimeout(() => {
      setMessage(null)
      setMessageType(null)
    }, 4500)
  }, [])

  const listCurrent = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const { data, error } = await supabase.storage.from(bucket).list(fullPath, {
        limit: 1000,
        sortBy: { column: "name", order: "asc" },
      })
      if (error) throw error

      const next: ClubDocumentItem[] = (data ?? [])
        .filter((e) => e.name !== ".keep")
        .map((e) => {
          const isFolder = !e.metadata
          if (isFolder) {
            return {
              kind: "folder" as const,
              name: e.name,
              path: joinPath(currentPath, e.name),
            }
          }
          return {
            kind: "file" as const,
            name: e.name,
            path: joinPath(currentPath, e.name),
            size: e.metadata?.size,
            contentType: e.metadata?.mimetype,
            createdAt: (e as any).created_at ?? null,
            updatedAt: (e as any).updated_at ?? null,
          }
        })
        .sort((a, b) => {
          if (a.kind !== b.kind) return a.kind === "folder" ? -1 : 1
          return a.name.localeCompare(b.name)
        })

      setItems(next)
    } catch (err: any) {
      setFlash("error", err?.message ?? "Fehler beim Laden der Dokumente")
    } finally {
      setLoading(false)
    }
  }, [bucket, currentPath, fullPath, setFlash, user])

  useEffect(() => {
    if (!user) return
    setCurrentPath("")
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  useEffect(() => {
    listCurrent()
  }, [listCurrent])

  const goInto = useCallback((folderName: string) => {
    setCurrentPath((p) => joinPath(p, folderName))
  }, [])

  const goUp = useCallback(() => {
    setCurrentPath((p) => {
      const seg = normalizePath(p).split("/").filter(Boolean)
      seg.pop()
      return seg.join("/")
    })
  }, [])

  const goTo = useCallback((relativePath: string) => {
    setCurrentPath(normalizePath(relativePath))
  }, [])

  const createFolder = useCallback(
    async (folderNameRaw: string) => {
      if (!user) return
      const folderName = sanitizeSegment(folderNameRaw)
      if (!folderName) return
      setLoading(true)
      try {
        const keepPath = joinPath(fullPath, folderName, ".keep")
        const blob = new Blob(["keep"], { type: "text/plain" })
        const { error } = await supabase.storage.from(bucket).upload(keepPath, blob, { upsert: false })
        if (error) throw error
        setFlash("success", `Ordner „${folderName}“ erstellt`)
        await listCurrent()
      } catch (err: any) {
        setFlash("error", err?.message ?? "Ordner konnte nicht erstellt werden")
      } finally {
        setLoading(false)
      }
    },
    [bucket, fullPath, listCurrent, setFlash, user],
  )

  // silent -> kein global loading/flash, ideal für Upload Queue
  const uploadFiles = useCallback(
    async (files: FileList | File[], options?: { upsert?: boolean; silent?: boolean }) => {
      if (!user) return
      const list = Array.from(files)
      if (list.length === 0) return

      if (!options?.silent) setLoading(true)
      try {
        for (const f of list) {
          const clean = sanitizeSegment(f.name)
          const dest = joinPath(fullPath, clean)
          const { error } = await supabase.storage
            .from(bucket)
            .upload(dest, f, { upsert: options?.upsert ?? true, contentType: f.type || undefined })
          if (error) throw error
        }
        if (!options?.silent) setFlash("success", `Upload fertig (${list.length})`)
        await listCurrent()
      } catch (err: any) {
        if (!options?.silent) setFlash("error", err?.message ?? "Upload fehlgeschlagen")
        throw err
      } finally {
        if (!options?.silent) setLoading(false)
      }
    },
    [bucket, fullPath, listCurrent, setFlash, user],
  )

  const deleteItem = useCallback(
    async (item: ClubDocumentItem) => {
      if (!user) return
      setLoading(true)
      try {
        const full = joinPath(rootPrefix, item.path)
        if (item.kind === "file") {
          const { error } = await supabase.storage.from(bucket).remove([full])
          if (error) throw error
        } else {
          const { files, folders } = await collectAllPaths(bucket, full)
          const all = [...files]
          for (const folder of [full, ...folders]) {
            all.push(joinPath(folder, ".keep"))
          }
          const unique = Array.from(new Set(all))
          if (unique.length > 0) {
            const { error } = await supabase.storage.from(bucket).remove(unique)
            if (error) throw error
          }
        }
        setFlash("success", `Gelöscht: ${item.name}`)
        await listCurrent()
      } catch (err: any) {
        setFlash("error", err?.message ?? "Löschen fehlgeschlagen")
      } finally {
        setLoading(false)
      }
    },
    [bucket, listCurrent, rootPrefix, setFlash, user],
  )

  const renameItem = useCallback(
    async (item: ClubDocumentItem, newNameRaw: string) => {
      if (!user) return
      const newName = sanitizeSegment(newNameRaw)
      if (!newName || newName === item.name) return

      setLoading(true)
      try {
        const fromFull = joinPath(rootPrefix, item.path)

        if (item.kind === "file") {
          const toRel = joinPath(currentPath, newName)
          const toFull = joinPath(rootPrefix, toRel)
          const { error } = await supabase.storage.from(bucket).move(fromFull, toFull)
          if (error) throw error
        } else {
          const fromFolder = fromFull
          const toFolder = joinPath(rootPrefix, joinPath(currentPath, newName))
          const { files, folders } = await collectAllPaths(bucket, fromFolder)

          const allFiles = [joinPath(fromFolder, ".keep"), ...files]
          for (const folder of folders) allFiles.push(joinPath(folder, ".keep"))
          const unique = Array.from(new Set(allFiles))

          for (const oldPath of unique) {
            const suffix = oldPath.startsWith(fromFolder) ? oldPath.slice(fromFolder.length).replace(/^\//, "") : oldPath
            const newPath = joinPath(toFolder, suffix)
            const { error } = await supabase.storage.from(bucket).move(oldPath, newPath)
            if (error) {
              if (String(error.message || "").toLowerCase().includes("not found")) continue
              throw error
            }
          }
        }

        setFlash("success", `Umbenannt: ${item.name} → ${newName}`)
        await listCurrent()
      } catch (err: any) {
        setFlash("error", err?.message ?? "Umbenennen fehlgeschlagen")
      } finally {
        setLoading(false)
      }
    },
    [bucket, currentPath, listCurrent, rootPrefix, setFlash, user],
  )

  const getSignedUrl = useCallback(
    async (item: ClubDocumentItem, expiresInSeconds = 60) => {
      if (!user) return null
      if (item.kind !== "file") return null
      const full = joinPath(rootPrefix, item.path)
      const { data, error } = await supabase.storage.from(bucket).createSignedUrl(full, expiresInSeconds)
      if (error) throw error
      return data?.signedUrl ?? null
    },
    [bucket, rootPrefix, user],
  )

  // ✅ NEU: alle Ordner (relativ) für Move/Copy Dialog
  const listFolders = useCallback(async () => {
    if (!user) return [] as { label: string; path: string }[]
    try {
      const rootFull = rootPrefix
      const { folders } = await collectAllPaths(bucket, rootFull)

      // folders sind full paths (inkl. rootPrefix). Wir machen relative daraus:
      const rel = folders
        .map((f) => {
          const trimmed = f.startsWith(rootPrefix) ? f.slice(rootPrefix.length).replace(/^\//, "") : f
          return normalizePath(trimmed)
        })
        .filter(Boolean)

      const unique = Array.from(new Set(rel)).sort((a, b) => a.localeCompare(b))

      // Root + alle Unterordner
      return [
        { label: "Dokumente (Root)", path: "" },
        ...unique.map((p) => ({ label: p.split("/").join(" / "), path: p })),
      ]
    } catch {
      return [{ label: "Dokumente (Root)", path: "" }]
    }
  }, [bucket, rootPrefix, user])

  // ✅ NEU: Move (file/folder)
  const moveItem = useCallback(
    async (item: ClubDocumentItem, targetFolderRel: string, newNameRaw?: string) => {
      if (!user) return
      const newName = newNameRaw ? sanitizeSegment(newNameRaw) : item.name
      if (!newName) return

      setLoading(true)
      try {
        const fromFull = joinPath(rootPrefix, item.path)
        const targetRelPath = joinPath(targetFolderRel, newName)
        const toFull = joinPath(rootPrefix, targetRelPath)

        if (item.kind === "file") {
          const { error } = await supabase.storage.from(bucket).move(fromFull, toFull)
          if (error) throw error
        } else {
          // folder: move all contained objects
          const fromFolder = fromFull
          const toFolder = toFull
          const { files, folders } = await collectAllPaths(bucket, fromFolder)

          const allFiles = [joinPath(fromFolder, ".keep"), ...files]
          for (const folder of folders) allFiles.push(joinPath(folder, ".keep"))
          const unique = Array.from(new Set(allFiles))

          for (const oldPath of unique) {
            const suffix = oldPath.startsWith(fromFolder) ? oldPath.slice(fromFolder.length).replace(/^\//, "") : oldPath
            const newPath = joinPath(toFolder, suffix)
            const { error } = await supabase.storage.from(bucket).move(oldPath, newPath)
            if (error) {
              if (String(error.message || "").toLowerCase().includes("not found")) continue
              throw error
            }
          }
        }

        setFlash("success", `Verschoben: ${item.name}`)
        await listCurrent()
      } catch (err: any) {
        setFlash("error", err?.message ?? "Verschieben fehlgeschlagen")
      } finally {
        setLoading(false)
      }
    },
    [bucket, listCurrent, rootPrefix, setFlash, user],
  )

  // ✅ NEU: Copy (file/folder) via download -> upload
  const copyItem = useCallback(
    async (item: ClubDocumentItem, targetFolderRel: string, newNameRaw?: string) => {
      if (!user) return
      const newName = newNameRaw ? sanitizeSegment(newNameRaw) : item.name
      if (!newName) return

      setLoading(true)
      try {
        const fromFull = joinPath(rootPrefix, item.path)
        const targetRelPath = joinPath(targetFolderRel, newName)
        const toFull = joinPath(rootPrefix, targetRelPath)

        if (item.kind === "file") {
          const { data, error } = await supabase.storage.from(bucket).download(fromFull)
          if (error) throw error
          const blob = data
          const { error: upErr } = await supabase.storage.from(bucket).upload(toFull, blob, { upsert: true })
          if (upErr) throw upErr
        } else {
          // copy folder recursively
          const fromFolder = fromFull
          const toFolder = toFull
          const { files, folders } = await collectAllPaths(bucket, fromFolder)

          // create destination folder placeholder
          const keepDest = joinPath(toFolder, ".keep")
          await supabase.storage.from(bucket).upload(keepDest, new Blob(["keep"], { type: "text/plain" }), {
            upsert: true,
          })

          // ensure all subfolders have keep
          for (const folder of folders) {
            const suffixFolder = folder.startsWith(fromFolder) ? folder.slice(fromFolder.length).replace(/^\//, "") : ""
            const destFolder = joinPath(toFolder, suffixFolder)
            const keep = joinPath(destFolder, ".keep")
            await supabase.storage.from(bucket).upload(keep, new Blob(["keep"], { type: "text/plain" }), { upsert: true })
          }

          // copy files
          for (const f of files) {
            const suffix = f.startsWith(fromFolder) ? f.slice(fromFolder.length).replace(/^\//, "") : f
            const dest = joinPath(toFolder, suffix)
            const { data, error } = await supabase.storage.from(bucket).download(f)
            if (error) throw error
            const { error: upErr } = await supabase.storage.from(bucket).upload(dest, data, { upsert: true })
            if (upErr) throw upErr
          }
        }

        setFlash("success", `Kopiert: ${item.name}`)
        await listCurrent()
      } catch (err: any) {
        setFlash("error", err?.message ?? "Kopieren fehlgeschlagen")
      } finally {
        setLoading(false)
      }
    },
    [bucket, listCurrent, rootPrefix, setFlash, user],
  )

  const breadcrumbs = useMemo(() => {
    const seg = normalizePath(currentPath).split("/").filter(Boolean)
    const crumbs = [{ label: "Dokumente", path: "" }]
    let acc = ""
    for (const s of seg) {
      acc = joinPath(acc, s)
      crumbs.push({ label: s, path: acc })
    }
    return crumbs
  }, [currentPath])

  return {
    bucket,
    rootPrefix,
    currentPath,
    fullPath,
    breadcrumbs,
    items,
    loading,
    message,
    messageType,
    goInto,
    goUp,
    goTo,
    listCurrent,
    createFolder,
    uploadFiles,
    deleteItem,
    renameItem,
    getSignedUrl,

    // ✅ neu
    listFolders,
    moveItem,
    copyItem,
  }
}
