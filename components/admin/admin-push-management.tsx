"use client"

import type React from "react"
import { useEffect, useMemo, useRef, useState } from "react"
import { supabase } from "@/lib/supabase"
import type { User } from "@supabase/supabase-js"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Search, Send, Users, Image as ImageIcon, Loader2, CheckCircle2, BellRing } from "lucide-react"
import { cn } from "@/lib/utils"

type ClubPlayer = {
  id: string
  name: string
  photo_url: string | null
  user_profile_id: string | null
  auth_user_id: string | null
}

interface AdminPushManagementProps {
  user: User | null
}

const PUSH_ENDPOINT = "/api/push/send-admin-push"

export function AdminPushManagement({ user }: AdminPushManagementProps) {
  const [players, setPlayers] = useState<ClubPlayer[]>([])
  const [loadingPlayers, setLoadingPlayers] = useState(false)
  const [sending, setSending] = useState(false)

  const [search, setSearch] = useState("")
  const [sendToAll, setSendToAll] = useState(true)
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([])

  const [text, setText] = useState("")
  const [pushDate, setPushDate] = useState("")
  const [pushTime, setPushTime] = useState("")
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)

  const [message, setMessage] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null)

  const createdObjectUrlRef = useRef<string | null>(null)

  useEffect(() => {
    if (user) fetchPlayers()
    return () => {
      if (createdObjectUrlRef.current) {
        URL.revokeObjectURL(createdObjectUrlRef.current)
        createdObjectUrlRef.current = null
      }
    }
  }, [user?.id])

  const fetchPlayers = async () => {
    try {
      setLoadingPlayers(true)
      setMessage(null)

      const { data: clubPlayers, error: playersError } = await supabase
        .from("club_players")
        .select("id,name,photo_url")
        .order("name", { ascending: true })

      if (playersError) throw playersError

      const playerIds = (clubPlayers || []).map((p) => p.id)
      let profilesMap = new Map<string, { profileId: string; userId: string | null }>()

      if (playerIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from("user_profiles")
          .select("id,user_id,player_id")
          .in("player_id", playerIds)

        if (profilesError) throw profilesError

        ;(profiles || []).forEach((p: any) => {
          if (p?.player_id) {
            profilesMap.set(p.player_id, {
              profileId: p.id,
              userId: p.user_id ?? null,
            })
          }
        })
      }

      const rows: ClubPlayer[] = (clubPlayers || []).map((p: any) => ({
        id: p.id,
        name: p.name,
        photo_url: p.photo_url ?? null,
        user_profile_id: profilesMap.get(p.id)?.profileId ?? null,
        auth_user_id: profilesMap.get(p.id)?.userId ?? null,
      }))

      setPlayers(rows)
    } catch (error: any) {
      console.error("fetchPlayers error", error)
      setPlayers([])
      setMessage({ type: "error", text: error?.message || "Spieler konnten nicht geladen werden." })
    } finally {
      setLoadingPlayers(false)
    }
  }

  const filteredPlayers = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return players
    return players.filter((p) => p.name.toLowerCase().includes(q))
  }, [players, search])

  const selectablePlayers = useMemo(() => {
    return filteredPlayers.filter((p) => !!p.auth_user_id)
  }, [filteredPlayers])

  const selectedCount = useMemo(() => {
    return sendToAll ? players.filter((p) => !!p.auth_user_id).length : selectedPlayerIds.length
  }, [sendToAll, selectedPlayerIds, players])

  const togglePlayer = (playerId: string) => {
    setSelectedPlayerIds((prev) =>
      prev.includes(playerId) ? prev.filter((id) => id !== playerId) : [...prev, playerId]
    )
  }

  const handleSelectAllVisible = () => {
    const visibleIds = selectablePlayers.map((p) => p.id)
    setSelectedPlayerIds(visibleIds)
    setSendToAll(false)
  }

  const clearSelection = () => {
    setSelectedPlayerIds([])
    setSendToAll(false)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null
    if (!file) {
      setPhotoFile(null)
      setPhotoPreview(null)
      return
    }

    if (!file.type.startsWith("image/")) {
      setMessage({ type: "error", text: "Bitte nur Bilddateien auswählen." })
      return
    }

    setPhotoFile(file)

    if (createdObjectUrlRef.current) {
      URL.revokeObjectURL(createdObjectUrlRef.current)
      createdObjectUrlRef.current = null
    }

    const url = URL.createObjectURL(file)
    createdObjectUrlRef.current = url
    setPhotoPreview(url)
  }

  const resetForm = () => {
    setText("")
    setPushDate("")
    setPushTime("")
    setPhotoFile(null)
    setPhotoPreview(null)
    setSendToAll(true)
    setSelectedPlayerIds([])
    setSearch("")
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)

    if (!user) {
      setMessage({ type: "error", text: "Nicht eingeloggt." })
      return
    }

    if (!text.trim()) {
      setMessage({ type: "error", text: "Text ist ein Pflichtfeld." })
      return
    }

    if (!sendToAll && selectedPlayerIds.length === 0) {
      setMessage({ type: "error", text: "Bitte mindestens einen Spieler auswählen oder 'an alle' senden." })
      return
    }

    try {
      setSending(true)

      const formData = new FormData()
      formData.append("text", text.trim())
      formData.append("send_to_all", sendToAll ? "true" : "false")
      formData.append("selected_player_ids", JSON.stringify(selectedPlayerIds))

      if (pushDate) formData.append("push_date", pushDate)
      if (pushTime) formData.append("push_time", pushTime)
      if (photoFile) formData.append("photo", photoFile)

      const token = (await supabase.auth.getSession()).data.session?.access_token
      if (!token) throw new Error("Kein Access Token vorhanden.")

      const res = await fetch(PUSH_ENDPOINT, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      })

      const json = await res.json().catch(() => null)

      if (!res.ok) {
        throw new Error(json?.error || `Push-API Fehler (${res.status})`)
      }

      setMessage({
        type: "success",
        text: `Push erfolgreich versendet. Gesendet: ${json?.sent ?? 0}, Fehlgeschlagen: ${json?.failed ?? 0}`,
      })

      resetForm()
    } catch (error: any) {
      console.error("handleSubmit error", error)
      setMessage({ type: "error", text: error?.message || "Push konnte nicht gesendet werden." })
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="w-full space-y-6">
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="h-2 bg-gradient-to-r from-orange-500 to-orange-600" />
        <div className="p-4 sm:p-5 flex items-start gap-3">
          <div className="w-11 h-11 rounded-2xl bg-orange-50 border border-orange-200 flex items-center justify-center flex-shrink-0">
            <BellRing className="w-5 h-5 text-orange-600" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base sm:text-lg font-black">Push-Nachrichten</h2>
            <p className="text-sm text-gray-600 mt-1">An alle oder ausgewählte Spieler senden.</p>
          </div>
        </div>
      </div>

      <Card className="rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <CardHeader>
          <CardTitle>Neue Push-Nachricht</CardTitle>
          <CardDescription>
            Pflichtfeld ist nur der Text. Datum, Uhrzeit und Bild sind optional.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label>Text *</Label>
              <Textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Push-Nachricht eingeben..."
                className="min-h-[120px]"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Datum (optional)</Label>
                <Input type="date" value={pushDate} onChange={(e) => setPushDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Uhrzeit (optional)</Label>
                <Input type="time" value={pushTime} onChange={(e) => setPushTime(e.target.value)} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Foto (optional)</Label>
              <Input type="file" accept="image/*" onChange={handleFileChange} />
              {photoPreview ? (
                <div className="mt-2">
                  <img
                    src={photoPreview}
                    alt="Vorschau"
                    className="h-32 w-auto rounded-xl border object-cover"
                  />
                </div>
              ) : null}
            </div>

            <div className="rounded-2xl border p-4 space-y-4">
              <div className="flex items-center gap-3">
                <Checkbox
                  checked={sendToAll}
                  onCheckedChange={(checked) => setSendToAll(!!checked)}
                  id="sendToAll"
                />
                <Label htmlFor="sendToAll" className="font-semibold">
                  An alle senden
                </Label>
                <Badge variant="secondary">{selectedCount} Empfänger</Badge>
              </div>

              {!sendToAll ? (
                <>
                  <div className="flex flex-col md:flex-row gap-3">
                    <div className="relative flex-1">
                      <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <Input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Spieler suchen..."
                        className="pl-9"
                      />
                    </div>
                    <Button type="button" variant="outline" onClick={handleSelectAllVisible}>
                      Sichtbare auswählen
                    </Button>
                    <Button type="button" variant="outline" onClick={clearSelection}>
                      Auswahl leeren
                    </Button>
                  </div>

                  <div className="rounded-2xl border">
                    <ScrollArea className="h-[320px]">
                      <div className="p-3 space-y-2">
                        {loadingPlayers ? (
                          <div className="flex items-center gap-2 text-sm text-gray-500">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Spieler werden geladen...
                          </div>
                        ) : filteredPlayers.length === 0 ? (
                          <div className="text-sm text-gray-500">Keine Spieler gefunden.</div>
                        ) : (
                          filteredPlayers.map((player) => {
                            const disabled = !player.auth_user_id
                            const checked = selectedPlayerIds.includes(player.id)

                            return (
                              <label
                                key={player.id}
                                className={cn(
                                  "flex items-center gap-3 rounded-xl border p-3",
                                  disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:bg-gray-50"
                                )}
                              >
                                <Checkbox
                                  checked={checked}
                                  disabled={disabled}
                                  onCheckedChange={() => !disabled && togglePlayer(player.id)}
                                />
                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 overflow-hidden">
                                  {player.photo_url ? (
                                    <img src={player.photo_url} alt={player.name} className="h-full w-full object-cover" />
                                  ) : (
                                    <Users className="w-4 h-4 text-gray-500" />
                                  )}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="font-medium truncate">{player.name}</div>
                                  {!player.auth_user_id ? (
                                    <div className="text-xs text-red-500">Kein App-User / keine Push-Zuordnung</div>
                                  ) : (
                                    <div className="text-xs text-gray-500">Push möglich</div>
                                  )}
                                </div>
                              </label>
                            )
                          })
                        )}
                      </div>
                    </ScrollArea>
                  </div>
                </>
              ) : null}
            </div>

            {message ? (
              <div
                className={cn(
                  "rounded-xl px-4 py-3 text-sm font-medium border",
                  message.type === "success" && "bg-green-50 border-green-200 text-green-800",
                  message.type === "error" && "bg-red-50 border-red-200 text-red-800",
                  message.type === "info" && "bg-blue-50 border-blue-200 text-blue-800"
                )}
              >
                {message.text}
              </div>
            ) : null}

            <div className="flex justify-end">
              <Button type="submit" disabled={sending} className="rounded-xl">
                {sending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                Push senden
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}