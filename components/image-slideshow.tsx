"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { motion, AnimatePresence } from "framer-motion"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"

interface ImageSlideshowProps {
  images: string[]
  interval?: number // Auto-play interval in ms
}

export function ImageSlideshow({ images, interval = 5000 }: ImageSlideshowProps) {
  const [currentIndex, setCurrentIndex] = useState(0)

  useEffect(() => {
    if (images.length > 1) {
      const timer = setInterval(() => {
        setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length)
      }, interval)
      return () => clearInterval(timer)
    }
  }, [images, interval])

  const goToPrevious = () => {
    setCurrentIndex((prevIndex) => (prevIndex - 1 + images.length) % images.length)
  }

  const goToNext = () => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length)
  }

  if (images.length === 0) {
    return null // Render nothing if no images are provided
  }

  return (
    <div className="relative w-full h-[400px] md:h-[600px] overflow-hidden rounded-lg shadow-2xl border border-brutal-border">
      <AnimatePresence initial={false} mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
          className="absolute inset-0"
        >
          <Image
            src={images[currentIndex] || "/placeholder.svg"}
            alt={`Slideshow image ${currentIndex + 1}`}
            layout="fill"
            objectFit="cover"
            quality={90}
            className="brightness-75" // Slightly darken images for better text contrast
          />
        </motion.div>
      </AnimatePresence>

      {images.length > 1 && (
        <>
          <Button
            variant="ghost"
            size="icon"
            onClick={goToPrevious}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-10 bg-brutal-card-bg/50 hover:bg-brutal-card-bg/80 text-brutal-text rounded-full p-2 border border-brutal-border"
            aria-label="Previous image"
          >
            <ChevronLeft className="h-8 w-8" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={goToNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-10 bg-brutal-card-bg/50 hover:bg-brutal-card-bg/80 text-brutal-text rounded-full p-2 border border-brutal-border"
            aria-label="Next image"
          >
            <ChevronRight className="h-8 w-8" />
          </Button>
        </>
      )}

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex space-x-2">
        {images.map((_, index) => (
          <div
            key={index}
            className={`h-3 w-3 rounded-full ${
              index === currentIndex ? "bg-brutal-accent-red" : "bg-brutal-text-muted/50"
            } cursor-pointer transition-colors border border-brutal-text-muted/30`}
            onClick={() => setCurrentIndex(index)}
            aria-label={`Go to image ${index + 1}`}
          />
        ))}
      </div>
    </div>
  )
}
