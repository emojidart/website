import { Header } from "@/components/header"
import { PushNotificationManager } from "@/components/push-notification-manager"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"

export default function PushNotificationsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Benachrichtigungen</h1>
          <p className="text-gray-600 mb-8">
            Verwalte deine Push-Benachrichtigungen und bleibe immer auf dem Laufenden
          </p>
          <PushNotificationManager />
        </div>
      </main>
      <MobileBottomNav />
    </div>
  )
}
