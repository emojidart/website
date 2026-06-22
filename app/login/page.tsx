"use client"

export const dynamic = "force-dynamic"

import Link from "next/link"
import { Header } from "@/components/header"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Users,
  ShieldCheck,
  ArrowRight,
  UserPlus,
} from "lucide-react"

export default function LoginChoicePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex flex-col text-gray-900">
      <Header />

      <main className="flex-grow px-4 pt-20 pb-28">
        <div className="mx-auto w-full max-w-2xl">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 shadow-lg mb-4">
              <ShieldCheck className="w-8 h-8 text-white" />
            </div>

            <h1 className="text-3xl sm:text-4xl font-black text-gray-900">
              Anmeldung
            </h1>

            <p className="text-gray-600 mt-2">
              Wähle aus, wie du die EMD VereinsApp nutzen möchtest.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Link href="/member-login">
              <Card className="h-full rounded-3xl border border-gray-200 shadow-lg hover:shadow-xl transition-all bg-white cursor-pointer">
                <CardContent className="p-6">
                  <div className="w-14 h-14 rounded-2xl bg-orange-50 border border-orange-200 flex items-center justify-center mb-4">
                    <Users className="w-7 h-7 text-orange-600" />
                  </div>

                  <h2 className="text-xl font-black text-gray-900">
                    Mitglieder-Login
                  </h2>

                  <p className="text-sm text-gray-600 mt-2 min-h-[48px]">
                    Für Vereinsmitglieder mit bestehendem Member-Zugang.
                  </p>

                  <Button className="w-full mt-5 rounded-xl bg-orange-600 hover:bg-orange-700 font-bold">
                    Zum Mitglieder-Login
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>
            </Link>

            <Link href="/guest-login">
              <Card className="h-full rounded-3xl border border-gray-200 shadow-lg hover:shadow-xl transition-all bg-white cursor-pointer">
                <CardContent className="p-6">
                  <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center mb-4">
                    <ShieldCheck className="w-7 h-7 text-blue-600" />
                  </div>

                  <h2 className="text-xl font-black text-gray-900">
                    Gast-Login
                  </h2>

                  <p className="text-sm text-gray-600 mt-2 min-h-[48px]">
                    Für freigeschaltete Gäste der EMD VereinsApp.
                  </p>

                  <Button className="w-full mt-5 rounded-xl bg-blue-600 hover:bg-blue-700 font-bold">
                    Zum Gast-Login
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>
            </Link>
          </div>

          <Card className="mt-5 rounded-3xl border border-orange-200 bg-orange-50 shadow-sm">
            <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h3 className="font-black text-gray-900">
                  Noch keinen Gastzugang?
                </h3>

                <p className="text-sm text-gray-600 mt-1">
                  Beantrage hier deinen Zugang zur EMD VereinsApp als Gast.
                </p>
              </div>

              <Link href="/gastzugang">
                <Button variant="outline" className="w-full sm:w-auto rounded-xl border-orange-300 bg-white text-orange-700 font-bold">
                  <UserPlus className="w-4 h-4 mr-2" />
                  Gastzugang beantragen
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </main>

      <MobileBottomNav />
    </div>
  )
}