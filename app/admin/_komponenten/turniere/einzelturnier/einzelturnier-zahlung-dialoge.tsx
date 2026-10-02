"use client"

import { AlertCircle, Euro, Lock } from "lucide-react"
import { Button } from "@/components/ui/button"

type InsufficientBalance = {
  open: boolean
  playerName?: string
  required?: number
  available?: number
}

type CreditConfirm = {
  open: boolean
  players?: Array<{
    id: number
    name: string
    currentBalance: number
    newBalance: number
    clubPlayerId: string
  }>
  playersWithoutCredit?: number[]
  entryFee?: number
}

type PaidLock = {
  open: boolean
  playerName?: string
}

type RefundConfirm = {
  open: boolean
  registrationId?: number
  playerName?: string
  refundAmount?: number
}

type RefundSuccess = {
  open: boolean
  playerName?: string
  refundAmount?: number
}

type Props = {
  insufficientBalance: InsufficientBalance
  onCloseInsufficientBalance: () => void
  creditConfirm: CreditConfirm
  onRegisterWithoutCredit: () => void
  onRegisterWithCredit: () => void
  isRegisteringPlayers: boolean
  paidLock: PaidLock
  onClosePaidLock: () => void
  refundConfirm: RefundConfirm
  onCloseRefundConfirm: () => void
  onConfirmRefund: () => void
  refundSuccess: RefundSuccess
  onCloseRefundSuccess: () => void
}

