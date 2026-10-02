"use client"

export const dynamic = "force-dynamic"

import type React from "react"
import { Suspense, useEffect, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"

import { Header } from "@/components/header"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

import { supabase } from "@/lib/supabase"
import { useAuth } from "@/hooks/use-auth"

import { Mail, Lock, Users, Eye, EyeOff, KeyRound, UserRound, ArrowRight } from "lucide-react"

export default function MemberLoginPage() {
  return (
    <Suspense fallback={<LoginSkeleton />}>
      <MemberLoginClient />
    </Suspense>
  )
}

function LoginSkeleton() {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#050608] text-white">
      <Header />
      <style jsx global>{`
        input:-webkit-autofill,
        input:-webkit-autofill:hover,
        input:-webkit-autofill:focus,
        input:-webkit-autofill:active {
          -webkit-text-fill-color: #ffffff !important;
          caret-color: #ffffff !important;
          -webkit-box-shadow: 0 0 0 1000px #111418 inset !important;
          box-shadow: 0 0 0 1000px #111418 inset !important;
          transition: background-color 9999s ease-out 0s !important;
        }
      `}</style>
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-[#050608]">
        <div
          className="absolute inset-0 bg-cover bg-[66%_50%] bg-no-repeat opacity-[0.34]"
          style={{ backgroundImage: "url('/terminal/hero-startscreen.png')" }}
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(3,5,8,.66),rgba(3,5,9,.93)_46%,rgba(2,4,7,.985))]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_8%_18%,rgba(249,115,22,.17),transparent_26%),radial-gradient(circle_at_88%_30%,rgba(14,165,233,.14),transparent_28%),radial-gradient(circle_at_52%_84%,rgba(99,102,241,.08),transparent_24%)]" />
      </div>
      <main className="relative z-10 flex min-h-screen items-center justify-center px-4 pb-24 pt-20">
        <div className="flex flex-col items-center gap-4 rounded-[24px] border border-white/10 bg-black/35 px-7 py-6 backdrop-blur-2xl">
          <div className="h-9 w-9 animate-spin rounded-full border-2 border-white/15 border-t-orange-400" />
          <span className="text-sm font-bold text-white/45">Zugang wird vorbereitet…</span>
        </div>
      </main>
      <MobileBottomNav />
    </div>
  )
}

