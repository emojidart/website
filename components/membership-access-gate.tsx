"use client"

import { SectionSkeleton } from "@/components/loading/loading"

import { useEffect, useState, type ReactNode } from "react"
import Link from "next/link"
import { FileCheck2, LockKeyhole } from "lucide-react"

import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabase"
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
  const [documentsLoading, setDocumentsLoading] = useState(true)
  const [documentsBlocked, setDocumentsBlocked] = useState(false)

  useEffect(() => {
    let cancelled = false
    const loadDocumentGate = async () => {
      try {
        setDocumentsLoading(true)
        const { data: userRes } = await supabase.auth.getUser()
        const user = userRes.user
        if (!user) {
          if (!cancelled) setDocumentsBlocked(false)
          return
        }

        const { data: settings, error: settingsError } = await supabase
          .from("club_join_settings")
          .select("documents_enabled,existing_members_must_accept")
          .eq("id", "default")
          .maybeSingle()
        if (settingsError) throw settingsError
        if (!settings?.documents_enabled || !settings?.existing_members_must_accept) {
          if (!cancelled) setDocumentsBlocked(false)
          return
        }

        const [{ data: profile, error: profileError }, { data: docs, error: docsError }, { data: acceptance, error: acceptanceError }] = await Promise.all([
          supabase.from("user_profiles").select("player_id,club_players(birthdate)").eq("user_id", user.id).maybeSingle(),
          supabase.from("club_join_documents").select("id,version,is_required,minors_only").eq("is_active", true).eq("is_required", true),
          supabase.from("member_document_acceptances").select("document_acceptances,signed_at,guardian_full_name,guardian_signed_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
        ])
        if (profileError) throw profileError
        if (docsError) throw docsError
        if (acceptanceError) throw acceptanceError

        const birthdate = (profile as any)?.club_players?.birthdate || null
        let minor = false
        if (birthdate) {
          const birth = new Date(`${birthdate}T00:00:00`)
          const today = new Date()
          let age = today.getFullYear() - birth.getFullYear()
          const m = today.getMonth() - birth.getMonth()
          if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
          minor = age < 18
        }
        const applicable = (docs || []).filter((doc: any) => !doc.minors_only || minor)
        if (applicable.length === 0) {
          if (!cancelled) setDocumentsBlocked(false)
          return
        }
        const accepted = new Map<string, any>(((acceptance as any)?.document_acceptances || []).map((doc: any) => [doc.document_id, doc]))
        const docsOk = applicable.every((doc: any) => accepted.get(doc.id)?.version === doc.version && !!accepted.get(doc.id)?.accepted_at)
        const signed = !!(acceptance as any)?.signed_at
        const guardianOk = !minor || (!!(acceptance as any)?.guardian_full_name && !!(acceptance as any)?.guardian_signed_at)
        if (!cancelled) setDocumentsBlocked(!(docsOk && signed && guardianOk))
      } catch (e) {
        console.error("member document gate error:", e)
        if (!cancelled) setDocumentsBlocked(false)
      } finally {
        if (!cancelled) setDocumentsLoading(false)
      }
    }
    void loadDocumentGate()
    return () => { cancelled = true }
  }, [])

  const requiredCodes = Array.isArray(required) ? required : [required]

  if (loading || documentsLoading) {
    return (
      <SectionSkeleton kind="cards" />
    )
  }

  if (error) {
    return (
      <Card className="mx-auto mt-8 max-w-xl rounded-2xl border border-red-300/15 bg-card text-white shadow-[0_24px_70px_-48px_rgba(0,0,0,.95)] ">
        <CardContent className="p-6 text-center">
          <div className="font-semibold text-red-300">
            Mitgliedschaft konnte nicht geprüft werden
          </div>
          <div className="mt-2 text-sm font-semibold text-muted-foreground">{error}</div>
        </CardContent>
      </Card>
    )
  }

  if (documentsBlocked) {
    return (
      <Card className="mx-auto mt-8 max-w-xl overflow-hidden rounded-[24px] border border-amber-300/15 bg-card text-white shadow-[0_24px_70px_-48px_rgba(0,0,0,.95)] ">
        <CardContent className="p-6 text-center sm:p-8">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-300/15 bg-amber-500/[0.08] shadow-[0_0_24px_rgba(245,158,11,.08)]">
            <FileCheck2 className="h-7 w-7 text-amber-300" />
          </div>
          <h2 className="mt-4 text-xl font-semibold text-white">Vereinsunterlagen bestätigen</h2>
          <p className="mx-auto mt-2 max-w-md text-sm font-semibold text-muted-foreground">
            Die Vereinsleitung hat neue bzw. nachzuholende Pflichtunterlagen freigeschaltet. Bitte lies und unterschreibe sie zuerst.
          </p>
          <Button asChild className="mt-5 rounded-xl bg-orange-500 font-semibold text-primary-foreground shadow-[0_0_28px_rgba(249,115,22,.14)] hover:bg-orange-400 active:scale-[0.99]">
            <Link href="/member-profile-app#vereinsunterlagen">Unterlagen jetzt bestätigen</Link>
          </Button>
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
    <Card className="mx-auto mt-8 max-w-xl overflow-hidden rounded-[24px] border border-orange-300/15 bg-card text-white shadow-[0_24px_70px_-48px_rgba(0,0,0,.95)] ">
      <CardContent className="p-6 text-center sm:p-8">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-orange-300/15 bg-orange-500/[0.08] shadow-[0_0_24px_rgba(249,115,22,.08)]">
          <LockKeyhole className="h-7 w-7 text-orange-300" />
        </div>

        <h2 className="mt-4 text-xl font-semibold text-white">{title}</h2>

        <p className="mx-auto mt-2 max-w-md text-sm font-semibold text-muted-foreground">
          {!hasMembership
            ? "Für dein Konto ist derzeit keine aktive Mitgliedschaft hinterlegt."
            : description}
        </p>

        <Button
          asChild
          className="mt-5 rounded-xl bg-orange-500 font-semibold text-primary-foreground shadow-[0_0_28px_rgba(249,115,22,.14)] hover:bg-orange-400 active:scale-[0.99]"
        >
          <Link href="/member-membership">
            Mitgliedschaft ansehen
          </Link>
        </Button>
      </CardContent>
    </Card>
  )
}
