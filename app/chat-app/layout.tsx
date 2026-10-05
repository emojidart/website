import type { Metadata, Viewport } from "next"

export const metadata: Metadata = {
  title: "EMD Messenger",
  description: "Chats, Aktuelles und Aufstellungen von EMD.",
  manifest: "/emd-messenger/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "EMD Messenger",
  },
  icons: {
    apple: "/emd-messenger/icon-192.png",
  },
}

export const viewport: Viewport = {
  themeColor: "#f97316",
}

export default function ChatAppLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return <div className="emd-chat-app-shell h-[100dvh] overflow-hidden">{children}</div>
}
