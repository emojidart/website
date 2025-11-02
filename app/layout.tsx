import type React from "react"
import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { SplashScreen } from "@/components/splash-screen"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Emoj's Dartverein",
  description: "Offizielle Website des Emoj's Dartvereins",
  generator: "grafikguru",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Emoj's Dartverein",
  },
}

export const viewport: Viewport = {
  themeColor: "#d97706",
  backgroundColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="de">
      <head>
        <meta name="theme-color" content="#d97706" />
      </head>
      <body className={`${inter.className} antialiased`}>
        <SplashScreen />
        {children}
      </body>
    </html>
  )
}
