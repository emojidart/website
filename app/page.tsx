"use client"

import { Header } from "@/components/header"
import { HeroSection } from "@/components/hero-section"
import { AboutUsSection } from "@/components/about-us-section"
import { ImageSlideshow } from "@/components/image-slideshow"
import { FeaturesSection } from "@/components/features-section"
import { useDartData } from "@/hooks/use-dart-data"

export default function Home() {
  const { currentPot } = useDartData()

  // Bilder für die Slideshow (von Ihnen bereitgestellt)
  const slideshowImages = [
    "/images/slideshow/darts-action-1.png",
    "/images/slideshow/darts-action-2.png",
    "/images/slideshow/darts-action-3.png", // Neues Bild für mehr Abwechslung
  ]

  return (
    <div className="min-h-screen bg-brutal-bg text-brutal-text font-sans">
      <Header />
      <main>
        <HeroSection currentPot={currentPot} />
        <FeaturesSection />
        <section className="py-20 px-4 md:px-8 bg-brutal-bg">
          <div className="max-w-6xl mx-auto">
            <ImageSlideshow images={slideshowImages} />
          </div>
        </section>
        <AboutUsSection />
      </main>
      <footer className="py-6 bg-brutal-card-bg text-brutal-text-muted text-sm text-center border-t border-brutal-border">
        <p>&copy; 2025 EMOJIS DARTVEREIN. Alle Rechte vorbehalten.</p>
      </footer>
    </div>
  )
}
