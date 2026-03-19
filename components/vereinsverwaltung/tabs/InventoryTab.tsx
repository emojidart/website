"use client"

import React, { useMemo, useState } from "react"
import type { User } from "@supabase/supabase-js"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import {
  Boxes,
  Laptop,
  Monitor,
  Plus,
  Printer,
  Search,
  Pencil,
  Trash2,
  Package,
  RefreshCcw,
  Wrench,
  FileText,
  Smartphone,
  Tablet,
  Router,
  X,
} from "lucide-react"
import {
  useClubInventory,
  type ClubInventoryItem,
  type InventoryCategory,
  type InventoryItemInput,
  type InventoryStatus,
} from "@/hooks/vereinsverwaltung/useClubInventory"

const categories: InventoryCategory[] = [
  "Laptop",
  "Monitor",
  "Tablet",
  "Smartphone",
  "Drucker",
  "Netzwerk",
  "Zubehör",
  "Sonstiges",
]

const statuses: InventoryStatus[] = ["aktiv", "im-einsatz", "in-reparatur", "ausgemustert"]

const emptyForm: InventoryItemInput = {
  name: "",
  category: "Laptop",
  brand: "",
  model: "",
  serial_number: "",
  inventory_number: "",
  quantity: 1,
  location: "",
  status: "aktiv",
  item_condition: "sehr gut",
  purchase_date: "",
  purchase_price: null,
  assigned_to: "",
  notes: "",
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(value || 0)
}

function formatDate(value?: string | null) {
  if (!value) return "–"
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return new Intl.DateTimeFormat("de-DE").format(d)
}

function categoryIcon(category: InventoryCategory) {
  switch (category) {
    case "Laptop":
      return <Laptop className="h-4 w-4" />
    case "Monitor":
      return <Monitor className="h-4 w-4" />
    case "Tablet":
      return <Tablet className="h-4 w-4" />
    case "Smartphone":
      return <Smartphone className="h-4 w-4" />
    case "Drucker":
      return <Printer className="h-4 w-4" />
    case "Netzwerk":
      return <Router className="h-4 w-4" />
    case "Zubehör":
      return <Package className="h-4 w-4" />
    default:
      return <Boxes className="h-4 w-4" />
  }
}

function statusBadge(status: InventoryStatus) {
  if (status === "aktiv") return "bg-emerald-50 text-emerald-700 border-emerald-200"
  if (status === "im-einsatz") return "bg-blue-50 text-blue-700 border-blue-200"
  if (status === "in-reparatur") return "bg-amber-50 text-amber-700 border-amber-200"
  return "bg-gray-100 text-gray-700 border-gray-200"
}

function Modal({
  open,
  title,
  children,
  onClose,
  footer,
}: {
  open: boolean
  title: string
  children: React.ReactNode
  onClose: () => void
  footer?: React.ReactNode
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 p-2 sm:p-4 print:hidden">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute left-1/2 top-1/2 w-[96vw] max-w-4xl -translate-x-1/2 -translate-y-1/2">
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <div className="font-semibold text-gray-900">{title}</div>
            <Button variant="ghost" size="icon" onClick={onClose} className="h-9 w-9 rounded-xl">
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="max-h-[75vh] overflow-auto p-4">{children}</div>
          {footer ? <div className="border-t bg-gray-50 px-4 py-3">{footer}</div> : null}
        </div>
      </div>
    </div>
  )
}

