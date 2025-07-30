"use client"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Trash2, XCircle } from "lucide-react"

interface DeletePhotoConfirmationModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  playerName: string | null
}

export function DeletePhotoConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  playerName,
}: DeletePhotoConfirmationModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-sm mx-auto bg-white/95 backdrop-blur-sm border-0 shadow-2xl">
        <DialogHeader className="border-b border-gray-100 pb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-br from-red-500 to-red-600 rounded-lg shadow-lg">
              <Trash2 className="h-5 w-5 text-white" />
            </div>
            <div>
              <DialogTitle className="text-lg font-semibold text-gray-900">Profilbild löschen</DialogTitle>
              <DialogDescription className="text-sm text-gray-500 mt-1">
                Diese Aktion kann nicht rückgängig gemacht werden.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="py-4 text-center">
          <p className="text-base text-gray-700">
            Möchten Sie das Profilbild für <span className="font-semibold text-gray-900">{playerName}</span> wirklich
            löschen?
          </p>
        </div>

        <DialogFooter className="pt-4 border-t border-gray-100">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="border-gray-200 hover:bg-gray-50 bg-transparent"
          >
            <XCircle className="h-4 w-4 mr-2" />
            Abbrechen
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            className="bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg shadow-md hover:shadow-lg"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Löschen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
