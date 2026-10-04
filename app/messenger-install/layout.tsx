import type { Metadata, Viewport } from "next"

export const metadata: Metadata = {
  title: "EMD Messenger installieren",
  description: "EMD Messenger auf deinem Gerät installieren.",
  manifest: "/emd-messenger/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "EMD Messenger",
  },
  icons: { apple: "/emd-messenger/icon-192.png" },
}

export const viewport: Viewport = { themeColor: "#f97316" }

export default function MessengerInstallLayout({ children }: { children: React.ReactNode }) {
  return children
}