function InventoryForm({
  value,
  onChange,
  disabled,
}: {
  value: InventoryItemInput
  onChange: (patch: Partial<InventoryItemInput>) => void
  disabled?: boolean
}) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <div className="space-y-2 md:col-span-2">
        <label className="text-sm font-medium text-gray-900">Bezeichnung *</label>
        <Input
          value={value.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="z. B. Dell Latitude 7440"
          className="h-11 rounded-xl"
          disabled={disabled}
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-900">Kategorie *</label>
        <select
          value={value.category}
          onChange={(e) => onChange({ category: e.target.value as InventoryCategory })}
          className="h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-orange-200"
          disabled={disabled}
        >
          {categories.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-900">Status</label>
        <select
          value={value.status}
          onChange={(e) => onChange({ status: e.target.value as InventoryStatus })}
          className="h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-orange-200"
          disabled={disabled}
        >
          {statuses.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-900">Marke</label>
        <Input value={value.brand ?? ""} onChange={(e) => onChange({ brand: e.target.value })} className="h-11 rounded-xl" disabled={disabled} />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-900">Modell</label>
        <Input value={value.model ?? ""} onChange={(e) => onChange({ model: e.target.value })} className="h-11 rounded-xl" disabled={disabled} />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-900">Inventarnummer</label>
        <Input value={value.inventory_number ?? ""} onChange={(e) => onChange({ inventory_number: e.target.value })} className="h-11 rounded-xl" disabled={disabled} />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-900">Seriennummer</label>
        <Input value={value.serial_number ?? ""} onChange={(e) => onChange({ serial_number: e.target.value })} className="h-11 rounded-xl" disabled={disabled} />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-900">Anzahl</label>
        <Input
          type="number"
          min={1}
          value={String(value.quantity ?? 1)}
          onChange={(e) => onChange({ quantity: Math.max(1, Number(e.target.value || 1)) })}
          className="h-11 rounded-xl"
          disabled={disabled}
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-900">Standort</label>
        <Input value={value.location ?? ""} onChange={(e) => onChange({ location: e.target.value })} className="h-11 rounded-xl" disabled={disabled} />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-900">Zustand</label>
        <Input value={value.item_condition ?? ""} onChange={(e) => onChange({ item_condition: e.target.value })} className="h-11 rounded-xl" disabled={disabled} />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-900">Zugewiesen an</label>
        <Input value={value.assigned_to ?? ""} onChange={(e) => onChange({ assigned_to: e.target.value })} className="h-11 rounded-xl" disabled={disabled} />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-900">Kaufdatum</label>
        <Input type="date" value={value.purchase_date ?? ""} onChange={(e) => onChange({ purchase_date: e.target.value })} className="h-11 rounded-xl" disabled={disabled} />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-900">Kaufpreis (€)</label>
        <Input
          type="number"
          step="0.01"
          value={value.purchase_price ?? ""}
          onChange={(e) => onChange({ purchase_price: e.target.value === "" ? null : Number(e.target.value) })}
          className="h-11 rounded-xl"
          disabled={disabled}
        />
      </div>

      <div className="space-y-2 md:col-span-2">
        <label className="text-sm font-medium text-gray-900">Notizen</label>
        <textarea
          value={value.notes ?? ""}
          onChange={(e) => onChange({ notes: e.target.value })}
          rows={4}
          className="min-h-[110px] w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-200"
          disabled={disabled}
          placeholder="z. B. mit Dockingstation, Netzteil vorhanden, Leasinggerät …"
        />
      </div>
    </div>
  )
}

export function InventoryTab({ user }: { user: User | null }) {
  const inventory = useClubInventory(user)
  const [search, setSearch] = useState("")
  const [categoryFilter, setCategoryFilter] = useState<"alle" | InventoryCategory>("alle")
  const [statusFilter, setStatusFilter] = useState<"alle" | InventoryStatus>("alle")
  const [formOpen, setFormOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<ClubInventoryItem | null>(null)
  const [deletingItem, setDeletingItem] = useState<ClubInventoryItem | null>(null)
  const [form, setForm] = useState<InventoryItemInput>(emptyForm)

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase()
    return inventory.items.filter((item) => {
      const haystack = [
        item.name,
        item.category,
        item.brand,
        item.model,
        item.serial_number,
        item.inventory_number,
        item.location,
        item.assigned_to,
        item.notes,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()

      const matchesSearch = !q || haystack.includes(q)
      const matchesCategory = categoryFilter === "alle" || item.category === categoryFilter
      const matchesStatus = statusFilter === "alle" || item.status === statusFilter
      return matchesSearch && matchesCategory && matchesStatus
    })
  }, [categoryFilter, inventory.items, search, statusFilter])

  const visibleTotals = useMemo(() => {
    const positions = filteredItems.length
    const units = filteredItems.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0)
    const value = filteredItems.reduce((sum, item) => sum + (Number(item.purchase_price) || 0) * (Number(item.quantity) || 0), 0)
    return { positions, units, value }
  }, [filteredItems])

  const openCreate = () => {
    setEditingItem(null)
    setForm({ ...emptyForm })
    setFormOpen(true)
  }

  const openEdit = (item: ClubInventoryItem) => {
    setEditingItem(item)
    setForm({
      name: item.name,
      category: item.category,
      brand: item.brand ?? "",
      model: item.model ?? "",
      serial_number: item.serial_number ?? "",
      inventory_number: item.inventory_number ?? "",
      quantity: item.quantity,
      location: item.location ?? "",
      status: item.status,
      item_condition: item.item_condition ?? "",
      purchase_date: item.purchase_date ?? "",
      purchase_price: item.purchase_price,
      assigned_to: item.assigned_to ?? "",
      notes: item.notes ?? "",
    })
    setFormOpen(true)
  }

  const closeForm = () => {
    if (inventory.saving) return
    setFormOpen(false)
    setEditingItem(null)
  }

  const saveForm = async () => {
    if (!form.name?.trim()) return
    if (editingItem) {
      await inventory.updateItem(editingItem.id, form)
    } else {
      await inventory.createItem(form)
    }
    setFormOpen(false)
    setEditingItem(null)
  }

  const askDelete = (item: ClubInventoryItem) => {
    setDeletingItem(item)
    setDeleteOpen(true)
  }

  const confirmDelete = async () => {
    if (!deletingItem) return
    await inventory.deleteItem(deletingItem.id, deletingItem.name)
    setDeleteOpen(false)
    setDeletingItem(null)
  }

  const printInventory = () => {
    window.print()
  }

  return (
    <>
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .inventory-print, .inventory-print * {
            visibility: visible;
          }
          .inventory-print {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            background: white;
          }
          .print-hidden {
            display: none !important;
          }
          table {
            font-size: 12px;
          }
        }
      `}</style>

      <div className="space-y-4 inventory-print">
        <Card className="rounded-2xl border-gray-200 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                  <Boxes className="h-5 w-5 text-orange-600" />
                  Inventar
                </CardTitle>
                <CardDescription>
                  Geräte und Zubehör sauber verwalten, bearbeiten, löschen und als PDF über den Browser drucken.
                </CardDescription>
              </div>

              <div className="flex flex-wrap gap-2 print-hidden">
                <Button variant="outline" onClick={inventory.fetchItems} className="rounded-xl">
                  <RefreshCcw className="mr-2 h-4 w-4" />
                  Aktualisieren
                </Button>
                <Button variant="outline" onClick={printInventory} className="rounded-xl">
                  <FileText className="mr-2 h-4 w-4" />
                  Drucken / PDF
                </Button>
                <Button onClick={openCreate} className="rounded-xl bg-orange-600 hover:bg-orange-700">
                  <Plus className="mr-2 h-4 w-4" />
                  Inventar anlegen
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {inventory.message ? (
              <div
                className={cn(
                  "rounded-xl border px-3 py-2 text-sm",
                  inventory.messageType === "success"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border-red-200 bg-red-50 text-red-700",
                )}
              >
                {inventory.message}
              </div>
            ) : null}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="text-xs uppercase tracking-wide text-gray-500">Positionen</div>
                <div className="mt-1 text-2xl font-semibold text-gray-900">{visibleTotals.positions}</div>
                <div className="text-xs text-gray-500">Gesamt in aktueller Ansicht: {inventory.totals.positions}</div>
              </div>
              <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="text-xs uppercase tracking-wide text-gray-500">Menge</div>
                <div className="mt-1 text-2xl font-semibold text-gray-900">{visibleTotals.units}</div>
                <div className="text-xs text-gray-500">Geräte / Einheiten</div>
              </div>
              <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="text-xs uppercase tracking-wide text-gray-500">Wert</div>
                <div className="mt-1 text-2xl font-semibold text-gray-900">{formatCurrency(visibleTotals.value)}</div>
                <div className="text-xs text-gray-500">Nach Kaufpreis</div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-[1.4fr_0.8fr_0.8fr] print-hidden">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Suche nach Laptop, Monitor, Seriennummer, Standort …"
                  className="h-11 rounded-xl pl-10"
                />
              </div>

              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value as "alle" | InventoryCategory)}
                className="h-11 rounded-xl border border-gray-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-orange-200"
              >
                <option value="alle">Alle Kategorien</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as "alle" | InventoryStatus)}
                className="h-11 rounded-xl border border-gray-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-orange-200"
              >
                <option value="alle">Alle Status</option>
                {statuses.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>

            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 text-left text-gray-600">
                    <tr>
                      <th className="px-4 py-3 font-medium">Gerät</th>
                      <th className="px-4 py-3 font-medium">Kategorie</th>
                      <th className="px-4 py-3 font-medium">Inventarnr.</th>
                      <th className="px-4 py-3 font-medium">Menge</th>
                      <th className="px-4 py-3 font-medium">Standort</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium">Wert</th>
                      <th className="px-4 py-3 font-medium print-hidden">Aktionen</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inventory.loading ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-10 text-center text-gray-500">
                          Inventar wird geladen …
                        </td>
                      </tr>
                    ) : filteredItems.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-10 text-center text-gray-500">
                          Noch kein Inventar vorhanden.
                        </td>
                      </tr>
                    ) : (
                      filteredItems.map((item) => (
                        <tr key={item.id} className="border-t border-gray-100 align-top">
                          <td className="px-4 py-3">
                            <div className="font-medium text-gray-900">{item.name}</div>
                            <div className="mt-1 text-xs text-gray-500">
                              {[item.brand, item.model, item.serial_number].filter(Boolean).join(" · ") || "–"}
                            </div>
                            {item.assigned_to ? <div className="mt-1 text-xs text-gray-500">Zugewiesen an: {item.assigned_to}</div> : null}
                          </td>
                          <td className="px-4 py-3">
                            <div className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium text-gray-700">
                              {categoryIcon(item.category)}
                              {item.category}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-gray-700">{item.inventory_number || "–"}</td>
                          <td className="px-4 py-3 text-gray-700">{item.quantity}</td>
                          <td className="px-4 py-3 text-gray-700">{item.location || "–"}</td>
                          <td className="px-4 py-3">
                            <span className={cn("inline-flex rounded-full border px-2.5 py-1 text-xs font-medium", statusBadge(item.status))}>
                              {item.status}
                            </span>
                            {item.item_condition ? <div className="mt-1 text-xs text-gray-500">Zustand: {item.item_condition}</div> : null}
                          </td>
                          <td className="px-4 py-3 text-gray-700">
                            {item.purchase_price ? formatCurrency(item.purchase_price * item.quantity) : "–"}
                            {item.purchase_date ? <div className="mt-1 text-xs text-gray-500">Kauf: {formatDate(item.purchase_date)}</div> : null}
                          </td>
                          <td className="px-4 py-3 print-hidden">
                            <div className="flex items-center gap-2">
                              <Button variant="outline" size="sm" className="rounded-lg" onClick={() => openEdit(item)}>
                                <Pencil className="mr-1 h-3.5 w-3.5" />
                                Bearbeiten
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="rounded-lg border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                                onClick={() => askDelete(item)}
                              >
                                <Trash2 className="mr-1 h-3.5 w-3.5" />
                                Löschen
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-4 text-sm text-gray-600 print:hidden">
              Für eine PDF einfach auf <span className="font-medium text-gray-900">„Drucken / PDF“</span> klicken und im Browser
              <span className="font-medium text-gray-900"> „Als PDF speichern“</span> wählen.
            </div>
          </CardContent>
        </Card>
      </div>

      <Modal
        open={formOpen}
        title={editingItem ? "Inventar bearbeiten" : "Inventar anlegen"}
        onClose={closeForm}
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button variant="outline" onClick={closeForm} disabled={inventory.saving} className="rounded-xl">
              Abbrechen
            </Button>
            <Button onClick={saveForm} disabled={inventory.saving || !form.name?.trim()} className="rounded-xl bg-orange-600 hover:bg-orange-700">
              {editingItem ? "Änderungen speichern" : "Inventar speichern"}
            </Button>
          </div>
        }
      >
        <InventoryForm value={form} onChange={(patch) => setForm((prev) => ({ ...prev, ...patch }))} disabled={inventory.saving} />
      </Modal>

      <Modal
        open={deleteOpen}
        title="Inventar löschen"
        onClose={() => {
          if (inventory.saving) return
          setDeleteOpen(false)
          setDeletingItem(null)
        }}
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={inventory.saving} className="rounded-xl">
              Abbrechen
            </Button>
            <Button onClick={confirmDelete} disabled={inventory.saving} className="rounded-xl bg-red-600 hover:bg-red-700">
              Endgültig löschen
            </Button>
          </div>
        }
      >
        <div className="space-y-2 text-sm text-gray-700">
          <div>
            Möchtest du <span className="font-semibold text-gray-900">{deletingItem?.name}</span> wirklich löschen?
          </div>
          <div className="rounded-xl border border-red-100 bg-red-50 p-3 text-red-700">
            Dieser Eintrag wird dauerhaft aus der Datenbank entfernt.
          </div>
        </div>
      </Modal>
    </>
  )
}
