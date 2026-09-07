"use client"

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

interface ConfirmationModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  message: string
  onConfirm: () => void
}

export function ConfirmationModal({
  open,
  onOpenChange,
  title,
  message,
  onConfirm,
}: ConfirmationModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden border-0 p-0 sm:max-w-[460px] rounded-[26px] shadow-2xl text-center">
        <div className="bg-slate-950 px-6 py-6 text-white"><DialogHeader>
          <DialogTitle className="text-xl font-black text-white">{title}</DialogTitle>
        </DialogHeader></div>

        <DialogDescription className="mx-6 my-6 text-slate-600">{message}</DialogDescription>

        <DialogFooter className="flex justify-center gap-3 border-t border-slate-100 px-6 py-5">
          <Button onClick={() => onOpenChange(false)} variant="outline" className="h-11 rounded-xl border-slate-200">
            Abbrechen
          </Button>

          <Button
            onClick={() => {
              onConfirm()
              onOpenChange(false)
            }}
            variant="destructive" className="h-11 rounded-xl font-black"
          >
            Bestätigen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}