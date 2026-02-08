"use client"

import { Button } from "@/components/ui/button"
import { Globe, LogIn, Sparkles, LayoutDashboard } from 'lucide-react'
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu"
import { useAuth } from "@/hooks/use-auth"
import { useRouter } from 'next/navigation'
import Image from "next/image"

export function Header() {
  const { user, isAdmin } = useAuth()
  const router = useRouter()

  const handleAuthClick = () => {
    if (user) {
      router.push("/member-profile-app")
    } else {
      router.push("/member-login")
    }
  }

  const handleApplyClick = () => {
    router.push("/player-search")
  }

  const handleAdminClick = () => {
    router.push("/admin")
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-orange-100/20 bg-white/80 backdrop-blur-xl shadow-sm">
      <div className="container mx-auto px-4 lg:px-6">
        <div className="flex h-20 items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-10">
            <a href="/" className="flex items-center gap-3 group">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl blur-lg opacity-50 group-hover:opacity-75 transition-opacity" />
                <div className="relative bg-gradient-to-br from-orange-500 to-orange-600 p-2.5 rounded-xl shadow-lg group-hover:shadow-xl transition-all group-hover:scale-105">
                  <Image
                    src="/images/brutal-darts-bg---.png"
                    alt="EMD Logo"
                    width={40}
                    height={40}
                    className="object-contain"
                  />
                </div>
              </div>
              <span className="hidden font-bold text-2xl bg-gradient-to-r from-orange-600 to-orange-500 bg-clip-text text-transparent sm:inline-block">
                EMD
              </span>
            </a>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-1">
              <NavigationMenu>
                <NavigationMenuList>
                  <NavigationMenuItem>
                    <a
                      href="/"
                      className="group inline-flex h-11 w-max items-center justify-center rounded-lg bg-transparent px-5 py-2 text-sm font-semibold transition-all hover:bg-orange-50 hover:text-orange-600 focus:bg-orange-50 focus:text-orange-600 focus:outline-none"
                    >
                      HOME
                    </a>
                  </NavigationMenuItem>

                  <NavigationMenuItem>
                    <NavigationMenuTrigger className="h-11 bg-transparent hover:bg-orange-50 hover:text-orange-600 font-semibold">
                      CUPS
                    </NavigationMenuTrigger>
                    <NavigationMenuContent>
                      <ul className="grid w-[420px] gap-2 p-4">
                        <li>
                          <NavigationMenuLink asChild>
                            <a
                              href="/tournament-series-app"
                              className="block select-none space-y-1 rounded-lg p-4 leading-none no-underline outline-none transition-all hover:bg-orange-50 hover:shadow-md border border-transparent hover:border-orange-100"
                            >
                              <div className="text-sm font-semibold leading-none text-orange-600">Lion Cup</div>
                              <p className="line-clamp-2 text-sm leading-snug text-muted-foreground mt-1.5">
                                E-Dart Turnierserie
                              </p>
                            </a>
                          </NavigationMenuLink>
                        </li>
                        <li>
                          <NavigationMenuLink asChild>
                            <a
                              href="/lion-cup-regelwerk"
                              className="block select-none space-y-1 rounded-lg p-4 leading-none no-underline outline-none transition-all hover:bg-orange-50 hover:shadow-md border border-transparent hover:border-orange-100"
                            >
                              <div className="text-sm font-semibold leading-none text-orange-600">
                                Lion Cup Regelwerk
                              </div>
                              <p className="line-clamp-2 text-sm leading-snug text-muted-foreground mt-1.5">
                                Offizielle Turnierregeln
                              </p>
                            </a>
                          </NavigationMenuLink>
                        </li>
                        <li>
                          <NavigationMenuLink asChild>
                            <a
                              href="/buffalo-steel-cup"
                              className="block select-none space-y-1 rounded-lg p-4 leading-none no-underline outline-none transition-all hover:bg-orange-50 hover:shadow-md border border-transparent hover:border-orange-100"
                            >
                              <div className="text-sm font-semibold leading-none text-orange-600">
                                Buffalo Steel Cup
                              </div>
                              <p className="line-clamp-2 text-sm leading-snug text-muted-foreground mt-1.5">
                                Steeldart Turnierserie
                              </p>
                            </a>
                          </NavigationMenuLink>
                        </li>
                      </ul>
                    </NavigationMenuContent>
                  </NavigationMenuItem>

                  <NavigationMenuItem>
                    <NavigationMenuTrigger className="h-11 bg-transparent hover:bg-orange-50 hover:text-orange-600 font-semibold">
                      EVENTS
                    </NavigationMenuTrigger>
                    <NavigationMenuContent>
                      <ul className="grid w-[420px] gap-2 p-4">
                        <li>
                          <NavigationMenuLink asChild>
                            <a
                              href="/veranstaltungen"
                              className="block select-none space-y-1 rounded-lg p-4 leading-none no-underline outline-none transition-all hover:bg-orange-50 hover:shadow-md border border-transparent hover:border-orange-100"
                            >
                              <div className="text-sm font-semibold leading-none text-orange-600">Bevorstehend</div>
                              <p className="line-clamp-2 text-sm leading-snug text-muted-foreground mt-1.5">
                                Kommende Turniere und Events
                              </p>
                            </a>
                          </NavigationMenuLink>
                        </li>
                        <li>
                          <NavigationMenuLink asChild>
                            <a
                              href="/tournament-history"
                              className="block select-none space-y-1 rounded-lg p-4 leading-none no-underline outline-none transition-all hover:bg-orange-50 hover:shadow-md border border-transparent hover:border-orange-100"
                            >
                              <div className="text-sm font-semibold leading-none text-orange-600">Turnier Historie</div>
                              <p className="line-clamp-2 text-sm leading-snug text-muted-foreground mt-1.5">
                                Alle gespielten Turniere & Ergebnisse
                              </p>
                            </a>
                          </NavigationMenuLink>
                        </li>

                        <li>
                          <NavigationMenuLink asChild>
                            <a
                              href="/live-all-app"
                              className="block select-none space-y-1 rounded-lg p-4 leading-none no-underline outline-none transition-all hover:bg-orange-50 hover:shadow-md border border-transparent hover:border-orange-100"
                            >
                              <div className="text-sm font-semibold leading-none text-orange-600">Liveticker</div>
                              <p className="line-clamp-2 text-sm leading-snug text-muted-foreground mt-1.5">
                                Live-Updates zu laufenden Spielen
                              </p>
                            </a>
                          </NavigationMenuLink>
                        </li>
                        <li>
                          <NavigationMenuLink asChild>
                            <a
                              href="/livestream"
                              className="block select-none space-y-1 rounded-lg p-4 leading-none no-underline outline-none transition-all hover:bg-orange-50 hover:shadow-md border border-transparent hover:border-orange-100"
                            >
                              <div className="text-sm font-semibold leading-none text-orange-600">Livestream</div>
                              <p className="line-clamp-2 text-sm leading-snug text-muted-foreground mt-1.5">
                                Live-Übertragungen ansehen
                              </p>
                            </a>
                          </NavigationMenuLink>
                        </li>
                      </ul>
                    </NavigationMenuContent>
                  </NavigationMenuItem>

                  <NavigationMenuItem>
                    <NavigationMenuTrigger className="h-11 bg-transparent hover:bg-orange-50 hover:text-orange-600 font-semibold">
                      LIGA
                    </NavigationMenuTrigger>
                    <NavigationMenuContent>
                      <ul className="grid w-[420px] gap-2 p-4">
                        <li>
                          <NavigationMenuLink asChild>
                            <a
                              href="/liga-statistiken-app"
                              className="block select-none space-y-1 rounded-lg p-4 leading-none no-underline outline-none transition-all hover:bg-orange-50 hover:shadow-md border border-transparent hover:border-orange-100"
                            >
                              <div className="text-sm font-semibold leading-none text-orange-600">Statistiken</div>
                              <p className="line-clamp-2 text-sm leading-snug text-muted-foreground mt-1.5">
                                Tabellen und Spielergebnisse
                              </p>
                            </a>
                          </NavigationMenuLink>
                        </li>
                        <li>
                          <NavigationMenuLink asChild>
                            <a
                              href="/new-club"
                              className="block select-none space-y-1 rounded-lg p-4 leading-none no-underline outline-none transition-all hover:bg-orange-50 hover:shadow-md border border-transparent hover:border-orange-100"
                            >
                              <div className="text-sm font-semibold leading-none text-orange-600">Verein</div>
                              <p className="line-clamp-2 text-sm leading-snug text-muted-foreground mt-1.5">
                                Informationen über den Verein
                              </p>
                            </a>
                          </NavigationMenuLink>
                        </li>
                        <li>
                          <NavigationMenuLink asChild>
                            <a
                              href="/match-galerie"
                              className="block select-none space-y-1 rounded-lg p-4 leading-none no-underline outline-none transition-all hover:bg-orange-50 hover:shadow-md border border-transparent hover:border-orange-100"
                            >
                              <div className="text-sm font-semibold leading-none text-orange-600">Match Galerie</div>
                              <p className="line-clamp-2 text-sm leading-snug text-muted-foreground mt-1.5">
                                Fotos von Matches und Events
                              </p>
                            </a>
                          </NavigationMenuLink>
                        </li>
                      </ul>
                    </NavigationMenuContent>
                  </NavigationMenuItem>

                  <NavigationMenuItem>
                    <a
                      href="/uber-uns"
                      className="group inline-flex h-11 w-max items-center justify-center rounded-lg bg-transparent px-5 py-2 text-sm font-semibold transition-all hover:bg-orange-50 hover:text-orange-600 focus:bg-orange-50 focus:text-orange-600 focus:outline-none"
                    >
                      ÜBER UNS
                    </a>
                  </NavigationMenuItem>

                  <NavigationMenuItem>
                    <a
                      href="/kontakt"
                      className="group inline-flex h-11 w-max items-center justify-center rounded-lg bg-transparent px-5 py-2 text-sm font-semibold transition-all hover:bg-orange-50 hover:text-orange-600 focus:bg-orange-50 focus:text-orange-600 focus:outline-none"
                    >
                      KONTAKT
                    </a>
                  </NavigationMenuItem>
                </NavigationMenuList>
              </NavigationMenu>
            </nav>
          </div>

          {/* Right Side Actions */}
          <div className="flex items-center gap-3">
            <Button
              onClick={handleApplyClick}
              className="hidden md:flex bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold shadow-lg shadow-orange-500/30 transition-all hover:shadow-xl hover:shadow-orange-500/40 hover:scale-105 border-0"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Jetzt bewerben
            </Button>

            <Button
              onClick={() => router.push("/emd-campus")}
              className="flex md:flex bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold shadow-lg shadow-orange-500/30 transition-all hover:shadow-xl hover:shadow-orange-500/40 hover:scale-105 border-0"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              EMD CAMPUS
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="hidden lg:flex hover:bg-orange-50 hover:text-orange-600 transition-all"
            >
              <Globe className="h-5 w-5" />
            </Button>

            {user && isAdmin && (
              <Button
                onClick={handleAdminClick}
                className="hidden lg:flex border-orange-400 hover:bg-orange-50 hover:text-orange-600 hover:border-orange-500 bg-transparent font-semibold transition-all text-orange-600"
                variant="outline"
              >
                <LayoutDashboard className="h-4 w-4 mr-2" />
                ADMIN
              </Button>
            )}

            <Button
              onClick={handleAuthClick}
              variant="outline"
              className="hidden lg:flex border-orange-200 hover:bg-orange-50 hover:text-orange-600 hover:border-orange-300 bg-transparent font-semibold transition-all"
            >
              <LogIn className="h-4 w-4 mr-2" />
              {user ? "PROFIL" : "LOGIN"}
            </Button>
          </div>
        </div>
      </div>
    </header>
  )
}
