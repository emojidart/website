"use client"

import type React from "react"

import { useEffect, useMemo, useRef, useState } from "react"
import type { User } from "@supabase/supabase-js"
import Image from "next/image"
import { supabase } from "@/lib/supabase"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Search,
  Database,
  Loader2,
  Plus,
  Pencil,
  Save,
  X,
  RefreshCw,
  Trash2,
  AlertTriangle,
  Upload,
  Users,
  Building2,
  Check,
  Shield,
  UserRound,
  ImageIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"

type SpielerdatenbankEntry = {
  id?: string
  name: string
  verein: string | null
  ligastatus: string | null
  geschlecht: string | null
  profile_picture_url: string | null
  sportdarts_player_number: string | null
  sportdarts_name: string | null
  tts_pronunciation?: string | null
  created_at?: string
}

interface AdminSpieldatenbankManagementProps {
  user: User | null
}

const EMPTY_FORM: SpielerdatenbankEntry = {
  name: "",
  verein: null,
  ligastatus: null,
  geschlecht: null,
  profile_picture_url: null,
  sportdarts_player_number: null,
  sportdarts_name: null,
  tts_pronunciation: null,
}

const LIGASTATUS_OPTIONS = [
  "A",
  "B",
  "R",
  "C1",
  "C2",
  "C3",
  "C4",
  "NC",
  "NC1",
  "NC2",
  "NC3",
  "NC 1",
  "NC 2",
  "Lungau",
  "Steeldart 1",
  "Steeldart 2",
  "Steeldart 3",
  "Steeldart 4",
  "Steeldart 5",
]

const GESCHLECHT_OPTIONS = [
  { value: "m", label: "Männlich" },
  { value: "w", label: "Weiblich" },
  { value: "d", label: "Divers" },
]


const normalizePlayerName = (value: string) =>
  value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("de")
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .replace(/\s+/g, " ")
    .trim()

const matchesPlayerSearch = (value: string, search: string) => {
  const haystack = normalizePlayerName(value)
  const needle = normalizePlayerName(search)

  if (!needle) return true

  return needle
    .split(" ")
    .filter(Boolean)
    .every((part) => haystack.includes(part))
}

const levenshteinDistance = (a: string, b: string) => {
  const left = normalizePlayerName(a)
  const right = normalizePlayerName(b)

  if (!left) return right.length
  if (!right) return left.length

  const prev = Array.from({ length: right.length + 1 }, (_, i) => i)
  const curr = new Array<number>(right.length + 1)

  for (let i = 1; i <= left.length; i++) {
    curr[0] = i
    for (let j = 1; j <= right.length; j++) {
      const cost = left[i - 1] === right[j - 1] ? 0 : 1
      curr[j] = Math.min(
        curr[j - 1] + 1,
        prev[j] + 1,
        prev[j - 1] + cost,
      )
    }
    for (let j = 0; j <= right.length; j++) prev[j] = curr[j]
  }

  return prev[right.length]
}

const isSimilarPlayerName = (a: string, b: string) => {
  const left = normalizePlayerName(a)
  const right = normalizePlayerName(b)

  if (!left || !right || left === right) return false
  if (left.includes(right) || right.includes(left)) return true

  const longest = Math.max(left.length, right.length)
  const distance = levenshteinDistance(left, right)
  const allowedDistance = longest <= 8 ? 1 : longest <= 16 ? 2 : 3

  return distance <= allowedDistance
}


const splitStoredName = (value: string | null | undefined) => {
  const clean = String(value || "").replace(/\s+/g, " ").trim()
  if (!clean) return { firstName: "", lastName: "" }

  const parts = clean.split(" ")
  if (parts.length === 1) return { firstName: parts[0], lastName: "" }

  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" "),
  }
}

const buildStoredName = (firstName: string, lastName: string) =>
  `${firstName.trim()} ${lastName.trim()}`.replace(/\s+/g, " ").trim()

