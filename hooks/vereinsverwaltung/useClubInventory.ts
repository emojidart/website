"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import type { User } from "@supabase/supabase-js"
import { supabase } from "@/lib/supabase"

export type InventoryCategory =
  | "Laptop"
  | "Monitor"
  | "Tablet"
  | "Smartphone"
  | "Drucker"
  | "Netzwerk"
  | "Zubehör"
  | "Sonstiges"

export type InventoryStatus = "aktiv" | "im-einsatz" | "in-reparatur" | "ausgemustert"

export interface ClubInventoryItem {
  id: string
  owner_user_id: string
  name: string
  category: InventoryCategory
  brand: string | null
  model: string | null
  serial_number: string | null
  inventory_number: string | null
  quantity: number
  location: string | null
  status: InventoryStatus
  item_condition: string | null
  purchase_date: string | null
  purchase_price: number | null
  assigned_to: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export type InventoryItemInput = {
  name: string
  category: InventoryCategory
  brand?: string | null
  model?: string | null
  serial_number?: string | null
  inventory_number?: string | null
  quantity?: number
  location?: string | null
  status?: InventoryStatus
  item_condition?: string | null
  purchase_date?: string | null
  purchase_price?: number | null
  assigned_to?: string | null
  notes?: string | null
}

function cleanText(value?: string | null) {
  const v = String(value ?? "").trim()
  return v.length ? v : null
}

function cleanPrice(value?: number | null) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return null
  return Number(value)
}

export function useClubInventory(user: User | null) {
  const [items, setItems] = useState<ClubInventoryItem[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [messageType, setMessageType] = useState<"success" | "error" | null>(null)

  const setFlash = useCallback((type: "success" | "error", msg: string) => {
    setMessageType(type)
    setMessage(msg)
    window.setTimeout(() => {
      setMessage(null)
      setMessageType(null)
    }, 4500)
  }, [])

  const fetchItems = useCallback(async () => {
    if (!user) {
      setItems([])
      return
    }

    setLoading(true)
    try {
      const { data, error } = await supabase
        .from("club_inventory")
        .select("*")
        .eq("owner_user_id", user.id)
        .order("name", { ascending: true })

      if (error) throw error
      setItems((data ?? []) as ClubInventoryItem[])
    } catch (err: any) {
      setFlash("error", err?.message ?? "Inventar konnte nicht geladen werden")
    } finally {
      setLoading(false)
    }
  }, [setFlash, user])

  useEffect(() => {
    fetchItems()
  }, [fetchItems])

  const totals = useMemo(() => {
    const positions = items.length
    const units = items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0)
    const value = items.reduce((sum, item) => sum + (Number(item.purchase_price) || 0) * (Number(item.quantity) || 0), 0)
    return { positions, units, value }
  }, [items])

  const createItem = useCallback(
    async (input: InventoryItemInput) => {
      if (!user) return
      setSaving(true)
      try {
        const payload = {
          owner_user_id: user.id,
          name: input.name.trim(),
          category: input.category,
          brand: cleanText(input.brand),
          model: cleanText(input.model),
          serial_number: cleanText(input.serial_number),
          inventory_number: cleanText(input.inventory_number),
          quantity: Math.max(1, Number(input.quantity || 1)),
          location: cleanText(input.location),
          status: input.status ?? "aktiv",
          item_condition: cleanText(input.item_condition),
          purchase_date: cleanText(input.purchase_date),
          purchase_price: cleanPrice(input.purchase_price),
          assigned_to: cleanText(input.assigned_to),
          notes: cleanText(input.notes),
        }

        const { error } = await supabase.from("club_inventory").insert(payload)
        if (error) throw error

        setFlash("success", `Inventar hinzugefügt: ${payload.name}`)
        await fetchItems()
      } catch (err: any) {
        setFlash("error", err?.message ?? "Inventar konnte nicht gespeichert werden")
        throw err
      } finally {
        setSaving(false)
      }
    },
    [fetchItems, setFlash, user],
  )

  const updateItem = useCallback(
    async (id: string, input: InventoryItemInput) => {
      if (!user) return
      setSaving(true)
      try {
        const payload = {
          name: input.name.trim(),
          category: input.category,
          brand: cleanText(input.brand),
          model: cleanText(input.model),
          serial_number: cleanText(input.serial_number),
          inventory_number: cleanText(input.inventory_number),
          quantity: Math.max(1, Number(input.quantity || 1)),
          location: cleanText(input.location),
          status: input.status ?? "aktiv",
          item_condition: cleanText(input.item_condition),
          purchase_date: cleanText(input.purchase_date),
          purchase_price: cleanPrice(input.purchase_price),
          assigned_to: cleanText(input.assigned_to),
          notes: cleanText(input.notes),
        }

        const { error } = await supabase
          .from("club_inventory")
          .update(payload)
          .eq("id", id)
          .eq("owner_user_id", user.id)

        if (error) throw error

        setFlash("success", `Inventar aktualisiert: ${payload.name}`)
        await fetchItems()
      } catch (err: any) {
        setFlash("error", err?.message ?? "Inventar konnte nicht aktualisiert werden")
        throw err
      } finally {
        setSaving(false)
      }
    },
    [fetchItems, setFlash, user],
  )

  const deleteItem = useCallback(
    async (id: string, name: string) => {
      if (!user) return
      setSaving(true)
      try {
        const { error } = await supabase.from("club_inventory").delete().eq("id", id).eq("owner_user_id", user.id)
        if (error) throw error

        setFlash("success", `Inventar gelöscht: ${name}`)
        await fetchItems()
      } catch (err: any) {
        setFlash("error", err?.message ?? "Inventar konnte nicht gelöscht werden")
        throw err
      } finally {
        setSaving(false)
      }
    },
    [fetchItems, setFlash, user],
  )

  return {
    items,
    loading,
    saving,
    message,
    messageType,
    totals,
    fetchItems,
    createItem,
    updateItem,
    deleteItem,
  }
}