function MemberLoginClient() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [redirecting, setRedirecting] = useState(false)
  const [resetLoading, setResetLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [wrongLoginType, setWrongLoginType] = useState<"guest" | null>(null)
  const [rememberEmail, setRememberEmail] = useState(true)

  const router = useRouter()
  const searchParams = useSearchParams()
  const { session, loading: authLoading } = useAuth()
  const loginAttemptRef = useRef(false)

  const mapAuthError = (error: any) => {
    const msg = error?.message?.toLowerCase() || ""

    if (msg.includes("invalid login credentials")) {
      return "E-Mail oder Passwort ist nicht korrekt."
    }

    if (msg.includes("email not confirmed")) {
      return "Bitte bestätige zuerst deine E-Mail-Adresse."
    }

    if (msg.includes("too many requests")) {
      return "Zu viele Versuche. Bitte warte kurz und versuche es erneut."
    }

    return "Anmeldung fehlgeschlagen. Bitte überprüfe deine Eingaben."
  }

  const hasActiveMemberAccess = async (
    userId: string,
    playerId?: string | number | null,
  ) => {
    const today = new Date().toISOString().split("T")[0]

    const { data: joinRequest, error: joinError } = await supabase
      .from("club_join_requests")
      .select("id,status")
      .eq("user_id", userId)
      .eq("status", "approved")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (joinError) {
      console.error("Member login join request check failed:", joinError)
      return false
    }

    if (!joinRequest || !playerId) return false

    const [
      { data: memberships, error: membershipError },
      { data: trials, error: trialError },
    ] = await Promise.all([
      supabase
        .from("member_memberships")
        .select("status,starts_on,ends_on")
        .eq("player_id", playerId)
        .eq("status", "active"),
      supabase
        .from("membership_trials")
        .select("status,starts_on,ends_on")
        .eq("player_id", playerId)
        .eq("status", "active")
        .lte("starts_on", today)
        .gte("ends_on", today),
    ])

    if (membershipError) {
      console.error("Member login membership check failed:", membershipError)
    }

    if (trialError) {
      console.error("Member login trial check failed:", trialError)
    }

    const membershipActive = (memberships ?? []).some(
      (membership: any) =>
        membership.starts_on <= today &&
        (!membership.ends_on || membership.ends_on >= today),
    )

    const trialActive = (trials ?? []).length > 0

    return membershipActive || trialActive
  }


  useEffect(() => {
    const savedEmail = window.localStorage.getItem("emd_member_login_email")
    if (savedEmail) setEmail(savedEmail)
  }, [])

  useEffect(() => {
    const code = searchParams.get("code")
    if (!code) return
    router.replace(`/member-set-password?code=${encodeURIComponent(code)}`)
  }, [searchParams, router])

  useEffect(() => {
    const checkMemberAndRedirect = async () => {
      if (authLoading || !session?.user || loginAttemptRef.current) return

      setRedirecting(true)

      const { data: profileData, error } = await supabase
        .from("user_profiles")
        .select("is_guest, is_blocked, blocked_reason, player_id")
        .eq("user_id", session.user.id)
        .maybeSingle()

      if (error) {
        setRedirecting(false)
        setLoading(false)
        setMessage("Fehler beim Prüfen des Benutzerstatus.")
        return
      }

      if (!profileData) {
        await supabase.auth.signOut()
        loginAttemptRef.current = false
        setRedirecting(false)
        setMessage("Für dieses Konto wurde kein Profil gefunden.")
        return
      }

      const memberAccessActive = await hasActiveMemberAccess(session.user.id, profileData.player_id)

      if (profileData.is_guest && !memberAccessActive) {
        await supabase.auth.signOut()
        loginAttemptRef.current = false
        setRedirecting(false)
        setWrongLoginType("guest")
        setMessage("")
        return
      }

      if (memberAccessActive && profileData.is_guest) {
        const { error: updateError } = await supabase
          .from("user_profiles")
          .update({ is_guest: false })
          .eq("user_id", session.user.id)

        if (updateError) {
          console.error("Member status update failed:", updateError)
          setRedirecting(false)
          setMessage("Dein Mitgliederstatus konnte nicht aktualisiert werden. Bitte versuche es erneut.")
          return
        }
      }

      router.replace("/member-profile-app")
    }

    void checkMemberAndRedirect()
  }, [session?.user?.id, authLoading, router])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    loginAttemptRef.current = true
    setLoading(true)
    setMessage("")
    setWrongLoginType(null)

    try {
      const cleanEmail = email.trim().toLowerCase()

      if (rememberEmail) window.localStorage.setItem("emd_member_login_email", cleanEmail)
      else window.localStorage.removeItem("emd_member_login_email")

      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      })

      if (error) {
        loginAttemptRef.current = false
        setLoading(false)
        setMessage(mapAuthError(error))
        return
      }

      if (!data.user || !data.session) {
        loginAttemptRef.current = false
        setLoading(false)
        setMessage("Anmeldung fehlgeschlagen.")
        return
      }

      setRedirecting(true)

      const { data: profileData, error: profileError } = await supabase
        .from("user_profiles")
        .select("is_guest, is_blocked, blocked_reason, player_id")
        .eq("user_id", data.user.id)
        .maybeSingle()

      if (profileError) {
        await supabase.auth.signOut()
        loginAttemptRef.current = false
        setRedirecting(false)
        setMessage("Fehler beim Prüfen des Benutzerstatus.")
        return
      }

      if (!profileData) {
        await supabase.auth.signOut()
        setRedirecting(false)
        setMessage("Für dieses Konto wurde kein Profil gefunden.")
        return
      }

      const memberAccessActive = await hasActiveMemberAccess(data.user.id, profileData.player_id)

      if (profileData.is_guest && !memberAccessActive) {
        await supabase.auth.signOut()
        setRedirecting(false)
        setWrongLoginType("guest")
        setMessage("")
        return
      }

      if (memberAccessActive && profileData.is_guest) {
        const { error: updateError } = await supabase
          .from("user_profiles")
          .update({ is_guest: false })
          .eq("user_id", data.user.id)

        if (updateError) {
          console.error("Member status update failed:", updateError)
          await supabase.auth.signOut()
          loginAttemptRef.current = false
          setRedirecting(false)
          setMessage("Dein Mitgliederstatus konnte nicht aktualisiert werden. Bitte versuche es erneut.")
          return
        }
      }

      window.location.replace("/member-profile-app")
    } catch {
      loginAttemptRef.current = false
      setRedirecting(false)
      setMessage("Ein Fehler ist aufgetreten.")
      setLoading(false)
    }
  }

  const handlePasswordReset = async () => {
    setResetLoading(true)
    setMessage("")

    try {
      const cleanEmail = email.trim().toLowerCase()

      if (!cleanEmail) {
        setMessage("Bitte zuerst deine E-Mail-Adresse eingeben.")
        return
      }

      const redirectTo = `${window.location.origin}/member-set-password`

      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo,
      })

      if (error) {
        setMessage("Reset fehlgeschlagen.")
        return
      }

      setMessage("Reset-Mail wurde gesendet.")
    } catch {
      setMessage("Reset fehlgeschlagen.")
    } finally {
      setResetLoading(false)
    }
  }

  // Bei einem normalen Login keinen zweiten Vollbild-Loader zeigen.
  // Solange der Benutzer aktiv auf "Anmelden" wartet, bleibt die Loginseite
  // stehen und nur der Button zeigt den Ladezustand. Nach der Navigation
  // übernimmt ausschließlich der globale AppRouteGuard seinen Loader.
  if ((authLoading && !loading) || (redirecting && !loading)) return <LoginSkeleton />

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#050608] text-white font-sans">
      <Header />
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-[#050608]">
        <div
          className="absolute inset-0 bg-cover bg-[66%_50%] bg-no-repeat opacity-[0.34]"
          style={{ backgroundImage: "url('/terminal/hero-startscreen.png')" }}
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(3,5,8,.66),rgba(3,5,9,.93)_46%,rgba(2,4,7,.985))]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_8%_18%,rgba(249,115,22,.17),transparent_26%),radial-gradient(circle_at_88%_30%,rgba(14,165,233,.14),transparent_28%),radial-gradient(circle_at_52%_84%,rgba(99,102,241,.08),transparent_24%)]" />
      </div>

      <main className="relative z-10 mx-auto w-full max-w-[1680px] px-3 pb-28 pt-16 sm:px-5 sm:pt-20 lg:px-7 xl:px-8">
        <div className="mx-auto grid min-h-[calc(100vh-8rem)] w-full max-w-6xl items-stretch overflow-hidden rounded-[30px] border border-white/10 bg-black/35 shadow-[0_40px_140px_-65px_rgba(0,0,0,.98)] backdrop-blur-2xl lg:grid-cols-[1.05fr_.95fr]">
          <section className="relative hidden overflow-hidden border-r border-white/10 p-8 lg:flex lg:flex-col lg:justify-between xl:p-10">
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(140deg,rgba(249,115,22,.13),transparent_38%,rgba(14,165,233,.08))]" />
            <div className="relative">
              <div className="inline-flex items-center gap-2 rounded-full border border-orange-400/20 bg-orange-500/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-orange-100">
                <Users className="h-3.5 w-3.5" />
                Mitgliederbereich
              </div>
              <h1 className="mt-6 max-w-xl text-5xl font-black tracking-[-0.055em] text-white">
                Willkommen zurück bei Emoj!´s Dartverein.
              </h1>
              <p className="mt-4 max-w-xl text-base font-medium leading-7 text-white/50">
                Dein persönlicher Bereich für Teams, Liga, Turniere, Termine, Statistiken und Vereinsleben.
              </p>
            </div>

            <div className="relative rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-xs font-black uppercase tracking-[0.14em] text-white/35">Dein Mitgliederbereich</div>
              <div className="mt-1 text-sm font-bold text-white/80">Verein, Teams, Liga, Turniere und persönliche Funktionen an einem Ort.</div>
            </div>
          </section>

          <section className="flex items-center p-4 sm:p-7 lg:p-9 xl:p-10">
            <div className="mx-auto w-full max-w-md">
              <div className="mb-7">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-orange-400/25 bg-orange-500/15 shadow-[0_0_35px_rgba(249,115,22,.14)]">
                  <Users className="h-7 w-7 text-orange-100" />
                </div>
                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-white/35">EMD VereinsApp</div>
                <h2 className="mt-2 text-3xl font-black tracking-[-0.04em] text-white sm:text-4xl">Member-Login</h2>
                <p className="mt-2 text-sm leading-6 text-white/50">Melde dich mit deinem persönlichen Mitgliederkonto an.</p>
              </div>

              <Card className="border-white/10 bg-white/5 shadow-none">
                <CardContent className="p-4 sm:p-5">
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                      <label className="text-[11px] font-black uppercase tracking-[0.14em] text-white/40">E-Mail-Adresse</label>
                      <div className="relative mt-2">
                        <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/30" />
                        <Input
                          type="email"
                          name="email"
                          autoComplete="username"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="deine.email@example.com"
                          className="h-12 rounded-xl border-white/10 bg-black/25 pl-12 text-white placeholder:text-white/25 focus-visible:border-orange-400/50 focus-visible:ring-orange-400/20"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between gap-3">
                        <label className="text-[11px] font-black uppercase tracking-[0.14em] text-white/40">Passwort</label>
                        <button type="button" onClick={handlePasswordReset} disabled={resetLoading} className="text-xs font-bold text-orange-300 hover:text-orange-200 disabled:opacity-50">
                          {resetLoading ? "Sende…" : "Passwort vergessen?"}
                        </button>
                      </div>
                      <div className="relative mt-2">
                        <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/30" />
                        <Input
                          type={showPassword ? "text" : "password"}
                          name="password"
                          autoComplete="current-password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Dein Passwort"
                          className="h-12 rounded-xl border-white/10 bg-black/25 pl-12 pr-12 text-white placeholder:text-white/25 focus-visible:border-orange-400/50 focus-visible:ring-orange-400/20"
                          required
                        />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/35 transition hover:text-white">
                          {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </button>
                      </div>
                    </div>

                    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/10 bg-black/20 p-3">
                      <input type="checkbox" checked={rememberEmail} onChange={(e) => setRememberEmail(e.target.checked)} className="mt-0.5 h-4 w-4 accent-orange-500" />
                      <span>
                        <span className="block text-sm font-bold text-white/75">E-Mail merken</span>
                        <span className="mt-0.5 block text-xs leading-5 text-white/35">Das Passwort kann dein Browser bzw. Passwortmanager sicher speichern.</span>
                      </span>
                    </label>

                    {wrongLoginType === "guest" ? (
                      <div className="overflow-hidden rounded-2xl border border-sky-300/30 bg-sky-500/[0.10] shadow-[0_0_40px_rgba(14,165,233,.12)]">
                        <div className="h-1 bg-sky-400" />
                        <div className="p-4 sm:p-5">
                          <div className="flex items-start gap-3">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-sky-300/25 bg-sky-500/15">
                              <UserRound className="h-5 w-5 text-sky-100" />
                            </div>
                            <div>
                              <div className="text-base font-black text-white">Dieses Konto ist ein Gastzugang</div>
                              <p className="mt-1 text-sm font-semibold leading-6 text-sky-100/75">
                                Du bist noch nicht als Vereinsmitglied freigeschaltet. Bitte verwende den Gast-Login.
                              </p>
                            </div>
                          </div>
                          <Button asChild type="button" className="mt-4 h-11 w-full rounded-xl bg-sky-500 font-black text-white hover:bg-sky-400">
                            <Link href="/guest-login">
                              Zum Gast-Login
                              <ArrowRight className="ml-2 h-4 w-4" />
                            </Link>
                          </Button>
                        </div>
                      </div>
                    ) : null}

                    {message ? (
                      <div className="rounded-xl border border-red-400/25 bg-red-400/10 p-3 text-center text-sm font-semibold text-red-200">{message}</div>
                    ) : null}

                    <Button type="submit" disabled={loading || redirecting} className="h-12 w-full rounded-xl bg-orange-500 text-base font-black text-white shadow-[0_0_30px_rgba(249,115,22,.16)] hover:bg-orange-600">
                      {loading ? "Wird angemeldet…" : "Anmelden"}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              <div className="mt-5 text-center text-sm text-white/45">
                Gastzugang? <Link href="/guest-login" className="font-black text-sky-300 hover:text-sky-200">Zum Gast-Login</Link>
              </div>
            </div>
          </section>
        </div>
      </main>

      <MobileBottomNav />
    </div>
  )
}
