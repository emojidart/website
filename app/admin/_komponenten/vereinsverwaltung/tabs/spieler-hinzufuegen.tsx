"use client"

import type React from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AlertCircle, CheckCircle, Loader2, ImageIcon as ImageIconLucide, XCircle, UserRound, MapPin, Phone, CreditCard, Shirt, CalendarDays, Hash, Mail } from "lucide-react"
import { cn } from "@/lib/utils"
import { vv } from "../vereinsverwaltung-styles"

type MessageType = "success" | "error" | "info"

type Props = {
  editingPlayerId: string | null

  playerName: string
  setPlayerName: (v: string) => void

  playerPhotoPreview: string | null
  onPhotoChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onRemovePhoto: () => void

  playerStreet: string
  setPlayerStreet: (v: string) => void
  playerHouseNumber: string
  setPlayerHouseNumber: (v: string) => void
  playerPostalCode: string
  setPlayerPostalCode: (v: string) => void
  playerCity: string
  setPlayerCity: (v: string) => void
  playerBirthdate: string
  setPlayerBirthdate: (v: string) => void
  playerNumber: number | string
  setPlayerNumber: (v: number | string) => void

  playerJerseySize: string
  setPlayerJerseySize: (v: string) => void
  playerEmail: string
  setPlayerEmail: (v: string) => void
  playerPhone: string
  setPlayerPhone: (v: string) => void
  playerIban: string
  setPlayerIban: (v: string) => void

  playerLoading: boolean
  playerMessage: string
  playerMessageType: MessageType

  onSubmit: (e: React.FormEvent) => void
  onCancelEdit: () => void
}

