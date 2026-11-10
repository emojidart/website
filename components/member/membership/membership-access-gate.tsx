"use client"

import { SectionSkeleton } from "@/components/loading/loading"

import type { ReactNode } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { LockKeyhole } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  type MembershipModuleCode,
  useMembershipAccess,
} from "@/hooks/use-membership-access"

type MembershipAccessGateProps = {
  required: MembershipModuleCode | MembershipModuleCode[]
  children: ReactNode
  title?: string
  description?: string
  requireAll?: boolean
}

export function MembershipAccessGate({
  required,
  children,
  title = "Dieses Modul ist nicht freigeschaltet",
  description = "Dieser Bereich ist in deiner aktuellen Mitgliedschaft nicht enthalten.",
  requireAll = true,
}: MembershipAccessGateProps) {
  const pathname = usePathname()
  const isMessenger = pathname === "/chat-app" || pathname.startsWith("/chat-app/")

  const {
    loading,
    error,
    hasMembership,
    hasModule,
    hasAllModules,
    hasAnyModule,
  } = useMembershipAccess()

  const requiredCodes = Array.isArray(required) ? required : [required]

  if (loading) {
    // Im EMD Messenger keinen sichtbaren Zwischenbildschirm anzeigen.
    // Die Prüfung läuft weiter; sobald sie fertig ist, greift allowed/error wie bisher.
    if (isMessenger) return <>{children}</>

    return (
      <SectionSkeleton kind="cards" />
    )
  }

  if (error) {
    return (
      <Card className="mx-auto mt-8 max-w-xl rounded-2xl border-red-200">
        <CardContent className="p-6 text-center">
          <div className="font-semibold text-red-700">
            Mitgliedschaft konnte nicht geprüft werden
          </div>
          <div className="mt-2 text-sm font-semibold text-muted-foreground">{error}</div>
        </CardContent>
      </Card>
    )
  }

  const allowed =
    requiredCodes.length === 1
      ? hasModule(requiredCodes[0])
      : requireAll
        ? hasAllModules(requiredCodes)
        : hasAnyModule(requiredCodes)

  if (allowed) {
    return <>{children}</>
  }

  return (
    <Card className="mx-auto mt-8 max-w-xl overflow-hidden rounded-2xl border-orange-200 bg-card shadow-sm">
      <CardContent className="p-6 text-center sm:p-8">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-50">
          <LockKeyhole className="h-7 w-7 text-orange-600" />
        </div>

        <h2 className="mt-4 text-xl font-semibold text-foreground">{title}</h2>

        <p className="mx-auto mt-2 max-w-md text-sm font-semibold text-muted-foreground">
          {!hasMembership
            ? "Für dein Konto ist derzeit keine aktive Mitgliedschaft hinterlegt."
            : description}
        </p>

        <Button
          asChild
          className="mt-5 rounded-xl bg-primary font-semibold text-primary-foreground hover:bg-orange-700"
        >
          <Link href="/member-membership">
            Mitgliedschaft ansehen
          </Link>
        </Button>
      </CardContent>
    </Card>
  )
}
