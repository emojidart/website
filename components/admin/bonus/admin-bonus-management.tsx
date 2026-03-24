"use client"

import { useEffect, useMemo, useState } from "react"
import type { User } from "@supabase/supabase-js"
import { supabase } from "@/lib/supabase"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
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
import { Search, Trophy, Loader2, Plus, Pencil, Save, X, RefreshCw, Trash2, AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"

type BonusCategory = {
  id: string
  name: string
  color: string | null
  sort_order: number
  is_active: boolean
}

type BonusRule = {
  id: string
  category_id: string
  title: string
  points: number
  description: string | null
  is_active: boolean
  sort_order: number
}

type BonusRuleWithCategory = BonusRule & {
  category_name?: string
  category_color?: string | null
}

interface AdminBonusManagementProps {
  user: User | null
}

const CATEGORY_COLORS: Record<string, string> = {
  green: "bg-green-50 text-green-700 border-green-200",
  blue: "bg-blue-50 text-blue-700 border-blue-200",
  yellow: "bg-yellow-50 text-yellow-700 border-yellow-200",
  orange: "bg-orange-50 text-orange-700 border-orange-200",
  purple: "bg-purple-50 text-purple-700 border-purple-200",
  red: "bg-red-50 text-red-700 border-red-200",
  brown: "bg-amber-50 text-amber-700 border-amber-200",
  gray: "bg-gray-50 text-gray-700 border-gray-200",
}

const EMPTY_FORM = {
  id: "",
  category_id: "",
  title: "",
  points: "",
  description: "",
  is_active: true,
  sort_order: "0",
}

export function AdminBonusManagement({ user }: AdminBonusManagementProps) {
  const [categories, setCategories] = useState<BonusCategory[]>([])
  const [rules, setRules] = useState<BonusRuleWithCategory[]>([])

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const [search, setSearch] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")

  const [isEditing, setIsEditing] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [message, setMessage] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null)

  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [ruleToDelete, setRuleToDelete] = useState<BonusRuleWithCategory | null>(null)

  useEffect(() => {
    if (user) {
      void loadData()
    }
  }, [user?.id])

  const loadData = async () => {
    try {
      setLoading(true)
      setMessage(null)

      const [{ data: categoryData, error: categoryError }, { data: ruleData, error: ruleError }] = await Promise.all([
        supabase.from("bonus_categories").select("id,name,color,sort_order,is_active").order("sort_order", { ascending: true }),
        supabase
          .from("bonus_rules")
          .select(`
            id,
            category_id,
            title,
            points,
            description,
            is_active,
            sort_order,
            bonus_categories (
              name,
              color
            )
          `)
          .order("sort_order", { ascending: true }),
      ])

      if (categoryError) throw categoryError
      if (ruleError) throw ruleError

      const nextCategories: BonusCategory[] = (categoryData || []).map((item: any) => ({
        id: item.id,
        name: item.name,
        color: item.color ?? "gray",
        sort_order: item.sort_order ?? 0,
        is_active: !!item.is_active,
      }))

      const nextRules: BonusRuleWithCategory[] = (ruleData || []).map((item: any) => ({
        id: item.id,
        category_id: item.category_id,
        title: item.title,
        points: item.points,
        description: item.description ?? "",
        is_active: !!item.is_active,
        sort_order: item.sort_order ?? 0,
        category_name: item.bonus_categories?.name ?? "Ohne Kategorie",
        category_color: item.bonus_categories?.color ?? "gray",
      }))

      nextRules.sort((a, b) => {
        const catA = nextCategories.find((cat) => cat.id === a.category_id)?.sort_order ?? 9999
        const catB = nextCategories.find((cat) => cat.id === b.category_id)?.sort_order ?? 9999
        if (catA !== catB) return catA - catB
        if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order
        return a.title.localeCompare(b.title, "de")
      })

      setCategories(nextCategories)
      setRules(nextRules)

      if (!form.category_id && nextCategories.length > 0) {
        setForm((prev) => ({ ...prev, category_id: nextCategories[0].id }))
      }
    } catch (error: any) {
      console.error("loadData error", error)
      setMessage({ type: "error", text: error?.message || "Bonussystem konnte nicht geladen werden." })
    } finally {
      setLoading(false)
    }
  }

  const filteredRules = useMemo(() => {
    const q = search.trim().toLowerCase()

    return rules.filter((rule) => {
      const matchesSearch =
        !q ||
        rule.title.toLowerCase().includes(q) ||
        rule.description?.toLowerCase().includes(q) ||
        rule.category_name?.toLowerCase().includes(q)

      const matchesCategory = selectedCategory === "all" || rule.category_id === selectedCategory
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && rule.is_active) ||
        (statusFilter === "inactive" && !rule.is_active)

      return matchesSearch && matchesCategory && matchesStatus
    })
  }, [rules, search, selectedCategory, statusFilter])

  const groupedRules = useMemo(() => {
    return categories
      .filter((category) => selectedCategory === "all" || category.id === selectedCategory)
      .map((category) => ({
        category,
        rules: filteredRules.filter((rule) => rule.category_id === category.id),
      }))
      .filter((group) => group.rules.length > 0 || selectedCategory !== "all")
  }, [categories, filteredRules, selectedCategory])

  const resetForm = () => {
    setIsEditing(false)
    setForm({
      ...EMPTY_FORM,
      category_id: categories[0]?.id ?? "",
    })
  }

  const startCreate = () => {
    setMessage(null)
    setIsEditing(false)
    setForm({
      ...EMPTY_FORM,
      category_id: categories[0]?.id ?? "",
    })
  }

  const startEdit = (rule: BonusRuleWithCategory) => {
    setMessage(null)
    setIsEditing(true)
    setForm({
      id: rule.id,
      category_id: rule.category_id,
      title: rule.title,
      points: String(rule.points),
      description: rule.description ?? "",
      is_active: rule.is_active,
      sort_order: String(rule.sort_order ?? 0),
    })
  }

  const openDeleteModal = (rule: BonusRuleWithCategory) => {
    setRuleToDelete(rule)
    setDeleteModalOpen(true)
  }

  const closeDeleteModal = () => {
    if (deletingId) return
    setDeleteModalOpen(false)
    setRuleToDelete(null)
  }

  const handleSave = async () => {
    try {
      setMessage(null)

      if (!user) {
        setMessage({ type: "error", text: "Nicht eingeloggt." })
        return
      }

      if (!form.category_id) {
        setMessage({ type: "error", text: "Bitte eine Kategorie wählen." })
        return
      }

      if (!form.title.trim()) {
        setMessage({ type: "error", text: "Bitte eine Bezeichnung eingeben." })
        return
      }

      const parsedPoints = Number(form.points)
      if (!Number.isFinite(parsedPoints) || parsedPoints < 0) {
        setMessage({ type: "error", text: "Bitte gültige Punkte eingeben." })
        return
      }

      const parsedSortOrder = Number(form.sort_order || 0)
      if (!Number.isFinite(parsedSortOrder)) {
        setMessage({ type: "error", text: "Bitte eine gültige Sortierung eingeben." })
        return
      }

      setSaving(true)

      const payload = {
        category_id: form.category_id,
        title: form.title.trim(),
        points: parsedPoints,
        description: form.description.trim() || null,
        is_active: form.is_active,
        sort_order: parsedSortOrder,
      }

      if (isEditing && form.id) {
        const { error } = await supabase.from("bonus_rules").update(payload).eq("id", form.id)
        if (error) throw error
        setMessage({ type: "success", text: "Bonusregel wurde gespeichert." })
      } else {
        const { error } = await supabase.from("bonus_rules").insert(payload)
        if (error) throw error
        setMessage({ type: "success", text: "Bonusregel wurde angelegt." })
      }

      await loadData()
      resetForm()
    } catch (error: any) {
      console.error("handleSave error", error)
      setMessage({ type: "error", text: error?.message || "Bonusregel konnte nicht gespeichert werden." })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!ruleToDelete) return

    try {
      setDeletingId(ruleToDelete.id)
      setMessage(null)

      const { error } = await supabase.from("bonus_rules").delete().eq("id", ruleToDelete.id)
      if (error) throw error

      setMessage({ type: "success", text: "Bonusregel wurde gelöscht." })
      if (form.id === ruleToDelete.id) resetForm()

      setDeleteModalOpen(false)
      setRuleToDelete(null)

      await loadData()
    } catch (error: any) {
      console.error("handleDelete error", error)
      setMessage({ type: "error", text: error?.message || "Bonusregel konnte nicht gelöscht werden." })
    } finally {
      setDeletingId(null)
    }
  }

  const totalRules = rules.length
  const activeRules = rules.filter((rule) => rule.is_active).length

  return (
    <div className="w-full space-y-6">
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="h-2 bg-gradient-to-r from-orange-500 to-orange-600" />
        <div className="p-4 sm:p-5 flex items-start gap-3">
          <div className="w-11 h-11 rounded-2xl bg-orange-50 border border-orange-200 flex items-center justify-center flex-shrink-0">
            <Trophy className="w-5 h-5 text-orange-600" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-base sm:text-lg font-black">Bonussystem</h2>
            <p className="text-sm text-gray-600 mt-1">Bonusregeln anlegen, Punkte ändern und Regeln aktiv oder inaktiv setzen.</p>
          </div>
          <Button type="button" variant="outline" onClick={() => void loadData()} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
            Neu laden
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-1 space-y-6">
          <Card className="rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <CardHeader>
              <CardTitle>{isEditing ? "Bonusregel bearbeiten" : "Neue Bonusregel"}</CardTitle>
              <CardDescription>
                Hier legst du Regeln für das Bonussystem an.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Kategorie</Label>
                <Select value={form.category_id} onValueChange={(value) => setForm((prev) => ({ ...prev, category_id: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Kategorie wählen" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Bezeichnung</Label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder="z. B. Cup-Spiel + Ersatz E-Dart"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Punkte</Label>
                  <Input
                    type="number"
                    min="0"
                    value={form.points}
                    onChange={(e) => setForm((prev) => ({ ...prev, points: e.target.value }))}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Sortierung</Label>
                  <Input
                    type="number"
                    value={form.sort_order}
                    onChange={(e) => setForm((prev) => ({ ...prev, sort_order: e.target.value }))}
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Beschreibung (optional)</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Optionaler Hinweis für Admins"
                  className="min-h-[90px]"
                />
              </div>

              <div className="flex items-center justify-between rounded-2xl border p-4">
                <div>
                  <div className="font-medium">Regel aktiv</div>
                  <div className="text-sm text-gray-500">Inaktive Regeln bleiben gespeichert, werden aber ausgeblendet oder nicht verwendet.</div>
                </div>
                <Switch checked={form.is_active} onCheckedChange={(checked) => setForm((prev) => ({ ...prev, is_active: checked }))} />
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

              <div className="flex flex-wrap gap-3 pt-2">
                <Button type="button" onClick={handleSave} disabled={saving} className="rounded-xl">
                  {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : isEditing ? <Save className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                  {isEditing ? "Änderungen speichern" : "Regel anlegen"}
                </Button>
                <Button type="button" variant="outline" onClick={resetForm} className="rounded-xl">
                  <X className="w-4 h-4 mr-2" />
                  Zurücksetzen
                </Button>
                <Button type="button" variant="ghost" onClick={startCreate} className="rounded-xl">
                  Neue Eingabe
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 gap-4">
            <Card className="rounded-2xl border border-gray-200 shadow-sm">
              <CardContent className="p-5">
                <div className="text-sm text-gray-500">Regeln gesamt</div>
                <div className="text-3xl font-black mt-1">{totalRules}</div>
              </CardContent>
            </Card>
            <Card className="rounded-2xl border border-gray-200 shadow-sm">
              <CardContent className="p-5">
                <div className="text-sm text-gray-500">Aktiv</div>
                <div className="text-3xl font-black mt-1">{activeRules}</div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="xl:col-span-2">
          <Card className="rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <CardHeader>
              <CardTitle>Vorhandene Bonusregeln</CardTitle>
              <CardDescription>Suche, filtere und bearbeite bestehende Regeln.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="relative md:col-span-1">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Regel suchen..."
                    className="pl-9"
                  />
                </div>

                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Kategorie filtern" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle Kategorien</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Status filtern" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle Status</SelectItem>
                    <SelectItem value="active">Nur aktiv</SelectItem>
                    <SelectItem value="inactive">Nur inaktiv</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="rounded-2xl border overflow-hidden">
                <ScrollArea className="h-[720px]">
                  <div className="p-4 space-y-6">
                    {loading ? (
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Bonusregeln werden geladen...
                      </div>
                    ) : filteredRules.length === 0 ? (
                      <div className="text-sm text-gray-500">Keine Bonusregeln gefunden.</div>
                    ) : (
                      groupedRules.map(({ category, rules: categoryRules }) => {
                        const colorClass = CATEGORY_COLORS[category.color || "gray"] || CATEGORY_COLORS.gray

                        return (
                          <div key={category.id} className="space-y-3">
                            <div className="flex items-center gap-3">
                              <Badge variant="outline" className={cn("rounded-xl px-3 py-1", colorClass)}>
                                {category.name}
                              </Badge>
                              <span className="text-sm text-gray-500">{categoryRules.length} Regel{categoryRules.length === 1 ? "" : "n"}</span>
                            </div>

                            <div className="space-y-3">
                              {categoryRules.map((rule) => (
                                <div
                                  key={rule.id}
                                  className="rounded-2xl border border-gray-200 bg-white p-4 flex flex-col lg:flex-row lg:items-center gap-4"
                                >
                                  <div className="flex-1 min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <div className="font-semibold text-gray-900">{rule.title}</div>
                                      <Badge variant={rule.is_active ? "default" : "secondary"} className="rounded-lg">
                                        {rule.is_active ? "Aktiv" : "Inaktiv"}
                                      </Badge>
                                      <Badge variant="outline" className="rounded-lg">
                                        {rule.points} Punkte
                                      </Badge>
                                      <Badge variant="outline" className="rounded-lg">
                                        Sortierung {rule.sort_order}
                                      </Badge>
                                    </div>
                                    {rule.description ? <div className="text-sm text-gray-500 mt-2">{rule.description}</div> : null}
                                  </div>

                                  <div className="flex flex-wrap gap-2">
                                    <Button type="button" variant="outline" onClick={() => startEdit(rule)} className="rounded-xl">
                                      <Pencil className="w-4 h-4 mr-2" />
                                      Bearbeiten
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      onClick={() => openDeleteModal(rule)}
                                      disabled={deletingId === rule.id}
                                      className="rounded-xl border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800"
                                    >
                                      {deletingId === rule.id ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
                                      Löschen
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>
                </ScrollArea>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={deleteModalOpen} onOpenChange={(open) => (!deletingId ? setDeleteModalOpen(open) : null)}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-red-50 border border-red-200">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <DialogTitle>Bonusregel löschen</DialogTitle>
                <DialogDescription>
                  Bitte bestätige das Löschen dieser Regel.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="rounded-2xl border border-red-100 bg-red-50/60 p-4">
            <div className="text-sm text-gray-600 mb-1">Ausgewählte Regel</div>
            <div className="font-semibold text-gray-900">{ruleToDelete?.title || "—"}</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {ruleToDelete?.category_name ? (
                <Badge variant="outline" className="rounded-lg">
                  {ruleToDelete.category_name}
                </Badge>
              ) : null}
              {typeof ruleToDelete?.points === "number" ? (
                <Badge variant="outline" className="rounded-lg">
                  {ruleToDelete.points} Punkte
                </Badge>
              ) : null}
            </div>
          </div>

          <div className="text-sm text-gray-600">
            Diese Aktion kann nicht rückgängig gemacht werden.
          </div>

          <DialogFooter className="gap-2 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={closeDeleteModal}
              disabled={!!deletingId}
              className="rounded-xl"
            >
              Abbrechen
            </Button>
            <Button
              type="button"
              onClick={handleDelete}
              disabled={!!deletingId}
              className="rounded-xl bg-red-600 hover:bg-red-700 text-white"
            >
              {deletingId ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
              Endgültig löschen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}