export function EinzelturnierZahlungDialoge({
  insufficientBalance,
  onCloseInsufficientBalance,
  creditConfirm,
  onRegisterWithoutCredit,
  onRegisterWithCredit,
  isRegisteringPlayers,
  paidLock,
  onClosePaidLock,
  refundConfirm,
  onCloseRefundConfirm,
  onConfirmRefund,
  refundSuccess,
  onCloseRefundSuccess,
}: Props) {
  return (
    <>
      {insufficientBalance.open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md">
          <div className="w-full max-w-md rounded-[28px] border border-white/10 bg-[#0b0d11]/95 p-7 text-white shadow-[0_35px_120px_-58px_rgba(0,0,0,.98)] backdrop-blur-2xl">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-orange-500/10">
              <AlertCircle className="h-7 w-7 text-orange-300" />
            </div>
            <h3 className="text-center text-2xl font-black">Nicht genug Guthaben</h3>
            <p className="mb-6 mt-1 text-center font-semibold text-white/55">{insufficientBalance.playerName}</p>

            <div className="mb-6 grid grid-cols-2 gap-4">
              <div className="rounded-2xl border border-red-300/15 bg-red-500/[0.07] p-4 text-center">
                <p className="mb-1 text-xs font-semibold text-red-300">Benötigt</p>
                <p className="text-2xl font-black text-red-200">{insufficientBalance.required?.toFixed(2)}€</p>
              </div>
              <div className="rounded-2xl border border-orange-300/15 bg-orange-500/[0.07] p-4 text-center">
                <p className="mb-1 text-xs font-semibold text-orange-300">Verfügbar</p>
                <p className="text-2xl font-black text-orange-200">{insufficientBalance.available?.toFixed(2)}€</p>
              </div>
            </div>

            <Button onClick={onCloseInsufficientBalance} className="w-full rounded-xl bg-orange-500 hover:bg-orange-400">
              Verstanden
            </Button>
          </div>
        </div>
      ) : null}

      {creditConfirm.open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md">
          <div className="w-full max-w-md rounded-[28px] border border-white/10 bg-[#0b0d11]/95 p-7 text-white shadow-[0_35px_120px_-58px_rgba(0,0,0,.98)] backdrop-blur-2xl">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-sky-500/10">
              <Euro className="h-7 w-7 text-sky-300" />
            </div>
            <h3 className="mb-4 text-center text-2xl font-black">Guthaben abziehen?</h3>

            {creditConfirm.players?.length ? (
              <div className="mb-5">
                <p className="mb-3 text-sm font-semibold text-white/55">Guthaben verfügbar:</p>
                <div className="max-h-60 space-y-2 overflow-y-auto">
                  {creditConfirm.players.map((player) => (
                    <div key={player.id} className="rounded-2xl border border-sky-300/15 bg-sky-500/[0.07] p-3">
                      <p className="font-bold text-white/90">{player.name}</p>
                      <div className="mt-1 flex justify-between text-sm text-white/50">
                        <span>{player.currentBalance.toFixed(2)}€</span>
                        <span className="font-semibold text-sky-200">→ {player.newBalance.toFixed(2)}€</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {creditConfirm.playersWithoutCredit?.length ? (
              <p className="mb-5 text-sm font-semibold text-orange-300">
                {creditConfirm.playersWithoutCredit.length} Spieler ohne Guthaben werden ohne Abzug registriert.
              </p>
            ) : null}

            <p className="mb-6 text-center text-sm text-white/55">
              Startgeld: {creditConfirm.entryFee?.toFixed(2)}€
            </p>

            <div className="flex gap-3">
              <Button
                onClick={onRegisterWithoutCredit}
                disabled={isRegisteringPlayers}
                variant="outline"
                className="flex-1 border-white/[0.10] bg-white/[0.025] text-white/70 hover:border-orange-300/15 hover:bg-white/[0.05] hover:text-white"
              >
                Ohne Abzug
              </Button>
              <Button
                onClick={onRegisterWithCredit}
                disabled={isRegisteringPlayers}
                className="flex-1 bg-orange-500 hover:bg-orange-400"
              >
                {isRegisteringPlayers ? "Wird verarbeitet…" : "Guthaben abziehen"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {paidLock.open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md">
          <div className="w-full max-w-md rounded-[28px] border border-white/10 bg-[#0b0d11]/95 p-7 text-white shadow-[0_35px_120px_-58px_rgba(0,0,0,.98)]">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-orange-500/10">
              <Lock className="h-7 w-7 text-orange-300" />
            </div>
            <h3 className="text-center text-2xl font-black">Status gesperrt</h3>
            <p className="mt-1 text-center font-semibold text-white/55">{paidLock.playerName}</p>
            <p className="my-6 text-center text-sm leading-6 text-white/45">
              Das Startgeld wurde automatisch vom Guthaben abgezogen. Der Bezahlstatus kann nicht geändert werden.
            </p>
            <Button onClick={onClosePaidLock} className="w-full bg-orange-500 hover:bg-orange-400">
              Verstanden
            </Button>
          </div>
        </div>
      ) : null}

      {refundConfirm.open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md">
          <div className="w-full max-w-md rounded-[28px] border border-white/10 bg-[#0b0d11]/95 p-7 text-white shadow-[0_35px_120px_-58px_rgba(0,0,0,.98)]">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-sky-500/10">
              <Euro className="h-7 w-7 text-sky-300" />
            </div>
            <h3 className="text-center text-2xl font-black">Guthaben zurückerstatten?</h3>
            <p className="mb-6 mt-1 text-center font-semibold text-white/55">{refundConfirm.playerName}</p>

            <div className="mb-6 rounded-2xl border border-sky-300/15 bg-sky-500/[0.07] p-4 text-center">
              <p className="text-sm text-white/50">Rückerstattung</p>
              <p className="mt-2 text-3xl font-black text-emerald-300">+{refundConfirm.refundAmount?.toFixed(2)}€</p>
            </div>

            <div className="flex gap-3">
              <Button onClick={onCloseRefundConfirm} variant="outline" className="flex-1 border-white/[0.10] bg-white/[0.025] text-white/70 hover:border-orange-300/15 hover:bg-white/[0.05] hover:text-white">
                Abbrechen
              </Button>
              <Button onClick={onConfirmRefund} className="flex-1 bg-sky-600 hover:bg-sky-500">
                Rückerstatten
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {refundSuccess.open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md">
          <div className="w-full max-w-md rounded-[28px] border border-white/10 bg-[#0b0d11]/95 p-7 text-white shadow-[0_35px_120px_-58px_rgba(0,0,0,.98)]">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10">
              <Euro className="h-7 w-7 text-emerald-300" />
            </div>
            <h3 className="text-center text-2xl font-black">Guthaben zurückerstattet</h3>
            <p className="mb-6 mt-1 text-center font-semibold text-white/55">{refundSuccess.playerName}</p>
            <div className="mb-6 rounded-2xl border border-emerald-300/15 bg-emerald-500/[0.07] p-4 text-center">
              <p className="text-3xl font-black text-emerald-300">+{refundSuccess.refundAmount?.toFixed(2)}€</p>
            </div>
            <Button onClick={onCloseRefundSuccess} className="w-full bg-emerald-600 hover:bg-emerald-500">
              Schließen
            </Button>
          </div>
        </div>
      ) : null}
    </>
  )
}
