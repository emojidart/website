"use client"

import type React from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AlertCircle, CheckCircle, Loader2, ImageIcon as ImageIconLucide, XCircle } from "lucide-react"
import { cn } from "@/lib/utils"

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
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-800">
        {editingPlayerId ? "Spieler bearbeiten" : "Neuen Spieler hinzufügen"}
      </h3>

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="playerName">Spielername</Label>
          <Input
            id="playerName"
            type="text"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder="Name des Spielers"
            className="h-10 border-gray-200 focus:border-orange-500 focus:ring-orange-500 bg-gray-50/50"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="playerPhoto">Foto (optional)</Label>
          <div className="flex items-center space-x-3">
            <Input
              id="playerPhoto"
              type="file"
              accept="image/*"
              onChange={onPhotoChange}
              className="flex-1 h-10 border-gray-200 focus:border-orange-500 focus:ring-orange-500 bg-gray-50/50 file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100"
            />

            {playerPhotoPreview && (
              <div className="relative w-10 h-10 flex-shrink-0 rounded-full overflow-hidden border border-gray-200">
                <Image
                  src={playerPhotoPreview || "/placeholder.svg"}
                  alt="Vorschau Spielerfoto"
                  fill
                  style={{ objectFit: "cover" }}
                  className="rounded-full"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white hover:bg-red-600"
                  onClick={onRemovePhoto}
                >
                  <XCircle className="h-3 w-3" />
                  <span className="sr-only">Bild entfernen</span>
                </Button>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="playerStreet">Straße</Label>
            <Input
              id="playerStreet"
              type="text"
              value={playerStreet}
              onChange={(e) => setPlayerStreet(e.target.value)}
              placeholder="Straße"
              className="h-10 border-gray-200 focus:border-orange-500 focus:ring-orange-500 bg-gray-50/50"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="playerHouseNumber">Hausnummer</Label>
            <Input
              id="playerHouseNumber"
              type="text"
              value={playerHouseNumber}
              onChange={(e) => setPlayerHouseNumber(e.target.value)}
              placeholder="Hausnummer"
              className="h-10 border-gray-200 focus:border-orange-500 focus:ring-orange-500 bg-gray-50/50"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="playerPostalCode">PLZ</Label>
            <Input
              id="playerPostalCode"
              type="text"
              value={playerPostalCode}
              onChange={(e) => setPlayerPostalCode(e.target.value)}
              placeholder="PLZ"
              className="h-10 border-gray-200 focus:border-orange-500 focus:ring-orange-500 bg-gray-50/50"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="playerCity">Ort</Label>
            <Input
              id="playerCity"
              type="text"
              value={playerCity}
              onChange={(e) => setPlayerCity(e.target.value)}
              placeholder="Ort"
              className="h-10 border-gray-200 focus:border-orange-500 focus:ring-orange-500 bg-gray-50/50"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="playerBirthdate">Geburtsdatum</Label>
            <Input
              id="playerBirthdate"
              type="date"
              value={playerBirthdate}
              onChange={(e) => setPlayerBirthdate(e.target.value)}
              className="h-10 border-gray-200 focus:border-orange-500 focus:ring-orange-500 bg-gray-50/50"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="playerNumber">Spielernummer</Label>
            <Input
              id="playerNumber"
              type="number"
              value={playerNumber}
              onChange={(e) => setPlayerNumber(e.target.value)}
              placeholder="Nr."
              className="h-10 border-gray-200 focus:border-orange-500 focus:ring-orange-500 bg-gray-50/50"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="playerJerseySize">Trikotgröße</Label>
            <Input
              id="playerJerseySize"
              type="text"
              value={playerJerseySize}
              onChange={(e) => setPlayerJerseySize(e.target.value)}
              placeholder="z.B. M, L, XL"
              className="h-10 border-gray-200 focus:border-orange-500 focus:ring-orange-500 bg-gray-50/50"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="playerEmail">E-Mail</Label>
            <Input
              id="playerEmail"
              type="email"
              value={playerEmail}
              onChange={(e) => setPlayerEmail(e.target.value)}
              placeholder="E-Mail"
              className="h-10 border-gray-200 focus:border-orange-500 focus:ring-orange-500 bg-gray-50/50"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="playerPhone">Telefon</Label>
            <Input
              id="playerPhone"
              type="text"
              value={playerPhone}
              onChange={(e) => setPlayerPhone(e.target.value)}
              placeholder="Telefon"
              className="h-10 border-gray-200 focus:border-orange-500 focus:ring-orange-500 bg-gray-50/50"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="playerIban">IBAN</Label>
            <Input
              id="playerIban"
              type="text"
              value={playerIban}
              onChange={(e) => setPlayerIban(e.target.value)}
              placeholder="IBAN"
              className="h-10 border-gray-200 focus:border-orange-500 focus:ring-orange-500 bg-gray-50/50"
            />
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            type="submit"
            disabled={playerLoading}
            className="flex-1 h-10 bg-orange-600 hover:bg-orange-700 text-white font-medium rounded-lg shadow-md"
          >
            {playerLoading ? (
              <div className="flex items-center space-x-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>{editingPlayerId ? "Wird aktualisiert..." : "Wird hinzugefügt..."}</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <ImageIconLucide className="h-4 w-4" />
                <span>{editingPlayerId ? "Änderungen speichern" : "Spieler hinzufügen"}</span>
              </div>
            )}
          </Button>

          {editingPlayerId && (
            <Button
              type="button"
              onClick={onCancelEdit}
              variant="outline"
              disabled={playerLoading}
              className="h-10 border-gray-200 text-gray-600 hover:bg-gray-100 hover:text-gray-800 font-medium rounded-lg shadow-md bg-transparent"
            >
              <XCircle className="h-4 w-4 mr-2" />
              Abbrechen
            </Button>
          )}
        </div>
      </form>

      {playerMessage && (
        <div
          className={cn(
            "p-3 rounded-lg text-sm font-medium flex items-center space-x-2",
            playerMessageType === "error"
              ? "bg-red-50 text-red-700 border border-red-100"
              : playerMessageType === "success"
                ? "bg-green-50 text-green-700 border border-green-100"
                : "bg-gray-50 text-gray-700 border border-gray-100",
          )}
        >
          {playerMessageType === "error" ? (
            <AlertCircle className="h-4 w-4" />
          ) : playerMessageType === "success" ? (
            <CheckCircle className="h-4 w-4" />
          ) : (
            <Loader2 className="h-4 w-4 animate-spin" />
          )}
          <span>{playerMessage}</span>
        </div>
      )}
    </div>
  )
}