export function AddPlayerTab(props: Props) {
  const {
    editingPlayerId,
    playerName,
    setPlayerName,
    playerPhotoPreview,
    onPhotoChange,
    onRemovePhoto,
    playerStreet,
    setPlayerStreet,
    playerHouseNumber,
    setPlayerHouseNumber,
    playerPostalCode,
    setPlayerPostalCode,
    playerCity,
    setPlayerCity,
    playerBirthdate,
    setPlayerBirthdate,
    playerNumber,
    setPlayerNumber,
    playerJerseySize,
    setPlayerJerseySize,
    playerEmail,
    setPlayerEmail,
    playerPhone,
    setPlayerPhone,
    playerIban,
    setPlayerIban,
    playerLoading,
    playerMessage,
    playerMessageType,
    onSubmit,
    onCancelEdit,
  } = props

  return (
    <div className="flex min-h-0 max-h-[calc(100dvh-1rem)] flex-col bg-[#090c11] text-white sm:max-h-[88dvh]">
      <div className={cn(vv.modalHeader, "flex items-start justify-between gap-4")}>
        <div className="flex min-w-0 items-center gap-3.5">
          <div className="flex h-11 w-11 flex-none items-center justify-center rounded-2xl border border-orange-300/20 bg-orange-500/[0.10]">
            <UserRound className="h-5 w-5 text-orange-300" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-black uppercase tracking-[0.16em] text-orange-200/50">Mitgliederdaten</div>
            <h3 className="mt-0.5 truncate text-xl font-black tracking-tight text-white sm:text-2xl">
              {editingPlayerId ? "Spieler bearbeiten" : "Spieler anlegen"}
            </h3>
            <p className="mt-1 hidden text-sm text-white/35 sm:block">
              Stammdaten und Kontaktdaten übersichtlich bearbeiten.
            </p>
          </div>
        </div>

        {editingPlayerId ? (
          <button
            type="button"
            onClick={onCancelEdit}
            disabled={playerLoading}
            className="flex h-9 w-9 flex-none items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.025] text-white/35 transition hover:bg-white/[0.06] hover:text-white disabled:opacity-40"
            aria-label="Schließen"
          >
            <XCircle className="h-4.5 w-4.5" />
          </button>
        ) : null}
      </div>

      <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
        <div className={vv.modalBody}>
          <div className="grid gap-4 lg:grid-cols-[210px_minmax(0,1fr)]">
            <div className="space-y-4">
              <section className="rounded-[22px] border border-[#252c36] bg-[#10141b] p-4">
                <div className="text-[10px] font-black uppercase tracking-[0.14em] text-white/30">Profilbild</div>
                <div className="mt-3 flex items-center gap-3 lg:flex-col lg:items-stretch">
                  <div className="relative h-20 w-20 flex-none overflow-hidden rounded-[22px] border border-white/[0.10] bg-black/25 lg:h-36 lg:w-full">
                    {playerPhotoPreview ? (
                      <Image src={playerPhotoPreview} alt="Vorschau Spielerfoto" fill className="object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <UserRound className="h-8 w-8 text-white/16" />
                      </div>
                    )}
                    {playerPhotoPreview ? (
                      <button
                        type="button"
                        onClick={onRemovePhoto}
                        className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-xl border border-white/[0.10] bg-black/70 text-white/60 backdrop-blur hover:text-white"
                        aria-label="Bild entfernen"
                      >
                        <XCircle className="h-3.5 w-3.5" />
                      </button>
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <Label htmlFor="playerPhoto" className="mb-2 block text-xs font-black text-white/55">Foto auswählen</Label>
                    <Input
                      id="playerPhoto"
                      type="file"
                      accept="image/*"
                      onChange={onPhotoChange}
                      className={vv.input}
                    />
                  </div>
                </div>
              </section>

              <section className="hidden rounded-[22px] border border-[#202731] bg-[#0d1117] p-4 lg:block">
                <div className="flex gap-2 text-xs leading-5 text-white/32">
                  <ImageIconLucide className="mt-0.5 h-3.5 w-3.5 flex-none text-orange-300/60" />
                  Änderungen werden direkt im bestehenden Mitglied gespeichert. Mannschaftszuordnungen bleiben unverändert.
                </div>
              </section>
            </div>

            <div className="space-y-4">
              <section className="rounded-[22px] border border-[#252c36] bg-[#10141b] p-4 sm:p-5">
                <div className="mb-4 flex items-center gap-2">
                  <UserRound className="h-4 w-4 text-sky-300" />
                  <div className="text-sm font-black text-white">Persönliche Daten</div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <Label htmlFor="playerName" className="mb-1.5 block text-[10px] font-black uppercase tracking-[0.10em] text-white/35">Spielername</Label>
                    <Input id="playerName" value={playerName} onChange={(e) => setPlayerName(e.target.value)} placeholder="Name des Spielers" className={vv.input} required />
                  </div>

                  <div>
                    <Label htmlFor="playerBirthdate" className="mb-1.5 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.10em] text-white/35"><CalendarDays className="h-3 w-3" /> Geburtsdatum</Label>
                    <Input id="playerBirthdate" type="date" value={playerBirthdate} onChange={(e) => setPlayerBirthdate(e.target.value)} className={vv.input} />
                  </div>

                  <div>
                    <Label htmlFor="playerNumber" className="mb-1.5 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.10em] text-white/35"><Hash className="h-3 w-3" /> Spielernummer</Label>
                    <Input id="playerNumber" type="number" value={playerNumber} onChange={(e) => setPlayerNumber(e.target.value)} placeholder="Nr." className={vv.input} />
                  </div>

                  <div>
                    <Label htmlFor="playerJerseySize" className="mb-1.5 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.10em] text-white/35"><Shirt className="h-3 w-3" /> Trikotgröße</Label>
                    <Input id="playerJerseySize" value={playerJerseySize} onChange={(e) => setPlayerJerseySize(e.target.value)} placeholder="z. B. L" className={vv.input} />
                  </div>
                </div>
              </section>

              <section className="rounded-[22px] border border-[#252c36] bg-[#10141b] p-4 sm:p-5">
                <div className="mb-4 flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-orange-300" />
                  <div className="text-sm font-black text-white">Adresse</div>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_130px]">
                  <div>
                    <Label htmlFor="playerStreet" className="mb-1.5 block text-[10px] font-black uppercase tracking-[0.10em] text-white/35">Straße</Label>
                    <Input id="playerStreet" value={playerStreet} onChange={(e) => setPlayerStreet(e.target.value)} placeholder="Straße" className={vv.input} />
                  </div>
                  <div>
                    <Label htmlFor="playerHouseNumber" className="mb-1.5 block text-[10px] font-black uppercase tracking-[0.10em] text-white/35">Hausnummer</Label>
                    <Input id="playerHouseNumber" value={playerHouseNumber} onChange={(e) => setPlayerHouseNumber(e.target.value)} placeholder="Nr." className={vv.input} />
                  </div>
                  <div>
                    <Label htmlFor="playerPostalCode" className="mb-1.5 block text-[10px] font-black uppercase tracking-[0.10em] text-white/35">PLZ</Label>
                    <Input id="playerPostalCode" value={playerPostalCode} onChange={(e) => setPlayerPostalCode(e.target.value)} placeholder="PLZ" className={vv.input} />
                  </div>
                  <div>
                    <Label htmlFor="playerCity" className="mb-1.5 block text-[10px] font-black uppercase tracking-[0.10em] text-white/35">Ort</Label>
                    <Input id="playerCity" value={playerCity} onChange={(e) => setPlayerCity(e.target.value)} placeholder="Ort" className={vv.input} />
                  </div>
                </div>
              </section>

              <section className="rounded-[22px] border border-[#252c36] bg-[#10141b] p-4 sm:p-5">
                <div className="mb-4 flex items-center gap-2">
                  <Phone className="h-4 w-4 text-emerald-300" />
                  <div className="text-sm font-black text-white">Kontakt & Abrechnung</div>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="playerEmail" className="mb-1.5 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.10em] text-white/35"><Mail className="h-3 w-3" /> E-Mail</Label>
                    <Input id="playerEmail" type="email" value={playerEmail} onChange={(e) => setPlayerEmail(e.target.value)} placeholder="E-Mail" className={vv.input} />
                  </div>
                  <div>
                    <Label htmlFor="playerPhone" className="mb-1.5 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.10em] text-white/35"><Phone className="h-3 w-3" /> Telefon</Label>
                    <Input id="playerPhone" value={playerPhone} onChange={(e) => setPlayerPhone(e.target.value)} placeholder="Telefon" className={vv.input} />
                  </div>
                  <div className="sm:col-span-2">
                    <Label htmlFor="playerIban" className="mb-1.5 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.10em] text-white/35"><CreditCard className="h-3 w-3" /> IBAN</Label>
                    <Input id="playerIban" value={playerIban} onChange={(e) => setPlayerIban(e.target.value)} placeholder="IBAN" className={vv.input} />
                  </div>
                </div>
              </section>

              {playerMessage ? (
                <div className={cn(
                  "flex items-start gap-2 rounded-2xl border p-3.5 text-sm font-bold",
                  playerMessageType === "error"
                    ? "border-rose-300/20 bg-rose-500/[0.08] text-rose-100"
                    : playerMessageType === "success"
                      ? "border-emerald-300/20 bg-emerald-500/[0.08] text-emerald-100"
                      : "border-white/[0.08] bg-white/[0.035] text-white/60",
                )}>
                  {playerMessageType === "error" ? <AlertCircle className="mt-0.5 h-4 w-4 flex-none" /> : playerMessageType === "success" ? <CheckCircle className="mt-0.5 h-4 w-4 flex-none" /> : <Loader2 className="mt-0.5 h-4 w-4 flex-none animate-spin" />}
                  <span>{playerMessage}</span>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className={vv.modalFooter}>
          {editingPlayerId ? (
            <Button type="button" onClick={onCancelEdit} variant="outline" disabled={playerLoading} className={cn(vv.buttonSecondary, "w-full sm:w-auto sm:min-w-32")}>
              Abbrechen
            </Button>
          ) : null}
          <Button type="submit" disabled={playerLoading} className={cn(vv.buttonPrimary, "w-full sm:w-auto sm:min-w-48")}>
            {playerLoading ? (
              <span className="flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />{editingPlayerId ? "Wird gespeichert…" : "Wird angelegt…"}</span>
            ) : (
              <span className="flex items-center justify-center gap-2"><CheckCircle className="h-4 w-4" />{editingPlayerId ? "Änderungen speichern" : "Spieler anlegen"}</span>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
