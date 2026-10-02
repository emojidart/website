"use client"

import React, { useMemo, useState } from "react"
import type { User } from "@supabase/supabase-js"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { vv } from "../vereinsverwaltung-styles"
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
  Euro,
  MapPin,
  UserRound,
  Hash,
  CalendarDays,
  CircleDot,
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
  if (status === "aktiv") return "border-emerald-300/20 bg-emerald-500/10 text-emerald-200"
  if (status === "im-einsatz") return "border-sky-300/20 bg-sky-500/10 text-sky-200"
  if (status === "in-reparatur") return "border-amber-300/20 bg-amber-500/10 text-amber-200"
  return "border-[#303946] bg-[#151a22] text-white/45"
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
    <div className="fixed inset-0 z-50 print:hidden">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-[2px]" onClick={onClose} />
      <div className="absolute inset-x-2 bottom-2 sm:left-1/2 sm:right-auto sm:top-1/2 sm:bottom-auto sm:w-[min(900px,calc(100vw-2rem))] sm:-translate-x-1/2 sm:-translate-y-1/2">
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
        <label className={vv.label}>Bezeichnung *</label>
        <Input
          value={value.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="z. B. Dell Latitude 7440"
          className={vv.input}
          disabled={disabled}
        />
      </div>

      <div className="space-y-2">
        <label className={vv.label}>Kategorie *</label>
        <select
          value={value.category}
          onChange={(e) => onChange({ category: e.target.value as InventoryCategory })}
          className={cn(vv.select, "w-full px-3")}
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
        <label className={vv.label}>Status</label>
        <select
          value={value.status}
          onChange={(e) => onChange({ status: e.target.value as InventoryStatus })}
          className={cn(vv.select, "w-full px-3")}
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
        <label className={vv.label}>Marke</label>
        <Input value={value.brand ?? ""} onChange={(e) => onChange({ brand: e.target.value })} className={vv.input} disabled={disabled} />
      </div>

      <div className="space-y-2">
        <label className={vv.label}>Modell</label>
        <Input value={value.model ?? ""} onChange={(e) => onChange({ model: e.target.value })} className={vv.input} disabled={disabled} />
      </div>

      <div className="space-y-2">
        <label className={vv.label}>Inventarnummer</label>
        <Input value={value.inventory_number ?? ""} onChange={(e) => onChange({ inventory_number: e.target.value })} className={vv.input} disabled={disabled} />
      </div>

      <div className="space-y-2">
        <label className={vv.label}>Seriennummer</label>
        <Input value={value.serial_number ?? ""} onChange={(e) => onChange({ serial_number: e.target.value })} className={vv.input} disabled={disabled} />
      </div>

      <div className="space-y-2">
        <label className={vv.label}>Anzahl</label>
        <Input
          type="number"
          min={1}
          value={String(value.quantity ?? 1)}
          onChange={(e) => onChange({ quantity: Math.max(1, Number(e.target.value || 1)) })}
          className={vv.input}
          disabled={disabled}
        />
      </div>

      <div className="space-y-2">
        <label className={vv.label}>Standort</label>
        <Input value={value.location ?? ""} onChange={(e) => onChange({ location: e.target.value })} className={vv.input} disabled={disabled} />
      </div>

      <div className="space-y-2">
        <label className={vv.label}>Zustand</label>
        <Input value={value.item_condition ?? ""} onChange={(e) => onChange({ item_condition: e.target.value })} className={vv.input} disabled={disabled} />
      </div>

      <div className="space-y-2">
        <label className={vv.label}>Zugewiesen an</label>
        <Input value={value.assigned_to ?? ""} onChange={(e) => onChange({ assigned_to: e.target.value })} className={vv.input} disabled={disabled} />
      </div>

      <div className="space-y-2">
        <label className={vv.label}>Kaufdatum</label>
        <Input type="date" value={value.purchase_date ?? ""} onChange={(e) => onChange({ purchase_date: e.target.value })} className={vv.input} disabled={disabled} />
      </div>

      <div className="space-y-2">
        <label className={vv.label}>Kaufpreis (€)</label>
        <Input
          type="number"
          step="0.01"
          value={value.purchase_price ?? ""}
          onChange={(e) => onChange({ purchase_price: e.target.value === "" ? null : Number(e.target.value) })}
          className={vv.input}
          disabled={disabled}
        />
      </div>

      <div className="space-y-2 md:col-span-2">
        <label className={vv.label}>Notizen</label>
        <textarea
          value={value.notes ?? ""}
          onChange={(e) => onChange({ notes: e.target.value })}
          rows={4}
          className="min-h-[110px] w-full rounded-xl border border-[#2a323d] bg-[#0d1117] px-3 py-2 text-sm text-white outline-none placeholder:text-white/22 focus:border-orange-400/40 focus:ring-2 focus:ring-orange-400/10"
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
          .inventory-print,
          .inventory-print * {
            visibility: visible;
          }
          .inventory-print {
            position: absolute;
            inset: 0;
            width: 100%;
            background: white !important;
            color: black !important;
          }
          .print-hidden {
            display: none !important;
          }
        }
      `}</style>

      <div className="space-y-5 inventory-print text-white">
        <section className={cn(vv.surfaceLg, "overflow-hidden")}>
          <div className="flex flex-col gap-5 px-5 py-5 sm:px-6 sm:py-6 xl:flex-row xl:items-end xl:justify-between">
            <div className="flex min-w-0 items-start gap-4">
              <div className="flex h-12 w-12 flex-none items-center justify-center rounded-2xl border border-orange-300/20 bg-orange-500/10">
                <Boxes className="h-5 w-5 text-orange-300" />
              </div>
              <div>
                <div className="text-[11px] font-black uppercase tracking-[0.18em] text-orange-200/50">Vereinsausstattung</div>
                <h3 className="mt-1 text-2xl font-black tracking-[-0.02em] text-white sm:text-[28px]">Inventar</h3>
                <p className="mt-1 max-w-3xl text-sm leading-6 text-white/42">
                  Geräte, Zubehör, Standorte und Zuweisungen zentral verwalten.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2 sm:flex print-hidden">
              <Button variant="outline" onClick={inventory.fetchItems} className={vv.buttonSecondary}>
                <RefreshCcw className="mr-2 h-4 w-4" />
                Aktualisieren
              </Button>
              <Button variant="outline" onClick={printInventory} className={vv.buttonSecondary}>
                <FileText className="mr-2 h-4 w-4" />
                Drucken / PDF
              </Button>
              <Button onClick={openCreate} className={vv.buttonPrimary}>
                <Plus className="mr-2 h-4 w-4" />
                Inventar anlegen
              </Button>
            </div>
          </div>
        </section>

        {inventory.message ? (
          <div
            className={cn(
              "rounded-[18px] border px-4 py-3 text-sm font-bold",
              inventory.messageType === "success"
                ? "border-emerald-300/20 bg-emerald-500/10 text-emerald-100"
                : "border-rose-300/20 bg-rose-500/10 text-rose-100",
            )}
          >
            {inventory.message}
          </div>
        ) : null}

        <div className="grid grid-cols-3 gap-3">
          <article className={cn(vv.card, "p-4 sm:p-5")}>
            <div className={vv.label}>Positionen</div>
            <div className="mt-2 text-2xl font-black text-white sm:text-3xl">{visibleTotals.positions}</div>
            <div className="mt-2 text-[11px] font-semibold text-white/30">
              Gesamt: {inventory.totals.positions}
            </div>
          </article>

          <article className={cn(vv.card, "p-4 sm:p-5")}>
            <div className={vv.label}>Einheiten</div>
            <div className="mt-2 text-2xl font-black text-sky-200 sm:text-3xl">{visibleTotals.units}</div>
            <div className="mt-2 text-[11px] font-semibold text-white/30">Geräte / Stück</div>
          </article>

          <article className={cn(vv.card, "p-4 sm:p-5")}>
            <div className={vv.label}>Wert</div>
            <div className="mt-2 truncate text-xl font-black text-emerald-200 sm:text-3xl">{formatCurrency(visibleTotals.value)}</div>
            <div className="mt-2 text-[11px] font-semibold text-white/30">Nach Kaufpreis</div>
          </article>
        </div>

        <section className={cn(vv.surface, "p-4 sm:p-5 print-hidden")}>
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px_220px]">
            <div>
              <div className={cn(vv.label, "mb-1.5")}>Suchen</div>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/25" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Gerät, Seriennummer, Standort …"
                  className={cn(vv.input, "pl-10")}
                />
              </div>
            </div>

            <div>
              <div className={cn(vv.label, "mb-1.5")}>Kategorie</div>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value as "alle" | InventoryCategory)}
                className={cn(vv.select, "w-full px-3")}
              >
                <option value="alle">Alle Kategorien</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className={cn(vv.label, "mb-1.5")}>Status</div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as "alle" | InventoryStatus)}
                className={cn(vv.select, "w-full px-3")}
              >
                <option value="alle">Alle Status</option>
                {statuses.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {inventory.loading ? (
          <div className={cn(vv.surface, "flex items-center justify-center px-4 py-10 text-sm font-semibold text-white/40")}>
            <RefreshCcw className="mr-2 h-4 w-4 animate-spin" />
            Inventar wird geladen …
          </div>
        ) : filteredItems.length === 0 ? (
          <div className={cn(vv.surface, "px-4 py-10 text-center")}>
            <Package className="mx-auto h-6 w-6 text-white/18" />
            <p className="mt-2 text-sm font-semibold text-white/35">Noch kein passendes Inventar vorhanden.</p>
          </div>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">
            {filteredItems.map((item) => (
              <article key={item.id} className={cn(vv.cardHover, "p-4")}>
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 flex-none items-center justify-center rounded-2xl border border-[#2b333e] bg-[#0d1117] text-orange-300">
                    {categoryIcon(item.category)}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h4 className="truncate text-base font-black text-white">{item.name}</h4>
                        <div className="mt-1 truncate text-xs font-semibold text-white/32">
                          {[item.brand, item.model].filter(Boolean).join(" · ") || item.category}
                        </div>
                      </div>

                      <span className={cn("rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.1em]", statusBadge(item.status))}>
                        {item.status}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2">
                  <div className={cn(vv.inset, "px-3 py-2.5")}>
                    <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.1em] text-white/24">
                      <Hash className="h-3 w-3" />
                      Inventarnr.
                    </div>
                    <div className="mt-1 truncate text-xs font-bold text-white/60">{item.inventory_number || "—"}</div>
                  </div>

                  <div className={cn(vv.inset, "px-3 py-2.5")}>
                    <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.1em] text-white/24">
                      <CircleDot className="h-3 w-3" />
                      Menge
                    </div>
                    <div className="mt-1 text-xs font-bold text-white/60">{item.quantity}</div>
                  </div>

                  <div className={cn(vv.inset, "px-3 py-2.5")}>
                    <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.1em] text-white/24">
                      <MapPin className="h-3 w-3" />
                      Standort
                    </div>
                    <div className="mt-1 truncate text-xs font-bold text-white/60">{item.location || "—"}</div>
                  </div>

                  <div className={cn(vv.inset, "px-3 py-2.5")}>
                    <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.1em] text-white/24">
                      <Euro className="h-3 w-3" />
                      Wert
                    </div>
                    <div className="mt-1 truncate text-xs font-bold text-white/60">
                      {item.purchase_price ? formatCurrency(item.purchase_price * item.quantity) : "—"}
                    </div>
                  </div>
                </div>

                <div className="mt-3 space-y-1.5 text-xs font-semibold text-white/38">
                  {item.serial_number ? <div>Seriennr.: <span className="text-white/58">{item.serial_number}</span></div> : null}
                  {item.item_condition ? <div>Zustand: <span className="text-white/58">{item.item_condition}</span></div> : null}
                  {item.assigned_to ? (
                    <div className="flex items-center gap-2">
                      <UserRound className="h-3.5 w-3.5 text-white/22" />
                      <span className="truncate">Zugewiesen an: {item.assigned_to}</span>
                    </div>
                  ) : null}
                  {item.purchase_date ? (
                    <div className="flex items-center gap-2">
                      <CalendarDays className="h-3.5 w-3.5 text-white/22" />
                      <span>Kauf: {formatDate(item.purchase_date)}</span>
                    </div>
                  ) : null}
                </div>

                {item.notes ? (
                  <div className={cn(vv.inset, "mt-3 px-3 py-2.5 text-xs leading-5 text-white/42")}>
                    {item.notes}
                  </div>
                ) : null}

                <div className="mt-4 grid grid-cols-2 gap-2 print-hidden">
                  <Button variant="outline" size="sm" className={cn(vv.buttonSecondary, "h-9")} onClick={() => openEdit(item)}>
                    <Pencil className="mr-2 h-3.5 w-3.5" />
                    Bearbeiten
                  </Button>
                  <Button variant="outline" size="sm" className={cn(vv.buttonDanger, "h-9")} onClick={() => askDelete(item)}>
                    <Trash2 className="mr-2 h-3.5 w-3.5" />
                    Löschen
                  </Button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      <Modal
        open={formOpen}
        title={editingItem ? "Inventar bearbeiten" : "Inventar anlegen"}
        onClose={closeForm}
        footer={
          <>
            <Button variant="outline" onClick={closeForm} disabled={inventory.saving} className={cn(vv.buttonSecondary, "w-full sm:w-auto")}>
              Abbrechen
            </Button>
            <Button onClick={saveForm} disabled={inventory.saving || !form.name?.trim()} className={cn(vv.buttonPrimary, "w-full sm:w-auto")}>
              {editingItem ? "Änderungen speichern" : "Inventar speichern"}
            </Button>
          </>
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
          <>
            <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={inventory.saving} className={cn(vv.buttonSecondary, "w-full sm:w-auto")}>
              Abbrechen
            </Button>
            <Button variant="outline" onClick={confirmDelete} disabled={inventory.saving} className={cn(vv.buttonDanger, "w-full sm:w-auto")}>
              <Trash2 className="mr-2 h-4 w-4" />
              Endgültig löschen
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <div className="text-sm font-semibold text-white/55">
            Möchtest du <span className="font-black text-white">{deletingItem?.name}</span> wirklich löschen?
          </div>
          <div className="rounded-[18px] border border-rose-300/20 bg-rose-500/10 p-3.5 text-sm font-bold text-rose-100">
            Dieser Eintrag wird dauerhaft aus der Datenbank entfernt.
          </div>
        </div>
      </Modal>
    </>
  )
}
