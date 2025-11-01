"use client"

import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"
import Link from "next/link"

interface RecruitmentHeroProps {
  badge?: string
  title?: string
  description?: string
  buttonText?: string
  buttonHref?: string
  showButton?: boolean
}

export function RecruitmentHero({
  badge = "Werde Teil unseres Teams",
  title = "WIR SUCHEN VERSTÄRKUNG!",
  description = "Egal ob erfahrener Spieler oder motivierter Neuling – wenn du unsere Leidenschaft für Darts teilst, bist du bei uns genau richtig!",
  buttonText = "Jetzt Bewerben",
  buttonHref = "/player-search",
  showButton = true,
}: RecruitmentHeroProps = {}) {
  return (
    <div className="relative overflow-hidden bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-b border-primary/20">
      <div className="container mx-auto px-4 py-16 md:py-24">
        <div className="max-w-3xl">
          <div className="inline-block mb-4">
            <span className="text-primary font-bold uppercase tracking-widest text-sm">{badge}</span>
          </div>

          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6 text-balance leading-tight">
            {title}
          </h2>

          <p className="text-lg md:text-xl text-muted-foreground mb-8 text-pretty leading-relaxed max-w-2xl">
            {description}
          </p>

          {showButton && (
            <Link href={buttonHref}>
              <Button size="lg" className="group">
                {buttonText}
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Decorative element */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl -z-10" />
    </div>
  )
}
