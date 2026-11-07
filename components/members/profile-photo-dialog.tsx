"use client"



import type { ChangeEvent } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Upload } from "lucide-react"

export function ProfilePhotoDialog({ open, onOpenChange, onFileChange, preview, message, busy, canSubmit, onSubmit }: {
  open: boolean; onOpenChange: (open: boolean) => void; onFileChange: (event: ChangeEvent<HTMLInputElement>) => void
  preview: string | null; message: string; busy: boolean; canSubmit: boolean; onSubmit: () => void
}) {
  return <Dialog open={open} onOpenChange={value => { if (!busy) onOpenChange(value) }}>
    <DialogContent>
      <DialogHeader><DialogTitle>Profilfoto ändern</DialogTitle><DialogDescription>Wähle ein neues Foto und sende eine Änderungsanfrage. Dein bisheriges Profilfoto bleibt bis zur Freigabe durch den Vorstand erhalten.</DialogDescription></DialogHeader>
      <label htmlFor="member-profile-photo" className="text-sm font-semibold">Neues Profilfoto</label>
      <input id="member-profile-photo" type="file" accept="image/*" disabled={busy} onChange={onFileChange} className="w-full rounded-xl border border-border bg-muted p-3 text-base file:mr-3 file:rounded-lg file:border-0 file:bg-secondary file:px-3 file:py-2 file:text-foreground"/>
      {preview && <img src={preview} alt="Vorschau des ausgewählten Profilfotos" className="mx-auto h-32 w-32 rounded-2xl border border-border object-cover"/>}
      {message && <p role="status" className="rounded-xl border border-border bg-muted p-3 text-sm">{message}</p>}
      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" disabled={busy} onClick={() => onOpenChange(false)}>Abbrechen</Button>
        <Button type="button" disabled={!canSubmit || busy} onClick={onSubmit} loading={Boolean(busy)}><Upload/>{busy ? "Wird gesendet…" : "Foto zur Freigabe senden"}</Button>
      </div>
    </DialogContent>
  </Dialog>
}
