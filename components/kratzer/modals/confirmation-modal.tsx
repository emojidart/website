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
      <DialogContent className="sm:max-w-[425px] p-6 rounded-2xl shadow-sm text-center">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-gray-900">{title}</DialogTitle>
        </DialogHeader>

        <DialogDescription className="text-gray-600 my-4">{message}</DialogDescription>

        <DialogFooter className="flex justify-center gap-4 mt-6">
          <Button onClick={() => onOpenChange(false)} variant="outline">
            Abbrechen
          </Button>

          <Button
            onClick={() => {
              onConfirm()
              onOpenChange(false)
            }}
            variant="destructive"
          >
            Bestätigen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}