export function AdminSpieldatenbankManagement({ user }: AdminSpieldatenbankManagementProps) {
  const [players, setPlayers] = useState<SpielerdatenbankEntry[]>([])

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [testingPronunciation, setTestingPronunciation] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [uploadingImage, setUploadingImage] = useState(false)

  const [search, setSearch] = useState("")
  const [selectedVerein, setSelectedVerein] = useState("all")
  const [selectedLiga, setSelectedLiga] = useState("all")
  const [selectedGeschlecht, setSelectedGeschlecht] = useState("all")
  const [activeSection, setActiveSection] = useState<"players" | "form">("players")

  const [isEditing, setIsEditing] = useState(false)
  const [form, setForm] = useState<SpielerdatenbankEntry>(EMPTY_FORM)
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [message, setMessage] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null)

  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [playerToDelete, setPlayerToDelete] = useState<SpielerdatenbankEntry | null>(null)
  const [deleteCheckLoading, setDeleteCheckLoading] = useState(false)
  const [deleteCheckError, setDeleteCheckError] = useState("")
  const [deleteGuard, setDeleteGuard] = useState<{
    can_delete: boolean
    total_references: number
    dependencies: Array<{ source: string; label: string; count: number; kind: string }>
  } | null>(null)

  const [sportdartsSyncOpen, setSportdartsSyncOpen] = useState(false)
  const [sportdartsSyncLoading, setSportdartsSyncLoading] = useState(false)
  const [sportdartsSyncApplying, setSportdartsSyncApplying] = useState(false)
  const [sportdartsSyncResult, setSportdartsSyncResult] = useState<any | null>(null)
  const [sportdartsSyncError, setSportdartsSyncError] = useState("")
  const [sportdartsConfirmingKey, setSportdartsConfirmingKey] = useState<string | null>(null)
  const [sportdartsCheckedAt, setSportdartsCheckedAt] = useState<number | null>(null)
  const [newPlayerGateOpen, setNewPlayerGateOpen] = useState(false)
  const [newPlayerSearch, setNewPlayerSearch] = useState("")

  useEffect(() => {
    if (user) {
      void loadData()
    }
  }, [user?.id])

  const loadData = async () => {
    try {
      setLoading(true)
      setMessage(null)

      const { data, error } = await supabase.from("spieldatenbank").select("*").order("name", { ascending: true })

      if (error) throw error

      setPlayers((data || []) as SpielerdatenbankEntry[])
    } catch (error: any) {
      console.error("loadData error", error)
      setMessage({
        type: "error",
        text: error?.message || "Spielerdatenbank konnte nicht geladen werden.",
      })
    } finally {
      setLoading(false)
    }
  }

  const uniqueVereine = useMemo(() => {
    return Array.from(new Set(players.map((p) => p.verein).filter(Boolean) as string[])).sort((a, b) =>
      a.localeCompare(b, "de"),
    )
  }, [players])

  const filteredPlayers = useMemo(() => {
    const q = search.trim().toLowerCase()

    return players.filter((player) => {
      const matchesSearch =
        !q ||
        player.name.toLowerCase().includes(q) ||
        (player.verein || "").toLowerCase().includes(q) ||
        (player.ligastatus || "").toLowerCase().includes(q) ||
        (player.geschlecht || "").toLowerCase().includes(q) ||
        (player.sportdarts_player_number || "").toLowerCase().includes(q) ||
        (player.sportdarts_name || "").toLowerCase().includes(q)

      const matchesVerein = selectedVerein === "all" || player.verein === selectedVerein
      const matchesLiga = selectedLiga === "all" || player.ligastatus === selectedLiga
      const matchesGeschlecht = selectedGeschlecht === "all" || player.geschlecht === selectedGeschlecht

      return matchesSearch && matchesVerein && matchesLiga && matchesGeschlecht
    })
  }, [players, search, selectedVerein, selectedLiga, selectedGeschlecht])


  const duplicateCandidates = useMemo(() => {
    const name = form.name.trim()
    if (name.length < 3) return []

    const normalized = normalizePlayerName(name)

    return players
      .filter((player) => !isEditing || player.id !== form.id)
      .map((player) => {
        const exact = normalizePlayerName(player.name) === normalized
        const similar = !exact && isSimilarPlayerName(player.name, name)

        return { player, exact, similar }
      })
      .filter((entry) => entry.exact || entry.similar)
      .sort((a, b) => Number(b.exact) - Number(a.exact))
      .slice(0, 5)
  }, [players, form.name, form.id, isEditing])

  const exactDuplicate = duplicateCandidates.find((entry) => entry.exact)?.player || null
  const similarDuplicates = duplicateCandidates.filter((entry) => entry.similar).map((entry) => entry.player)

  const filtersActive =
    !!search.trim() ||
    selectedVerein !== "all" ||
    selectedLiga !== "all" ||
    selectedGeschlecht !== "all"

  const resetFilters = () => {
    setSearch("")
    setSelectedVerein("all")
    setSelectedLiga("all")
    setSelectedGeschlecht("all")
  }

  const resetForm = () => {
    setIsEditing(false)
    setForm(EMPTY_FORM)
    setFirstName("")
    setLastName("")
    setImagePreview(null)
    setSelectedFile(null)
    setMessage(null)

    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const startCreate = () => {
    setActiveSection("form")
    setMessage(null)
    setIsEditing(false)
    setForm(EMPTY_FORM)
    setFirstName("")
    setLastName("")
    setImagePreview(null)
    setSelectedFile(null)

    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const startEdit = (player: SpielerdatenbankEntry) => {
    setActiveSection("form")
    setMessage(null)
    setIsEditing(true)
    setForm({
      id: player.id,
      name: player.name,
      verein: player.verein,
      ligastatus: player.ligastatus,
      geschlecht: player.geschlecht,
      profile_picture_url: player.profile_picture_url,
      sportdarts_player_number: player.sportdarts_player_number,
      sportdarts_name: player.sportdarts_name,
      tts_pronunciation: player.tts_pronunciation ?? null,
      created_at: player.created_at,
    })
    const parsedName = splitStoredName(player.name)
    setFirstName(parsedName.firstName)
    setLastName(parsedName.lastName)
    setImagePreview(player.profile_picture_url || null)
    setSelectedFile(null)

    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const loadDeleteGuard = async (player: SpielerdatenbankEntry) => {
    if (!player.id) return null

    try {
      setDeleteCheckLoading(true)
      setDeleteCheckError("")
      setDeleteGuard(null)

      const { data, error } = await supabase.rpc("spieldatenbank_delete_guard", {
        p_player_id: player.id,
      })

      if (error) throw error

      const result = data as {
        can_delete: boolean
        total_references: number
        dependencies: Array<{ source: string; label: string; count: number; kind: string }>
      }

      setDeleteGuard(result)
      return result
    } catch (error: any) {
      console.error("delete guard error", error)
      setDeleteCheckError(
        error?.code === "PGRST202"
          ? "Die Löschschutz-Funktion fehlt noch. Bitte zuerst die SQL-Migration ausführen."
          : error?.message || "Verknüpfungen konnten nicht geprüft werden.",
      )
      return null
    } finally {
      setDeleteCheckLoading(false)
    }
  }

  const openDeleteModal = async (player: SpielerdatenbankEntry) => {
    setPlayerToDelete(player)
    setDeleteGuard(null)
    setDeleteCheckError("")
    setDeleteModalOpen(true)
    await loadDeleteGuard(player)
  }

  const closeDeleteModal = () => {
    if (deletingId) return
    setDeleteModalOpen(false)
    setPlayerToDelete(null)
    setDeleteGuard(null)
    setDeleteCheckError("")
  }

  const syncCombinedName = (nextFirstName: string, nextLastName: string) => {
    const combined = buildStoredName(nextFirstName, nextLastName)
    setForm((prev) => ({ ...prev, name: combined }))
  }

  const handleFirstNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setFirstName(value)
    syncCombinedName(value, lastName)
  }

  const handleLastNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setLastName(value)
    syncCombinedName(firstName, value)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setForm((prev) => ({
      ...prev,
      [name]: value.trim() === "" ? null : value,
    }))
  }

  const handleSelectChange = (name: keyof SpielerdatenbankEntry, value: string) => {
    setForm((prev) => ({
      ...prev,
      [name]: value === "none" ? null : value,
    }))
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith("image/")) {
      setMessage({ type: "error", text: "Bitte wählen Sie eine Bilddatei aus." })
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setMessage({ type: "error", text: "Die Datei ist zu groß. Maximale Größe: 5MB." })
      return
    }

    setSelectedFile(file)

    const reader = new FileReader()
    reader.onloadend = () => {
      setImagePreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleRemoveImage = () => {
    setSelectedFile(null)
    setImagePreview(null)
    setForm((prev) => ({ ...prev, profile_picture_url: null }))

    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const uploadImage = async (file: File): Promise<string | null> => {
    const fileExt = file.name.split(".").pop()
    const fileName = `${Math.random().toString(36).slice(2)}-${Date.now()}.${fileExt}`
    const filePath = fileName

    const { error: uploadError } = await supabase.storage.from("profile_picture_url").upload(filePath, file, {
      cacheControl: "3600",
      upsert: false,
    })

    if (uploadError) throw uploadError

    const {
      data: { publicUrl },
    } = supabase.storage.from("profile_picture_url").getPublicUrl(filePath)

    return publicUrl
  }

  // Test erzeugt nur Ton, speichert nichts und verändert keine Spielerzuordnung.
  const testMartinPronunciation = async () => {
    const spokenName = (form.tts_pronunciation || buildStoredName(firstName, lastName)).trim()
    if (!spokenName || testingPronunciation) return
    setTestingPronunciation(true)
    try {
      const response = await fetch("http://127.0.0.1:8765/speak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ player1: spokenName, player2: "Testspieler", machine: 1, call: 1, speed: 1 }),
      })
      if (!response.ok) throw new Error(`Martin antwortet mit HTTP ${response.status}`)
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const audio = new Audio(url)
      audio.onended = () => URL.revokeObjectURL(url)
      audio.onerror = () => URL.revokeObjectURL(url)
      await audio.play()
    } catch (error) {
      setMessage({ type: "error", text: "Martin-Test fehlgeschlagen. Läuft Martin auf diesem PC?" })
      console.warn("Martin Aussprachetest:", error)
    } finally {
      setTestingPronunciation(false)
    }
  }

  const handleSave = async () => {
    try {
      setMessage(null)

      if (!user) {
        setMessage({ type: "error", text: "Nicht eingeloggt." })
        return
      }

      if (!firstName.trim()) {
        setMessage({ type: "error", text: "Bitte einen Vornamen eingeben." })
        return
      }

      if (!lastName.trim()) {
        setMessage({ type: "error", text: "Bitte einen Nachnamen eingeben." })
        return
      }

      if (!form.geschlecht) {
        setMessage({ type: "error", text: "Bitte ein Geschlecht auswählen." })
        return
      }

      const combinedName = buildStoredName(firstName, lastName)

      if (exactDuplicate) {
        setMessage({
          type: "error",
          text: `Dieser Spieler ist bereits vorhanden: ${exactDuplicate.name}${exactDuplicate.verein ? ` · ${exactDuplicate.verein}` : ""}.`,
        })
        return
      }

      setSaving(true)

      let profilePictureUrl = form.profile_picture_url

      if (selectedFile) {
        setUploadingImage(true)
        profilePictureUrl = await uploadImage(selectedFile)
      }

      const payload = {
        name: combinedName,
        verein: form.verein?.trim() || null,
        ligastatus: form.ligastatus || null,
        geschlecht: form.geschlecht || null,
        profile_picture_url: profilePictureUrl || null,
        sportdarts_player_number: form.sportdarts_player_number?.trim() || null,
        sportdarts_name: form.sportdarts_name?.trim() || null,
        tts_pronunciation: form.tts_pronunciation?.trim() || null,
      }

      if (isEditing && form.id) {
        const { error } = await supabase.from("spieldatenbank").update(payload).eq("id", form.id)
        if (error) throw error
        setMessage({ type: "success", text: "Spieler wurde gespeichert." })
      } else {
        const { error } = await supabase.from("spieldatenbank").insert(payload)
        if (error) throw error
        setMessage({ type: "success", text: "Spieler wurde angelegt." })
      }

      await loadData()
      resetForm()
      setActiveSection("players")
    } catch (error: any) {
      console.error("handleSave error", error)
      setMessage({
        type: "error",
        text: error?.message || "Spieler konnte nicht gespeichert werden.",
      })
    } finally {
      setSaving(false)
      setUploadingImage(false)
    }
  }

  const handleDelete = async () => {
    if (!playerToDelete?.id) return

    try {
      setDeletingId(playerToDelete.id)
      setMessage(null)
      setDeleteCheckError("")

      const { data: guardData, error: guardError } = await supabase.rpc("spieldatenbank_delete_guard", {
        p_player_id: playerToDelete.id,
      })

      if (guardError) throw guardError

      const latestGuard = guardData as {
        can_delete: boolean
        total_references: number
        dependencies: Array<{ source: string; label: string; count: number; kind: string }>
      }

      setDeleteGuard(latestGuard)

      if (!latestGuard?.can_delete) {
        setDeleteCheckError("Löschen blockiert: Der Spieler wird noch in anderen Bereichen verwendet.")
        return
      }

      const { error } = await supabase.from("spieldatenbank").delete().eq("id", playerToDelete.id)
      if (error) throw error

      if (form.id === playerToDelete.id) {
        resetForm()
      }

      setDeleteModalOpen(false)
      setPlayerToDelete(null)
      setDeleteGuard(null)
      setDeleteCheckError("")
      setMessage({ type: "success", text: "Spieler wurde gelöscht." })

      await loadData()
    } catch (error: any) {
      console.error("handleDelete error", error)
      setDeleteCheckError(error?.message || "Spieler konnte nicht gelöscht werden.")
    } finally {
      setDeletingId(null)
    }
  }

  const requestSportdartsSync = async (mode: "preview" | "apply") => {
    const isApply = mode === "apply"

    try {
      if (isApply) {
        setSportdartsSyncApplying(true)
      } else {
        setSportdartsSyncLoading(true)
        setSportdartsSyncOpen(true)
      }

      setSportdartsSyncError("")

      const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
      if (sessionError) throw sessionError

      const token = sessionData.session?.access_token
      if (!token) throw new Error("Bitte erneut einloggen.")

      const response = await fetch("/api/admin/spieldatenbank/sportdarts-sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ mode }),
        cache: "no-store",
      })

      const result = await response.json()
      if (!response.ok) {
        throw new Error(result?.error || "SportDarts-Synchronisierung fehlgeschlagen.")
      }

      setSportdartsSyncResult(result)

      if (!isApply) {
        setSportdartsCheckedAt(Date.now())
      }

      if (isApply) {
        await loadData()
      }
    } catch (error: any) {
      console.error("SportDarts spieldatenbank sync failed:", error)
      setSportdartsSyncError(error?.message || "SportDarts-Synchronisierung fehlgeschlagen.")
    } finally {
      setSportdartsSyncLoading(false)
      setSportdartsSyncApplying(false)
    }
  }

  const confirmSportdartsSuggestion = async (
    localPlayerId: string,
    playerNumber: string,
    sportdartsName: string,
  ) => {
    const key = `${localPlayerId}:${playerNumber}`

    try {
      setSportdartsConfirmingKey(key)
      setSportdartsSyncError("")

      const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
      if (sessionError) throw sessionError

      const token = sessionData.session?.access_token
      if (!token) throw new Error("Bitte erneut einloggen.")

      const response = await fetch("/api/admin/spieldatenbank/sportdarts-sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          mode: "confirm",
          localPlayerId,
          playerNumber,
          sportdartsName,
        }),
        cache: "no-store",
      })

      const result = await response.json()
      if (!response.ok) {
        throw new Error(result?.error || "SportDarts-Zuordnung konnte nicht bestätigt werden.")
      }

      await loadData()
      await requestSportdartsSync("preview")
    } catch (error: any) {
      console.error("confirm SportDarts suggestion failed:", error)
      setSportdartsSyncError(error?.message || "SportDarts-Zuordnung konnte nicht bestätigt werden.")
    } finally {
      setSportdartsConfirmingKey(null)
    }
  }

  const openNewPlayerGate = async () => {
    setNewPlayerGateOpen(true)
    setNewPlayerSearch("")

    // Vor jedem neuen Spieler muss SportDarts frisch geprüft werden.
    await requestSportdartsSync("preview")
  }

  const continueManualCreate = () => {
    setNewPlayerGateOpen(false)
    startCreate()
  }

  const importSportdartsPlayerToForm = (candidate: any) => {
    const rawName = String(candidate?.name || "").trim()
    const parts = rawName.split(/\s+/).filter(Boolean)
    const first = parts.shift() || ""
    const last = parts.join(" ")

    const candidateTeams = Array.isArray(candidate?.teams)
      ? candidate.teams.map((value: any) => String(value || "").trim()).filter(Boolean)
      : candidate?.team
        ? [String(candidate.team).trim()]
        : []

    const candidateLigaStatuses = Array.isArray(candidate?.ligastatus)
      ? candidate.ligastatus.map((value: any) => String(value || "").trim()).filter(Boolean)
      : candidate?.ligastatus
        ? [String(candidate.ligastatus).trim()]
        : []

    const candidateVerein = candidateTeams[0] || ""
    const candidateLigaStatus = candidateLigaStatuses[0] || ""

    resetForm()
    setFirstName(first)
    setLastName(last)
    setForm((prev) => ({
      ...prev,
      name: rawName,
      verein: candidateVerein || null,
      ligastatus: candidateLigaStatus || null,
      geschlecht: null,
      sportdarts_player_number: String(candidate?.number || "").trim() || null,
      sportdarts_name: rawName || null,
    }))

    // Nach "Übernehmen" alle SportDarts-Dialoge schließen und direkt ins Formular.
    setNewPlayerGateOpen(false)
    setSportdartsSyncOpen(false)
    setActiveSection("form")

    // Auf mobilen Geräten/kleinen Viewports direkt zum Formularanfang springen.
    window.setTimeout(() => {
      document.getElementById("spieldatenbank-player-form")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      })
    }, 80)
  }

  const totalPlayers = players.length
  const withClub = players.filter((p) => !!p.verein).length
  const withPhoto = players.filter((p) => !!p.profile_picture_url).length
  const withLiga = players.filter((p) => !!p.ligastatus).length

  return (
    <div className="emd-admin-page min-w-0 max-w-full overflow-x-hidden">
      <div className="emd-admin-content w-full min-w-0 max-w-full overflow-x-hidden">
        <div className="mb-4 pt-2 sm:pt-3">
          <div className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.18em] text-orange-200/45">
                Admin · Datenbank
              </div>
              <h1 className="mt-1 text-2xl font-black tracking-[-0.025em] text-white sm:text-[30px]">
                Spielerdatenbank
              </h1>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-white/38">
                Spieler verwalten, Daten pflegen und neue Einträge anlegen.
              </p>
            </div>

            <div className="grid w-full min-w-0 grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap sm:items-center">
              <div className="emd-admin-stat text-right">
                <div className="text-[9px] font-black uppercase tracking-[0.14em] text-white/25">Spieler</div>
                <div className="mt-0.5 text-sm font-black text-white">{totalPlayers}</div>
              </div>
              <div className="emd-admin-stat text-right">
                <div className="text-[9px] font-black uppercase tracking-[0.14em] text-white/25">Vereine</div>
                <div className="mt-0.5 text-sm font-black text-white">{uniqueVereine.length}</div>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => void requestSportdartsSync("preview")}
                disabled={sportdartsSyncLoading || sportdartsSyncApplying}
                className="emd-admin-button-secondary col-span-2 w-full sm:col-span-1 sm:w-auto"
              >
                {sportdartsSyncLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                SportDarts Sync
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={() => void loadData()}
                disabled={loading}
                className="emd-admin-button-secondary col-span-2 w-full sm:col-span-1 sm:w-auto"
              >
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                Neu laden
              </Button>
            </div>
          </div>
        </div>

        <div className="sticky top-0 z-20 mb-5 py-2">
          <div className="grid min-w-0 grid-cols-2 gap-2 sm:flex sm:overflow-x-auto sm:pb-0.5 sm:[scrollbar-width:none] sm:[&::-webkit-scrollbar]:hidden">
            <button
              type="button"
              onClick={() => setActiveSection("players")}
              className={cn(
                "emd-admin-tab min-w-0 w-full justify-center overflow-hidden px-2 sm:w-auto sm:px-3.5",
                activeSection === "players" ? "emd-admin-tab-active" : "emd-admin-tab-idle",
              )}
            >
              <Users className="h-4 w-4" />
              <span className="whitespace-nowrap">Spieler</span>
              <span className="ml-1 rounded-full bg-white/[0.05] px-2 py-0.5 text-[10px] font-black text-white/55">
                {filteredPlayers.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => void openNewPlayerGate()}
              className={cn(
                "emd-admin-tab min-w-0 w-full justify-center overflow-hidden px-2 sm:w-auto sm:px-3.5",
                activeSection === "form" ? "emd-admin-tab-active" : "emd-admin-tab-idle",
              )}
            >
              <Plus className="h-4 w-4" />
              <span className="min-w-0 truncate">{isEditing ? "Spieler bearbeiten" : "Neuer Spieler"}</span>
            </button>
          </div>
        </div>

        <div className="grid w-full min-w-0 grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
          <Card className="emd-admin-card min-w-0 overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-[0.12em] text-white/35">Spieler gesamt</div>
                  <div className="mt-1 text-2xl font-black text-white">{totalPlayers}</div>
                </div>
                <Users className="h-5 w-5 text-orange-300/70" />
              </div>
            </CardContent>
          </Card>

          <Card className="emd-admin-card min-w-0 overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-[0.12em] text-white/35">Mit Verein</div>
                  <div className="mt-1 text-2xl font-black text-white">{withClub}</div>
                </div>
                <Building2 className="h-5 w-5 text-cyan-300/70" />
              </div>
            </CardContent>
          </Card>

          <Card className="emd-admin-card min-w-0 overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-[0.12em] text-white/35">Mit Bild</div>
                  <div className="mt-1 text-2xl font-black text-white">{withPhoto}</div>
                </div>
                <ImageIcon className="h-5 w-5 text-emerald-300/70" />
              </div>
            </CardContent>
          </Card>

          <Card className="emd-admin-card min-w-0 overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-[0.12em] text-white/35">Mit Ligastatus</div>
                  <div className="mt-1 text-2xl font-black text-white">{withLiga}</div>
                </div>
                <Shield className="h-5 w-5 text-violet-300/70" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-6 w-full min-w-0 max-w-full overflow-x-hidden">
          {activeSection === "form" ? (
            <div id="spieldatenbank-player-form" className="w-full min-w-0 max-w-full">
                      <Card className="emd-admin-surface w-full min-w-0 max-w-full overflow-hidden">
                        <CardHeader className="space-y-1.5 border-b border-white/[0.06] px-4 py-4 sm:px-6 sm:py-5">
                          <CardTitle className="text-lg font-black text-white">{isEditing ? "Spieler bearbeiten" : "Neuer Spieler"}</CardTitle>
                          <CardDescription className="text-white/42">
                            {isEditing
                              ? "Änderungen werden erst gespeichert, wenn du auf „Änderungen speichern“ klickst."
                              : "Hier legst du einen neuen Spieler an."}
                          </CardDescription>
                        </CardHeader>

                        <CardContent className="grid min-w-0 grid-cols-1 gap-5 px-4 py-4 sm:px-6 sm:py-6 xl:grid-cols-[320px_minmax(0,1fr)] xl:items-start xl:[&>*:not(:first-child)]:col-start-2">
                          <div className="emd-admin-inset flex min-w-0 flex-col gap-4 p-3 sm:flex-row sm:items-center sm:p-4 xl:sticky xl:top-24 xl:flex-col xl:items-stretch">
                            <div className="shrink-0">
                              {imagePreview ? (
                                <div className="relative">
                                  <div className="h-24 w-24 overflow-hidden rounded-[24px] border border-white/[0.08] bg-transparent shadow-lg">
                                    <Image
                                      src={imagePreview || "/placeholder.svg"}
                                      alt="Profilbild Vorschau"
                                      width={96}
                                      height={96}
                                      className="h-full w-full object-cover"
                                    />
                                  </div>

                                  <Button
                                    type="button"
                                    variant="destructive"
                                    size="sm"
                                    className="absolute -right-2 -top-2 h-8 w-8 rounded-full p-0"
                                    onClick={handleRemoveImage}
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>
                              ) : (
                                <div className="flex h-24 w-24 items-center justify-center rounded-[24px] border border-white/[0.08] bg-transparent">
                                  <ImageIcon className="h-9 w-9 text-white/25" />
                                </div>
                              )}
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="text-sm font-black text-white">Profilbild</div>
                              <p className="mt-1 text-xs leading-5 text-white/35">Optional · JPG, PNG oder GIF · maximal 5 MB</p>

                              <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleImageChange}
                                className="hidden"
                                id="spieler-photo-upload"
                              />

                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={uploadingImage}
                                className="emd-admin-button-secondary mt-3 w-full sm:w-auto"
                              >
                                <Upload className="mr-2 h-4 w-4" />
                                {imagePreview ? "Bild ändern" : "Bild auswählen"}
                              </Button>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                            <div className="space-y-2">
                              <Label className="text-white/70">
                                Vorname <span className="text-orange-300">*</span>
                              </Label>
                              <Input
                                value={firstName}
                                onChange={handleFirstNameChange}
                                placeholder="z. B. Andreas"
                                className="emd-admin-input block w-full min-w-0 max-w-full"
                                required
                                autoComplete="given-name"
                              />
                            </div>

                            <div className="space-y-2">
                              <Label className="text-white/70">
                                Nachname <span className="text-orange-300">*</span>
                              </Label>
                              <Input
                                value={lastName}
                                onChange={handleLastNameChange}
                                placeholder="z. B. Huber"
                                className="emd-admin-input block w-full min-w-0 max-w-full"
                                required
                                autoComplete="family-name"
                              />
                            </div>
                          </div>

                          <div className="rounded-[18px] border border-orange-500/25 bg-orange-500/[0.05] p-4 lg:col-span-2">
                            <div className="mb-3 text-sm font-black text-orange-200">🎤 Martin · Namensaussprache</div>
                            <Label className="text-white/70" htmlFor="tts-pronunciation">So soll Martin den Namen aussprechen (optional)</Label>
                            <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                              <Input
                                id="tts-pronunciation"
                                value={form.tts_pronunciation || ""}
                                onChange={(event) => setForm((prev) => ({ ...prev, tts_pronunciation: event.target.value }))}
                                placeholder="z. B. Aussprache in normaler Lautschrift"
                                maxLength={120}
                                className="emd-admin-input min-w-0 flex-1"
                              />
                              <Button type="button" variant="outline" className="emd-admin-button-secondary"
                                disabled={testingPronunciation || !buildStoredName(firstName,lastName)}
                                onClick={testMartinPronunciation}>
                                {testingPronunciation ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                Mit Martin testen
                              </Button>
                            </div>
                            <p className="mt-2 text-xs text-white/40">Der offizielle Spielername bleibt unverändert. Die Testansage verwendet Automat 1 und einen Testgegner. Ohne Eintrag verwendet Martin den offiziellen Namen.</p>
                          </div>

                          <div className="space-y-2 lg:col-span-2">
                            <Label className="text-white/70">Verein</Label>
                            <Input
                              name="verein"
                              value={form.verein || ""}
                              onChange={handleInputChange}
                              placeholder="z. B. Emoj!s Dartverein"
                              className="emd-admin-input block w-full min-w-0 max-w-full"
                            />
                          </div>

                          <div className="rounded-[18px] border border-white/[0.07] bg-white/[0.02] p-4 lg:col-span-2">
                            <div className="mb-3">
                              <div className="text-sm font-black text-white">SportDarts-Zuordnung</div>
                              <div className="mt-1 text-xs leading-5 text-white/35">
                                Spielernummer und Alias kommen aus SportDarts. Bei neuen Spielern werden Verein und Ligastatus im Formular vorbefüllt; das Geschlecht muss vor dem Speichern ausgewählt werden.
                              </div>
                            </div>

                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                              <div className="space-y-2">
                                <Label className="text-white/70">SportDarts-Spielernummer</Label>
                                <Input
                                  name="sportdarts_player_number"
                                  value={form.sportdarts_player_number || ""}
                                  onChange={handleInputChange}
                                  placeholder="z. B. 12345"
                                  inputMode="numeric"
                                  className="emd-admin-input block w-full min-w-0 max-w-full"
                                />
                              </div>

                              <div className="space-y-2">
                                <Label className="text-white/70">SportDarts-Name / Alias</Label>
                                <Input
                                  name="sportdarts_name"
                                  value={form.sportdarts_name || ""}
                                  onChange={handleInputChange}
                                  placeholder="z. B. AL3N ALUKIC"
                                  className="emd-admin-input block w-full min-w-0 max-w-full"
                                />
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                              <Label className="text-white/70">Ligastatus</Label>
                              <Select
                                value={form.ligastatus || "none"}
                                onValueChange={(value) => handleSelectChange("ligastatus", value)}
                              >
                                <SelectTrigger className="emd-admin-select w-full min-w-0 max-w-full">
                                  <SelectValue placeholder="Status wählen" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">Ohne Status</SelectItem>
                                  {[
                                    ...(form.ligastatus && !LIGASTATUS_OPTIONS.includes(form.ligastatus)
                                      ? [form.ligastatus]
                                      : []),
                                    ...LIGASTATUS_OPTIONS,
                                  ].map((status) => (
                                    <SelectItem key={status} value={status}>
                                      {status}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="space-y-2">
                              <Label className="text-white/70">Geschlecht <span className="text-orange-300">*</span></Label>
                              <Select
                                value={form.geschlecht || undefined}
                                onValueChange={(value) => handleSelectChange("geschlecht", value)}
                              >
                                <SelectTrigger className="emd-admin-select w-full min-w-0 max-w-full">
                                  <SelectValue placeholder="Geschlecht auswählen *" />
                                </SelectTrigger>
                                <SelectContent>
                                  {GESCHLECHT_OPTIONS.map((entry) => (
                                    <SelectItem key={entry.value} value={entry.value}>
                                      {entry.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          {exactDuplicate ? (
                            <div className="rounded-2xl border border-rose-300/20 bg-rose-500/[0.06] p-4">
                              <div className="flex items-start gap-3">
                                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-300" />
                                <div className="min-w-0">
                                  <div className="font-black text-rose-100">Spieler bereits vorhanden</div>
                                  <div className="mt-1 text-sm text-rose-100/65">
                                    {exactDuplicate.name}
                                    {exactDuplicate.verein ? ` · ${exactDuplicate.verein}` : ""}
                                    {exactDuplicate.ligastatus ? ` · Liga ${exactDuplicate.ligastatus}` : ""}
                                  </div>
                                  <div className="mt-2 text-xs font-semibold text-rose-100/45">
                                    Ein exakt gleicher Name kann nicht erneut angelegt werden.
                                  </div>
                                </div>
                              </div>
                            </div>
                          ) : similarDuplicates.length > 0 ? (
                            <div className="rounded-2xl border border-amber-300/20 bg-amber-500/[0.05] p-4">
                              <div className="flex items-start gap-3">
                                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />
                                <div className="min-w-0 flex-1">
                                  <div className="font-black text-amber-100">Ähnliche Spieler gefunden</div>
                                  <div className="mt-1 text-xs font-semibold text-amber-100/50">
                                    Prüfe kurz, ob die Person schon vorhanden ist. Speichern bleibt möglich.
                                  </div>
                                  <div className="mt-3 space-y-2">
                                    {similarDuplicates.map((player) => (
                                      <button
                                        key={player.id || player.name}
                                        type="button"
                                        onClick={() => startEdit(player)}
                                        className="flex w-full items-center justify-between gap-3 rounded-xl border border-amber-200/10 bg-transparent px-3 py-2 text-left transition hover:border-amber-200/20 hover:bg-amber-500/[0.04]"
                                      >
                                        <div className="min-w-0">
                                          <div className="truncate text-sm font-black text-white">{player.name}</div>
                                          <div className="truncate text-xs text-white/38">
                                            {player.verein || "Ohne Verein"}
                                            {player.ligastatus ? ` · Liga ${player.ligastatus}` : ""}
                                          </div>
                                        </div>
                                        <Pencil className="h-4 w-4 shrink-0 text-amber-200/70" />
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ) : null}

                          {message ? (
                            <div
                              className={cn(
                                "rounded-xl px-4 py-3 text-sm font-medium border",
                                message.type === "success" && "bg-emerald-500/[0.08] border-emerald-300/20 text-emerald-100",
                                message.type === "error" && "bg-rose-500/[0.06] border-rose-300/20 text-rose-100",
                                message.type === "info" && "bg-sky-500/[0.08] border-sky-300/20 text-sky-100",
                              )}
                            >
                              {message.text}
                            </div>
                          ) : null}

                          <div className="space-y-2 pt-1">
                            <Button
                              type="button"
                              onClick={handleSave}
                              disabled={saving || uploadingImage || !!exactDuplicate || !firstName.trim() || !lastName.trim()}
                              className="emd-admin-button-primary w-full"
                            >
                              {saving || uploadingImage ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              ) : isEditing ? (
                                <Save className="mr-2 h-4 w-4" />
                              ) : (
                                <Plus className="mr-2 h-4 w-4" />
                              )}

                              {saving || uploadingImage
                                ? uploadingImage
                                  ? "Bild wird hochgeladen..."
                                  : "Speichern..."
                                : isEditing
                                  ? "Änderungen speichern"
                                  : "Spieler anlegen"}
                            </Button>

                            {isEditing ? (
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                  resetForm()
                                  setActiveSection("players")
                                }}
                                className="emd-admin-button-secondary w-full"
                              >
                                <X className="mr-2 h-4 w-4" />
                                Abbrechen
                              </Button>
                            ) : (
                              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  onClick={resetForm}
                                  className="emd-admin-button-secondary"
                                >
                                  <X className="mr-2 h-4 w-4" />
                                  Zurücksetzen
                                </Button>

                                <Button
                                  type="button"
                                  variant="ghost"
                                  onClick={startCreate}
                                  className="rounded-xl text-white/55 hover:bg-white/[0.06] hover:text-white"
                                >
                                  <Plus className="mr-2 h-4 w-4" />
                                  Neue Eingabe
                                </Button>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
            </div>
          ) : (
            <div className="w-full min-w-0 max-w-full overflow-x-hidden">
                      <Card className="emd-admin-surface overflow-hidden">
                        <CardHeader className="space-y-1.5 border-b border-white/[0.06] px-4 py-4 sm:px-6 sm:py-5">
                          <CardTitle className="text-lg font-black text-white">Vorhandene Spieler</CardTitle>
                          <CardDescription className="text-white/42">Suche, filtere und bearbeite bestehende Einträge.</CardDescription>
                        </CardHeader>

                        <CardContent className="min-w-0 space-y-5 px-4 py-4 sm:px-6 sm:py-6">
                          <div className="space-y-3">
                            <div className="relative">
                              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                              <Input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Spieler suchen..."
                                className="emd-admin-input block w-full min-w-0 max-w-full pl-9"
                              />
                            </div>

                            <div className="grid w-full min-w-0 grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                            <Select value={selectedVerein} onValueChange={setSelectedVerein}>
                              <SelectTrigger className="emd-admin-select w-full min-w-0 max-w-full">
                                <SelectValue placeholder="Verein filtern" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">Alle Vereine</SelectItem>
                                {uniqueVereine.map((verein) => (
                                  <SelectItem key={verein} value={verein}>
                                    {verein}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>

                            <Select value={selectedLiga} onValueChange={setSelectedLiga}>
                              <SelectTrigger className="emd-admin-select w-full min-w-0 max-w-full">
                                <SelectValue placeholder="Ligastatus filtern" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">Alle Ligastatus</SelectItem>
                                {LIGASTATUS_OPTIONS.map((status) => (
                                  <SelectItem key={status} value={status}>
                                    {status}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>

                            <Select value={selectedGeschlecht} onValueChange={setSelectedGeschlecht}>
                              <SelectTrigger className="emd-admin-select w-full min-w-0 max-w-full">
                                <SelectValue placeholder="Geschlecht filtern" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">Alle Geschlechter</SelectItem>
                                {GESCHLECHT_OPTIONS.map((entry) => (
                                  <SelectItem key={entry.value} value={entry.value}>
                                    {entry.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            </div>

                            <div className="emd-admin-inset flex w-full min-w-0 max-w-full flex-col items-stretch gap-3 overflow-hidden px-3 py-3 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-4">
                              <div className="flex items-center gap-3">
                                <span className="text-white/45">Gefundene Einträge</span>
                                <span className="font-black text-white">{filteredPlayers.length}</span>
                              </div>
                              {filtersActive ? (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={resetFilters}
                                  className="h-8 rounded-lg px-2.5 text-xs font-black text-orange-200/75 hover:bg-orange-500/[0.08] hover:text-orange-100"
                                >
                                  <X className="mr-1.5 h-3.5 w-3.5" />
                                  Filter zurücksetzen
                                </Button>
                              ) : null}
                            </div>
                          </div>

                          <div className="emd-admin-inset overflow-hidden">
                            <ScrollArea className="h-[620px] 2xl:h-[680px]">
                              <div className="w-full min-w-0 max-w-full space-y-3 p-2 sm:p-4">
                                {loading ? (
                                  <div className="flex items-center gap-2 text-sm text-white/42">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Spieler werden geladen...
                                  </div>
                                ) : filteredPlayers.length === 0 ? (
                                  <div className="text-sm text-white/42">Keine Spieler gefunden.</div>
                                ) : (
                                  filteredPlayers.map((player) => (
                                    <div
                                      key={player.id}
                                      className="emd-admin-card-hover flex w-full min-w-0 max-w-full flex-col gap-3 overflow-hidden p-3 sm:p-4 lg:flex-row lg:items-center lg:gap-4"
                                    >
                                      <div className="flex w-full min-w-0 flex-1 items-start gap-3 sm:items-center sm:gap-4">
                                        <div className="flex h-12 w-12 shrink-0 sm:h-14 sm:w-14 items-center justify-center overflow-hidden rounded-2xl border border-white/[0.08]">
                                          {player.profile_picture_url ? (
                                            <Image
                                              src={player.profile_picture_url}
                                              alt={player.name}
                                              width={56}
                                              height={56}
                                              className="w-full h-full object-cover"
                                            />
                                          ) : (
                                            <Users className="h-6 w-6 text-white/25" />
                                          )}
                                        </div>

                                        <div className="min-w-0 flex-1">
                                          <div className="truncate font-black text-white">{player.name}</div>

                                          <div className="mt-2 flex min-w-0 max-w-full flex-wrap items-center gap-1.5">
                                            <Badge variant="outline" className="rounded-lg border-white/[0.10] text-white/62">
                                              <Building2 className="w-3.5 h-3.5 mr-1" />
                                              {player.verein || "Ohne Verein"}
                                            </Badge>

                                            <Badge variant="outline" className="rounded-lg border-white/[0.10] text-white/62">
                                              <Shield className="w-3.5 h-3.5 mr-1" />
                                              {player.ligastatus || "Ohne Ligastatus"}
                                            </Badge>

                                            <Badge variant="outline" className="rounded-lg border-white/[0.10] text-white/62">
                                              <UserRound className="w-3.5 h-3.5 mr-1" />
                                              {player.geschlecht || "Ohne Angabe"}
                                            </Badge>

                                            {player.sportdarts_player_number ? (
                                              <Badge
                                                variant="outline"
                                                className="rounded-lg border-orange-300/15 bg-orange-500/[0.05] text-orange-100/75"
                                              >
                                                SD #{player.sportdarts_player_number}
                                              </Badge>
                                            ) : null}

                                            {player.sportdarts_name ? (
                                              <Badge
                                                variant="outline"
                                                className="max-w-full rounded-lg border-white/[0.08] text-white/45"
                                                title={player.sportdarts_name}
                                              >
                                                {player.sportdarts_name}
                                              </Badge>
                                            ) : null}
                                          </div>
                                        </div>
                                      </div>

                                      <div className="grid w-full min-w-0 shrink-0 grid-cols-1 gap-2 sm:grid-cols-2 lg:flex lg:w-auto lg:flex-wrap">
                                        <Button type="button" variant="outline" onClick={() => startEdit(player)} className="emd-admin-button-secondary w-full min-w-0 lg:w-auto">
                                          <Pencil className="w-4 h-4 mr-2" />
                                          Bearbeiten
                                        </Button>

                                        <Button
                                          type="button"
                                          variant="outline"
                                          onClick={() => openDeleteModal(player)}
                                          disabled={deletingId === player.id}
                                          className="emd-admin-button-danger w-full min-w-0 lg:w-auto"
                                        >
                                          {deletingId === player.id ? (
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                          ) : (
                                            <Trash2 className="w-4 h-4 mr-2" />
                                          )}
                                          Löschen
                                        </Button>
                                      </div>
                                    </div>
                                  ))
                                )}
                              </div>
                            </ScrollArea>
                          </div>
                        </CardContent>
                      </Card>
            </div>
          )}
        </div>

              <Dialog open={newPlayerGateOpen} onOpenChange={setNewPlayerGateOpen}>
                <DialogContent className="emd-admin-modal max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-[calc(100vw-1rem)] overflow-y-auto overflow-x-hidden overscroll-contain touch-pan-y rounded-[22px] sm:max-h-[90dvh] sm:max-w-2xl sm:rounded-[28px]">
                  <DialogHeader>
                    <DialogTitle>Neuen Spieler anlegen</DialogTitle>
                    <DialogDescription>
                      Vor einem neuen Eintrag wird zuerst SportDarts geprüft. So vermeiden wir doppelte Spieler und können vorhandene SportDarts-Daten direkt zuordnen.
                    </DialogDescription>
                  </DialogHeader>

                  {sportdartsSyncLoading ? (
                    <div className="flex items-center justify-center py-10 text-white/55">
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      SportDarts wird zuerst geprüft …
                    </div>
                  ) : sportdartsSyncError ? (
                    <div className="rounded-2xl border border-red-400/20 bg-red-500/[0.07] p-4 text-sm text-red-100">
                      {sportdartsSyncError}
                    </div>
                  ) : sportdartsSyncResult ? (
                    <div className="space-y-4">
                      <div className="rounded-2xl border border-emerald-300/15 bg-emerald-500/[0.05] p-4 text-sm text-emerald-100/75">
                        SportDarts geprüft: {sportdartsSyncResult.summary?.divisionsRead ?? 0} Divisionen · {sportdartsSyncResult.summary?.remotePlayers ?? 0} Spieler · {sportdartsSyncResult.summary?.possibleExisting ?? 0} mögliche Dubletten.
                      </div>

                      <div className="sticky top-0 z-20 -mx-1 bg-[#070a0f]/95 px-1 py-2 backdrop-blur-xl">
                        <Input
                          autoFocus
                          value={newPlayerSearch}
                          onChange={(event) => setNewPlayerSearch(event.target.value)}
                          placeholder="Name, Spielernummer oder Team suchen …"
                          className="emd-admin-input w-full"
                        />
                      </div>


                      {(sportdartsSyncResult.possibleExisting || []).filter((candidate: any) => {
                        if (!newPlayerSearch.trim()) return true
                        return matchesPlayerSearch(
                          [
                            candidate.name,
                            candidate.number,
                            ...(candidate.teams || []),
                            ...(candidate.divisions || []),
                            ...((candidate.localCandidates || []).map((row: any) => row.name)),
                          ].filter(Boolean).join(" "),
                          newPlayerSearch,
                        )
                      }).length > 0 ? (
                        <div className="space-y-2">
                          <div className="text-xs font-black uppercase tracking-[0.12em] text-amber-200/70">
                            Möglicherweise bereits bei uns vorhanden
                          </div>

                          <div className="space-y-2">
                            {(sportdartsSyncResult.possibleExisting || [])
                              .filter((candidate: any) => {
                                if (!newPlayerSearch.trim()) return true
                                return matchesPlayerSearch(
                                  [
                                    candidate.name,
                                    candidate.number,
                                    ...(candidate.teams || []),
                                    ...(candidate.divisions || []),
                                    ...((candidate.localCandidates || []).map((row: any) => row.name)),
                                  ].filter(Boolean).join(" "),
                                  newPlayerSearch,
                                )
                              })
                              .slice(0, 50)
                              .map((candidate: any) => (
                                <div
                                  key={`possible-${candidate.number}-${candidate.name}`}
                                  className="rounded-xl border border-amber-300/15 bg-amber-500/[0.035] p-3"
                                >
                                  <div className="font-black text-white">{candidate.name}</div>
                                  <div className="mt-1 text-xs text-white/45">
                                    SportDarts #{candidate.number}
                                    {candidate.teams?.length ? ` · ${candidate.teams.join(" / ")}` : ""}
                                  </div>

                                  <div className="mt-3 space-y-2">
                                    {(candidate.localCandidates || []).map((local: any) => (
                                      <div
                                        key={local.id}
                                        className="flex flex-col gap-2 rounded-lg border border-white/[0.06] bg-black/10 p-3 sm:flex-row sm:items-center sm:justify-between"
                                      >
                                        <div className="min-w-0">
                                          <div className="text-xs text-white/35">Bereits vorhanden:</div>
                                          <div className="font-bold text-white/80">{local.name}</div>
                                          <div className="mt-0.5 text-xs text-white/35">
                                            {[local.verein, local.ligastatus].filter(Boolean).join(" · ") || "Keine weiteren Angaben"}
                                          </div>
                                        </div>

                                        <Button
                                          type="button"
                                          variant="outline"
                                          onClick={() =>
                                            void confirmSportdartsSuggestion(
                                              local.id,
                                              String(candidate.number),
                                              String(candidate.name),
                                            )
                                          }
                                          disabled={!!sportdartsConfirmingKey}
                                          className="emd-admin-button-secondary shrink-0"
                                        >
                                          {sportdartsConfirmingKey === `${local.id}:${candidate.number}` ? (
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                          ) : (
                                            <Check className="mr-2 h-4 w-4" />
                                          )}
                                          Mit vorhandenem Spieler verknüpfen
                                        </Button>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ))}
                          </div>
                        </div>
                      ) : null}

                      <div className="text-xs font-black uppercase tracking-[0.12em] text-cyan-200/60">
                        Sicher noch nicht bei uns zugeordnet
                      </div>

                      <div
                        className="max-h-[45dvh] min-h-[260px] w-full overflow-y-auto overflow-x-hidden overscroll-contain touch-pan-y rounded-2xl border border-white/[0.07]"
                        style={{ WebkitOverflowScrolling: "touch" }}
                      >
                        <div className="space-y-2 p-3">
                          {(sportdartsSyncResult.remoteOnly || [])
                            .filter((candidate: any) => {
                              if (!newPlayerSearch.trim()) return true

                              return matchesPlayerSearch(
                                [
                                  candidate.name,
                                  candidate.number,
                                  ...(candidate.teams || []),
                                  ...(candidate.divisions || []),
                                ].filter(Boolean).join(" "),
                                newPlayerSearch,
                              )
                            })
                            .slice(0, 250)
                            .map((candidate: any) => (
                              <div
                                key={`${candidate.number}-${candidate.name}`}
                                className="flex flex-col gap-3 rounded-xl border border-white/[0.06] bg-white/[0.025] p-3 sm:flex-row sm:items-center sm:justify-between"
                              >
                                <div className="min-w-0">
                                  <div className="font-black text-white">{candidate.name}</div>
                                  <div className="mt-1 text-xs text-white/45">
                                    #{candidate.number}
                                    {candidate.teams?.length ? ` · ${candidate.teams.join(" / ")}` : ""}
                                  </div>
                                </div>

                                <Button
                                  type="button"
                                  variant="outline"
                                  onClick={() => importSportdartsPlayerToForm(candidate)}
                                  className="emd-admin-button-secondary shrink-0"
                                >
                                  <Plus className="mr-2 h-4 w-4" />
                                  Übernehmen
                                </Button>
                              </div>
                            ))}
                        </div>
                      </div>

                      <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-3 text-xs leading-5 text-white/45">
                        Nicht gefunden? Dann kannst du manuell anlegen. Die SportDarts-Prüfung ist damit bereits erledigt.
                      </div>
                    </div>
                  ) : null}

                  <DialogFooter className="gap-2 sm:gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setNewPlayerGateOpen(false)}
                      className="emd-admin-button-secondary"
                    >
                      Abbrechen
                    </Button>
                    <Button
                      type="button"
                      onClick={continueManualCreate}
                      disabled={sportdartsSyncLoading || !sportdartsCheckedAt || !!sportdartsSyncError}
                      className="emd-admin-button-primary"
                    >
                      Manuell neu anlegen
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Dialog open={sportdartsSyncOpen} onOpenChange={setSportdartsSyncOpen}>
                <DialogContent className="emd-admin-modal max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-[calc(100vw-1rem)] overflow-y-auto overscroll-contain rounded-[22px] sm:max-h-[90dvh] sm:max-w-2xl sm:rounded-[28px]">
                  <DialogHeader>
                    <DialogTitle>SportDarts synchronisieren</DialogTitle>
                    <DialogDescription>
                      Unsere internen Spielerdaten sind führend und werden niemals von SportDarts überschrieben. Der Sync ergänzt nur SportDarts-Spielernummer und SportDarts-Alias. Verein, Ligastatus, Geschlecht und interner Spielername bleiben exakt so, wie sie in unserer Datenbank stehen.
                    </DialogDescription>
                  </DialogHeader>

                  {sportdartsSyncLoading ? (
                    <div className="flex items-center justify-center py-10 text-white/55">
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      SportDarts wird geprüft …
                    </div>
                  ) : sportdartsSyncError ? (
                    <div className="rounded-2xl border border-red-400/20 bg-red-500/[0.07] p-4 text-sm text-red-100">
                      {sportdartsSyncError}
                    </div>
                  ) : sportdartsSyncResult ? (
                    <div className="min-h-0 space-y-4">
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                        <div className="emd-admin-stat">
                          <div className="text-[9px] font-black uppercase tracking-[0.12em] text-white/30">Änderungen</div>
                          <div className="mt-1 text-xl font-black text-white">{sportdartsSyncResult.summary?.willUpdate ?? 0}</div>
                        </div>
                        <div className="emd-admin-stat">
                          <div className="text-[9px] font-black uppercase tracking-[0.12em] text-white/30">Exakte Treffer</div>
                          <div className="mt-1 text-xl font-black text-white">{sportdartsSyncResult.summary?.matchedByExactName ?? 0}</div>
                        </div>
                        <div className="emd-admin-stat">
                          <div className="text-[9px] font-black uppercase tracking-[0.12em] text-white/30">Über Nummer</div>
                          <div className="mt-1 text-xl font-black text-white">
                            {(sportdartsSyncResult.summary?.matchedByNumber ?? 0) + (sportdartsSyncResult.summary?.matchedByClubPlayerNumber ?? 0)}
                          </div>
                        </div>
                        <div className="emd-admin-stat">
                          <div className="text-[9px] font-black uppercase tracking-[0.12em] text-white/30">Neu bei SportDarts</div>
                          <div className="mt-1 text-xl font-black text-white">{sportdartsSyncResult.summary?.remoteOnly ?? 0}</div>
                        </div>
                      </div>

                      <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-3 text-xs leading-5 text-white/45">
                        Geprüft: {sportdartsSyncResult.summary?.divisionsRead ?? 0} / {sportdartsSyncResult.summary?.divisionsTotal ?? 0} SportDarts-Divisionen ·
                        {" "}{sportdartsSyncResult.summary?.remotePlayers ?? 0} SportDarts-Spieler ·
                        {" "}{sportdartsSyncResult.summary?.totalLocalPlayers ?? 0} lokale Spieler
                      </div>

                      <div className="rounded-2xl border border-emerald-300/15 bg-emerald-500/[0.05] p-3 text-xs leading-5 text-emerald-100/70">
                        Interne Daten bleiben Master: Verein, Ligastatus, Geschlecht und Name werden durch diesen Sync nicht geändert.
                      </div>

                      {(sportdartsSyncResult.changes || []).length > 0 ? (
                        <div className="max-h-[45dvh] w-full overflow-y-auto overflow-x-hidden overscroll-contain touch-pan-y rounded-2xl border border-white/[0.07]" style={{ WebkitOverflowScrolling: "touch" }}>
                          <div className="space-y-2 p-3">
                            {(sportdartsSyncResult.changes || []).map((change: any) => (
                              <div key={change.id} className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-3">
                                <div className="font-black text-white">{change.internalName}</div>
                                <div className="mt-1 text-xs text-white/45">
                                  SportDarts #{change.playerNumber} · {change.sportdartsName}
                                </div>
                                <div className="mt-1 text-[11px] text-white/30">
                                  {change.matchMethod === "number"
                                    ? "Treffer über gespeicherte SportDarts-Spielernummer"
                                    : change.matchMethod === "club_player_number"
                                      ? `Treffer über Vereins-Spielernummer #${change.trustedClubPlayerNumber}`
                                      : "Exakter Namens-Treffer · Spielernummer wird neu zugeordnet"}
                                </div>
                                <div className="mt-2 flex flex-wrap gap-2 text-xs">
                                  {change.numberChanged ? (
                                    <Badge variant="outline" className="border-orange-300/15 text-orange-100/75">
                                      Spielernummer: {change.fromNumber || "—"} → {change.toNumber}
                                    </Badge>
                                  ) : null}
                                  {change.aliasChanged ? (
                                    <Badge variant="outline" className="border-white/[0.08] text-white/50">
                                      SportDarts-Alias: {change.sportdartsName}
                                    </Badge>
                                  ) : null}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4 text-sm text-white/50">
                          Keine Änderungen erforderlich.
                        </div>
                      )}

                      {(sportdartsSyncResult.remoteOnly || []).length > 0 ? (
                        <div className="space-y-2">
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <div className="text-xs font-black uppercase tracking-[0.12em] text-cyan-200/60">
                              Noch nicht in unserer Spielerdatenbank
                            </div>
                            <Input
                              value={newPlayerSearch}
                              onChange={(event) => setNewPlayerSearch(event.target.value)}
                              placeholder="Spieler suchen …"
                              className="emd-admin-input sm:max-w-xs"
                            />
                          </div>
                          <div className="max-h-[300px] w-full overflow-y-auto overflow-x-hidden overscroll-contain touch-pan-y rounded-2xl border border-cyan-300/15 bg-cyan-500/[0.025]" style={{ WebkitOverflowScrolling: "touch" }}>
                            <div className="space-y-2 p-3">
                              {(sportdartsSyncResult.remoteOnly || [])
                                .filter((candidate: any) => {
                                  const q = newPlayerSearch.trim().toLowerCase()
                                  if (!q) return true
                                  return [
                                    candidate.name,
                                    candidate.number,
                                    ...(candidate.teams || []),
                                    ...(candidate.divisions || []),
                                  ]
                                    .filter(Boolean)
                                    .join(" ")
                                    .toLowerCase()
                                    .includes(q)
                                })
                                .slice(0, 250)
                                .map((candidate: any) => (
                                <div
                                  key={`${candidate.number}-${candidate.name}`}
                                  className="flex flex-col gap-3 rounded-xl border border-white/[0.06] bg-black/10 p-3 sm:flex-row sm:items-center sm:justify-between"
                                >
                                  <div className="min-w-0">
                                    <div className="font-black text-white">{candidate.name}</div>
                                    <div className="mt-1 text-xs text-white/45">
                                      #{candidate.number}
                                      {candidate.teams?.length ? ` · ${candidate.teams.join(" / ")}` : ""}
                                      {candidate.divisions?.length ? ` · ${candidate.divisions.join(" / ")}` : ""}
                                    </div>
                                  </div>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => importSportdartsPlayerToForm(candidate)}
                                    className="emd-admin-button-secondary shrink-0"
                                  >
                                    <Plus className="mr-2 h-4 w-4" />
                                    Als neuen Spieler übernehmen
                                  </Button>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      ) : null}

                      {(sportdartsSyncResult.suggestions || []).length > 0 ? (
                        <div className="space-y-2">
                          <div className="text-xs font-black uppercase tracking-[0.12em] text-amber-200/60">
                            Mögliche Treffer – nicht automatisch übernommen
                          </div>
                          <div className="max-h-[260px] w-full overflow-y-auto overflow-x-hidden overscroll-contain touch-pan-y rounded-2xl border border-amber-300/15 bg-amber-500/[0.025]" style={{ WebkitOverflowScrolling: "touch" }}>
                            <div className="space-y-2 p-3">
                              {(sportdartsSyncResult.suggestions || []).map((suggestion: any) => (
                                <div key={suggestion.id} className="rounded-xl border border-white/[0.06] bg-black/10 p-3">
                                  <div className="font-black text-white">{suggestion.internalName}</div>
                                  <div className="mt-2 space-y-1.5">
                                    {(suggestion.candidates || []).map((candidate: any) => {
                                      const confirmKey = `${suggestion.id}:${candidate.number}`
                                      const isConfirming = sportdartsConfirmingKey === confirmKey

                                      return (
                                        <div
                                          key={`${candidate.number}-${candidate.name}-${candidate.divisionName}`}
                                          className="rounded-lg border border-white/[0.06] p-3"
                                        >
                                          <div className="text-xs text-white/55">
                                            <span className="font-bold text-white/80">{candidate.name}</span>
                                            {" "}· #{candidate.number} · {candidate.team} · {candidate.divisionName}
                                          </div>

                                          <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() =>
                                              void confirmSportdartsSuggestion(
                                                suggestion.id,
                                                String(candidate.number),
                                                String(candidate.name),
                                              )
                                            }
                                            disabled={!!sportdartsConfirmingKey}
                                            className="emd-admin-button-secondary mt-2 w-full sm:w-auto"
                                          >
                                            {isConfirming ? (
                                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            ) : (
                                              <Check className="mr-2 h-4 w-4" />
                                            )}
                                            Diese Zuordnung bestätigen
                                          </Button>
                                        </div>
                                      )
                                    })}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                          <div className="text-xs leading-5 text-amber-100/45">
                            Diese Namen sind nur ähnlich und werden nicht automatisch verknüpft. Wenn du die Person eindeutig kennst, kannst du die passende Zuordnung manuell bestätigen. Dabei werden ausschließlich SportDarts-Nummer und Alias gespeichert.
                          </div>
                        </div>
                      ) : null}

                      {sportdartsSyncResult.mode === "apply" ? (
                        <div className="rounded-2xl border border-emerald-300/15 bg-emerald-500/[0.05] p-4 text-sm text-emerald-100/80">
                          Synchronisierung abgeschlossen. {sportdartsSyncResult.summary?.updated ?? 0} SportDarts-Zuordnungen wurden aktualisiert.
                        </div>
                      ) : null}
                    </div>
                  ) : null}

                  <DialogFooter className="sticky bottom-0 z-10 -mx-6 -mb-6 mt-2 gap-2 border-t border-white/[0.07] bg-[#070a0f]/95 px-6 py-4 backdrop-blur-xl sm:gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setSportdartsSyncOpen(false)}
                      className="emd-admin-button-secondary"
                      disabled={sportdartsSyncApplying}
                    >
                      Schließen
                    </Button>

                    {sportdartsSyncResult?.mode !== "apply" ? (
                      <Button
                        type="button"
                        onClick={() => void requestSportdartsSync("apply")}
                        disabled={
                          sportdartsSyncLoading ||
                          sportdartsSyncApplying ||
                          !sportdartsSyncResult ||
                          (sportdartsSyncResult.summary?.willUpdate ?? 0) === 0
                        }
                        className="emd-admin-button-primary"
                      >
                        {sportdartsSyncApplying ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Save className="mr-2 h-4 w-4" />
                        )}
                        Änderungen übernehmen
                      </Button>
                    ) : null}
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Dialog open={deleteModalOpen} onOpenChange={(open) => (!deletingId ? (open ? setDeleteModalOpen(true) : closeDeleteModal()) : null)}>
                <DialogContent className="emd-admin-modal w-[calc(100vw-1rem)] max-w-[calc(100vw-1rem)] overflow-hidden rounded-[22px] p-0 sm:max-w-lg sm:rounded-[26px]">
                  <div className="border-b border-white/[0.07] px-5 py-5 sm:px-6">
                    <DialogHeader>
                      <div className="flex items-start gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-rose-300/20 bg-rose-500/10">
                          <AlertTriangle className="h-5 w-5 text-rose-300" />
                        </div>
                        <div className="min-w-0">
                          <DialogTitle className="text-left text-lg font-black text-white">Spieler löschen</DialogTitle>
                          <DialogDescription className="mt-1 text-left text-sm leading-5 text-white/42">
                            Vor dem Löschen werden Liga, Turniere, Serien, Cups und weitere Verknüpfungen geprüft.
                          </DialogDescription>
                        </div>
                      </div>
                    </DialogHeader>
                  </div>

                  <div className="space-y-4 px-5 py-5 sm:px-6">
                    <div className="emd-admin-inset p-4">
                      <div className="text-[10px] font-black uppercase tracking-[0.14em] text-white/30">Ausgewählter Spieler</div>
                      <div className="mt-1 text-base font-black text-white">{playerToDelete?.name || "—"}</div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        {playerToDelete?.verein ? (
                          <Badge variant="outline" className="rounded-lg border-white/[0.08] text-white/60">
                            <Building2 className="mr-1 h-3.5 w-3.5" />
                            {playerToDelete.verein}
                          </Badge>
                        ) : null}
                        {playerToDelete?.ligastatus ? (
                          <Badge variant="outline" className="rounded-lg border-white/[0.08] text-white/60">
                            <Shield className="mr-1 h-3.5 w-3.5" />
                            {playerToDelete.ligastatus}
                          </Badge>
                        ) : null}
                      </div>
                    </div>

                    {deleteCheckLoading ? (
                      <div className="flex items-center justify-center rounded-2xl border border-white/[0.07] bg-white/[0.025] px-4 py-7 text-sm text-white/50">
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Verknüpfungen werden geprüft …
                      </div>
                    ) : deleteCheckError ? (
                      <div className="rounded-2xl border border-rose-300/20 bg-rose-500/[0.07] p-4">
                        <div className="font-black text-rose-100">Löschen derzeit nicht möglich</div>
                        <div className="mt-1 text-sm leading-5 text-rose-100/65">{deleteCheckError}</div>
                      </div>
                    ) : deleteGuard && !deleteGuard.can_delete ? (
                      <div className="space-y-3">
                        <div className="rounded-2xl border border-amber-300/20 bg-amber-500/[0.07] p-4">
                          <div className="flex items-start gap-3">
                            <Shield className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />
                            <div>
                              <div className="font-black text-amber-100">Spieler ist noch verknüpft</div>
                              <div className="mt-1 text-sm leading-5 text-amber-100/65">
                                Solange dieser Spieler in Liga, Turnieren, Serien, Cups oder anderen Bereichen verwendet wird, ist Löschen gesperrt.
                              </div>
                            </div>
                          </div>
                        </div>

                        <ScrollArea className="max-h-[220px] w-full rounded-2xl border border-white/[0.07]">
                          <div className="space-y-2 p-3">
                            {(deleteGuard.dependencies || []).map((dep, index) => (
                              <div
                                key={`${dep.source}-${index}`}
                                className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-white/[0.025] px-3 py-2.5"
                              >
                                <div className="min-w-0">
                                  <div className="truncate text-sm font-bold text-white/75">{dep.label}</div>
                                  <div className="truncate text-[11px] text-white/30">{dep.source}</div>
                                </div>
                                <Badge variant="outline" className="shrink-0 rounded-lg border-amber-300/15 text-amber-100/70">
                                  {dep.count}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      </div>
                    ) : deleteGuard?.can_delete ? (
                      <div className="rounded-2xl border border-emerald-300/15 bg-emerald-500/[0.06] p-4">
                        <div className="flex items-start gap-3">
                          <Shield className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" />
                          <div>
                            <div className="font-black text-emerald-100">Keine Verknüpfungen gefunden</div>
                            <div className="mt-1 text-sm leading-5 text-emerald-100/60">
                              Der Spieler wird in keinem geprüften Bereich verwendet und kann gelöscht werden.
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : null}

                    <div className="text-xs leading-5 text-white/30">
                      Es werden niemals Liga-, Turnier-, Cup- oder Historiedaten mitgelöscht. Bei einer Verknüpfung wird nur das Löschen dieses Eintrags blockiert.
                    </div>
                  </div>

                  <DialogFooter className="border-t border-white/[0.07] px-5 py-4 sm:px-6">
                    <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={closeDeleteModal}
                        disabled={!!deletingId}
                        className="emd-admin-button-secondary w-full"
                      >
                        Abbrechen
                      </Button>

                      <Button
                        type="button"
                        onClick={handleDelete}
                        disabled={!!deletingId || deleteCheckLoading || !!deleteCheckError || !deleteGuard?.can_delete}
                        className="emd-admin-button-danger w-full disabled:cursor-not-allowed disabled:opacity-35"
                      >
                        {deletingId ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="mr-2 h-4 w-4" />
                        )}
                        Endgültig löschen
                      </Button>
                    </div>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
      </div>
    </div>
  )
}
