"use client"

import type { ReactNode } from "react"
import Link from "next/link"
import { Loader2, LockKeyhole } from "lucide-react"

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
    return (
      <div className="flex min-h-[320px] items-center justify-center">
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-600">
          <Loader2 className="h-5 w-5 animate-spin" />
          Zugriff wird geprüft...
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <Card className="mx-auto mt-8 max-w-xl rounded-2xl border-red-200">
        <CardContent className="p-6 text-center">
          <div className="font-black text-red-700">
            Mitgliedschaft konnte nicht geprüft werden
          </div>
          <div className="mt-2 text-sm font-semibold text-gray-600">{error}</div>
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
    <Card className="mx-auto mt-8 max-w-xl overflow-hidden rounded-2xl border-orange-200 bg-white shadow-sm">
      <CardContent className="p-6 text-center sm:p-8">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-50">
          <LockKeyhole className="h-7 w-7 text-orange-600" />
        </div>

        <h2 className="mt-4 text-xl font-black text-gray-900">{title}</h2>

        <p className="mx-auto mt-2 max-w-md text-sm font-semibold text-gray-600">
          {!hasMembership
            ? "Für dein Konto ist derzeit keine aktive Mitgliedschaft hinterlegt."
            : description}
        </p>

        <Button
          asChild
          className="mt-5 rounded-xl bg-orange-600 font-black text-white hover:bg-orange-700"
        >
          <Link href="/member-membership">
            Mitgliedschaft ansehen
          </Link>
        </Button>
      </CardContent>
    </Card>
  )
}
