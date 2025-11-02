// Service Worker for Push Notifications
self.addEventListener("install", (event) => {
  console.log("[v0] Service Worker installing...")
  self.skipWaiting()
})

self.addEventListener("activate", (event) => {
  console.log("[v0] Service Worker activated")
  event.waitUntil(clients.claim())
})

// Handle push notifications
self.addEventListener("push", (event) => {
  console.log("[v0] Push notification received:", event)

  let notificationData = {
    title: "EMD Vereinsapp",
    body: "Neue Benachrichtigung",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    image: undefined,
    data: {},
  }

  // Parse push data if available
  if (event.data) {
    try {
      const data = event.data.json()
      notificationData = {
        title: data.title || notificationData.title,
        body: data.body || notificationData.body,
        icon: data.icon || notificationData.icon,
        badge: data.badge || notificationData.badge,
        image: data.image || notificationData.image,
        data: data.data || {},
      }
    } catch (e) {
      console.error("[v0] Error parsing push data:", e)
    }
  }

  const notificationOptions = {
    body: notificationData.body,
    icon: notificationData.icon,
    badge: notificationData.badge,
    data: notificationData.data,
    vibrate: [200, 100, 200],
    tag: "emd-dart-notification",
  }

  if (notificationData.image) {
    notificationOptions.image = notificationData.image
  }

  event.waitUntil(self.registration.showNotification(notificationData.title, notificationOptions))
})

// Handle notification clicks
self.addEventListener("notificationclick", (event) => {
  console.log("[v0] Notification clicked:", event)
  event.notification.close()

  const link = event.notification.data?.link || "/veranstaltungen"

  event.waitUntil(
    clients.matchAll({ type: "window" }).then((clientList) => {
      // Check if app is already open
      for (let i = 0; i < clientList.length; i++) {
        if (clientList[i].url === link && "focus" in clientList[i]) {
          return clientList[i].focus()
        }
      }
      // If not open, open new window with the link
      if (clients.openWindow) {
        return clients.openWindow(link)
      }
    }),
  )
})
